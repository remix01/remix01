/**
 * Health Monitor — Checks system health and triggers alerts
 * 
 * Monitors:
 * 1. SLA breaches — tasks stuck in pending/matching >5min
 * 2. DLQ spikes — failed event accumulation
 * 3. Event lag — outbox backlog
 * 4. Stuck sagas — sagas running without progress
 * 5. Frozen escrow — payments stuck >48h
 * 6. Conversion funnel — matching/accept rates dropping
 */

import { createAdminClient } from '@/lib/supabase/server'
import { alerting } from './alerting'

export const healthMonitor = {
  /**
   * CHECK 1: SLA monitor
   * Task without match = 2h guarantee at risk
   */
  async checkSLABreaches(): Promise<void> {
    const supabase = createAdminClient()

    const warn5min = new Date(Date.now() - 5 * 60_000).toISOString()
    const crit90min = new Date(Date.now() - 90 * 60_000).toISOString()

    // Tasks older than 90min in pending/matching → CRITICAL
    const { data: critTasks } = await supabase
      .from('service_requests')
      .select('id, created_at, status')
      .in('status', ['pending', 'matching'])
      .lte('created_at', crit90min)
      .limit(20)

    if (critTasks?.length) {
      const alreadySent = await alerting.isDuplicate('sla_critical', 30)
      if (!alreadySent) {
        await alerting.send({
          type: 'sla_critical',
          severity: 'critical',
          message: `${critTasks.length} task(s) waiting >90min — 2h guarantee at risk!`,
          metadata: {
            taskIds: critTasks.map((t) => t.id),
            oldestCreatedAt: critTasks[0]?.created_at,
          },
        })
      }
    }

    // Tasks 5–90min in pending/matching → WARNING
    const { data: warnTasks } = await supabase
      .from('service_requests')
      .select('id, created_at')
      .in('status', ['pending', 'matching'])
      .lte('created_at', warn5min)
      .gt('created_at', crit90min)

    if ((warnTasks?.length ?? 0) > 5) {
      const alreadySent = await alerting.isDuplicate('sla_warning', 15)
      if (!alreadySent) {
        await alerting.send({
          type: 'sla_warning',
          severity: 'warn',
          message: `${warnTasks!.length} task(s) waiting >5min for match`,
          metadata: { count: warnTasks!.length },
        })
      }
    }
  },

  /**
   * CHECK 2: DLQ spike
   */
  async checkDLQSpike(): Promise<void> {
    const supabase = createAdminClient()
    const since10min = new Date(Date.now() - 10 * 60_000).toISOString()

    const { count } = await supabase
      .from('event_dlq')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false)
      .gte('failed_at', since10min)

    const dlqCount = count ?? 0

    if (dlqCount >= 10) {
      const alreadySent = await alerting.isDuplicate('dlq_spike', 20)
      if (!alreadySent) {
        const { data: items } = await supabase
          .from('event_dlq')
          .select('event_name')
          .eq('resolved', false)
          .gte('failed_at', since10min)

        const eventTypes = [...new Set(items?.map((i) => i.event_name) ?? [])]

        await alerting.send({
          type: 'dlq_spike',
          severity: 'critical',
          message: `DLQ spike: ${dlqCount} failed events in last 10min`,
          metadata: { dlqCount, eventTypes },
        })
      }
    } else if (dlqCount >= 3) {
      const alreadySent = await alerting.isDuplicate('dlq_spike', 15)
      if (!alreadySent) {
        await alerting.send({
          type: 'dlq_spike',
          severity: 'warn',
          message: `DLQ: ${dlqCount} failed events in 10min`,
          metadata: { dlqCount },
        })
      }
    }
  },

  /**
   * CHECK 3: Event lag (outbox backlog)
   */
  async checkEventLag(): Promise<void> {
    const supabase = createAdminClient()

    const { data: oldest } = await supabase
      .from('event_outbox')
      .select('created_at, event_name')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!oldest) return

    const lagMs = Date.now() - new Date(oldest.created_at).getTime()
    const lagMin = Math.floor(lagMs / 60_000)

    if (lagMin >= 10) {
      const alreadySent = await alerting.isDuplicate('event_lag', 20)
      if (!alreadySent) {
        await alerting.send({
          type: 'event_lag',
          severity: lagMin >= 15 ? 'critical' : 'warn',
          message: `Event outbox lag: oldest pending event is ${lagMin}min old — cron worker may be down`,
          metadata: {
            lagMin,
            oldestEvent: oldest.event_name,
            oldestAt: oldest.created_at,
          },
        })
      }
    }
  },

  /**
   * CHECK 4: Stuck sagas
   */
  async checkStuckSagas(): Promise<void> {
    const supabase = createAdminClient()
    const since30min = new Date(Date.now() - 30 * 60_000).toISOString()

    // Sagas in compensating → immediate alert
    const { data: compensating } = await supabase
      .from('saga_instances')
      .select('id, saga_type, task_id, error_message')
      .eq('status', 'compensating')

    if (compensating?.length) {
      await alerting.send({
        type: 'saga_compensating',
        severity: 'critical',
        message: `${compensating.length} saga(s) in rollback state — potential data loss`,
        metadata: {
          sagas: compensating.map((s) => ({
            id: s.id,
            type: s.saga_type,
            taskId: s.task_id,
          })),
        },
      })
    }

    // Sagas running without progress >30min → warning
    const { data: stuck } = await supabase
      .from('saga_instances')
      .select('id, saga_type, task_id, current_step, updated_at')
      .eq('status', 'running')
      .lte('updated_at', since30min)

    if (stuck?.length) {
      const alreadySent = await alerting.isDuplicate('saga_stuck', 30)
      if (!alreadySent) {
        await alerting.send({
          type: 'saga_stuck',
          severity: 'warn',
          message: `${stuck.length} saga(s) without progress >30min`,
          metadata: {
            sagas: stuck.map((s) => ({
              id: s.id,
              type: s.saga_type,
              step: s.current_step,
            })),
          },
        })
      }
    }
  },

  /**
   * CHECK 5: Frozen escrow
   */
  async checkFrozenEscrow(): Promise<void> {
    const supabase = createAdminClient()
    const since48h = new Date(Date.now() - 48 * 60 * 60_000).toISOString()

    const { data: frozen } = await supabase
      .from('escrow_holds')
      .select('id, task_id, amount, created_at')
      .eq('status', 'held')
      .lte('created_at', since48h)

    if (frozen?.length) {
      const totalAmount = frozen.reduce((sum, e) => sum + (e.amount ?? 0), 0)

      await alerting.send({
        type: 'payment_frozen',
        severity: 'critical',
        message: `${frozen.length} escrow(s) frozen >48h — total €${totalAmount.toFixed(2)}`,
        metadata: {
          count: frozen.length,
          totalAmount,
          taskIds: frozen.map((e) => e.task_id),
        },
      })
    }
  },

  /**
   * CHECK 6: Conversion funnel
   */
  async checkConversionFunnel(): Promise<void> {
    const supabase = createAdminClient()
    const since1h = new Date(Date.now() - 60 * 60_000).toISOString()

    // Aggregate from analytics_events (last 1h)
    const counts: Record<string, number> = {}
    for (const event of ['task_created', 'task_matched', 'task_accepted']) {
      const { count } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event', event)
        .gte('occurred_at', since1h)
      counts[event] = count ?? 0
    }

    if (counts.task_created > 5) {
      const matchRate = counts.task_matched / counts.task_created
      const acceptRate =
        counts.task_matched > 0
          ? counts.task_accepted / counts.task_matched
          : 1

      if (matchRate < 0.4) {
        await alerting.send({
          type: 'funnel_drop',
          severity: 'warn',
          message: `Matching rate dropped to ${(matchRate * 100).toFixed(0)}% in last hour`,
          metadata: { matchRate, counts },
        })
      }

      if (acceptRate < 0.3) {
        await alerting.send({
          type: 'funnel_drop',
          severity: 'warn',
          message: `Accept rate dropped to ${(acceptRate * 100).toFixed(0)}% in last hour`,
          metadata: { acceptRate, counts },
        })
      }
    }
  },

  /**
   * Run all checks in parallel
   */
  async runAll(): Promise<void> {
    await Promise.allSettled([
      this.checkSLABreaches(),
      this.checkDLQSpike(),
      this.checkEventLag(),
      this.checkStuckSagas(),
      this.checkFrozenEscrow(),
      this.checkConversionFunnel(),
    ])
  },
}
