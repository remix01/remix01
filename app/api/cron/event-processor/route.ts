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
import { createAdminClient } from '@/lib/supabase/server'

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

    const durationMs = Date.now() - start
    console.log(JSON.stringify({
      level: 'info',
      message: '[event-processor] completed',
      processed: result.processed,
      failed: result.failed,
      durationMs,
    }))

    if (result.failed > 0) {
      console.error(JSON.stringify({
        level: 'error',
        message: '[event-processor] batch had failures',
        failed: result.failed,
        processed: result.processed,
      }))
    }

    // Write heartbeat for dead-man check
    const supabase = createAdminClient()
    await supabase.from('alert_log').insert({
      alert_type: 'cron_dead',
      severity: 'warn',
      message: 'event-processor heartbeat',
      metadata: {
        type: 'heartbeat',
        processed: result.processed,
        failed: result.failed,
        ranAt: new Date().toISOString(),
      },
      resolved: true,
    })

    return NextResponse.json({ ok: true, processed: result.processed, failed: result.failed, durationMs })
  } catch (err) {
    const durationMs = Date.now() - start
    console.error(JSON.stringify({ level: 'error', message: '[event-processor] error', error: String(err), durationMs }))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
