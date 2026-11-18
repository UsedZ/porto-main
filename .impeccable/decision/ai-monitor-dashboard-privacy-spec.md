# AI Monitor Dashboard — Final Architecture & Privacy Spec

**Status:** READ-ONLY handoff for implementation  
**Workspace:** `/home/sync-id/Documents/BackUP_Migrasi/porto-local/porto-main` (local-only, no commit/push/deploy)  
**Author:** architect (Nemotron 3 Ultra)  
**Date:** 2026-11-17

---

## 1. Scope & Constraints

| Item | Decision |
|------|----------|
| **Target** | `/app/admin/ai-monitor/page.tsx` + 3 API routes under `/app/api/admin/*` + `/app/api/ai/chat` + `/lib/db.ts` + `components/AIChat.tsx` |
| **Mode** | Local development only — no git commit, no deploy, no secrets exposure |
| **Privacy** | Zero default credentials; fail-closed admin auth; IP/chat retention policy explicit; no PII in logs beyond what's necessary |
| **Testing** | Manual acceptance commands only (no test suite exists) |

---

## 2. Baseline Findings (Verified by Code Inspection)

| # | Finding | Location | Severity |
|---|---------|----------|----------|
| 1 | **No auth on `/api/admin/ai-stats` and `/api/admin/ai-logs`** | `app/api/admin/ai-stats/route.ts:4`, `app/api/admin/ai-logs/route.ts:4` | Critical |
| 2 | **AI chat creates new session when `x-session-id` header absent** | `app/api/ai/chat/route.ts:13` | High |
| 3 | **AIChat component never sends `x-session-id` header** | `components/AIChat.tsx:156-159` | High |
| 4 | **Session list API ignores `language` filter param** | `app/api/admin/ai-logs/route.ts:22` vs `lib/db.ts:65-72` | Medium |
| 5 | **Messages tab empty — `messages` state never populated** | `app/admin/ai-monitor/page.tsx:465, 846-855` | High |
| 6 | **CSV export dumps sessions, not messages** | `app/admin/ai-monitor/page.tsx:564-586` | Medium |
| 7 | **Latency/Success Rate hardcoded in Analytics** | `app/admin/ai-monitor/page.tsx:404-412` | Medium |
| 8 | **Search/pagination mismatch: frontend searches sessions, backend searches messages** | `app/admin/ai-monitor/page.tsx:502` vs `app/api/admin/ai-logs/route.ts:17-19` | Medium |
| 9 | **No rate limiting or abuse protection on chat endpoint** | `app/api/ai/chat/route.ts` | Medium |
| 10 | **IP stored in plaintext; no retention/auto-purge policy** | `lib/db.ts:22, 118-121` | Privacy |

---

## 3. Required Contracts

### 3.1 Admin Authentication (Fail-Closed)

**Mechanism:** HTTP Basic Auth via `Authorization` header (simplest zero-dependency option for local-only).  
**Credential source:** Environment variables only — `ADMIN_USER`, `ADMIN_PASS` (both **required**, no defaults).  
**Behavior:**  
- Missing env vars → **all admin routes return 503 Service Unavailable** (fail-closed).  
- Invalid/missing credentials → `401 Unauthorized` with `WWW-Authenticate: Basic realm="Admin"`.  
- No session cookies, no JWT, no fallback.

**Middleware location:** `lib/admin-auth.ts` (new) — reusable wrapper for all `/api/admin/*` routes.

```ts
// lib/admin-auth.ts (spec)
export function requireAdminAuth(req: NextRequest): NextResponse | null {
  const user = process.env.ADMIN_USER
  const pass = process.env.ADMIN_PASS
  if (!user || !pass) {
    return NextResponse.json(
      { error: 'Admin auth not configured' },
      { status: 503 }
    )
  }
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Basic ')) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="Admin"' } }
    )
  }
  const [u, p] = Buffer.from(auth.slice(6), 'base64').toString().split(':')
  if (u !== user || p !== pass) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  return null // auth OK
}
```

### 3.2 Session Identity Propagation

**Header:** `x-session-id` (client → server) — opaque string, UUID v4 preferred.  
**Flow:**
1. **AIChat** generates/retrieves `sessionId` from `localStorage` on mount.
2. **Every** `/api/ai/chat` request includes `x-session-id: <sessionId>`.
3. **Server** uses provided ID if session exists; otherwise creates new session **with same ID** (no silent regeneration).
4. **Response** echoes `session_id` for client confirmation.

**Client storage key:** `portfolio_ai_session_id` (separate from message history).

### 3.3 Session Filtering & Pagination Contract

**GET `/api/admin/ai-logs`** query params:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 50 | Page size (max 200) |
| `offset` | int | 0 | Pagination offset |
| `language` | `id\|en\|all` | `all` | Filter sessions by language |
| `search` | string | — | **Search session IP/user-agent/ID** (not message content) |
| `session_id` | string | — | If present, return messages for that session (existing behavior) |

