/**
 * Generic Webhook Receiver
 *
 * Universal inbound webhook endpoint. External services can send events here.
 * Each event is:
 *   1. Validated (optional HMAC signature or API key)
 *   2. Logged to Supabase webhook_events table
 *   3. Dispatched to the appropriate handler via source routing
 *
 * Supported sources (via ?source= query param or X-Webhook-Source header):
 *   sentry    → error-classifier skill
 *   gmail     → email-responder skill
 *   custom    → stored + available for n8n/automation pickup
 *
 * URL: POST /api/webhooks/generic?source=sentry
 *
 * Auth options (checked in order):
 *   1. X-Api-Key header matches WEBHOOK_API_KEY env var
 *   2. X-Signature-256 HMAC with WEBHOOK_SECRET env var
 *   3. No auth (logs warning, still processes in non-production)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { classifyError, type SentryEvent } from '@/lib/skills/error-classifier'
import { processInboundEmail, type InboundEmail } from '@/lib/skills/email-responder'

type WebhookSource = 'sentry' | 'gmail' | 'custom'

// ── Auth ─────────────────────────────────────────────────────────────────────

function isAuthorized(request: NextRequest, rawBody: string): boolean {
  const apiKey = request.headers.get('x-api-key')
  if (apiKey && process.env.WEBHOOK_API_KEY) {
    try {
      return timingSafeEqual(Buffer.from(apiKey), Buffer.from(process.env.WEBHOOK_API_KEY))
    } catch { return false }
  }

  const sig = request.headers.get('x-signature-256') ?? request.headers.get('x-hub-signature-256')
  if (sig && process.env.WEBHOOK_SECRET) {
    const expected = `sha256=${createHmac('sha256', process.env.WEBHOOK_SECRET).update(rawBody).digest('hex')}`
    try {
      return timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    } catch { return false }
  }

  // Allow unauthenticated in development only
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Webhook] No auth — processing in dev mode')
    return true
  }

  return false
}

// ── Source-specific handlers ──────────────────────────────────────────────────

async function handleSentry(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const evt = payload as unknown as SentryEvent
  const result = await classifyError(evt)
  return { classified: true, priority: result.priority, component: result.component }
}

async function handleGmail(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  // Gmail push notification sends a base64-encoded Pub/Sub message
  const data = payload.message as { data?: string; messageId?: string } | undefined
  if (!data?.data) return { skipped: 'no data field' }

  let email: InboundEmail
  try {
    const decoded = JSON.parse(Buffer.from(data.data, 'base64').toString())
    email = {
      messageId: data.messageId ?? decoded.id ?? 'unknown',
      from: decoded.from ?? '',
      fromName: decoded.fromName,
      subject: decoded.subject ?? '(no subject)',
      bodyText: decoded.body ?? decoded.snippet ?? '',
      receivedAt: new Date().toISOString(),
    }
  } catch {
    return { skipped: 'decode error' }
  }

  const result = await processInboundEmail(email)
  return { intent: result.intent, autoSent: result.autoSent }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()

  if (!isAuthorized(request, rawBody)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const source = (
    request.nextUrl.searchParams.get('source') ??
    request.headers.get('x-webhook-source') ??
    'custom'
  ) as WebhookSource

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Log every event to Supabase
  const { data: logEntry } = await supabaseAdmin
    .from('webhook_events')
    .insert({
      source,
      payload,
      received_at: new Date().toISOString(),
      status: 'processing',
    })
    .select('id')
    .single()

  const eventId = logEntry?.id

  let handlerResult: Record<string, unknown> = {}
  let status = 'processed'
  let error: string | null = null

  try {
    switch (source) {
      case 'sentry':
        handlerResult = await handleSentry(payload)
        break
      case 'gmail':
        handlerResult = await handleGmail(payload)
        break
      default:
        // 'custom' — stored for n8n or manual processing
        handlerResult = { stored: true }
    }
  } catch (err) {
    status = 'error'
    error = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[Webhook/${source}] Handler error:`, error)
  }

  // Update log with result
  if (eventId) {
    await supabaseAdmin
      .from('webhook_events')
      .update({ status, handler_result: handlerResult, error, processed_at: new Date().toISOString() })
      .eq('id', eventId)
  }

  return NextResponse.json({
    ok: status !== 'error',
    source,
    eventId,
    result: handlerResult,
    ...(error ? { error } : {}),
  })
}

// GET — health check + registered sources
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    ok: true,
    sources: ['sentry', 'gmail', 'custom'],
    auth: ['x-api-key', 'x-signature-256'],
  })
}
