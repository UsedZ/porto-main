/**
 * AI Monitor admin dashboard — focused tests.
 *
 * Covers the contracts from the implementation task:
 *  - fail-closed admin auth (503 unconfigured / 401 absent|invalid / allow)
 *  - CSV escaping + spreadsheet formula-injection guard
 *  - pagination clamping
 *  - migration-safe SQLite telemetry columns (including the concurrent-worker
 *    ALTER race seen during `next build`)
 *  - session/message query contracts (filter, search scope, totals, no fan-out)
 *  - chat session continuity, single user-message logging, measured telemetry,
 *    and honest failure recording
 *  - dashboard/API route wiring (file-based, no browser required)
 *
 * No real secrets and no network: the upstream provider is stubbed and the
 * database is a scratch file under TMPDIR.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import Database from "better-sqlite3";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(path.join(root, rel), "utf8");

// ---------------------------------------------------------------------------
// Scratch database + legacy-schema migration fixture.
// Must be set before lib/db.ts is imported (it reads env at module load).
// ---------------------------------------------------------------------------
const scratchDir = mkdtempSync(path.join(tmpdir(), "ai-monitor-admin-"));
const scratchDbPath = path.join(scratchDir, "legacy.db");
process.env.CONVERSATIONS_DB_PATH = scratchDbPath;

{
  // A database created before latency_ms/status existed.
  const seed = new Database(scratchDbPath);
  seed.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      ip TEXT,
      user_agent TEXT,
      referer TEXT,
      language TEXT DEFAULT 'id',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      tokens_input INTEGER DEFAULT 0,
      tokens_output INTEGER DEFAULT 0,
      model TEXT,
      provider TEXT,
      cost_usd REAL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );
    INSERT INTO sessions (id, ip, user_agent, referer, language, created_at, updated_at)
      VALUES ('legacy-1', '192.0.2.10', 'legacy-ua', 'legacy-ref', 'id', 1000, 1000);
    INSERT INTO messages (session_id, role, content, tokens_input, tokens_output, model, provider, cost_usd, created_at)
      VALUES ('legacy-1', 'user', 'legacy message', 1, 0, NULL, NULL, 0, 1000);
  `);
  seed.close();
}

const { db, parsePagination } = await import("../lib/db.ts");
const {
  processChatTurn,
  sanitizeSessionId,
  validateChatMessages,
  SESSION_ID_HEADER,
} = await import("../lib/ai-chat.ts");
const { requireAdminAuth } = await import("../lib/admin-auth.ts");
const { csvCell, csvRow, csvDocument } = await import("../lib/csv.ts");

const tableColumns = (dbPath, table) => {
  const conn = new Database(dbPath, { readonly: true });
  const cols = conn
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((column) => column.name);
  conn.close();
  return cols;
};

const clearData = () => {
  const conn = new Database(scratchDbPath);
  conn.exec("DELETE FROM messages; DELETE FROM sessions;");
  conn.close();
};

// ===========================================================================
// Migration compatibility
// ===========================================================================
test("migration adds latency_ms/status to a pre-telemetry database", () => {
  const columns = tableColumns(scratchDbPath, "messages");
  assert.ok(columns.includes("latency_ms"), "messages.latency_ms must exist after migration");
  assert.ok(columns.includes("status"), "messages.status must exist after migration");
});

test("migration preserves existing rows and leaves new telemetry columns NULL", () => {
  const session = db.getSession("legacy-1");
  assert.ok(session, "existing session row must survive the migration");
  assert.equal(session.ip, "192.0.2.10");

  const messages = db.getMessages("legacy-1");
  assert.equal(messages.length, 1);
  assert.equal(messages[0].content, "legacy message");
  assert.equal(messages[0].latency_ms, null, "legacy rows must not get fabricated latency");
  assert.equal(messages[0].status, null, "legacy rows must not get fabricated status");
});

test("concurrent imports migrate the same legacy database without crashing", async () => {
  const raceDbPath = path.join(scratchDir, "race.db");
  const seed = new Database(raceDbPath);
  seed.exec(`
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY, ip TEXT, user_agent TEXT, referer TEXT,
      language TEXT DEFAULT 'id', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, role TEXT NOT NULL,
      content TEXT NOT NULL, tokens_input INTEGER DEFAULT 0, tokens_output INTEGER DEFAULT 0,
      model TEXT, provider TEXT, cost_usd REAL DEFAULT 0, created_at INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    );
  `);
  seed.close();

  const script =
    "import('./lib/db.ts').then(()=>process.exit(0)).catch((e)=>{console.error(e);process.exit(1)})";
  const childEnv = { ...process.env, CONVERSATIONS_DB_PATH: raceDbPath };

  // Two workers racing the check-then-ALTER migration, as `next build` does.
  await Promise.all(
    [0, 1].map(() => execFileAsync(process.execPath, ["-e", script], { cwd: root, env: childEnv }))
  );

  const columns = tableColumns(raceDbPath, "messages");
  assert.ok(columns.includes("latency_ms"));
  assert.ok(columns.includes("status"));
});

test("deleteSession cascades to messages", () => {
  db.deleteSession("legacy-1");
  assert.equal(db.getSession("legacy-1"), undefined);
  assert.equal(db.getSessionsCount(), 0);
  assert.equal(db.getStats().total_messages, 0);
});

// ===========================================================================
// Query contracts
// ===========================================================================
test("stats report zero (not NULL/NaN) on an empty database", () => {
  clearData();
  const stats = db.getStats();
  assert.equal(stats.total_sessions, 0);
  assert.equal(stats.total_messages, 0);
  assert.equal(stats.total_tokens, 0);
  assert.equal(stats.total_cost, 0);
  assert.equal(stats.avg_latency_ms, 0);
  assert.equal(stats.measured_assistant_messages, 0);
  assert.equal(stats.successful_assistant_messages, 0);
});

test("session filter, search, totals and pagination are accurate", () => {
  clearData();
  db.createSession({ id: "sess-id-1", ip: "10.0.0.1", userAgent: "ua-one", referer: "ref-one", language: "id" });
  db.createSession({ id: "sess-en-2", ip: "10.0.0.2", userAgent: "ua-two", referer: "ref-two", language: "en" });
  db.createSession({ id: "sess-id-3", ip: "10.0.0.3", userAgent: "ua-three", referer: "ref-three", language: "id" });

  db.addMessage({ sessionId: "sess-id-1", role: "user", content: "hello world", tokensInput: 1 });
  db.addMessage({ sessionId: "sess-id-1", role: "assistant", content: "hi there", tokensInput: 10, tokensOutput: 5, model: "m1", provider: "p1", costUsd: 0.01, latencyMs: 100, status: 200 });
  db.addMessage({ sessionId: "sess-id-1", role: "user", content: "second", tokensInput: 1 });
  db.addMessage({ sessionId: "sess-id-1", role: "assistant", content: "", model: "m1", provider: "error", latencyMs: 50, status: 500 });
  db.addMessage({ sessionId: "sess-en-2", role: "user", content: "english only" });
  db.addMessage({ sessionId: "sess-en-2", role: "assistant", content: "ok", tokensInput: 20, tokensOutput: 10, model: "m1", provider: "p1", costUsd: 0.02, latencyMs: 200, status: 200 });
  db.addMessage({ sessionId: "sess-id-3", role: "user", content: "halo" });
  db.addMessage({ sessionId: "sess-id-3", role: "assistant", content: "respon", tokensInput: 7, tokensOutput: 3, model: "m1", provider: "p1", costUsd: 0.03, latencyMs: 300, status: 200 });

  const en = db.getSessionsFiltered({ language: "en", limit: 50, offset: 0 });
  assert.equal(en.total, 1);
  assert.equal(en.sessions.length, 1);
  assert.equal(en.sessions[0].id, "sess-en-2");

  const idOnly = db.getSessionsFiltered({ language: "id", limit: 50, offset: 0 });
  assert.equal(idOnly.total, 2);

  // Session search covers session fields only.
  assert.equal(db.getSessionsFiltered({ search: "10.0.0.2", limit: 50, offset: 0 }).total, 1);
  assert.equal(db.getSessionsFiltered({ search: "sess-en-2", limit: 50, offset: 0 }).total, 1);
  assert.equal(db.getSessionsFiltered({ search: "ua-three", limit: 50, offset: 0 }).total, 1);
  assert.equal(db.getSessionsFiltered({ search: "hello world", limit: 50, offset: 0 }).total, 0,
    "session search must not match message content");

  // LIKE wildcards in user input are escaped, not treated as wildcards.
  assert.equal(db.getSessionsFiltered({ search: "%", limit: 50, offset: 0 }).total, 0);

  const page1 = db.getSessionsFiltered({ limit: 2, offset: 0 });
  assert.equal(page1.total, 3);
  assert.equal(page1.sessions.length, 2);
  const page2 = db.getSessionsFiltered({ limit: 2, offset: 2 });
  assert.equal(page2.sessions.length, 1);

  // Message search covers content, not session fields.
  assert.equal(db.searchMessages({ search: "hello", limit: 50, offset: 0 }).total, 1);
  assert.equal(db.searchMessages({ search: "sess-en-2", limit: 50, offset: 0 }).total, 0,
    "message search must not match session id");
  assert.equal(db.searchMessages({ sessionId: "sess-id-1", limit: 50, offset: 0 }).total, 4);
  assert.equal(db.searchMessages({ sessionId: "sess-id-1", search: "second", limit: 50, offset: 0 }).total, 1);
  assert.equal(db.searchMessages({ language: "en", limit: 50, offset: 0 }).total, 2);
  const msgPage = db.searchMessages({ limit: 2, offset: 0 });
  assert.equal(msgPage.total, 8);
  assert.equal(msgPage.messages.length, 2);

  const stats = db.getStats();
  assert.equal(stats.total_sessions, 3);
  assert.equal(stats.total_messages, 8);
  assert.equal(stats.unique_visitors, 3);
  assert.equal(stats.total_tokens, 57);
  assert.equal(stats.tokens_input, 39);
  assert.equal(stats.tokens_output, 18);
  assert.ok(Math.abs(stats.total_cost - 0.06) < 1e-9);
  assert.equal(stats.avg_latency_ms, 162.5);
  assert.equal(stats.measured_assistant_messages, 4);
  assert.equal(stats.successful_assistant_messages, 3);

  // Recent sessions: one row per session, correct counts, no JOIN fan-out.
  const recent = db.getRecentSessions();
  assert.equal(recent.length, 3);
  assert.equal(new Set(recent.map((session) => session.id)).size, 3);
  const first = recent.find((session) => session.id === "sess-id-1");
  assert.equal(first.message_count, 4);
});

// ===========================================================================
// Pagination clamping
// ===========================================================================
test("parsePagination defaults, clamps and rejects invalid input", () => {
  assert.deepEqual(parsePagination(new URLSearchParams("")), { limit: 50, offset: 0 });
  assert.deepEqual(parsePagination(new URLSearchParams("limit=25&offset=50")), { limit: 25, offset: 50 });
  assert.deepEqual(parsePagination(new URLSearchParams("limit=abc")), { limit: 50, offset: 0 });
  assert.deepEqual(parsePagination(new URLSearchParams("limit=")), { limit: 50, offset: 0 });
  assert.deepEqual(parsePagination(new URLSearchParams("limit=-5")), { limit: 50, offset: 0 });
  assert.deepEqual(parsePagination(new URLSearchParams("limit=0")), { limit: 50, offset: 0 });
  assert.deepEqual(parsePagination(new URLSearchParams("limit=100000")), { limit: 200, offset: 0 });
  assert.deepEqual(parsePagination(new URLSearchParams("offset=-1")), { limit: 50, offset: 0 });
  assert.deepEqual(parsePagination(new URLSearchParams("offset=abc")), { limit: 50, offset: 0 });
});

// ===========================================================================
// CSV safety
// ===========================================================================
test("csvCell escapes quotes, commas and newlines", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
  assert.equal(csvCell("line1\r\nline2"), '"line1\r\nline2"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(undefined), "");
  assert.equal(csvCell(0), "0");
});

test("csvCell neutralises spreadsheet formula injection", () => {
  assert.equal(csvCell("=SUM(A1:A2)"), "'=SUM(A1:A2)");
  assert.equal(csvCell("+123"), "'+123");
  assert.equal(csvCell("-5"), "'-5");
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell("\tfoo"), "'\tfoo");
  // Formula trigger and CSV quoting combine correctly.
  assert.equal(csvCell("=a,b"), '"\'=a,b"');
});

test("csvDocument emits a header row and CRLF line endings", () => {
  assert.equal(csvDocument(["a", "b"], [["1", "2"]]), "a,b\r\n1,2\r\n");
  assert.equal(csvRow(["x", "y"]), "x,y");
});

// ===========================================================================
// Admin auth
// ===========================================================================
const ORIGINAL_ADMIN_USER = process.env.ADMIN_USER;
const ORIGINAL_ADMIN_PASS = process.env.ADMIN_PASS;

const setAdminEnv = (user, pass) => {
  if (user === undefined) delete process.env.ADMIN_USER;
  else process.env.ADMIN_USER = user;
  if (pass === undefined) delete process.env.ADMIN_PASS;
  else process.env.ADMIN_PASS = pass;
};

const authRequest = (authorization) => ({
  headers: {
    get: (name) => (name.toLowerCase() === "authorization" ? authorization : null),
  },
});

test("admin auth returns 503 when credentials are not configured", () => {
  setAdminEnv(undefined, undefined);
  let result = requireAdminAuth(authRequest(null));
  assert.equal(result.status, 503);
  assert.ok(result.body.error);

  setAdminEnv("admin", undefined);
  result = requireAdminAuth(authRequest(null));
  assert.equal(result.status, 503);

  setAdminEnv(undefined, "secret");
  result = requireAdminAuth(authRequest(null));
  assert.equal(result.status, 503);
});

test("admin auth returns 401 for missing or invalid credentials", () => {
  setAdminEnv("admin", "secret123");

  const missing = requireAdminAuth(authRequest(null));
  assert.equal(missing.status, 401);
  assert.equal(missing.headers["WWW-Authenticate"], 'Basic realm="Admin"');

  const wrongScheme = requireAdminAuth(authRequest("Bearer abc"));
  assert.equal(wrongScheme.status, 401);

  const malformed = requireAdminAuth(authRequest("Basic !!!!"));
  assert.equal(malformed.status, 401);

  const wrongPassword = requireAdminAuth(
    authRequest("Basic " + Buffer.from("admin:wrong").toString("base64"))
  );
  assert.equal(wrongPassword.status, 401);

  const wrongUser = requireAdminAuth(
    authRequest("Basic " + Buffer.from("root:secret123").toString("base64"))
  );
  assert.equal(wrongUser.status, 401);
});

test("admin auth allows valid credentials", () => {
  setAdminEnv("admin", "secret123");
  const allowed = requireAdminAuth(
    authRequest("Basic " + Buffer.from("admin:secret123").toString("base64"))
  );
  assert.equal(allowed, null);
});

// ===========================================================================
// Chat validation + session id helpers
// ===========================================================================
test("sanitizeSessionId accepts only bounded safe identifiers", () => {
  assert.equal(sanitizeSessionId(null), null);
  assert.equal(sanitizeSessionId(""), null);
  assert.equal(sanitizeSessionId("   "), null);
  assert.equal(sanitizeSessionId("bad id!"), null);
  assert.equal(sanitizeSessionId("a".repeat(129)), null);
  assert.equal(sanitizeSessionId("session_123_abc"), "session_123_abc");
  assert.equal(sanitizeSessionId("550e8400-e29b-41d4-a716-446655440000"), "550e8400-e29b-41d4-a716-446655440000");
});

test("validateChatMessages enforces roles, sizes and payload shape", () => {
  assert.equal(validateChatMessages([{ role: "user", content: "hai" }]).ok, true);
  assert.equal(validateChatMessages([]).ok, false);
  assert.equal(validateChatMessages("nope").ok, false);
  assert.equal(validateChatMessages([{ role: "system", content: "x" }]).ok, false);
  assert.equal(validateChatMessages([{ role: "user", content: 42 }]).ok, false);
  assert.equal(validateChatMessages([{ role: "user", content: "a".repeat(8001) }]).ok, false);
  assert.equal(validateChatMessages(Array.from({ length: 51 }, () => ({ role: "user", content: "x" }))).ok, false);
});

// ===========================================================================
// Chat orchestration (stubbed upstream, scratch DB)
// ===========================================================================
const okUpstream = async () => ({
  ok: true,
  status: 200,
  data: {
    choices: [{ message: { content: "Halo!" } }],
    usage: { prompt_tokens: 5, completion_tokens: 3, cost_usd: 0.001 },
    model: "m1",
    provider: "p1",
  },
});

const headersWithSession = (sessionId) => ({
  get: (name) => (name === SESSION_ID_HEADER ? sessionId : null),
});

test("chat keeps the supplied session id and logs the user message once", async () => {
  clearData();
  let clock = 1000;
  const now = () => clock;

  const first = await processChatTurn({
    headers: headersWithSession("chat-sess-1"),
    body: { messages: [{ role: "user", content: "hai" }] },
    apiKey: "test-key",
    upstream: okUpstream,
    now,
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.session_id, "chat-sess-1");

  clock = 1150;
  const advancingUpstream = async () => {
    clock += 150;
    return {
      ok: true,
      status: 200,
      data: {
        choices: [{ message: { content: "Halo!" } }],
        usage: { prompt_tokens: 5, completion_tokens: 3, cost_usd: 0.001 },
        model: "m1",
        provider: "p1",
      },
    };
  };
  const second = await processChatTurn({
    headers: headersWithSession("chat-sess-1"),
    body: {
      messages: [
        { role: "user", content: "hai" },
        { role: "assistant", content: "Halo!" },
        { role: "user", content: "lagi" },
      ],
    },
    apiKey: "test-key",
    upstream: advancingUpstream,
    now,
  });
  assert.equal(second.status, 200);
  assert.equal(second.body.session_id, "chat-sess-1");
  assert.equal(second.body.latency_ms, 150);

  const messages = db.getMessages("chat-sess-1");
  assert.equal(messages.length, 4);
  assert.equal(messages.filter((message) => message.role === "user").length, 2);
  assert.equal(messages.filter((message) => message.role === "user" && message.content === "hai").length, 1);
  assert.equal(messages.filter((message) => message.role === "assistant").length, 2);

  const assistantRows = messages.filter((message) => message.role === "assistant");
  assert.equal(assistantRows[0].latency_ms, 0);
  assert.equal(assistantRows[1].latency_ms, 150);
  assert.equal(assistantRows[1].status, 200);
  assert.equal(assistantRows[1].tokens_input, 5);
  assert.equal(assistantRows[1].tokens_output, 3);
  assert.equal(assistantRows[1].model, "m1");

  // Re-sending the same conversation (retry) must not duplicate the user row.
  await processChatTurn({
    headers: headersWithSession("chat-sess-1"),
    body: {
      messages: [
        { role: "user", content: "hai" },
        { role: "assistant", content: "Halo!" },
        { role: "user", content: "lagi" },
      ],
    },
    apiKey: "test-key",
    upstream: okUpstream,
    now,
  });
  assert.equal(db.getMessages("chat-sess-1").filter((message) => message.role === "user").length, 2);
});

test("chat generates a session id when none is supplied or the supplied one is invalid", async () => {
  clearData();

  const generated = await processChatTurn({
    headers: headersWithSession(null),
    body: { messages: [{ role: "user", content: "auto" }] },
    apiKey: "test-key",
    upstream: okUpstream,
    now: () => 0,
  });
  assert.ok(generated.body.session_id.startsWith("session_"));
  assert.ok(db.getSession(generated.body.session_id));

  const invalid = await processChatTurn({
    headers: headersWithSession("bad id!"),
    body: { messages: [{ role: "user", content: "invalid" }] },
    apiKey: "test-key",
    upstream: okUpstream,
    now: () => 0,
  });
  assert.ok(!invalid.body.session_id.includes("bad id"));
  assert.ok(invalid.body.session_id.startsWith("session_"));
});

test("upstream failure is reported and recorded, never silently succeeded", async () => {
  clearData();
  const failing = async () => ({ ok: false, status: 503, error: "upstream down" });

  const result = await processChatTurn({
    headers: headersWithSession("chat-fail"),
    body: { messages: [{ role: "user", content: "cek" }] },
    apiKey: "test-key",
    upstream: failing,
    now: () => 0,
  });

  assert.equal(result.status, 502);
  assert.equal(result.body.session_id, "chat-fail");
  assert.match(result.body.error, /upstream down/);

  const messages = db.getMessages("chat-fail");
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, "user");
  assert.equal(messages[1].role, "assistant");
  assert.equal(messages[1].content, "");
  assert.equal(messages[1].status, 503);
  assert.equal(messages[1].latency_ms, 0);
  assert.equal(messages[1].provider, "error");
});

test("invalid payloads are rejected before any session is created", async () => {
  clearData();
  const before = db.getSessionsCount();

  const badRole = await processChatTurn({
    headers: headersWithSession("nope"),
    body: { messages: [{ role: "system", content: "x" }] },
    apiKey: "test-key",
    upstream: okUpstream,
    now: () => 0,
  });
  assert.equal(badRole.status, 400);

  const tooLong = await processChatTurn({
    headers: headersWithSession("nope"),
    body: { messages: [{ role: "user", content: "a".repeat(9000) }] },
    apiKey: "test-key",
    upstream: okUpstream,
    now: () => 0,
  });
  assert.equal(tooLong.status, 400);

  assert.equal(db.getSessionsCount(), before);
});

test("missing API key returns 503 and creates no session", async () => {
  clearData();
  const result = await processChatTurn({
    headers: headersWithSession("nope"),
    body: { messages: [{ role: "user", content: "hai" }] },
    apiKey: undefined,
    upstream: okUpstream,
    now: () => 0,
  });
  assert.equal(result.status, 503);
  assert.equal(db.getSessionsCount(), 0);
});

// ===========================================================================
// Route wiring (file-based; no browser required)
// ===========================================================================
test("every admin API route is guarded by requireAdminAuth", () => {
  for (const route of ["ai-stats", "ai-logs", "ai-messages", "ai-export"]) {
    const source = read(`app/api/admin/${route}/route.ts`);
    assert.match(source, /requireAdminAuth/, `${route} must call requireAdminAuth`);
  }
});

test("admin routes clamp pagination and use the correct query contracts", () => {
  const stats = read("app/api/admin/ai-stats/route.ts");
  assert.match(stats, /db\.getStats/);

  const logs = read("app/api/admin/ai-logs/route.ts");
  assert.match(logs, /parsePagination/);
  assert.match(logs, /getSessionsFiltered/);
  assert.match(logs, /searchMessages/);

  const messages = read("app/api/admin/ai-messages/route.ts");
  assert.match(messages, /parsePagination/);
  assert.match(messages, /searchMessages/);
  assert.doesNotMatch(messages, /getSessionsFiltered/);
});

test("CSV export endpoint sets Content-Disposition and uses the CSV helper", () => {
  const source = read("app/api/admin/ai-export/route.ts");
  assert.match(source, /csvDocument/);
  assert.match(source, /Content-Disposition/);
  assert.match(source, /text\/csv/);
});

test("dashboard wires Messages/Export and renders no raw HTML", () => {
  const page = read("app/admin/ai-monitor/page.tsx");
  assert.match(page, /\/api\/admin\/ai-messages/);
  assert.match(page, /\/api\/admin\/ai-export/);
  assert.match(page, /\/api\/admin\/ai-logs\?session_id=/);
  assert.match(page, /measured_assistant_messages/);
  assert.match(page, /notEnoughData/);
  assert.doesNotMatch(page, /dangerouslySetInnerHTML/);
  assert.doesNotMatch(page, /98\.5|1234 ms/);
});

test("AI chat client persists and sends the session id header", () => {
  const chat = read("components/AIChat.tsx");
  assert.match(chat, /portfolio_ai_session_id/);
  assert.match(chat, /x-session-id/);
  assert.match(chat, /session_id/);

  const chatRoute = read("app/api/ai/chat/route.ts");
  assert.match(chatRoute, /processChatTurn/);
  assert.doesNotMatch(chatRoute, /ADMIN_USER|ADMIN_PASS/);
});

test("chat orchestration persists measured telemetry and reuses the session id", () => {
  const source = read("lib/ai-chat.ts");
  assert.match(source, /x-session-id/);
  assert.match(source, /latencyMs/);
  assert.match(source, /status/);
  assert.match(source, /logUserMessageOnce/);
});

after(() => {
  setAdminEnv(ORIGINAL_ADMIN_USER, ORIGINAL_ADMIN_PASS);
  try {
    db.close();
  } catch {
    // already closed
  }
  rmSync(scratchDir, { recursive: true, force: true });
});