**Response (sessions list):**
```json
{ "sessions": Session[], "total": number, "page": number, "pageSize": number }
```

**Response (messages for session):**
```json
{ "messages": Message[], "total": number }
```

### 3.4 Message Search & Pagination Contract

**New endpoint:** `GET /api/admin/ai-messages` (separate from session listing).  
**Query params:**
| Param | Type | Default |
|-------|------|---------|
| `session_id` | string | required |
| `limit` | int | 50 (max 200) |
| `offset` | int | 0 |
| `search` | string | — (searches message content) |

**Response:**
```json
{ "messages": Message[], "total": number }
```

### 3.5 CSV Export Contract

**Endpoint:** `GET /api/admin/ai-export?type=messages&session_id=<optional>&limit=10000`  
**Output columns (messages):**
```
session_id, role, content, tokens_input, tokens_output, model, provider, cost_usd, created_at
```
**Output columns (sessions):**
```
session_id, ip, language, message_count, created_at, updated_at
```
**Behavior:** `type=messages` (default) exports messages; `type=sessions` exports sessions. Both respect `session_id` filter if provided.

### 3.6 Measured Metrics (Replace Hardcoded)

| Metric | Source | Computation |
|--------|--------|-------------|
| **Avg Response Time** | `messages.latency_ms` (new column) | `AVG(latency_ms) WHERE role='assistant'` |
| **Success Rate** | HTTP status + error flag | `COUNT(WHERE status=200) / COUNT(*)` per session |
| **Tokens In/Out** | `tokens_input`, `tokens_output` | Already stored — aggregate correctly |
| **Cost/Session, Cost/Message** | `cost_usd` | Already stored — compute from real data |

**DB change:** Add `latency_ms INTEGER DEFAULT 0` and `status INTEGER DEFAULT 200` to `messages` table (migration required).

---

## 4. Privacy & Retention Risks

| Risk | Current State | Mitigation (Spec) |
|------|---------------|-------------------|
| **IP exposure** | Plaintext in `sessions.ip` | Hash IP with salt (`SHA256(ip + salt)`) for display; store salt in env. Raw IP only in DB for abuse correlation (max 30 days). |
| **Chat content retention** | Forever (no purge) | **TTL: 90 days** for messages; **TTL: 30 days** for raw IP. Implement `purge_expired()` cron (daily). |
| **No consent notice** | None | Add banner in AIChat: "Conversations logged for quality improvement. No personal data sold." Link to privacy page. |
| **Admin access control** | None | Fail-closed Basic Auth (see §3.1). Audit log every admin access (timestamp, action, session_id). |
| **Export leakage** | CSV includes IP | Export **hashes** by default; raw IP only with explicit `--include-pii` flag (not in UI). |
| **Third-party API key** | `FREELLMAPI_API_KEY` in env | OK (server-side only). Ensure not logged. |

**Retention policy summary:**
- Messages: 90 days rolling
- Session metadata (hashed IP, language, counts): 180 days
- Raw IP (for abuse): 30 days → auto-purge
- Admin audit log: 1 year

---

## 5. Files to Touch (Minimum Patch Set)

| File | Changes | Priority |
|------|---------|----------|
| `lib/admin-auth.ts` | **New** — fail-closed Basic Auth wrapper | P0 |
| `app/api/admin/ai-stats/route.ts` | Wrap with `requireAdminAuth` | P0 |
| `app/api/admin/ai-logs/route.ts` | Wrap auth; add `language` filter; fix search to search sessions; add pagination metadata | P0 |
| `app/api/admin/ai-messages/route.ts` | **New** — message search + pagination for Messages tab | P0 |
| `app/api/admin/ai-export/route.ts` | **New** — typed CSV export (messages/sessions) | P1 |
| `app/api/ai/chat/route.ts` | Use provided `x-session-id` without regeneration; store `latency_ms`, `status` on message; return `session_id` | P0 |
| `lib/db.ts` | Add `latency_ms`, `status` columns (migration); add `getSessionsFiltered`, `searchSessions`, `getMessagesPaginatedBySession`, `purgeExpired`, `hashIp`; language filter in `getSessions` | P0 |
| `components/AIChat.tsx` | Persist `sessionId` in `localStorage`; send `x-session-id` header on every request; handle echoed `session_id` | P0 |
| `app/admin/ai-monitor/page.tsx` | Wire Messages tab to `/api/admin/ai-messages`; fix export button to call `/api/admin/ai-export`; replace hardcoded metrics with computed values; fix search to use session search; pagination wiring | P0 |
| `translations/index.js` | Add `admin.ai_monitor` keys for new UI strings (export type, purge notice, etc.) | P1 |

---

## 6. Patch Order (Dependency Sequence)

