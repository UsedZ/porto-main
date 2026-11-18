import Database from 'better-sqlite3'
import { join } from 'path'
import { mkdirSync, existsSync } from 'fs'

const DATA_DIR = join(process.cwd(), 'data')
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true })
}

// Tests and multi-instance local runs can point this at a scratch database.
// Production/dev behaviour is unchanged: it defaults to data/conversations.db.
const DB_PATH = process.env.CONVERSATIONS_DB_PATH || join(DATA_DIR, 'conversations.db')

const dbInstance = new Database(DB_PATH)

// Enable WAL mode for better concurrency
dbInstance.pragma('journal_mode = WAL')
dbInstance.pragma('foreign_keys = ON')

// Initialize tables
dbInstance.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    ip TEXT,
    user_agent TEXT,
    referer TEXT,
    language TEXT DEFAULT 'id',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    model TEXT,
    provider TEXT,
    cost_usd REAL DEFAULT 0,
    latency_ms INTEGER,
    status INTEGER,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages (session_id);
  CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages (created_at);
  CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions (updated_at);
`)

// Migration-safe schema upgrades for databases created before telemetry
// columns existed. Existing rows keep NULL (never a fabricated measurement):
// latency_ms/status are only written for real upstream attempts.
//
// The check-then-ALTER sequence is racy when several workers import this
// module at once (Next.js build page-data collection, multi-instance local
// runs): worker A and worker B can both observe the column as missing and
// both issue ALTER. SQLite then reports "duplicate column name" for the
// loser. That error is benign, so it is swallowed; every other failure is
// rethrown so a genuinely broken database never fails open.
function addColumnIfMissing(table: string, column: string, ddl: string): void {
  const columns = (
    dbInstance.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
  ).map((existing) => existing.name)

  if (columns.includes(column)) return

  try {
    dbInstance.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (!/duplicate column name/i.test(message)) {
      throw error
    }
  }
}

addColumnIfMissing('messages', 'latency_ms', 'latency_ms INTEGER')
addColumnIfMissing('messages', 'status', 'status INTEGER')

// Prepared statements
const insertSession = dbInstance.prepare(`
  INSERT INTO sessions (id, ip, user_agent, referer, language, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)

const updateSession = dbInstance.prepare(`
  UPDATE sessions SET updated_at = ? WHERE id = ?
`)

const insertMessage = dbInstance.prepare(`
  INSERT INTO messages (session_id, role, content, tokens_input, tokens_output, model, provider, cost_usd, latency_ms, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

const getSession = dbInstance.prepare(`SELECT * FROM sessions WHERE id = ?`)
const getSessionCount = dbInstance.prepare(`SELECT COUNT(*) as count FROM sessions`)

const getMessages = dbInstance.prepare(`
  SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC, id ASC
`)

const getLastMessage = dbInstance.prepare(`
  SELECT * FROM messages WHERE session_id = ? ORDER BY created_at DESC, id DESC LIMIT 1
`)

const getLastUserMessage = dbInstance.prepare(`
  SELECT * FROM messages WHERE session_id = ? AND role = 'user'
  ORDER BY created_at DESC, id DESC LIMIT 1
`)

const countUserMessages = dbInstance.prepare(`
  SELECT COUNT(*) as count FROM messages WHERE session_id = ? AND role = 'user'
`)

const getStats = dbInstance.prepare(`
  SELECT
    (SELECT COUNT(*) FROM sessions) as total_sessions,
    (SELECT COUNT(*) FROM messages) as total_messages,
    (SELECT COUNT(DISTINCT ip) FROM sessions) as unique_visitors,
    (SELECT COALESCE(SUM(tokens_input + tokens_output), 0) FROM messages) as total_tokens,
    (SELECT COALESCE(SUM(tokens_input), 0) FROM messages) as tokens_input,
    (SELECT COALESCE(SUM(tokens_output), 0) FROM messages) as tokens_output,
    (SELECT COALESCE(SUM(cost_usd), 0) FROM messages) as total_cost,
    (SELECT COUNT(*) FROM sessions WHERE created_at > ?) as sessions_last_24h,
    (SELECT COUNT(*) FROM messages WHERE created_at > ?) as messages_last_24h,
    (SELECT COALESCE(AVG(latency_ms), 0) FROM messages WHERE role = 'assistant' AND latency_ms IS NOT NULL) as avg_latency_ms,
    (SELECT COUNT(*) FROM messages WHERE role = 'assistant' AND latency_ms IS NOT NULL) as measured_assistant_messages,
    (SELECT COUNT(*) FROM messages WHERE role = 'assistant' AND latency_ms IS NOT NULL AND status >= 200 AND status < 300) as successful_assistant_messages
`)

const getRecentSessions = dbInstance.prepare(`
  SELECT s.id, s.ip, s.language, s.created_at, s.updated_at,
         (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) as message_count,
         (SELECT m.content FROM messages m WHERE m.session_id = s.id
          ORDER BY m.created_at DESC, m.id DESC LIMIT 1) as last_message
  FROM sessions s
  ORDER BY s.updated_at DESC, s.id DESC
  LIMIT 20
`)

const deleteSession = dbInstance.prepare(`DELETE FROM sessions WHERE id = ?`)

// Escape LIKE wildcards so a search for "100%" does not behave like a wildcard.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`)
}

