import { NextRequest, NextResponse } from 'next/server'
import { DEFAULT_UPSTREAM_URL, processChatTurn } from '@/lib/ai-chat'

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const result = await processChatTurn({
      headers: req.headers,
      body,
      apiKey: process.env.FREELLMAPI_API_KEY,
      upstream: async (payload, apiKey) => {
        const upstreamUrl = process.env.AI_CHAT_UPSTREAM_URL || DEFAULT_UPSTREAM_URL
        const res = await fetch(upstreamUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        })

        if (!res.ok) {
          console.error('Freellmapi error:', res.status)
          return { ok: false, status: res.status, error: 'AI service error' }
        }

        const text = await res.text()
        try {
          return { ok: true, status: res.status, data: JSON.parse(text) }
        } catch {
          console.error('Freellmapi returned a non-JSON response')
          return { ok: false, status: 502, error: 'AI service returned an invalid response' }
        }
      },
    })

    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('AI chat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
