import { createAdminClient } from '@/lib/supabase/server'

export type DeliveryStatus = 'success' | 'failed' | 'retry_exhausted'

export interface DeliveryLogEntry {
  correlationId: string
  userId: string
  channel: 'in_app' | 'push' | 'email'
  status: DeliveryStatus
  attemptCount: number
  lastError?: string
  metadata?: Record<string, unknown>
}

export const deliveryLog = {
  async write(entry: DeliveryLogEntry): Promise<void> {
    try {
      const supabase = createAdminClient() as any
      await supabase.from('notification_delivery_log').insert({
        correlation_id: entry.correlationId,
        user_id: entry.userId,
        channel: entry.channel,
        status: entry.status,
        attempt_count: entry.attemptCount,
        last_error: entry.lastError ?? null,
        metadata: entry.metadata ?? {},
      })
    } catch (err) {
      // Delivery log failure must never propagate
      console.error('[DeliveryLog] Write failed:', err)
    }
  },

  async getRecentFailures(limitHours = 24, limit = 50) {
    try {
      const supabase = createAdminClient() as any
      const since = new Date(Date.now() - limitHours * 60 * 60_000).toISOString()
      const { data, error } = await supabase
        .from('notification_delivery_log')
        .select('id, correlation_id, user_id, channel, status, attempt_count, last_error, created_at')
        .in('status', ['failed', 'retry_exhausted'])
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data ?? []
    } catch (err) {
      console.error('[DeliveryLog] getRecentFailures error:', err)
      return []
    }
  },

  async getStats(limitHours = 24) {
    try {
      const supabase = createAdminClient() as any
      const since = new Date(Date.now() - limitHours * 60 * 60_000).toISOString()
      const [success, failed, exhausted] = await Promise.all([
        supabase.from('notification_delivery_log').select('*', { count: 'exact', head: true }).eq('status', 'success').gte('created_at', since),
        supabase.from('notification_delivery_log').select('*', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', since),
        supabase.from('notification_delivery_log').select('*', { count: 'exact', head: true }).eq('status', 'retry_exhausted').gte('created_at', since),
      ])
      return {
        success: success.count ?? 0,
        failed: failed.count ?? 0,
        retryExhausted: exhausted.count ?? 0,
      }
    } catch (err) {
      console.error('[DeliveryLog] getStats error:', err)
      return { success: 0, failed: 0, retryExhausted: 0 }
    }
  },
}
