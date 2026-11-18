import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-auth'
import { csvDocument } from '@/lib/csv'

const MAX_EXPORT_ROWS = 10000

export async function GET(req: NextRequest) {
  const auth = requireAdminAuth(req)
  if (auth) {
    return NextResponse.json(auth.body, { status: auth.status, headers: auth.headers })
  }

  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') === 'sessions' ? 'sessions' : 'messages'
    const sessionId = searchParams.get('session_id')
    const search = searchParams.get('search')
    const language = searchParams.get('language')

    const parsedLimit = Number.parseInt(searchParams.get('limit') || String(MAX_EXPORT_ROWS), 10)
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, MAX_EXPORT_ROWS)
        : MAX_EXPORT_ROWS

    const now = new Date()
    const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`
    const commonHeaders = {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'no-store',
    }

    if (type === 'sessions') {
      const { sessions } = db.getSessionsFiltered({ language, search, limit, offset: 0 })
      const csv = csvDocument(
        ['session_id', 'ip', 'language', 'message_count', 'created_at', 'updated_at'],
        (sessions as Record<string, unknown>[]).map((session) => [
          session.id,
          session.ip,
          session.language,
          session.message_count,
          new Date(Number(session.created_at)).toISOString(),
          new Date(Number(session.updated_at)).toISOString(),
        ])
      )
      return new NextResponse(csv, {
        status: 200,
        headers: {
          ...commonHeaders,
          'Content-Disposition': `attachment; filename="ai-sessions-${stamp}.csv"`,
        },
      })
    }

    const { messages } = db.searchMessages({ sessionId, search, language, limit, offset: 0 })
    const csv = csvDocument(
      [
        'session_id',
        'role',
        'content',
        'tokens_input',
        'tokens_output',
        'model',
        'provider',
        'cost_usd',
        'latency_ms',
        'status',
        'created_at',
      ],
      (messages as Record<string, unknown>[]).map((message) => [
        message.session_id,
        message.role,
        message.content,
        message.tokens_input,
        message.tokens_output,
        message.model,
        message.provider,
        message.cost_usd,
        message.latency_ms,
        message.status,
        new Date(Number(message.created_at)).toISOString(),
      ])
    )
    return new NextResponse(csv, {
      status: 200,
      headers: {
        ...commonHeaders,
        'Content-Disposition': `attachment; filename="ai-messages-${stamp}.csv"`,
      },
    })
  } catch (error) {
    console.error('Admin AI export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
