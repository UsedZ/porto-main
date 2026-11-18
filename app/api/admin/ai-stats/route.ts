import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdminAuth } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const auth = requireAdminAuth(req)
  if (auth) {
    return NextResponse.json(auth.body, { status: auth.status, headers: auth.headers })
  }

  try {
    const stats = db.getStats()
    const recentSessions = db.getRecentSessions()

    return NextResponse.json({
      stats,
      recent_sessions: recentSessions,
    })
  } catch (error) {
    console.error('Admin AI stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
