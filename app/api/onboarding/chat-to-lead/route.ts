/**
 * POST /api/onboarding/chat-to-lead
 *
 * Receives chatbot conversation, extracts lead data, saves draft, and
 * optionally sends follow-up email.
 *
 * Body:
 *   sessionId    string
 *   messages     { role: 'user'|'assistant'; content: string }[]
 *   meta?        { utmSource, utmMedium, utmCampaign }
 *
 * Response:
 *   lead         LeadData
 *   draftId?     string
 *   matchFound   boolean
 *   followUpSent boolean
 */

import { NextRequest, NextResponse } from 'next/server'
import { qualifyVisitor } from '@/lib/agents/demand/chat-to-lead'

export const maxDuration = 30

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json()
    const { sessionId, messages, meta = {} } = body

    if (!sessionId || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'sessionId and messages are required' },
        { status: 400 },
      )
    }

    // Enrich geo from Vercel/Cloudflare headers
    const enrichedMeta = {
      ...meta,
      countryCode: (req.headers.get('x-vercel-ip-country') ?? meta.countryCode ?? 'SI').toUpperCase(),
      ipCity:      req.headers.get('x-vercel-ip-city') ?? meta.ipCity ?? null,
    }

    const result = await qualifyVisitor(sessionId, messages, enrichedMeta)

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[ChatToLead API]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
