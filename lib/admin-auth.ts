import { createHash, timingSafeEqual } from 'crypto'

export interface AdminAuthRequest {
  headers: {
    get(name: string): string | null
  }
}

export interface AdminAuthDenial {
  status: 503 | 401
  body: { error: string }
  headers?: Record<string, string>
}

/** Length-independent comparison so credential checks do not leak timing. */
function safeEqual(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest()
  const right = createHash('sha256').update(b).digest()
  return timingSafeEqual(left, right)
}

/**
 * Fail-closed admin gate for every /api/admin/* route.
 *
 * - ADMIN_USER / ADMIN_PASS unset (or empty) -> 503, regardless of headers.
 * - No/invalid Basic credentials           -> 401 (+ WWW-Authenticate).
 * - Valid credentials                      -> null (request may proceed).
 *
 * There are deliberately no default credentials and no bypass.
 */
export function requireAdminAuth(req: AdminAuthRequest): AdminAuthDenial | null {
  const expectedUser = process.env.ADMIN_USER
  const expectedPass = process.env.ADMIN_PASS

  if (!expectedUser || !expectedPass) {
    return { status: 503, body: { error: 'Admin auth not configured' } }
  }

  const authorization = req.headers.get('authorization')
  if (!authorization || !authorization.startsWith('Basic ')) {
    return {
      status: 401,
      body: { error: 'Authentication required' },
      headers: { 'WWW-Authenticate': 'Basic realm="Admin"' },
    }
  }

  let decoded = ''
  try {
    decoded = Buffer.from(authorization.slice('Basic '.length).trim(), 'base64').toString('utf8')
  } catch {
    decoded = ''
  }

  const separator = decoded.indexOf(':')
  const suppliedUser = separator >= 0 ? decoded.slice(0, separator) : ''
  const suppliedPass = separator >= 0 ? decoded.slice(separator + 1) : ''

  if (!safeEqual(suppliedUser, expectedUser) || !safeEqual(suppliedPass, expectedPass)) {
    return { status: 401, body: { error: 'Invalid credentials' } }
  }

  return null
}
