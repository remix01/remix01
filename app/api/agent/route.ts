import { NextResponse } from 'next/server'

/**
 * POST /api/agent
 * 
 * DEPRECATED: Use /api/agent/chat instead
 * 
 * This route is kept for backward compatibility but redirects to the new endpoint.
 * The chat UI (useAgentChat.ts) uses /api/agent/chat directly.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Use /api/agent/chat instead. This endpoint is deprecated.' },
    { status: 308, headers: { Location: '/api/agent/chat' } }
  )
}
