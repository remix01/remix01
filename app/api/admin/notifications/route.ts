/**
 * Admin — Notification Pipeline Observability
 *
 * Returns a health snapshot for the notification delivery pipeline:
 *   - pending:   unread in-app notifications created in last 24h
 *   - delivery:  success/failed/retry_exhausted counts from delivery log
 *   - dlq:       unresolved event DLQ entries (notification-related)
 *   - outbox:    events pending / retrying in the outbox
 *   - lastErrors: last 10 delivery failures with correlationId + channel
 *
 * Debug guide:
 *   1. Check dlq.unresolved — if > 0, open /api/admin/events for replay
 *   2. Check delivery.retryExhausted — find correlationId in Vercel logs
 *      grep: level=error AND correlationId=<id>
 *   3. Check outbox.retrying — events stuck may mean cron is down
 *      verify /api/cron/event-processor runs every 5 min in Vercel dashboard
 */

import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { deliveryLog } from '@/lib/notifications/delivery-log'

export const GET = withAdminAuth(async () => {
  try {
    const supabase = createAdminClient() as any
    const since24h = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
    const since1h  = new Date(Date.now() - 60 * 60_000).toISOString()

    const [
      unread24h,
      unread1h,
      outboxPending,
      outboxRetrying,
      dlqAll,
      dlqNotificationRelated,
      deliveryStats,
      recentFailures,
    ] = await Promise.all([
      // Unread in-app notifications created in last 24h (pending delivery to users)
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .gte('created_at', since24h),

      // Same but last 1h for trend
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .gte('created_at', since1h),

      // Events waiting to be dispatched (cron hasn't picked them up yet)
      supabase
        .from('event_outbox')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),

      // Events that failed at least once and are scheduled for retry
      supabase
        .from('event_outbox')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed')
        .gt('attempt_count', 0)
        .lt('attempt_count', 3),

      // All unresolved DLQ entries
      supabase
        .from('event_dlq')
        .select('id, event_name, failure_reason, attempt_count, failed_at')
        .eq('resolved', false)
        .order('failed_at', { ascending: false })
        .limit(20),

      // Notification-specific DLQ entries
      supabase
        .from('event_dlq')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false)
        .ilike('event_name', '%notification%'),

      // Delivery log stats (24h)
      deliveryLog.getStats(24),

      // Last 10 failures from delivery log
      deliveryLog.getRecentFailures(24, 10),
    ])

    // Overall pipeline health
    const dlqCount = dlqAll.data?.length ?? 0
    const exhausted = deliveryStats.retryExhausted ?? 0
    const health =
      dlqCount >= 10 || exhausted >= 5
        ? 'critical'
        : dlqCount >= 3 || exhausted >= 2
          ? 'degraded'
          : 'healthy'

    return NextResponse.json({
      health,
      timestamp: new Date().toISOString(),

      pending: {
        unread24h:    unread24h.count   ?? 0,
        unread1h:     unread1h.count    ?? 0,
        outboxPending: outboxPending.count ?? 0,
        outboxRetrying: outboxRetrying.count ?? 0,
      },

      delivery: {
        success24h:      deliveryStats.success,
        failed24h:       deliveryStats.failed,
        retryExhausted:  deliveryStats.retryExhausted,
      },

      dlq: {
        unresolved: dlqCount,
        notificationRelated: dlqNotificationRelated.count ?? 0,
        items: dlqAll.data ?? [],
      },

      lastErrors: recentFailures,

      debug: {
        hint: 'To trace a failure: search Vercel logs with correlationId from lastErrors[*].correlation_id',
        replayEndpoint: 'POST /api/admin/events/dlq/replay { dlqId }',
        cronStatus: 'Check Vercel dashboard → Cron Jobs → /api/cron/event-processor (every 5min)',
      },
    })
  } catch (err) {
    console.error('[API] /admin/notifications error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
