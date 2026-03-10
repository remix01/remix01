/**
 * Alerting System — Sends alerts via Slack and email
 * 
 * All alerts are persisted to alert_log table for audit trail.
 * Duplicate checking prevents alert spam for recurring issues.
 */

import { createAdminClient } from '@/lib/supabase/server'

type AlertType =
  | 'sla_warning'
  | 'sla_critical'
  | 'dlq_spike'
  | 'event_lag'
  | 'saga_stuck'
  | 'saga_compensating'
  | 'payment_frozen'
  | 'funnel_drop'
  | 'cron_dead'

type Severity = 'warn' | 'critical'

interface AlertPayload {
  type: AlertType
  severity: Severity
  message: string
  metadata?: Record<string, unknown>
}

export const alerting = {
  async send(alert: AlertPayload): Promise<void> {
    const supabase = createAdminClient()
    const channels: string[] = []

    // 1. Always write to alert_log
    await supabase.from('alert_log').insert({
      alert_type: alert.type,
      severity: alert.severity,
      message: alert.message,
      metadata: alert.metadata ?? {},
      channels_notified: channels,
    })

    // 2. Slack — for all alerts
    if (process.env.SLACK_WEBHOOK_URL) {
      try {
        await this._sendSlack(alert)
        channels.push('slack')
      } catch (err) {
        console.error('[Alerting] Slack send failed:', err)
      }
    }

    // 3. Email — only for critical severity
    if (alert.severity === 'critical' && process.env.ADMIN_EMAIL) {
      try {
        await this._sendEmail(alert)
        channels.push('email')
      } catch (err) {
        console.error('[Alerting] Email send failed:', err)
      }
    }
  },

  async _sendSlack(alert: AlertPayload): Promise<void> {
    const emoji = alert.severity === 'critical' ? '🚨' : '⚠️'
    const color = alert.severity === 'critical' ? '#ef4444' : '#fbbf24'

    await fetch(process.env.SLACK_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `${emoji} *LiftGO ${alert.severity.toUpperCase()}*\n${alert.message}`,
                },
              },
              alert.metadata && {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `\`\`\`${JSON.stringify(alert.metadata, null, 2)}\`\`\``,
                },
              },
            ].filter(Boolean),
          },
        ],
      }),
    })
  },

  async _sendEmail(alert: AlertPayload): Promise<void> {
    // TODO: Send email via Resend or existing email service
    // Subject: `[LiftGO ${alert.severity.toUpperCase()}] ${alert.type}`
    // Body: alert.message + JSON.stringify(alert.metadata)
    // To: process.env.ADMIN_EMAIL
    console.log(`[Alerting] Email alert (${alert.type}): ${alert.message}`)
  },

  /**
   * Check if same alert was already sent within time window.
   * Prevents spam for recurring issues.
   */
  async isDuplicate(type: AlertType, withinMinutes = 15): Promise<boolean> {
    const supabase = createAdminClient()
    const since = new Date(Date.now() - withinMinutes * 60_000).toISOString()

    const { count } = await supabase
      .from('alert_log')
      .select('*', { count: 'exact', head: true })
      .eq('alert_type', type)
      .gte('created_at', since)

    return (count ?? 0) > 0
  },
}
