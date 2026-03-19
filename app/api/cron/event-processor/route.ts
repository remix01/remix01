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

  try {
    const result = await outbox.processPendingBatch(50)

    // Heartbeat is implicit in the HTTP response — health-sweep cron handles
    // dead-man alerting via checkEventLag() if outbox backlog accumulates.
    // Do NOT insert into alert_log here: that table is for real alerts only.

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      failed: result.failed,
    })
  } catch (err) {
    console.error('[Cron] Event processor error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
