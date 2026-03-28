/**
 * Outbox Pattern — Reliable Event Publishing
 *
 * Ensures exactly-once event delivery by:
 * 1. Persisting event to database FIRST
 * 2. Async worker processes pending events
 * 3. Transactional guarantee: DB change + event are atomic
 *
 * Prevents: "event sent but DB commit failed" scenarios
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { EventName, EventPayload } from './eventTypes'
import { deadLetterQueue } from './deadLetterQueue'

export const outbox = {
  /**
   * Publish event to outbox (not directly to subscribers)
   * Database write is atomic — event guaranteed to be processed eventually
   */
  async publish<T extends EventName>(
    event: T,
    payload: EventPayload<T>,
    options?: { idempotencyKey?: string }
  ): Promise<void> {
    const supabase = createAdminClient()
    const key = options?.idempotencyKey
      ?? `${event}:${(payload as any).taskId ?? 'global'}:${Date.now()}`

    try {
      await supabase.from('event_outbox').insert({
        event_name: event,
        payload: payload as object,
        idempotency_key: key,
        status: 'pending',
        next_attempt_at: new Date().toISOString(),
      })
    } catch (err) {
      console.error('[Outbox] Failed to publish event:', err)
      throw err
    }
    // Cron worker will process async — don't wait here
  },

  /**
   * Cron worker processes batch of pending events.
   * Called every 5 minutes by /api/cron/event-processor.
   *
   * Logs each step explicitly so Vercel logs show exactly where
   * a hang or failure occurs.
   */
  async processPendingBatch(batchSize = 50): Promise<{ processed: number; failed: number }> {
    // ── Step 1: create admin client ──────────────────────────────────────
    console.log(JSON.stringify({ level: 'info', message: '[Outbox] step 1: createAdminClient' }))
    const supabase = createAdminClient()

    // ── Step 2: import eventBus ──────────────────────────────────────────
    console.log(JSON.stringify({ level: 'info', message: '[Outbox] step 2: import eventBus' }))
    const { eventBus } = await import('./eventBus')

    // ── Step 3: query event_outbox ───────────────────────────────────────
    console.log(JSON.stringify({ level: 'info', message: '[Outbox] step 3: query event_outbox' }))

    const controller = new AbortController()
    const queryTimeout = setTimeout(() => controller.abort(), 5000)

    let data: any[] | null = null
    let queryError: any = null
    try {
      const result = await supabase
        .from('event_outbox')
        .select('*')
        .in('status', ['pending', 'failed'])
        .lte('next_attempt_at', new Date().toISOString())
        .lt('attempt_count', 3)
        .order('created_at', { ascending: true })
        .limit(batchSize)
        .abortSignal(controller.signal)
      data = result.data
      queryError = result.error
    } finally {
      clearTimeout(queryTimeout)
    }

    if (queryError) {
      const msg = `[Outbox] Failed to fetch from event_outbox: ${queryError.message} (code: ${queryError.code})`
      console.error(JSON.stringify({ level: 'error', message: msg }))
      // Throw so the caller's catch block logs the 500 with details
      throw new Error(msg)
    }

    console.log(JSON.stringify({
      level: 'info',
      message: '[Outbox] step 3: query complete',
      count: data?.length ?? 0,
    }))

    if (!data?.length) {
      return { processed: 0, failed: 0 }
    }

    // ── Step 4: process each event ───────────────────────────────────────
    console.log(JSON.stringify({ level: 'info', message: '[Outbox] step 4: processing batch', count: data.length }))

    let processed = 0
    let failed = 0

    await Promise.allSettled(
      data.map(async (row: any) => {
        try {
          // Optimistic lock: mark as processing
          const { error: lockErr } = await supabase
            .from('event_outbox')
            .update({ status: 'processing' })
            .eq('id', row.id)
            .eq('status', row.status)

          if (lockErr) {
            console.warn(JSON.stringify({
              level: 'warn',
              message: '[Outbox] Race condition on event, skipping',
              eventId: row.id,
            }))
            return
          }

          // Dispatch to registered handlers
          await eventBus.dispatchHandlers(row.event_name as EventName, row.payload)

          // Mark done
          await supabase
            .from('event_outbox')
            .update({ status: 'done', processed_at: new Date().toISOString() })
            .eq('id', row.id)

          processed++
        } catch (err) {
          const nextAttempt = (row.attempt_count ?? 0) + 1
          const backoffMs = Math.pow(2, nextAttempt) * 60_000 // 2m, 4m, 8m

          console.error(JSON.stringify({
            level: 'error',
            message: '[Outbox] Event dispatch failed',
            eventId: row.id,
            eventName: row.event_name,
            attempt: nextAttempt,
            error: String(err),
          }))

          if (nextAttempt >= 3) {
            await deadLetterQueue.send(row, String(err))
            await supabase
              .from('event_outbox')
              .update({ status: 'failed' })
              .eq('id', row.id)
          } else {
            await supabase
              .from('event_outbox')
              .update({
                status: 'failed',
                attempt_count: nextAttempt,
                last_error: String(err),
                next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
              })
              .eq('id', row.id)
          }

          failed++
        }
      })
    )

    console.log(JSON.stringify({
      level: 'info',
      message: '[Outbox] batch complete',
      processed,
      failed,
      batchSize,
    }))
    return { processed, failed }
  },
}
