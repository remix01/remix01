/**
 * Cron Worker — Event Processor
 *
 * Runs every 5 minutes to process pending events from outbox.
 * Triggered by Vercel Cron (configured in vercel.json).
 *
 * Protected by CRON_SECRET to prevent unauthorized invocations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { outbox } from '@/lib/events/outbox'

// Guard against duplicate subscriber registration across warm serverless instances
let subscribersInitialized = false

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  const expectedToken = `Bearer ${cronSecret}`

  // Only enforce auth if CRON_SECRET is configured
  if (cronSecret && authHeader !== expectedToken) {
    console.warn('[Cron] Unauthorized event processor call')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const start = Date.now()
  console.log(JSON.stringify({ level: 'info', message: '[event-processor] start', ranAt: new Date().toISOString() }))

  // Initialize event subscribers once per serverless instance so that
  // dispatched events actually trigger notifications, analytics, etc.
  if (!subscribersInitialized) {
    try {
      const { initEventSubscribers } = await import('@/lib/events')
      initEventSubscribers()
      subscribersInitialized = true
      console.log('[event-processor] subscribers initialized')
    } catch (initErr) {
      // Non-fatal: events will still be marked done, just without handlers
      console.error('[event-processor] failed to initialize subscribers:', String(initErr))
    }
  }

  try {
    const result = await outbox.processPendingBatch(50)

    // Heartbeat is implicit in the HTTP response — health-sweep cron handles
    // dead-man alerting via checkEventLag() if outbox backlog accumulates.
    // Do NOT insert into alert_log here: that table is for real alerts only.

    const durationMs = Date.now() - start
    console.log(JSON.stringify({ level: 'info', message: '[event-processor] done', ...result, durationMs }))
    return NextResponse.json({ ok: true, processed: result.processed, failed: result.failed, durationMs })
  } catch (err) {
    const durationMs = Date.now() - start
    const errMsg = err instanceof Error ? err.message : String(err)
    const errStack = err instanceof Error ? err.stack : undefined
    console.error(JSON.stringify({ level: 'error', message: '[event-processor] fatal error', error: errMsg, stack: errStack, durationMs }))
    return NextResponse.json({ error: 'Internal server error', detail: errMsg }, { status: 500 })
  }
}
