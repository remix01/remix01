/**
 * Mimir metrics pusher — remote-writes Prometheus-format metrics to Grafana Mimir.
 *
 * LiftGO business metrics shipped:
 *   liftgo_tasks_total          — task counts by status
 *   liftgo_ponudbe_total        — offer counts
 *   liftgo_ai_tokens_total      — AI token consumption
 *   liftgo_event_outbox_pending — queue backlog
 *   liftgo_saga_running         — in-flight sagas
 *   liftgo_saga_failed          — failed sagas
 *
 * Pushed every time collectAndPush() is called (from cron or /api/metrics).
 * Uses Prometheus remote-write text format (simple label=value pairs).
 */

import { getConfig, getAuthHeader } from './client'

export interface MetricSample {
  name: string
  labels?: Record<string, string>
  value: number
  timestamp?: number  // ms epoch; defaults to now
}

function formatPrometheusLine(sample: MetricSample): string {
  const ts = sample.timestamp ?? Date.now()
  const labelStr = sample.labels
    ? '{' + Object.entries(sample.labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
    : ''
  return `${sample.name}${labelStr} ${sample.value} ${ts}`
}

/** Push an array of metric samples to Grafana Mimir via remote-write */
export async function pushMetrics(samples: MetricSample[]): Promise<void> {
  const cfg = getConfig()
  const auth = getAuthHeader(cfg)
  if (!auth || samples.length === 0) return

  const body = samples.map(formatPrometheusLine).join('\n')

  try {
    await fetch(`${cfg.prometheusUrl}/api/prom/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        Authorization: auth,
      },
      body,
    })
  } catch {
    // Never propagate
  }
}

/** Render an array of samples as Prometheus text exposition format (for /api/metrics) */
export function renderPrometheusText(samples: MetricSample[]): string {
  const lines: string[] = []

  // Group by metric name for HELP/TYPE headers
  const grouped = new Map<string, MetricSample[]>()
  for (const s of samples) {
    if (!grouped.has(s.name)) grouped.set(s.name, [])
    grouped.get(s.name)!.push(s)
  }

  for (const [name, group] of grouped) {
    lines.push(`# HELP ${name} LiftGO business metric`)
    lines.push(`# TYPE ${name} gauge`)
    for (const s of group) {
      const labelStr = s.labels
        ? '{' + Object.entries(s.labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
        : ''
      lines.push(`${name}${labelStr} ${s.value}`)
    }
  }

  return lines.join('\n') + '\n'
}
