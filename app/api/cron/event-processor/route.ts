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

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedToken) {
    console.warn('[Cron] Unauthorized event processor call')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const start = Date.now()
  console.log(JSON.stringify({ level: 'info', message: '[event-processor] start', ranAt: new Date().toISOString() }))

  try {
    const result = await outbox.processPendingBatch(50)

    // Heartbeat is implicit in the HTTP response — health-sweep cron handles
    // dead-man alerting via checkEventLag() if outbox backlog accumulates.
    // Do NOT insert into alert_log here: that table is for real alerts only.

    const durationMs = Date.now() - start
    return NextResponse.json({ ok: true, processed: result.processed, failed: result.failed, durationMs })
  } catch (err) {
    const durationMs = Date.now() - start
    console.error(JSON.stringify({
      level: 'error',
      message: '[event-processor] error',
      error: String(err),
      errorName: err instanceof Error ? err.name : typeof err,
      stack: err instanceof Error ? err.stack : undefined,
      durationMs,
    }))
    return NextResponse.json({ error: 'Internal server error', detail: String(err) }, { status: 500 })
  }
}