function buildSessionFilter(language?: string | null, search?: string | null) {
  const clauses: string[] = []
  const args: unknown[] = []

  const normalizedLanguage = language?.trim()
  if (normalizedLanguage && normalizedLanguage !== 'all') {
    clauses.push('s.language = ?')
    args.push(normalizedLanguage)
  }

  const normalizedSearch = search?.trim()
  if (normalizedSearch) {
    const like = `%${escapeLike(normalizedSearch)}%`
    clauses.push(
      `(s.id LIKE ? ESCAPE '\\' OR s.ip LIKE ? ESCAPE '\\' OR s.user_agent LIKE ? ESCAPE '\\' OR s.referer LIKE ? ESCAPE '\\' OR s.language LIKE ? ESCAPE '\\')`
    )
    args.push(like, like, like, like, like)
  }

  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args }
}

function buildMessageFilter(sessionId?: string | null, search?: string | null, language?: string | null) {
  const clauses: string[] = []
  const args: unknown[] = []

  const normalizedSessionId = sessionId?.trim()
  if (normalizedSessionId) {
    clauses.push('m.session_id = ?')
    args.push(normalizedSessionId)
  }

  const normalizedLanguage = language?.trim()
  if (normalizedLanguage && normalizedLanguage !== 'all') {
    clauses.push('s.language = ?')
    args.push(normalizedLanguage)
  }

  const normalizedSearch = search?.trim()
  if (normalizedSearch) {
    clauses.push(`m.content LIKE ? ESCAPE '\\'`)
    args.push(`%${escapeLike(normalizedSearch)}%`)
  }

  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', args }
}

export const PAGE_DEFAULTS = { limit: 50, maxLimit: 200, offset: 0 } as const

/**
 * Parse and clamp pagination params coming from a query string.
 * Invalid/empty values fall back to defaults; negatives and oversized
 * limits are clamped so a malformed request cannot scan the whole table.
 */
export function parsePagination(params: URLSearchParams): { limit: number; offset: number } {
  const limitRaw = params.get('limit')
  const offsetRaw = params.get('offset')

  let limit: number = PAGE_DEFAULTS.limit
  if (limitRaw !== null && limitRaw.trim() !== '') {
    const parsed = Number.parseInt(limitRaw, 10)
    limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, PAGE_DEFAULTS.maxLimit) : PAGE_DEFAULTS.limit
  }

  let offset: number = PAGE_DEFAULTS.offset
  if (offsetRaw !== null && offsetRaw.trim() !== '') {
    const parsed = Number.parseInt(offsetRaw, 10)
    offset = Number.isFinite(parsed) && parsed > 0 ? parsed : PAGE_DEFAULTS.offset
  }

  return { limit, offset }
}

