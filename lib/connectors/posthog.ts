/**
 * PostHog Analytics Connector
 *
 * Server-side event tracking for LiftGO. Tracks connector usage,
 * agent calls, conversion funnel, and subscription metrics.
 * Data feeds into Stripe pricing optimisation.
 *
 * Env vars required:
 *   POSTHOG_API_KEY      — Project API key (ph_...)
 *   POSTHOG_HOST         — e.g. "https://eu.posthog.com" (EU cloud)
 *
 * All calls are fire-and-forget (non-blocking) unless flush() is called.
 */

import type { Connector, ConnectorHealth } from './index'

interface PostHogEvent {
  distinctId: string
  event: string
  properties?: Record<string, unknown>
  timestamp?: string
}

interface PostHogBatch {
  api_key: string
  batch: Array<{
    type: 'capture'
    event: string
    distinct_id: string
    properties: Record<string, unknown>
    timestamp: string
  }>
}

// ── Connector interface ──────────────────────────────────────────────────────

class PostHogConnector implements Connector {
  name = 'posthog' as const
  private queue: PostHogBatch['batch'] = []
  private flushTimer: ReturnType<typeof setTimeout> | null = null

  isConfigured(): boolean {
    return !!(process.env.POSTHOG_API_KEY && process.env.POSTHOG_HOST)
  }

  async healthCheck(): Promise<ConnectorHealth> {
    if (!this.isConfigured()) {
      return { name: this.name, healthy: false, error: 'Not configured' }
    }

    const start = Date.now()
    try {
      const res = await fetch(`${process.env.POSTHOG_HOST}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: process.env.POSTHOG_API_KEY,
          distinct_id: 'healthcheck',
        }),
        signal: AbortSignal.timeout(5000),
      })
      return {
        name: this.name,
        healthy: res.ok,
        latencyMs: Date.now() - start,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      }
    } catch (err) {
      return {
        name: this.name,
        healthy: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown',
      }
    }
  }

  /** Queue an event. Batches are flushed automatically after 500ms. */
  capture(evt: PostHogEvent): void {
    if (!this.isConfigured()) return

    this.queue.push({
      type: 'capture',
      event: evt.event,
      distinct_id: evt.distinctId,
      properties: {
        $lib: 'liftgo-server',
        ...(evt.properties ?? {}),
      },
      timestamp: evt.timestamp ?? new Date().toISOString(),
    })

    // Auto-flush after 500ms of silence
    if (this.flushTimer) clearTimeout(this.flushTimer)
    this.flushTimer = setTimeout(() => this.flush(), 500)
  }

  /** Immediately send all queued events */
  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    if (this.queue.length === 0 || !this.isConfigured()) return

    const batch = [...this.queue]
    this.queue = []

    const body: PostHogBatch = {
      api_key: process.env.POSTHOG_API_KEY!,
      batch,
    }

    try {
      await fetch(`${process.env.POSTHOG_HOST}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      })
    } catch (err) {
      // Non-fatal — analytics should never break the app
      console.warn('[PostHog] Flush failed:', err instanceof Error ? err.message : err)
    }
  }
}

export const postHogConnector = new PostHogConnector()

// ── Typed tracking helpers ───────────────────────────────────────────────────

/** Track which AI agent was called and how many tokens it used */
export function trackAgentCall(params: {
  userId: string
  agentType: string
  model: string
  inputTokens: number
  outputTokens: number
  durationMs: number
  tier: string
  success: boolean
}): void {
  postHogConnector.capture({
    distinctId: params.userId,
    event: 'agent_call',
    properties: {
      agent_type: params.agentType,
      model: params.model,
      input_tokens: params.inputTokens,
      output_tokens: params.outputTokens,
      total_tokens: params.inputTokens + params.outputTokens,
      duration_ms: params.durationMs,
      user_tier: params.tier,
      success: params.success,
      // Estimated cost in EUR cents (rough)
      estimated_cost_eur_cents: Math.round(
        ((params.inputTokens * 0.8 + params.outputTokens * 4.0) / 1_000_000) * 100
      ),
    },
  })
}

/** Track connector usage to see which integrations drive value */
export function trackConnectorUsage(params: {
  userId: string
  connector: string
  action: string
  success: boolean
  durationMs?: number
}): void {
  postHogConnector.capture({
    distinctId: params.userId,
    event: 'connector_used',
    properties: {
      connector: params.connector,
      action: params.action,
      success: params.success,
      duration_ms: params.durationMs,
    },
  })
}

/** Track key conversion events (povpraševanje → ponudba → dogovor) */
export function trackConversion(params: {
  userId: string
  event:
    | 'task_created'
    | 'offer_received'
    | 'offer_accepted'
    | 'escrow_captured'
    | 'job_completed'
    | 'review_left'
  meta?: Record<string, unknown>
}): void {
  postHogConnector.capture({
    distinctId: params.userId,
    event: `conversion_${params.event}`,
    properties: params.meta,
  })
}

/** Track subscription events for Stripe pricing analysis */
export function trackSubscription(params: {
  userId: string
  action: 'upgraded' | 'downgraded' | 'cancelled' | 'renewed'
  fromTier?: string
  toTier?: string
  mrr?: number
}): void {
  postHogConnector.capture({
    distinctId: params.userId,
    event: `subscription_${params.action}`,
    properties: {
      from_tier: params.fromTier,
      to_tier: params.toTier,
      mrr_eur_cents: params.mrr,
    },
  })
}

/** Identify a user with their profile data */
export function identifyUser(params: {
  userId: string
  email?: string
  tier?: string
  role?: string
  createdAt?: string
}): void {
  postHogConnector.capture({
    distinctId: params.userId,
    event: '$identify',
    properties: {
      $set: {
        email: params.email,
        tier: params.tier,
        role: params.role,
        created_at: params.createdAt,
      },
    },
  })
}
