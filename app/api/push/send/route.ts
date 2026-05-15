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

    const pushDelivered = result.attempts.some((attempt) => attempt.channel === 'push' && attempt.success)

    return NextResponse.json({
      sent: pushDelivered ? 1 : 0,
      failed: pushDelivered ? 0 : 1,
      correlationId: result.correlationId,
      attempts: result.attempts,
      orchestratedSuccess: result.success,
    })
  } catch (error) {
    console.error('[v0] Error in push send:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
