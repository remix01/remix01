/**
 * Agent Logger — Observability for every tool call, guardrail rejection,
 * permission denial, and state transition in the LiftGO agent.
 *
 * Design principles:
 * - Non-blocking: logs are buffered in-memory and flushed in batches
 * - Safe: sensitive financial fields are stripped before storage
 * - Portable: falls back to console.log when DB is unavailable (dev)
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

// ── TYPES ─────────────────────────────────────────────────────────────────────

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

type AgentEvent =
  | 'tool_call_started'
  | 'tool_call_succeeded'
  | 'tool_call_failed'
  | 'guardrail_rejected'
  | 'permission_denied'
  | 'state_transition_blocked'
  | 'state_transition_success'
  | 'rate_limit_hit'
  | 'injection_attempt_detected'
  | 'session_started'
  | 'session_ended'
  | 'llm_call_started'
  | 'llm_call_completed'
  | 'confirmation_required'
  | 'confirmation_received'

type AgentLogEntry = {
  id: string
  sessionId: string
  userId: string
  level: LogLevel
  event: AgentEvent
  tool?: string
  params?: object
  result?: { success: boolean; error?: string }
  durationMs?: number
  timestamp: number
}

// ── SANITISATION ──────────────────────────────────────────────────────────────

/** Keys whose values are NEVER stored — strip recursively */
const SENSITIVE_KEYS = new Set([
  'payment',
  'paymentintentid',
  'stripecustomerid',
  'card',
  'secret',
  'token',
  'password',
  'cvv',
  'cvc',
  'pan',
])

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase()
  return [...SENSITIVE_KEYS].some(k => lower.includes(k))
}

function sanitize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) return obj.map(sanitize)

  const result: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = isSensitiveKey(k) ? '[REDACTED]' : sanitize(v)
  }
  return result
}

// ── LOGGER ────────────────────────────────────────────────────────────────────

const FLUSH_INTERVAL_MS = 5_000
const FLUSH_BUFFER_SIZE = 100
const IS_DEV = process.env.NODE_ENV !== 'production'

class AgentLogger {
  private buffer: AgentLogEntry[] = []
  private flushTimer: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Only start the interval in non-edge runtimes (Node.js)
    if (typeof setInterval !== 'undefined') {
      this.flushTimer = setInterval(() => {
        this.flush().catch(err =>
          console.error('[AGENT LOGGER] Auto-flush error:', err)
        )
      }, FLUSH_INTERVAL_MS)
    }
  }

  /** Core log method — buffers entry and flushes when full */
  log(entry: Omit<AgentLogEntry, 'id' | 'timestamp'>): void {
    const full: AgentLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      params: entry.params ? (sanitize(entry.params) as object) : undefined,
    }

    if (IS_DEV) {
      const icon =
        full.level === 'error' ? '✗' :
        full.level === 'warn'  ? '!' :
        full.level === 'debug' ? '…' : '•'
      console.log(
        `[AGENT ${icon}] ${full.event}${full.tool ? ` (${full.tool})` : ''}`,
        full.durationMs != null ? `${full.durationMs}ms` : ''
      )
    }

    this.buffer.push(full)

    if (this.buffer.length >= FLUSH_BUFFER_SIZE) {
      this.flush().catch(err =>
        console.error('[AGENT LOGGER] Buffer-full flush error:', err)
      )
    }
  }

  /**
   * Log a tool call start and return a "done" callback.
   * Call done() on success, done(error) on failure.
   *
   * Usage:
   *   const done = agentLogger.logToolCall(sessionId, userId, 'captureEscrow', params)
   *   const result = await runTool()
   *   done(result.error)
   */
  logToolCall(
    sessionId: string,
    userId: string,
    tool: string,
    params: object
  ): (error?: string) => void {
    const startedAt = Date.now()

    this.log({
      sessionId,
      userId,
      level: 'info',
      event: 'tool_call_started',
      tool,
      params,
    })

    return (error?: string) => {
      const durationMs = Date.now() - startedAt
      this.log({
        sessionId,
        userId,
        level: error ? 'error' : 'info',
        event: error ? 'tool_call_failed' : 'tool_call_succeeded',
        tool,
        durationMs,
        result: { success: !error, error },
      })
    }
  }

  logGuardrailRejection(
    sessionId: string,
    userId: string,
    tool: string,
    reason: string
  ): void {
    this.log({
      sessionId,
      userId,
      level: 'warn',
      event: 'guardrail_rejected',
      tool,
      result: { success: false, error: reason },
    })
  }

  logPermissionDenied(
    sessionId: string,
    userId: string,
    tool: string,
    requiredRole: string,
    userRole: string
  ): void {
    this.log({
      sessionId,
      userId,
      level: 'warn',
      event: 'permission_denied',
      tool,
      params: { requiredRole, userRole },
    })
  }

  logStateTransitionBlocked(
    sessionId: string,
    resource: string,
    fromStatus: string,
    toStatus: string
  ): void {
    this.log({
      sessionId,
      userId: '',
      level: 'warn',
      event: 'state_transition_blocked',
      params: { resource, fromStatus, toStatus },
    })
  }

  logStateTransitionSuccess(
    sessionId: string,
    resource: string,
    fromStatus: string,
    toStatus: string
  ): void {
    this.log({
      sessionId,
      userId: '',
      level: 'info',
      event: 'state_transition_success',
      params: { resource, fromStatus, toStatus },
    })
  }

  logRateLimit(sessionId: string, userId: string): void {
    this.log({
      sessionId,
      userId,
      level: 'warn',
      event: 'rate_limit_hit',
    })
  }

  /**
   * Log an injection attempt.
   * ONLY the pattern TYPE is stored — never the actual malicious payload.
   */
  logInjectionAttempt(
    sessionId: string,
    userId: string,
    detectedPattern: string
  ): void {
    this.log({
      sessionId,
      userId,
      level: 'error',
      event: 'injection_attempt_detected',
      params: { patternType: detectedPattern },
    })
  }

  /** Flush buffered logs to the agent_logs table */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const batch = this.buffer.splice(0, this.buffer.length)

    try {
      const rows = batch.map(e => ({
        id:          e.id,
        session_id:  e.sessionId,
        user_id:     e.userId || null,
        level:       e.level,
        event:       e.event,
        tool:        e.tool ?? null,
        params:      e.params ?? null,
        result:      e.result ?? null,
        duration_ms: e.durationMs ?? null,
      }))

      const { error } = await supabaseAdmin
        .from('agent_logs')
        .insert(rows)

      if (error) {
        console.error('[AGENT LOGGER] Flush error:', error.message)
        // Re-queue failed batch (capped to avoid unbounded growth)
        if (this.buffer.length < FLUSH_BUFFER_SIZE * 2) {
          this.buffer.unshift(...batch)
        }
      }
    } catch (err) {
      console.error('[AGENT LOGGER] Unexpected flush error:', err)
    }
  }
}

export const agentLogger = new AgentLogger()
export type { AgentLogEntry, AgentEvent, LogLevel }
