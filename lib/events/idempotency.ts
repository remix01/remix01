/**
 * Idempotency Guard — Prevents duplicate event subscriber execution
 *
 * When events are replayed or retried, this ensures each subscriber
 * processes each event exactly once, preventing double-charging, duplicate
 * notifications, or data inconsistencies.
 *
 * Two usage patterns:
 *
 * Pattern A — atomic check-and-mark (for subscribers: mark before processing)
 *   const skip = await idempotency.checkAndMark('task.matched', 'notify', taskId)
 *   if (skip) return
 *   // ... proceed
 *
 * Pattern B — check then mark after success (for delivery: never drop on failure)
 *   const skip = await idempotency.check('notification', 'orchestrate', key)
 *   if (skip) return { skipped: true }
 *   // ... attempt delivery ...
 *   if (delivered) idempotency.mark('notification', 'orchestrate', key).catch(() => {})
 */

import { createAdminClient } from '@/lib/supabase/server'

function makeKey(eventName: string, consumer: string, entityId: string): string {
  return `${eventName}:${consumer}:${entityId}`
}

export const idempotency = {
  /**
   * Atomically check + mark in one DB round-trip.
   * Use for subscribers where marking before processing is safe
   * (idempotent operations, or where a miss is worse than a duplicate).
   *
   * Returns true  → already processed, skip.
   * Returns false → first time, proceed.
   */
  async checkAndMark(
    eventName: string,
    consumer: string,
    entityId: string
  ): Promise<boolean> {
    const supabase = createAdminClient() as any
    const key = makeKey(eventName, consumer, entityId)

    const { error } = await supabase.from('event_processing_log').insert({
      idempotency_key: key,
      consumer,
      event_name: eventName,
      entity_id: entityId,
    })

    if (error) {
      if (error.code === '23505') {
        console.log(`[Idempotency] Duplicate detected, skipping: ${key}`)
        return true
      }
      // Other DB error — log but don't block
      console.error('[Idempotency] DB error:', error.message)
      return false
    }

    return false
  },

  /**
   * Read-only check — does not write anything.
   * Use when you need to mark AFTER a successful operation
   * (so a failure between check and mark doesn't consume the key).
   *
   * Returns true  → already processed.
   * Returns false → not yet seen (proceed, then call mark() on success).
   */
  async check(
    eventName: string,
    consumer: string,
    entityId: string
  ): Promise<boolean> {
    const supabase = createAdminClient() as any
    const key = makeKey(eventName, consumer, entityId)

    try {
      const { data } = await supabase
        .from('event_processing_log')
        .select('id')
        .eq('idempotency_key', key)
        .maybeSingle()
      return data !== null
    } catch (err) {
      // On read failure, proceed — better a duplicate send than a silent drop
      console.error('[Idempotency] check DB error:', err)
      return false
    }
  },

  /**
   * Write-only mark — call after a successful operation.
   * Ignores unique-constraint errors (concurrent mark is harmless).
   */
  async mark(
    eventName: string,
    consumer: string,
    entityId: string
  ): Promise<void> {
    const supabase = createAdminClient() as any
    const key = makeKey(eventName, consumer, entityId)

    const { error } = await supabase.from('event_processing_log').insert({
      idempotency_key: key,
      consumer,
      event_name: eventName,
      entity_id: entityId,
    })

    if (error && error.code !== '23505') {
      // 23505 = concurrent mark, harmless; other errors are worth logging
      console.error('[Idempotency] mark DB error:', error.message)
    }
  },
}
