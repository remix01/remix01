/**
 * Idempotency Guard — Prevents duplicate event subscriber execution
 * 
 * When events are replayed or retried, this ensures each subscriber
 * processes each event exactly once, preventing double-charging, duplicate
 * notifications, or data inconsistencies.
 * 
 * Pattern:
 *   const skip = await idempotency.checkAndMark(
 *     'task.matched', 'notify', taskId
 *   )
 *   if (skip) return  // Already processed
 *   // ... proceed with subscriber logic
 */

import { createAdminClient } from '@/lib/supabase/server'

export const idempotency = {
  /**
   * Check if event has been processed by this consumer.
   * Atomically insert idempotency key if not yet processed.
   * 
   * Returns true if already processed (skip execution).
   * Returns false if new event (proceed with execution).
   * 
   * Key format: "{eventName}:{consumer}:{entityId}"
   * Example: "task.matched:notify:task-uuid-abc123"
   */
  async checkAndMark(
    eventName: string,
    consumer: string,
    entityId: string
  ): Promise<boolean> {
    const supabase = createAdminClient()
    const key = `${eventName}:${consumer}:${entityId}`

    const { error } = await supabase.from('event_processing_log').insert({
      idempotency_key: key,
      consumer,
      event_name: eventName,
      entity_id: entityId,
    })

    if (error) {
      // Unique constraint violation (23505) = already processed
      if (error.code === '23505') {
        console.log(`[Idempotency] Duplicate detected, skipping: ${key}`)
        return true // true = skip execution
      }

      // Other DB error — log but don't block
      // (may be network issue, not duplicate)
      console.error('[Idempotency] DB error:', error.message)
      return false // false = proceed anyway
    }

    return false // false = first time, proceed with execution
  },
}
