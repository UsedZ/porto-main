import { NextRequest, NextResponse } from 'next/server'
import { db, parsePagination } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = requireAdminAuth(req)
  if (auth) {
    return NextResponse.json(auth.body, { status: auth.status, headers: auth.headers })
  }

  try {
    const { searchParams } = new URL(req.url)
    const { limit, offset } = parsePagination(searchParams)
    const sessionId = searchParams.get('session_id')
    const search = searchParams.get('search')
    const language = searchParams.get('language')
    const page = Math.floor(offset / limit) + 1

    // Session-scoped message view (session detail modal).
    if (sessionId) {
      const { messages, total } = db.searchMessages({ sessionId, search, limit, offset })
      return NextResponse.json({ messages, total, page, pageSize: limit })
    }

    // Session listing: search covers session fields, never message content.
    const { sessions, total } = db.getSessionsFiltered({ language, search, limit, offset })
    return NextResponse.json({ sessions, total, page, pageSize: limit })
  } catch (error) {
    console.error('Admin AI logs error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
