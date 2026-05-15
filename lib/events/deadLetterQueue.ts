/**
 * Dead Letter Queue — Failed Event Recovery
 *
 * Events that fail 3+ times go here for manual admin review + replay.
 * Provides visibility into system failures and recovery mechanism.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { alerting } from '@/lib/monitoring/alerting'
import { outbox } from './outbox'

export const deadLetterQueue = {
  /**
   * Move failed event to DLQ (called after 3 failed attempts)
   */
  async send(outboxRow: any, reason: string): Promise<void> {
    const supabase = createAdminClient() as any

    try {
      await supabase.from('event_dlq').insert({
        original_outbox_id: outboxRow.id,
        event_name: outboxRow.event_name,
        payload: outboxRow.payload,
        failure_reason: reason,
        attempt_count: outboxRow.attempt_count,
      })

      console.error(JSON.stringify({
        level: 'error',
        message: '[DLQ] Event failed permanently',
        eventName: outboxRow.event_name,
        outboxId: outboxRow.id,
        reason,
        attemptCount: outboxRow.attempt_count,
      }))

      // Fire-and-forget — alert must not block the caller or throw
      alerting.send({
        type: 'dlq_spike',
        severity: 'warn',
        message: `[DLQ] Permanent failure: ${outboxRow.event_name}`,
        metadata: {
          outboxId: outboxRow.id,
          eventName: outboxRow.event_name,
          reason,
          attemptCount: outboxRow.attempt_count,
        },
      }).catch((err) => console.error('[DLQ] Alert send failed:', err))
    } catch (err) {
      console.error('[DLQ] Failed to insert into DLQ:', err)
    }
  },

  /**
   * Admin can manually replay event from DLQ
   * Re-inserts to outbox with new idempotency key
   */
  async replay(dlqId: string, adminUserId: string): Promise<void> {
    const supabase = createAdminClient() as any

    try {
      const { data: dlqItem, error } = await supabase.from('event_dlq')
        .select('*')
        .eq('id', dlqId)
        .single()

      if (error || !dlqItem) {
        throw new Error('DLQ item not found')
      }

      // Re-insert to outbox with replay idempotency key
      await outbox.publish(dlqItem.event_name as any, dlqItem.payload, {
        idempotencyKey: `replay:${dlqItem.id}:${Date.now()}`,
      })

      // Mark as resolved
      await supabase.from('event_dlq')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: adminUserId,
        })
        .eq('id', dlqId)

      console.info(JSON.stringify({
        level: 'info',
        message: '[DLQ] Event replayed',
        dlqId,
        adminUserId,
        eventName: dlqItem.event_name,
      }))
    } catch (err) {
      console.error('[DLQ] Failed to replay event:', err)
      throw err
    }
  },

  /**
   * List unresolved DLQ items (for admin dashboard)
   */
  async listUnresolved() {
    const supabase = createAdminClient() as any

    try {
      const { data, error } = await supabase.from('event_dlq')
        .select('*')
        .eq('resolved', false)
        .order('failed_at', { ascending: false })

      if (error) throw error
      return data ?? []
    } catch (err) {
      console.error('[DLQ] Failed to list unresolved:', err)
      return []
    }
  },
}
