import { NextRequest, NextResponse } from 'next/server'
import { db, parsePagination } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-auth'

/**
 * Message search endpoint backing the dashboard Messages tab.
 * `session_id` is optional: omit it to search message content across all
 * sessions, include it to scope to a single conversation.
 */
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

    const { messages, total } = db.searchMessages({ sessionId, search, language, limit, offset })

    return NextResponse.json({
      messages,
      total,
      page: Math.floor(offset / limit) + 1,
      pageSize: limit,
    })
  } catch (error) {
    console.error('Admin AI messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
