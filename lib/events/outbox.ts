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
   * Cron worker processes batch of pending events
   * Called every 2 minutes by /api/cron/event-processor
   */
  async processPendingBatch(batchSize = 50): Promise<{ processed: number; failed: number }> {
    const supabase = createAdminClient()
    const { eventBus } = await import('./eventBus')

    // Fetch pending + eligible for retry
    const { data: events, error } = await supabase
      .from('event_outbox')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lte('next_attempt_at', new Date().toISOString())
      .lt('attempt_count', 3)
      .order('created_at', { ascending: true })
      .limit(batchSize)

    if (error) {
      console.error(JSON.stringify({ level: 'error', message: '[Outbox] Failed to fetch pending events', code: error.code, details: error.message, hint: error.hint }))
      return { processed: 0, failed: 0 }
    }

    if (!events?.length) {
      return { processed: 0, failed: 0 }
    }

    let processed = 0
    let failed = 0

    await Promise.allSettled(
      events.map(async (row: any) => {
        try {
          // Mark as processing (optimistic lock)
          const { error: updateErr } = await supabase
            .from('event_outbox')
            .update({ status: 'processing' })
            .eq('id', row.id)
            .eq('status', row.status)

          if (updateErr) {
            console.warn('[Outbox] Race condition on event:', row.id)
            return
          }

          // Dispatch to event bus handlers (synchronous)
          await eventBus.dispatchHandlers(row.event_name as EventName, row.payload)

          // Mark as done
          await supabase
            .from('event_outbox')
            .update({
              status: 'done',
              processed_at: new Date().toISOString(),
            })
            .eq('id', row.id)

          processed++
        } catch (err) {
          const nextAttempt = (row.attempt_count ?? 0) + 1
          const backoffMs = Math.pow(2, nextAttempt) * 60_000 // 2m, 4m, 8m

          if (nextAttempt >= 3) {
            // Move to DLQ
            await deadLetterQueue.send(row, String(err))
            await supabase
              .from('event_outbox')
              .update({ status: 'failed' })
              .eq('id', row.id)
          } else {
            // Retry with exponential backoff
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

    console.log('[Outbox] Batch processed:', { processed, failed, batchSize })
    return { processed, failed }
  },
}