1. **`lib/db.ts`** — schema migration + new queries (foundation for all API changes)
2. **`lib/admin-auth.ts`** — auth primitive
3. **`app/api/admin/ai-stats/route.ts`** — add auth
4. **`app/api/admin/ai-logs/route.ts`** — add auth, language filter, session search, pagination metadata
5. **`app/api/admin/ai-messages/route.ts`** — new endpoint for Messages tab
6. **`app/api/admin/ai-export/route.ts`** — new export endpoint
7. **`app/api/ai/chat/route.ts`** — session ID propagation, latency/status logging
8. **`components/AIChat.tsx`** — client-side session ID persistence + header
9. **`app/admin/ai-monitor/page.tsx`** — UI wiring (Messages tab, export, metrics, search, pagination)
10. **`translations/index.js`** — i18n strings

---

## 7. Acceptance Commands (Manual Verification)

Run each after dev server starts (`npm run dev`):

```bash
# 1. Admin auth fail-closed (no env vars set)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/ai-stats
# → 503

# 2. Admin auth with valid credentials
export ADMIN_USER=admin ADMIN_PASS=secret123
curl -s -u admin:secret123 http://localhost:3000/api/admin/ai-stats | jq '.stats.total_sessions'
# → integer >= 0

# 3. Admin auth rejected on bad credentials
curl -s -o /dev/null -w "%{http_code}" -u admin:wrong http://localhost:3000/api/admin/ai-stats
# → 401

# 4. Session persistence across chat messages
SESSION_ID=$(curl -s -u admin:secret123 -H "x-session-id: test-session-123" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}]}' \
  http://localhost:3000/api/ai/chat | jq -r .session_id)
echo $SESSION_ID
# → test-session-123 (echoed back, not regenerated)

# 5. Language filter on sessions list
curl -s -u admin:secret123 "http://localhost:3000/api/admin/ai-logs?language=en&limit=5" | jq '.sessions[].language | unique'
# → ["en"] only

# 6. Session search (by IP/ID/user-agent)
curl -s -u admin:secret123 "http://localhost:3000/api/admin/ai-logs?search=test-session" | jq '.total'
# → count matching sessions

# 7. Messages tab endpoint
curl -s -u admin:secret123 "http://localhost:3000/api/admin/ai-messages?session_id=$SESSION_ID&limit=10" | jq '.messages | length'
# → >= 0

# 8. CSV export (messages)
curl -s -u admin:secret123 "http://localhost:3000/api/admin/ai-export?type=messages&limit=100" | head -3
# → header row + data rows with session_id,role,content,tokens_input,...

# 9. CSV export (sessions)
curl -s -u admin:secret123 "http://localhost:3000/api/admin/ai-export?type=sessions&limit=100" | head -3
# → header row + data rows with session_id,ip,language,message_count,...

# 10. Dashboard metrics are computed (not hardcoded)
# Open http://localhost:3000/admin/ai-monitor → Analytics tab
# "Avg Response Time" shows numeric ms (e.g. "1,234 ms")
# "Success Rate" shows percentage (e.g. "98.5%")

# 11. AIChat sends x-session-id header (inspect Network tab in browser DevTools)
# → every POST /api/ai/chat includes x-session-id: <uuid>

# 12. Purge job dry-run
# (Add script later) node -e "require('./lib/db').purgeExpired(90)" # messages older than 90 days
```

---

## 8. Out of Scope / Explicit Exclusions

- **No OAuth, no 2FA, no RBAC** — Basic Auth is intentional for local-only.
- **No real-time/WebSocket updates** — polling/refresh button sufficient.
- **No message content encryption** — local SQLite only;-at-rest encryption not required.
- **No automated test suite** — acceptance commands are the contract.
- **No deployment/config management** — `.env.local` only.
- **No frontend auth UI** — browser Basic Auth dialog is acceptable.

---

## 9. Handoff Metadata

```json
{
  "changed_files": [
    "lib/db.ts",
    "lib/admin-auth.ts",
    "app/api/admin/ai-stats/route.ts",
    "app/api/admin/ai-logs/route.ts",
    "app/api/admin/ai-messages/route.ts",
    "app/api/admin/ai-export/route.ts",
    "app/api/ai/chat/route.ts",
    "components/AIChat.tsx",
    "app/admin/ai-monitor/page.tsx",
    "translations/index.js"
  ],
  "new_files": [
    "lib/admin-auth.ts",
    "app/api/admin/ai-messages/route.ts",
    "app/api/admin/ai-export/route.ts"
  ],
  "db_migration": "ALTER TABLE messages ADD COLUMN latency_ms INTEGER DEFAULT 0; ALTER TABLE messages ADD COLUMN status INTEGER DEFAULT 200;",
  "env_vars_required": ["ADMIN_USER", "ADMIN_PASS", "FREELLMAPI_API_KEY", "IP_HASH_SALT"],
  "privacy_review_needed": true,
  "acceptance_commands": 12
}
```

---

**End of spec.** Implementation can proceed in the order defined in §6. Each patch should be verified against the acceptance commands in §7 before moving to the next.