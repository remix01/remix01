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

import { NextRequest } from 'next/server'
import { ok, fail } from '@/lib/http/response'

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get('authorization')
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedToken) {
    console.warn('[Cron] Unauthorized event processor call')
    return fail('Unauthorized', 401)
  }

  const start = Date.now()
  console.log(JSON.stringify({ 
    level: 'info', 
    message: '[event-processor] start', 
    ranAt: new Date().toISOString() 
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

    // STEP 3: Process pending events
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

    return ok({ 
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
    
    return fail('Internal server error', 500)
  }
}
