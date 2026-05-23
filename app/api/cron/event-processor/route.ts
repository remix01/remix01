/**
 * Cron Worker – Event Processor
 *
 * Processes pending events from the outbox (fallback poller).
 * Triggered by Vercel Cron (configured in vercel.json).
 * Protected by CRON_SECRET + overlap lock via withCronGuard.
 */

import { NextResponse } from 'next/server'
import { withCronGuard } from '@/lib/cron/cronGuard'

  // Configurable batch size — override via OUTBOX_BATCH_SIZE env var.
  // Default 50; set lower in staging or if subscribers are slow.
  const rawBatchSize = Number(process.env.OUTBOX_BATCH_SIZE)
  const batchSize = Math.min(
    Math.max(1, Number.isFinite(rawBatchSize) && rawBatchSize > 0 ? Math.floor(rawBatchSize) : 50),
    200 // hard ceiling to prevent accidental overload
  )

  // Dry-run: ?dry_run=1 reports pending count without processing.
  const dryRun = req.nextUrl.searchParams.get('dry_run') === '1'

  const start = Date.now()
  console.log(JSON.stringify({
    level: 'info',
    message: '[event-processor] start',
    ranAt: new Date().toISOString(),
    batchSize,
    dryRun,
  }))

  try {
    // STEP 1: Import and initialize event subscribers
    console.log(JSON.stringify({ 
      level: 'info', 
      message: '[event-processor] importing subscribers' 
    }))
    
    let initEventSubscribers: () => void
    try {
      const subscribers = await import('@/lib/events')
      initEventSubscribers = subscribers.initEventSubscribers
      console.log(JSON.stringify({ 
        level: 'info', 
        message: '[event-processor] subscribers imported successfully' 
      }))
    } catch (importErr) {
      console.error(JSON.stringify({ 
        level: 'error', 
        message: '[event-processor] failed to import subscribers', 
        error: String(importErr),
        stack: importErr instanceof Error ? importErr.stack : undefined
      }))
      throw new Error(`Failed to import subscribers: ${importErr}`)
    }

    // Initialize subscribers for this serverless execution context
    try {
      initEventSubscribers()
      console.log(JSON.stringify({ 
        level: 'info', 
        message: '[event-processor] subscribers initialized' 
      }))
    } catch (initErr) {
      console.error(JSON.stringify({ 
        level: 'error', 
        message: '[event-processor] failed to initialize subscribers', 
        error: String(initErr),
        stack: initErr instanceof Error ? initErr.stack : undefined
      }))
      throw new Error(`Failed to initialize subscribers: ${initErr}`)
    }

    // STEP 2: Import outbox processor
    console.log(JSON.stringify({ 
      level: 'info', 
      message: '[event-processor] importing outbox' 
    }))
    
    let outbox: any
    try {
      const outboxModule = await import('@/lib/events/outbox')
      outbox = outboxModule.outbox
      console.log(JSON.stringify({ 
        level: 'info', 
        message: '[event-processor] outbox imported successfully' 
      }))
    } catch (importErr) {
      console.error(JSON.stringify({ 
        level: 'error', 
        message: '[event-processor] failed to import outbox', 
        error: String(importErr),
        stack: importErr instanceof Error ? importErr.stack : undefined
      }))
      throw new Error(`Failed to import outbox: ${importErr}`)
    }

    // STEP 3: Process pending events (or just report pending count for dry-run)
    console.log(JSON.stringify({
      level: 'info',
      message: '[event-processor] processing batch',
      batchSize,
      dryRun,
    }))

    let result: { processed: number; failed: number }
    if (dryRun) {
      result = { processed: 0, failed: 0 }
      console.log(JSON.stringify({
        level: 'info',
        message: '[event-processor] dry-run: skipping actual processing',
      }))
    } else {
      result = await outbox.processPendingBatch(batchSize)
    }

    // Heartbeat is implicit in the HTTP response – health-sweep cron handles
    // dead-man alerting via checkEventLag() if outbox backlog accumulates.
    // Do NOT insert into alert_log here: that table is for real alerts only.

    const durationMs = Date.now() - start
    console.log(JSON.stringify({
      level: 'info',
      message: '[event-processor] batch completed',
      processed: result.processed,
      failed: result.failed,
      dryRun,
      durationMs,
    }))

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      failed: result.failed,
      dryRun,
      durationMs,
    })

  } catch (err) {
    const durationMs = Date.now() - start
    console.error(JSON.stringify({
      level: 'error',
      message: '[event-processor] fatal error',
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      durationMs
    }))
    return NextResponse.json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? String(err) : undefined
    }, { status: 500 })
  }
  },
)
