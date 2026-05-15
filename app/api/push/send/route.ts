import { NextRequest, NextResponse } from 'next/server'
import { sendOrchestratedNotification } from '@/lib/notifications/orchestration-service'

export async function POST(request: NextRequest) {
  try {
    const { userId, title, message, link, icon } = await request.json()

    if (!userId || !title || !message) {
      return NextResponse.json({ error: 'userId, title, and message required' }, { status: 400 })
    }

    const result = await sendOrchestratedNotification({
      userId,
      type: 'SYSTEM',
      title,
      body: message,
      data: { link, icon },
      preferredChannels: ['push', 'in_app'],
      fallbackChannels: ['in_app'],
    })

    return NextResponse.json({
      sent: result.success ? 1 : 0,
      failed: result.success ? 0 : 1,
      correlationId: result.correlationId,
      attempts: result.attempts,
    })
  } catch (error) {
    console.error('[v0] Error in push send:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
