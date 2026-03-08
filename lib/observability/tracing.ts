/**
 * Distributed Tracing — OpenTelemetry-compatible spans for the LiftGO agent.
 *
 * Traces the full execution chain:
 *   orchestrator.process → llm.call
 *                        → guardrails.run
 *                        → permissions.check
 *                        → tool.execute → stateMachine.transition
 *                                       → db.query
 *                                       → jobs.enqueue
 *
 * Export target: Langfuse (when LANGFUSE_SECRET_KEY is set).
 * Fallback:      console.debug (silent in production, visible in dev).
 *
 * SAFETY RULES:
 * - Every public method wraps its internals in try/catch.
 * - export() never throws — tracing must NEVER break the main agent flow.
 * - Sensitive fields (payment IDs, tokens, passwords) are never stored.
 */

// ── TYPES ─────────────────────────────────────────────────────────────────────

export type SpanStatus = 'ok' | 'error' | 'pending'

export interface Span {
  traceId: string
  spanId: string
  parentSpanId?: string
  operation: string
  startTime: number
  endTime?: number
  status: SpanStatus
  attributes: Record<string, string | number | boolean>
  error?: string
}

// Keys that must never appear in span attributes
const REDACTED_KEYS = new Set([
  'password', 'token', 'secret', 'apikey', 'api_key',
  'paymentintentid', 'stripecustomerid', 'card', 'cvv', 'cvc', 'pan',
  'authorization', 'cookie', 'session',
])

function sanitizeAttributes(
  attrs: Record<string, unknown> = {}
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {}
  for (const [k, v] of Object.entries(attrs)) {
    if (REDACTED_KEYS.has(k.toLowerCase())) continue
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v
    }
  }
  return out
}

function randomHex(bytes: number): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    // Use UUID and strip dashes to get a hex-like string
    return crypto.randomUUID().replace(/-/g, '').slice(0, bytes * 2)
  }
  // Fallback for edge runtimes without crypto.randomUUID
  return Array.from({ length: bytes * 2 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('')
}

// ── TRACER ────────────────────────────────────────────────────────────────────

const IS_DEV = process.env.NODE_ENV !== 'production'

class Tracer {
  // ── Span creation ──────────────────────────────────────────────────────────

  /**
   * Start a root span with a new traceId.
   * This is the entry point for every agent request.
   */
  startTrace(
    operation: string,
    attributes?: Record<string, unknown>
  ): Span {
    try {
      return {
        traceId: randomHex(16),
        spanId:  randomHex(8),
        operation,
        startTime: Date.now(),
        status: 'pending',
        attributes: sanitizeAttributes(attributes),
      }
    } catch {
      // Return a minimal span so callers can always pass a Span around
      return {
        traceId: 'fallback',
        spanId:  'fallback',
        operation,
        startTime: Date.now(),
        status: 'pending',
        attributes: {},
      }
    }
  }

  /**
   * Start a child span linked to a parent's traceId.
   */
  startSpan(
    operation: string,
    parentSpan: Span,
    attributes?: Record<string, unknown>
  ): Span {
    try {
      return {
        traceId:      parentSpan.traceId,
        spanId:       randomHex(8),
        parentSpanId: parentSpan.spanId,
        operation,
        startTime: Date.now(),
        status: 'pending',
        attributes: sanitizeAttributes(attributes),
      }
    } catch {
      return {
        traceId:      parentSpan.traceId,
        spanId:       'fallback',
        parentSpanId: parentSpan.spanId,
        operation,
        startTime: Date.now(),
        status: 'pending',
        attributes: {},
      }
    }
  }

  /**
   * Close a span, record its duration, and export it.
   */
  endSpan(
    span: Span,
    status: SpanStatus = 'ok',
    error?: string
  ): void {
    try {
      span.endTime = Date.now()
      span.status  = status
      if (error) span.error = error

      // Fire-and-forget — never await inside endSpan
      this.export(span).catch(() => { /* already handled inside export */ })
    } catch {
      // endSpan must NEVER throw
    }
  }

  // ── Export ─────────────────────────────────────────────────────────────────

  /**
   * Send span to Langfuse or fall back to console.debug.
   * NEVER throws.
   */
  async export(span: Span): Promise<void> {
    try {
      const secretKey = process.env.LANGFUSE_SECRET_KEY
      const publicKey = process.env.LANGFUSE_PUBLIC_KEY
      const host      = process.env.LANGFUSE_HOST ?? 'https://cloud.langfuse.com'

      if (secretKey && publicKey) {
        await this._exportToLangfuse(span, secretKey, publicKey, host)
      } else {
        this._exportToConsole(span)
      }
    } catch {
      // Absolute safety net — tracing must NEVER affect main flow
    }
  }

  // ── Convenience wrappers (match the 8 operations in the spec) ─────────────

  /** Wrap async work in a child span. Returns result and ends span automatically. */
  async trace<T>(
    operation: string,
    parentSpan: Span,
    attributes: Record<string, unknown>,
    fn: (span: Span) => Promise<T>
  ): Promise<T> {
    const span = this.startSpan(operation, parentSpan, attributes)
    try {
      const result = await fn(span)
      this.endSpan(span, 'ok')
      return result
    } catch (err: any) {
      this.endSpan(span, 'error', err?.message ?? String(err))
      throw err
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async _exportToLangfuse(
    span: Span,
    secretKey: string,
    publicKey: string,
    host: string
  ): Promise<void> {
    // Langfuse ingestion endpoint — uses the observations API
    const url = `${host}/api/public/observations`

    const body = {
      id:          span.spanId,
      traceId:     span.traceId,
      parentObservationId: span.parentSpanId ?? null,
      name:        span.operation,
      startTime:   new Date(span.startTime).toISOString(),
      endTime:     span.endTime ? new Date(span.endTime).toISOString() : null,
      type:        'SPAN',
      level:       span.status === 'error' ? 'ERROR' : 'DEFAULT',
      statusMessage: span.error ?? null,
      metadata:    span.attributes,
    }

    const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString('base64')

    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Basic ${credentials}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok && IS_DEV) {
      console.debug('[TRACER] Langfuse export failed:', res.status, await res.text())
    }
  }

  private _exportToConsole(span: Span): void {
    if (!IS_DEV) return // silent in production when Langfuse is not configured
    const durationMs = span.endTime ? span.endTime - span.startTime : '?'
    console.debug(
      `[TRACE ${span.status.toUpperCase()}] ${span.operation}`,
      `(${durationMs}ms)`,
      span.error ? `— ${span.error}` : '',
      {
        traceId: span.traceId,
        spanId:  span.spanId,
        parent:  span.parentSpanId,
        attrs:   span.attributes,
      }
    )
  }
}

export const tracer = new Tracer()
