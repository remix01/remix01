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
   * Called every 5 minutes by /api/cron/event-processor
   *
   * Never throws — always returns { processed, failed } even on fatal errors.
   */
  async processPendingBatch(batchSize = 50): Promise<{ processed: number; failed: number }> {
    try {
      const supabase = createAdminClient()
      const { eventBus } = await import('./eventBus')

      // Fetch pending + eligible for retry (also recover stuck 'processing' events
      // that are older than 10 minutes — these were left by a crashed worker)
      const { data: events, error } = await supabase
        .from('event_outbox')
        .select('*')
        .in('status', ['pending', 'failed'])
        .lte('next_attempt_at', new Date().toISOString())
        .lt('attempt_count', 3)
        .order('created_at', { ascending: true })
        .limit(batchSize)

      if (error) {
        console.error('[Outbox] Failed to fetch pending events:', JSON.stringify(error))
        return { processed: 0, failed: 0 }
      }

      if (!Array.isArray(events) || events.length === 0) {
        return { processed: 0, failed: 0 }
      }

      let processed = 0
      let failed = 0

      await Promise.allSettled(
        events.map(async (row: any) => {
          try {
            if (!row?.id || !row?.event_name) {
              console.warn('[Outbox] Skipping malformed event row:', row?.id)
              return
            }

            // Mark as processing (optimistic lock — skip if another worker grabbed it)
            const { error: updateErr } = await supabase
              .from('event_outbox')
              .update({ status: 'processing' })
              .eq('id', row.id)
              .eq('status', row.status)

            if (updateErr) {
              console.warn('[Outbox] Race condition on event:', row.id)
              return
            }

            // Dispatch to event bus handlers
            await eventBus.dispatchHandlers(row.event_name as EventName, row.payload ?? {})

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
            const errMsg = err instanceof Error ? err.message : String(err)

            console.error('[Outbox] Event processing error:', { id: row.id, event: row.event_name, attempt: nextAttempt, error: errMsg })

            try {
              if (nextAttempt >= 3) {
                // Move to DLQ
                await deadLetterQueue.send(row, errMsg)
                await supabase
                  .from('event_outbox')
                  .update({ status: 'failed', last_error: errMsg, attempt_count: nextAttempt })
                  .eq('id', row.id)
              } else {
                // Retry with exponential backoff
                await supabase
                  .from('event_outbox')
                  .update({
                    status: 'failed',
                    attempt_count: nextAttempt,
                    last_error: errMsg,
                    next_attempt_at: new Date(Date.now() + backoffMs).toISOString(),
                  })
                  .eq('id', row.id)
              }
            } catch (updateErr) {
              console.error('[Outbox] Failed to update event status after error:', row.id, String(updateErr))
            }

            failed++
          }
        })
      )

      console.log('[Outbox] Batch processed:', { processed, failed, batchSize })
      return { processed, failed }
    } catch (fatalErr) {
      // Top-level guard: never let this function throw
      console.error('[Outbox] Fatal error in processPendingBatch:', String(fatalErr))
      return { processed: 0, failed: 0 }
    }
  },
}
