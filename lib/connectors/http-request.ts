/**
 * Generic HTTP Request Connector
 *
 * Outbound HTTP for calling external APIs and sending webhook events.
 * Features:
 *   - Timeout + retry with exponential backoff
 *   - HMAC-SHA256 signing (for outbound webhooks)
 *   - Structured response with error details
 *   - Optional audit trail to Supabase
 *
 * Usage:
 *   const result = await httpRequest({ url: '...', method: 'POST', json: {...} })
 *   await sendWebhook('https://partner.example.com/hook', { event: 'offer_accepted', ... })
 */

import { createHmac } from 'crypto'
import type { Connector, ConnectorHealth } from './index'

export interface HttpRequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  json?: unknown
  body?: string
  timeoutMs?: number
  retries?: number        // 0 = no retry
  retryDelayMs?: number   // base delay, doubles each attempt
}

export interface HttpResult<T = unknown> {
  ok: boolean
  status?: number
  data?: T
  error?: string
  durationMs: number
  attempt: number
}

// ── Connector interface ──────────────────────────────────────────────────────

class HttpConnector implements Connector {
  name = 'http' as const

  isConfigured(): boolean {
    return true // Always available — no external credentials needed
  }

  async healthCheck(): Promise<ConnectorHealth> {
    return { name: this.name, healthy: true }
  }
}

export const httpConnector = new HttpConnector()

// ── Core request function ────────────────────────────────────────────────────

export async function httpRequest<T = unknown>(
  opts: HttpRequestOptions
): Promise<HttpResult<T>> {
  const {
    url,
    method = 'GET',
    headers = {},
    json,
    body,
    timeoutMs = 10_000,
    retries = 2,
    retryDelayMs = 300,
  } = opts

  const finalHeaders: Record<string, string> = { ...headers }
  let finalBody: string | undefined = body

  if (json !== undefined) {
    finalHeaders['Content-Type'] = 'application/json'
    finalBody = JSON.stringify(json)
  }

  const start = Date.now()
  let lastError: string = ''

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await fetch(url, {
        method,
        headers: finalHeaders,
        body: finalBody,
        signal: AbortSignal.timeout(timeoutMs),
      })

      const contentType = res.headers.get('content-type') ?? ''
      let data: T | undefined
      if (contentType.includes('application/json')) {
        data = (await res.json()) as T
      } else {
        data = (await res.text()) as unknown as T
      }

      return {
        ok: res.ok,
        status: res.status,
        data,
        error: res.ok ? undefined : `HTTP ${res.status}`,
        durationMs: Date.now() - start,
        attempt,
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error'
      if (attempt <= retries) {
        const delay = retryDelayMs * Math.pow(2, attempt - 1)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  return {
    ok: false,
    error: lastError,
    durationMs: Date.now() - start,
    attempt: retries + 1,
  }
}

// ── Webhook sender ───────────────────────────────────────────────────────────

export interface WebhookOptions {
  /** HMAC-SHA256 signing secret — adds X-Signature-256 header */
  secret?: string
  headers?: Record<string, string>
  timeoutMs?: number
  retries?: number
}

/**
 * Send a signed outbound webhook payload to any URL.
 * Signs with HMAC-SHA256 when a secret is provided (like Stripe/GitHub style).
 */
export async function sendWebhook<T extends Record<string, unknown>>(
  url: string,
  payload: T,
  opts: WebhookOptions = {}
): Promise<HttpResult> {
  const body = JSON.stringify(payload)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'LiftGO-Webhook/1.0',
    'X-LiftGO-Event': (payload.event as string) ?? 'generic',
    ...opts.headers,
  }

  if (opts.secret) {
    const sig = createHmac('sha256', opts.secret).update(body).digest('hex')
    headers['X-Signature-256'] = `sha256=${sig}`
  }

  return httpRequest({
    url,
    method: 'POST',
    headers,
    body,
    timeoutMs: opts.timeoutMs ?? 10_000,
    retries: opts.retries ?? 3,
  })
}

// ── LiftGO outbound events ───────────────────────────────────────────────────

/**
 * Broadcast an escrow status change to all registered partner webhooks.
 * Partner webhook URLs are stored in obrtnik_profiles.webhook_url.
 */
export async function broadcastEscrowEvent(params: {
  webhookUrls: string[]
  secret: string
  event: 'escrow.captured' | 'escrow.released' | 'escrow.refunded' | 'dispute.opened'
  escrowId: string
  amountCents: number
  meta?: Record<string, unknown>
}): Promise<HttpResult[]> {
  const payload = {
    event: params.event,
    escrow_id: params.escrowId,
    amount_cents: params.amountCents,
    timestamp: new Date().toISOString(),
    ...params.meta,
  }

  const results = await Promise.allSettled(
    params.webhookUrls.map((url) =>
      sendWebhook(url, payload, { secret: params.secret })
    )
  )

  return results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { ok: false, error: r.reason?.message ?? 'Rejected', durationMs: 0, attempt: 1 }
  )
}