export const db = {
  // Session operations
  createSession: (session: { id: string; ip: string; userAgent: string; referer: string; language: string }) => {
    const now = Date.now()
    insertSession.run(session.id, session.ip, session.userAgent, session.referer, session.language, now, now)
    return session
  },

  updateSessionTimestamp: (sessionId: string) => {
    updateSession.run(Date.now(), sessionId)
  },

  getSession: (sessionId: string) => getSession.get(sessionId),

  getSessionsCount: () => (getSessionCount.get() as { count: number } | undefined)?.count || 0,

  deleteSession: (sessionId: string) => deleteSession.run(sessionId),

  /**
   * Paginated session list with optional language + session-field search.
   * Uses scalar subqueries (no JOIN fan-out) so each session appears once.
   */
  getSessionsFiltered: (options: { language?: string | null; search?: string | null; limit: number; offset: number }) => {
    const { where, args } = buildSessionFilter(options.language, options.search)
    const sessions = dbInstance
      .prepare(
        `SELECT s.id, s.ip, s.user_agent, s.referer, s.language, s.created_at, s.updated_at,
                (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS message_count,
                (SELECT m.content FROM messages m WHERE m.session_id = s.id
                 ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message
         FROM sessions s
         ${where}
         ORDER BY s.updated_at DESC, s.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...args, options.limit, options.offset)
    const total = (
      dbInstance.prepare(`SELECT COUNT(*) AS count FROM sessions s ${where}`).get(...args) as
        | { count: number }
        | undefined
    )?.count || 0
    return { sessions, total }
  },

  // Message operations
  addMessage: (message: {
    sessionId: string
    role: 'user' | 'assistant'
    content: string
    tokensInput?: number
    tokensOutput?: number
    model?: string
    provider?: string
    costUsd?: number
    latencyMs?: number | null
    status?: number | null
  }) => {
    const now = Date.now()
    insertMessage.run(
      message.sessionId,
      message.role,
      message.content,
      message.tokensInput || 0,
      message.tokensOutput || 0,
      message.model || null,
      message.provider || null,
      message.costUsd || 0,
      message.latencyMs ?? null,
      message.status ?? null,
      now
    )
  },

  getMessages: (sessionId: string) => getMessages.all(sessionId),

  getLastMessage: (sessionId: string) => getLastMessage.get(sessionId),

  getLastUserMessage: (sessionId: string) => getLastUserMessage.get(sessionId),

  countUserMessages: (sessionId: string) =>
    (countUserMessages.get(sessionId) as { count: number } | undefined)?.count || 0,

  /**
   * Paginated message search. Without a session_id it searches across all
   * sessions; with one it scopes to that conversation. Search covers content.
   */
  searchMessages: (options: {
    sessionId?: string | null
    search?: string | null
    language?: string | null
    limit: number
    offset: number
  }) => {
    const { where, args } = buildMessageFilter(options.sessionId, options.search, options.language)
    const messages = dbInstance
      .prepare(
        `SELECT m.*, s.ip, s.language AS session_language
         FROM messages m
         JOIN sessions s ON m.session_id = s.id
         ${where}
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT ? OFFSET ?`
      )
      .all(...args, options.limit, options.offset)
    const total = (
      dbInstance.prepare(
        `SELECT COUNT(*) AS count FROM messages m JOIN sessions s ON m.session_id = s.id ${where}`
      ).get(...args) as { count: number } | undefined
    )?.count || 0
    return { messages, total }
  },

  // Stats & analytics
  getStats: () => {
    const now = Date.now()
    const dayAgo = now - 24 * 60 * 60 * 1000
    return getStats.get(dayAgo, dayAgo)
  },

  getRecentSessions: () => getRecentSessions.all(),

  // Close
  close: () => db.close(),
}

export type Session = {
  id: string
  ip: string
  user_agent: string
  referer: string
  language: string
  created_at: number
  updated_at: number
}

export type Message = {
  id: number
  session_id: string
  role: 'user' | 'assistant'
  content: string
  tokens_input: number
  tokens_output: number
  model: string | null
  provider: string | null
  cost_usd: number
  latency_ms: number | null
  status: number | null
  created_at: number
}
