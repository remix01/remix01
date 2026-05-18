/**
 * LiftGO business metrics collector.
 *
 * Queries Supabase for the key business signals that power
 * the Grafana dashboards. Called by:
 *   - GET /api/metrics  (Prometheus scrape endpoint)
 *   - POST /api/cron/metrics-push  (Mimir remote-write, every 60s)
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { MetricSample } from './mimir'

export async function collectBusinessMetrics(): Promise<MetricSample[]> {
  const supabase: any = createAdminClient()
  const now = Date.now()
  const h1ago = new Date(now - 3600_000).toISOString()
  const h24ago = new Date(now - 86400_000).toISOString()

  const samples: MetricSample[] = []

  // ── Tasks ────────────────────────────────────────────────────────────────
  const taskStatuses = ['draft', 'open', 'has_ponudbe', 'in_progress', 'completed', 'cancelled', 'expired']
  await Promise.all(taskStatuses.map(async (status) => {
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', status)
    samples.push({ name: 'liftgo_tasks_total', labels: { status }, value: count ?? 0 })
  }))

  // Tasks created last 1h / 24h
  const { count: tasksLast1h } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', h1ago)
  samples.push({ name: 'liftgo_tasks_created_1h', value: tasksLast1h ?? 0 })

  const { count: tasksLast24h } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', h24ago)
  samples.push({ name: 'liftgo_tasks_created_24h', value: tasksLast24h ?? 0 })

  // ── Ponudbe (offers) ─────────────────────────────────────────────────────
  const { count: ponudbeTotal } = await supabase
    .from('ponudbe')
    .select('*', { count: 'exact', head: true })
  samples.push({ name: 'liftgo_ponudbe_total', value: ponudbeTotal ?? 0 })

  const { count: ponudbeLast24h } = await supabase
    .from('ponudbe')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', h24ago)
  samples.push({ name: 'liftgo_ponudbe_created_24h', value: ponudbeLast24h ?? 0 })

  // ── Event bus ────────────────────────────────────────────────────────────
  const { count: outboxPending } = await supabase
    .from('event_outbox')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  samples.push({ name: 'liftgo_event_outbox_pending', value: outboxPending ?? 0 })

  const { count: dlqUnresolved } = await supabase
    .from('event_dlq')
    .select('*', { count: 'exact', head: true })
    .eq('resolved', false)
  samples.push({ name: 'liftgo_event_dlq_unresolved', value: dlqUnresolved ?? 0 })

  const { count: eventsLast1h } = await supabase
    .from('event_log')
    .select('*', { count: 'exact', head: true })
    .gte('emitted_at', h1ago)
  samples.push({ name: 'liftgo_events_emitted_1h', value: eventsLast1h ?? 0 })

  // ── Sagas ────────────────────────────────────────────────────────────────
  const sagaStatuses = ['running', 'failed', 'completed', 'compensating']
  await Promise.all(sagaStatuses.map(async (status) => {
    const { count } = await supabase
      .from('saga_instances')
      .select('*', { count: 'exact', head: true })
      .eq('status', status)
    samples.push({ name: 'liftgo_sagas_total', labels: { status }, value: count ?? 0 })
  }))

  // ── AI usage ─────────────────────────────────────────────────────────────
  const { data: aiUsage } = await supabase
    .from('ai_usage_logs')
    .select('tokens_used, cost_eur')
    .gte('created_at', h24ago)

  const totalTokens = (aiUsage ?? []).reduce((sum: number, r: any) => sum + (r.tokens_used ?? 0), 0)
  const totalCostEur = (aiUsage ?? []).reduce((sum: number, r: any) => sum + (r.cost_eur ?? 0), 0)
  samples.push({ name: 'liftgo_ai_tokens_24h', value: totalTokens })
  samples.push({ name: 'liftgo_ai_cost_eur_24h', value: Math.round(totalCostEur * 100) / 100 })

  // ── Users & profiles ─────────────────────────────────────────────────────
  const { count: totalProfiles } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
  samples.push({ name: 'liftgo_profiles_total', value: totalProfiles ?? 0 })

  const { count: totalObrtniki } = await supabase
    .from('obrtnik_profiles')
    .select('*', { count: 'exact', head: true })
  samples.push({ name: 'liftgo_obrtnik_profiles_total', value: totalObrtniki ?? 0 })

  // ── Alerts ───────────────────────────────────────────────────────────────
  const { count: alertsOpen } = await supabase
    .from('alert_log')
    .select('*', { count: 'exact', head: true })
    .eq('resolved', false)
  samples.push({ name: 'liftgo_alerts_open', value: alertsOpen ?? 0 })

  return samples
}
