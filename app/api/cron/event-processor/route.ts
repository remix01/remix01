/**
 * Cron Worker – Event Processor (IMPROVED)
 * 
 * Runs every 5 minutes to process pending events from outbox.
 * Triggered by Vercel Cron (configured in vercel.json).
 * 
 * Protected by CRON_SECRET to prevent unauthorized invocations.
 * 
 * CHANGELOG (2026-03-31):
 * - Added robust error handling for dynamic imports
 * - Initialize event subscribers in serverless context
 * - Detailed logging for debugging
 * - Fixes event-processor 500 errors
 */

import { NextRequest, NextResponse } from 'next/server'
import { initEventSubscribers } from '@/lib/events'
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
  console.log(JSON.stringify({ 
    level: 'info', 
    message: '[event-processor] start', 
    ranAt: new Date().toISOString() 
  }))

  try {
    // STEP 1: Initialize subscribers for this serverless execution context
    initEventSubscribers()
    console.log(JSON.stringify({
      level: 'info',
      message: '[event-processor] subscribers initialized'
    }))

    // STEP 2: Process pending events
    console.log(JSON.stringify({ 
      level: 'info', 
      message: '[event-processor] processing batch', 
      batchSize: 50 
    }))
    
    const result = await outbox.processPendingBatch(50)

    // Heartbeat is implicit in the HTTP response – health-sweep cron handles
    // dead-man alerting via checkEventLag() if outbox backlog accumulates.
    // Do NOT insert into alert_log here: that table is for real alerts only.

    const durationMs = Date.now() - start
    console.log(JSON.stringify({ 
      level: 'info', 
      message: '[event-processor] batch completed', 
      processed: result.processed, 
      failed: result.failed, 
      durationMs 
    }))

    return NextResponse.json({ 
      ok: true, 
      processed: result.processed, 
      failed: result.failed, 
      durationMs 
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
}
