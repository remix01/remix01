export type NotificationMetricName =
  | 'notification_channel_delivery'
  | 'notification_retry_exhausted'
  | 'notification_retry_attempt'
  | 'matching_latency_ms'
  | 'payment_finalization_ms'
  | 'lead_transition_error'

export function recordMetric(name: NotificationMetricName, value: number, tags: Record<string, string> = {}) {
  console.info('[metric]', { name, value, tags, at: new Date().toISOString() })
}
