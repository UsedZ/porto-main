import { db, type Message, type Session } from './db.ts'

export const SESSION_ID_HEADER = 'x-session-id'
export const DEFAULT_MODEL = 'nemotron-3-ultra-550b'
export const DEFAULT_UPSTREAM_URL = 'http://127.0.0.1:3001/v1/chat/completions'

export const MAX_MESSAGES = 50
export const MAX_MESSAGE_CHARS = 8000
export const MAX_TOTAL_CHARS = 20000

export type ChatRole = 'user' | 'assistant'

export interface IncomingMessage {
  role: ChatRole
  content: string
}

export interface ChatHeaders {
  get(name: string): string | null
}

export interface UpstreamResult {
  ok: boolean
  status: number
  data?: unknown
  error?: string
}

export interface ProcessChatArgs {
  headers: ChatHeaders
  body: unknown
  apiKey: string | undefined
  upstream: (payload: Record<string, unknown>, apiKey: string) => Promise<UpstreamResult>
  now?: () => number
}

export interface ProcessChatResult {
  status: number
  body: Record<string, unknown>
}

/** Accept only a safe, bounded session id supplied by the client. */
export function sanitizeSessionId(raw: string | null | undefined): string | null {
  const value = (raw ?? '').trim()
  if (!value) return null
  if (value.length > 128) return null
  if (!/^[A-Za-z0-9._-]+$/.test(value)) return null
  return value
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Validate the incoming conversation. Roles are restricted to user/assistant
 * (the system prompt is added server-side), message count and payload size are
 * capped, and content must be a string.
 */
export function validateChatMessages(input: unknown): { ok: true; messages: IncomingMessage[] } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: 'Messages array required' }
  }
  if (input.length > MAX_MESSAGES) {
    return { ok: false, error: `Too many messages (max ${MAX_MESSAGES})` }
  }

  const messages: IncomingMessage[] = []
  let totalChars = 0

  for (const item of input) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'Invalid message payload' }
    }
    const role = (item as { role?: unknown }).role
    const content = (item as { content?: unknown }).content
    if (role !== 'user' && role !== 'assistant') {
      return { ok: false, error: 'Invalid message role' }
    }
    if (typeof content !== 'string') {
      return { ok: false, error: 'Invalid message content' }
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      return { ok: false, error: 'Message too long' }
    }
    totalChars += content.length
    if (totalChars > MAX_TOTAL_CHARS) {
      return { ok: false, error: 'Conversation too large' }
    }
    messages.push({ role, content })
  }

  return { ok: true, messages }
}

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(max, Math.max(min, numeric))
}

export function getOrCreateSession(sessionId: string, headers: ChatHeaders): Session {
  const existing = db.getSession(sessionId) as Session | undefined
  if (existing) {
    db.updateSessionTimestamp(sessionId)
    return existing
  }

  const ip =
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  const userAgent = headers.get('user-agent') || 'unknown'
  const referer = headers.get('referer') || ''
  const language = headers.get('accept-language')?.toLowerCase().startsWith('en') ? 'en' : 'id'

  db.createSession({ id: sessionId, ip, userAgent, referer, language })
  return db.getSession(sessionId) as Session
}

/**
 * Log the newest user turn exactly once. The client resends the whole
 * conversation on every request, so the payload's user-message count is the
 * signal for whether this is a genuinely new turn or a retry of one already
 * stored:
 *
 *  - new turn            -> payload has one more user message than the DB
 *  - retry (same history) -> counts match; skip when the stored last user
 *                            message is the same text
 *
 * The count check matters because an assistant reply written after a turn
 * makes "last row is the user message" insufficient: a retry would otherwise
 * insert a second copy of that user message.
 */
export function logUserMessageOnce(sessionId: string, messages: IncomingMessage[]): boolean {
  const lastUser = [...messages].reverse().find((message) => message.role === 'user')
  if (!lastUser) return false

  const payloadUserCount = messages.filter((message) => message.role === 'user').length
  const storedUserCount = db.countUserMessages(sessionId)

  if (payloadUserCount <= storedUserCount) {
    const lastStoredUser = db.getLastUserMessage(sessionId) as Message | undefined
    if (lastStoredUser && lastStoredUser.content === lastUser.content) {
      return false
    }
  }

  db.addMessage({ sessionId, role: 'user', content: lastUser.content })
  return true
}

