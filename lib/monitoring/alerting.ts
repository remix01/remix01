/**
 * Alerting System — Sends alerts via Slack and email
 *
 * Slack sending delegated to lib/slack.ts sendAlert()
 * which supports both Webhook (existing) and Bot API (new).
 */

import { createAdminClient } from '@/lib/supabase/server'
import { sendAlert as slackSendAlert } from '@/lib/slack'

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

    try {
      await supabase.from('alert_log').insert({
        alert_type: alert.type,
        severity: alert.severity,
        message: alert.message,
        metadata: (alert.metadata ?? {}) as any,
        channels_notified: channels,
      })
    } catch (err) {
      console.error('[Alerting] alert_log insert failed:', err)
    }

    try {
      await slackSendAlert({
        type: alert.type,
        severity: alert.severity === 'warn' ? 'warn' : 'critical',
        message: alert.message,
        metadata: alert.metadata,
      })
      channels.push('slack')
    } catch (err) {
      console.error('[Alerting] Slack send failed:', err)
    }

    if (alert.severity === 'critical' && process.env.ADMIN_EMAIL) {
      try {
        await this._sendEmail(alert)
        channels.push('email')
      } catch (err) {
        console.error('[Alerting] Email send failed:', err)
      }
    }
  },

  async _sendEmail(alert: AlertPayload): Promise<void> {
    if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) return
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'LiftGO Alerts <noreply@liftgo.net>',
      to: process.env.ADMIN_EMAIL,
      subject: `[LiftGO ${alert.severity.toUpperCase()}] ${alert.type}`,
      text: [
        `Alert: ${alert.type}`,
        `Severity: ${alert.severity}`,
        `Message: ${alert.message}`,
        alert.metadata ? `Metadata:\n${JSON.stringify(alert.metadata, null, 2)}` : '',
        `Time: ${new Date().toISOString()}`,
      ].filter(Boolean).join('\n\n'),
    })
  },

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
