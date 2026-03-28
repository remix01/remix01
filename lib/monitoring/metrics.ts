/**
 * Metrics — Health snapshot for admin dashboard
 * 
 * Provides real-time system health metrics for monitoring.
 */

import { createAdminClient } from '@/lib/supabase/server'

export const metrics = {
  async getSnapshot() {
    const supabase = createAdminClient()
    const now = new Date()
    const h1ago = new Date(now.getTime() - 60 * 60_000).toISOString()
    const h24ago = new Date(now.getTime() - 24 * 60 * 60_000).toISOString()

    const [
      outboxPending,
      dlqUnresolved,
      sagasRunning,
      sagasFailed,
      alertsOpen,
      eventsLast1h,
      eventsLast24h,
    ] = await Promise.all([
      supabase
        .from('event_outbox' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('event_dlq' as any)
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false),
      supabase
        .from('saga_instances' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'running'),
      supabase
        .from('saga_instances' as any)
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed'),
      supabase
        .from('alert_log' as any)
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false),
      supabase
        .from('event_log' as any)
        .select('*', { count: 'exact', head: true })
        .gte('emitted_at', h1ago),
      supabase
        .from('event_log' as any)
        .select('*', { count: 'exact', head: true })
        .gte('emitted_at', h24ago),
    ])

    // Conversion funnel (24h)
    const funnelCounts: Record<string, number> = {}
    for (const ev of ['task_created', 'task_matched', 'task_accepted', 'task_completed']) {
      const { count } = await supabase
        .from('analytics_events' as any)
        .select('*', { count: 'exact', head: true })
        .eq('event', ev)
        .gte('occurred_at', h24ago)
      funnelCounts[ev] = count ?? 0
    }

    // Overall status determination
    const status =
      (dlqUnresolved.count ?? 0) >= 10 || (sagasFailed.count ?? 0) > 0
        ? 'critical'
        : (dlqUnresolved.count ?? 0) >= 3 || (alertsOpen.count ?? 0) > 0
          ? 'degraded'
          : 'healthy'

    return {
      status,
      timestamp: now.toISOString(),
      eventBus: {
        outboxPending: outboxPending.count ?? 0,
        dlqUnresolved: dlqUnresolved.count ?? 0,
        eventsLast1h: eventsLast1h.count ?? 0,
        eventsLast24h: eventsLast24h.count ?? 0,
      },
      sagas: {
        running: sagasRunning.count ?? 0,
        failed: sagasFailed.count ?? 0,
      },
      alerts: {
        open: alertsOpen.count ?? 0,
      },
      funnel24h: {
        created: funnelCounts.task_created ?? 0,
        matched: funnelCounts.task_matched ?? 0,
        accepted: funnelCounts.task_accepted ?? 0,
        completed: funnelCounts.task_completed ?? 0,
        matchRate:
          funnelCounts.task_created > 0
            ? +(funnelCounts.task_matched / funnelCounts.task_created).toFixed(2)
            : 0,
        acceptRate:
          funnelCounts.task_matched > 0
            ? +(funnelCounts.task_accepted / funnelCounts.task_matched).toFixed(2)
            : 0,
      },
    }
  },
}