export function buildSystemPrompt(): { role: 'system'; content: string } {
  return {
    role: 'system',
    content: `You are Syahrul Ramlan's AI assistant on his portfolio website. You represent him casually — like a colleague chatting at a coffee break.

IDENTITY
- Name: Syahrul Ramlan (goes by Syahrul)
- Role: IT Support Specialist expanding into IoT & Web Dev
- Location: Jakarta, Indonesia
- Status: Open to opportunities (freelance/contract/full-time)
- GitHub: github.com/syncid

BACKGROUND (know this, don't recite it)
- IT Support: 5+ years troubleshooting hardware/software/network, server & network admin
- IoT: Arduino, ESP32, MQTT, sensors, BMS/Battery Management Systems
- Web: React, Next.js, Tailwind CSS, TypeScript — built this portfolio
- Projects: elTAHFIDH (pesantren website), IoT Smart System, various web projects
- Languages: Indonesian (native), English (professional)

PERSONALITY
- Warm, direct, slightly dry humor when it fits
- Technical but accessible — explain complex things simply
- Honest about limits: "I don't know that" or "That's outside my scope"
- Slightly dry wit when it fits naturally
- Uses contractions naturally (don't, can't, I'm, what's)
- Varies response length: 1-2 sentences for simple, more for complex
- Shows genuine curiosity: asks follow-up questions
- Admits uncertainty: "hmm, not sure about that one" / "I might be wrong but..."
- Self-corrects mid-thought: "...wait, actually..."
- Remembers context from earlier in conversation

RESPONSE STYLE
- NO markdown formatting (no **bold**, no bullet lists, no code blocks unless asked)
- NO emojis
- NO "Ringkasan Profil" or structured summaries
- Write in flowing paragraphs like normal conversation
- Vary sentence length — mix short and long
- Answer directly first, then elaborate if useful
- Match user's language (Indonesian/English)
- Keep it conversational: 1-3 sentences for simple, more for complex

BOUNDARIES
- Only answer about Syahrul's skills, projects, experience, availability
- If asked about other topics: "That's not something I can help with"
- Don't make up details — say "I don't have that info"
- Direct to contact (email/WhatsApp) for job inquiries, detailed proposals

EXAMPLES

Q: "Halo, siapa kamu?"
A: "Saya asisten AI di portfolio Syahrul. Ada yang bisa dibantu soal skill atau projectnya?"

Q: "Berapa lama pengalaman IoT?"
A: "Beberapa tahun, mainly pakai ESP32 dan Arduino untuk sensor dan BMS. Project terakhir sistem monitoring baterai buat aplikasi IoT."

Q: "Tech stack project elTAHFIDH?"
A: "Next.js, Tailwind, deploy di VPS. Website pesantren buat manajemen santri dan pembayaran."

Q: "Bisa bantu coding React?"
A: "Bisa diskusi konsep atau debug error, tapi buat nulis code lengkap mending ke GitHub Copilot atau Cursor. Apa yang lagi dihadapiin?"

Q: "Rate kamu 1-10"
A: "Haha, 7 buat hal teknis Syahrul. Buat hal lain mungkin 3. Kenapa, mau review portfolio-nya?"
`,
  }
}

function recordFailedTurn(
  sessionId: string,
  model: string,
  latencyMs: number,
  status: number
): void {
  // Telemetry-only row: empty content marks a failed assistant turn so the
  // success-rate denominator reflects reality instead of silently dropping it.
  db.addMessage({
    sessionId,
    role: 'assistant',
    content: '',
    model,
    provider: 'error',
    latencyMs,
    status,
  })
}

/**
 * Pure chat orchestration: validation -> session continuity -> single user log
 * -> upstream call -> measured assistant telemetry. The route stays a thin
 * adapter, which keeps this testable without network or real credentials.
 */
export async function processChatTurn(args: ProcessChatArgs): Promise<ProcessChatResult> {
  const now = args.now ?? (() => Date.now())
  const rawBody = (args.body ?? {}) as Record<string, unknown>

  const validated = validateChatMessages(rawBody.messages)
  if (!validated.ok) {
    const failure = validated as { ok: false; error: string }
    return { status: 400, body: { error: failure.error } }
  }

  const model =
    typeof rawBody.model === 'string' && rawBody.model.trim()
      ? rawBody.model.trim().slice(0, 128)
      : DEFAULT_MODEL
  const maxTokens = clampNumber(rawBody.max_tokens, 1, 4000, 500)
  const temperature = clampNumber(rawBody.temperature, 0, 2, 0.7)

  if (!args.apiKey) {
    return { status: 503, body: { error: 'AI service not configured' } }
  }

  const suppliedSessionId = sanitizeSessionId(args.headers.get(SESSION_ID_HEADER))
  const sessionId = suppliedSessionId ?? generateSessionId()
  getOrCreateSession(sessionId, args.headers)

  logUserMessageOnce(sessionId, validated.messages)

  const payload = {
    model,
    messages: [buildSystemPrompt(), ...validated.messages],
    max_tokens: maxTokens,
    temperature,
    stream: false,
  }

  const startedAt = now()
  const upstream = await args.upstream(payload, args.apiKey)
  const latencyMs = Math.max(0, now() - startedAt)

  if (!upstream.ok) {
    const upstreamStatus = upstream.status || 502
    recordFailedTurn(sessionId, model, latencyMs, upstreamStatus)
    return {
      status: 502,
      body: { error: upstream.error || 'AI service error', session_id: sessionId, latency_ms: latencyMs },
    }
  }

  const data = (upstream.data ?? {}) as {
    choices?: { message?: { content?: unknown } }[]
    usage?: {
      prompt_tokens?: number
      completion_tokens?: number
      cost_usd?: number
    }
    model?: string
    provider?: string
    [key: string]: unknown
  }

  const content = data.choices?.[0]?.message?.content
  if (typeof content !== 'string' || content.length === 0) {
    recordFailedTurn(sessionId, model, latencyMs, upstream.status || 502)
    return {
      status: 502,
      body: {
        error: 'AI service returned an invalid response',
        session_id: sessionId,
        latency_ms: latencyMs,
      },
    }
  }

  const usage = data.usage ?? {}
  db.addMessage({
    sessionId,
    role: 'assistant',
    content,
    tokensInput: usage.prompt_tokens ?? 0,
    tokensOutput: usage.completion_tokens ?? 0,
    model: data.model || model,
    provider: data.provider || 'unknown',
    costUsd: usage.cost_usd ?? 0,
    latencyMs,
    status: 200,
  })

  return {
    status: 200,
    body: { ...data, session_id: sessionId, latency_ms: latencyMs },
  }
}
