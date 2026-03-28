// @ts-nocheck
/**
 * Dead Letter Queue — Failed Event Recovery
 * 
 * Events that fail 3+ times go here for manual admin review + replay.
 * Provides visibility into system failures and recovery mechanism.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { outbox } from './outbox'

export const deadLetterQueue = {
  /**
   * Move failed event to DLQ (called after 3 failed attempts)
   */
  async send(outboxRow: any, reason: string): Promise<void> {
    const supabase = createAdminClient()

    try {
      await supabase.from('event_dlq' as any).insert({
        original_outbox_id: outboxRow.id,
        event_name: outboxRow.event_name,
        payload: outboxRow.payload,
        failure_reason: reason,
        attempt_count: outboxRow.attempt_count,
      })

      console.error(`[DLQ] Event failed permanently: ${outboxRow.event_name}`, {
        id: outboxRow.id,
        reason,
      })

      // TODO: alert admin via notificationService.alertAdmin()
    } catch (err) {
      console.error('[DLQ] Failed to insert into DLQ:', err)
    }
  },

  /**
   * Admin can manually replay event from DLQ
   * Re-inserts to outbox with new idempotency key
   */
  async replay(dlqId: string, adminUserId: string): Promise<void> {
    const supabase = createAdminClient()

    try {
      const { data: dlqItem, error } = await supabase
        .from('event_dlq' as any)
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
      await supabase
        .from('event_dlq' as any)
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: adminUserId,
        })
        .eq('id', dlqId)

      console.log('[DLQ] Event replayed:', { dlqId, adminUserId })
    } catch (err) {
      console.error('[DLQ] Failed to replay event:', err)
      throw err
    }
  },

  /**
   * List unresolved DLQ items (for admin dashboard)
   */
  async listUnresolved() {
    const supabase = createAdminClient()

    try {
      const { data, error } = await supabase
        .from('event_dlq')
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
