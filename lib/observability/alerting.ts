/**
 * Anomaly Detector — Early warning system for abuse, bugs, and attacks
 * 
 * Monitors agent activity patterns and fires alerts when suspicious behavior detected.
 * Never blocks the main flow — all operations are non-blocking and async.
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { agentLogger } from './agentLogger'

// ── TYPES ──────────────────────────────────────────────────────────────────────

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'

type AlertType =
  | 'repeated_injection_attempts'    // same user triggers injection guard 3+ times in 10min
  | 'excessive_tool_calls'           // user makes 50+ tool calls in 1 minute
  | 'repeated_permission_denials'    // 5+ permission denials in 5min from same user
  | 'escrow_capture_spike'           // 10+ captureEscrow calls in 1 min globally
  | 'repeated_state_violations'      // same resource has 3+ illegal transition attempts
  | 'llm_error_spike'               // 5+ LLM failures in 2 minutes
  | 'job_queue_failure_spike'        // 10+ job failures in 5 minutes

type Alert = {
  id: string
  severity: AlertSeverity
  type: AlertType
  userId?: string
  sessionId?: string
  details: string
  count?: number
  timestamp: number
  resolved: boolean
}

// ── CONFIGURATION ──────────────────────────────────────────────────────────────

const THRESHOLDS: Record<AlertType, { threshold: number; windowMs: number; severity: AlertSeverity }> = {
  repeated_injection_attempts: { threshold: 3, windowMs: 600000, severity: 'high' },      // 3 in 10min
  excessive_tool_calls: { threshold: 50, windowMs: 60000, severity: 'critical' },          // 50 in 1min
  repeated_permission_denials: { threshold: 5, windowMs: 300000, severity: 'medium' },    // 5 in 5min
  escrow_capture_spike: { threshold: 10, windowMs: 60000, severity: 'critical' },          // 10 in 1min
  repeated_state_violations: { threshold: 3, windowMs: 600000, severity: 'high' },        // 3 in 10min
  llm_error_spike: { threshold: 5, windowMs: 120000, severity: 'high' },                   // 5 in 2min
  job_queue_failure_spike: { threshold: 10, windowMs: 300000, severity: 'medium' },       // 10 in 5min
}

// ── ANOMALY DETECTOR ───────────────────────────────────────────────────────────

class AnomalyDetector {
  private counters: Map<string, { count: number; windowStart: number }> = new Map()
  private adminEmail = process.env.ADMIN_ALERT_EMAIL

  /**
   * Record an event and check thresholds asynchronously
   * Key format: '{alertType}:{userId}' or '{alertType}:global'
   */
  record(
    alertType: AlertType,
    userId?: string,
    sessionId?: string,
    details?: string
  ): void {
    // Fire-and-forget: don't await, never block main flow
    this.recordAsync(alertType, userId, sessionId, details).catch(err =>
      console.error('[ANOMALY] Error recording event:', err)
    )
  }

  private async recordAsync(
    alertType: AlertType,
    userId?: string,
    sessionId?: string,
    details?: string
  ): Promise<void> {
    const key = userId ? `${alertType}:${userId}` : `${alertType}:global`
    const now = Date.now()
    const config = THRESHOLDS[alertType]

    // Get or create counter
    let entry = this.counters.get(key)
    if (!entry || now - entry.windowStart > config.windowMs) {
      // Window expired or first occurrence
      entry = { count: 1, windowStart: now }
      this.counters.set(key, entry)
      return // First occurrence, no alert yet
    }

    // Within window, increment
    entry.count += 1

    // Check if threshold exceeded
    if (entry.count > config.threshold) {
      // Only fire once per threshold cross
      if (entry.count === config.threshold + 1) {
        await this.fireAlert({
          severity: config.severity,
          type: alertType,
          userId,
          sessionId,
          details: details || `Threshold exceeded for ${alertType}`,
          count: entry.count,
        })
      }
    }
  }

  /**
   * Fire alert: save to DB, email admin if critical, log via agentLogger
   */
  private async fireAlert(
    alert: Omit<Alert, 'id' | 'timestamp' | 'resolved'>
  ): Promise<void> {
    const timestamp = Date.now()

    // Log via agentLogger
    agentLogger.log({
      level: 'warn',
      event: 'anomaly_detected',
      details: alert.details,
      sessionId: alert.sessionId,
      userId: alert.userId,
    })

    // Save to DB
    try {
      const { error } = await supabaseAdmin
        .from('agent_alerts')
        .insert({
          severity: alert.severity,
          type: alert.type,
          user_id: alert.userId,
          session_id: alert.sessionId,
          details: alert.details,
          count: alert.count,
        })

      if (error) {
        console.error('[ANOMALY] Failed to save alert to DB:', error)
      }
    } catch (err) {
      console.error('[ANOMALY] Error saving alert:', err)
    }

    // Send email to admin if high or critical
    if (
      (alert.severity === 'high' || alert.severity === 'critical') &&
      this.adminEmail
    ) {
      this.sendAdminEmail(alert, timestamp).catch(err =>
        console.error('[ANOMALY] Failed to send alert email:', err)
      )
    }
  }

  /**
   * Send alert email to admin (fire-and-forget)
   */
  private async sendAdminEmail(
    alert: Omit<Alert, 'id' | 'timestamp' | 'resolved'>,
    timestamp: number
  ): Promise<void> {
    try {
      // Use your email service here (e.g., Resend, SendGrid, SMTP)
      // This is a placeholder — implement with your email provider
      const emailBody = `
        Alert Type: ${alert.type}
        Severity: ${alert.severity}
        User ID: ${alert.userId || 'N/A'}
        Session ID: ${alert.sessionId || 'N/A'}
        Count: ${alert.count || 1}
        Details: ${alert.details}
        Timestamp: ${new Date(timestamp).toISOString()}
      `.trim()

      console.log(`[ANOMALY EMAIL] To: ${this.adminEmail}\n${emailBody}`)
      // TODO: Integrate with actual email service
    } catch (err) {
      console.error('[ANOMALY] Email sending error:', err)
    }
  }

  /**
   * Get all unresolved alerts for admin dashboard
   */
  async getActiveAlerts(): Promise<Alert[]> {
    try {
      const { data, error } = await supabaseAdmin
        .from('agent_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[ANOMALY] Failed to fetch alerts:', error)
        return []
      }

      return (data || []).map(row => ({
        id: row.id,
        severity: row.severity,
        type: row.type,
        userId: row.user_id,
        sessionId: row.session_id,
        details: row.details,
        count: row.count,
        timestamp: new Date(row.created_at).getTime(),
        resolved: row.resolved,
      }))
    } catch (err) {
      console.error('[ANOMALY] Error fetching alerts:', err)
      return []
    }
  }

  /**
   * Mark an alert as resolved
   */
  async resolveAlert(alertId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('agent_alerts')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', alertId)

      if (error) {
        console.error('[ANOMALY] Failed to resolve alert:', error)
      }
    } catch (err) {
      console.error('[ANOMALY] Error resolving alert:', err)
    }
  }
}

export const anomalyDetector = new AnomalyDetector()
