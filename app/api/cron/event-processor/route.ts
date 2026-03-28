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
import { initEventSubscribers } from '@/lib/events'

/** Maximum time we'll wait for processPendingBatch before giving up. */
const BATCH_TIMEOUT_MS = 9_000

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedToken) {
    console.warn('[Cron] Unauthorized event processor call')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  console.log(JSON.stringify({ level: 'info', message: '[event-processor] start', ranAt: new Date().toISOString() }))

  try {
    // Register subscribers in this serverless context — cron invocations are
    // isolated and don't go through layout.tsx where they're normally set up.
    // Safe to call multiple times; idempotency guard is inside.
    initEventSubscribers()

    // Race the batch against a hard timeout so we always reach the catch
    // block if something hangs — instead of being killed silently by Vercel.
    const result = await Promise.race([
      outbox.processPendingBatch(50),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`processPendingBatch timed out after ${BATCH_TIMEOUT_MS}ms`)),
          BATCH_TIMEOUT_MS
        )
      ),
    ])

    const durationMs = Date.now() - start
    console.log(JSON.stringify({
      level: 'info',
      message: '[event-processor] completed',
      processed: result.processed,
      failed: result.failed,
      durationMs,
    }))

    return NextResponse.json({ ok: true, processed: result.processed, failed: result.failed, durationMs })
  } catch (err) {
    const durationMs = Date.now() - start
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(JSON.stringify({
      level: 'error',
      message: '[event-processor] error',
      error: errorMsg,
      durationMs,
    }))
    return NextResponse.json({ error: 'Internal server error', details: errorMsg }, { status: 500 })
  }
}
