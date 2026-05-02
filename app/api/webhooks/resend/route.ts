import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { env } from '@/lib/env'
import { supabaseAdmin } from '@/lib/supabase-admin'

type ResendWebhookEvent = {
  type?: string
  created_at?: string
  data?: {
    email_id?: string
    id?: string
    to?: string | string[]
    [key: string]: unknown
  }
  [key: string]: unknown
}

const SUPPORTED_EVENTS = new Set([
  'email.sent',
  'email.delivered',
  'email.delivery_delayed',
  'email.complained',
  'email.bounced',
  'email.opened',
  'email.clicked',
])

const STATUS_BY_EVENT: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.delivery_delayed': 'delivery_delayed',
  'email.complained': 'complained',
  'email.bounced': 'bounced',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
}

function normalizeEmail(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    const first = value.find((entry) => typeof entry === 'string' && entry.trim().length > 0)
    return first?.trim() ?? null
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }

  return null
}

function parseSvixSignatureHeader(signatureHeader: string): string[] {
  return signatureHeader
    .split(' ')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.split(','))
    .filter((parts) => parts.length === 2 && parts[0] === 'v1')
    .map((parts) => parts[1] as string)
}

function verifyResendWebhookSignature(options: {
  payload: string
  svixId: string
  svixTimestamp: string
  svixSignature: string
  webhookSecret: string
}): boolean {
  const { payload, svixId, svixTimestamp, svixSignature, webhookSecret } = options

  if (!svixId || !svixTimestamp || !svixSignature || !webhookSecret) {
    return false
  }

  const timestamp = Number(svixTimestamp)
  if (!Number.isFinite(timestamp)) return false

  const currentTimestamp = Math.floor(Date.now() / 1000)
  const toleranceInSeconds = 5 * 60
  if (Math.abs(currentTimestamp - timestamp) > toleranceInSeconds) {
    return false
  }

  const secret = webhookSecret.startsWith('whsec_')
    ? webhookSecret.substring('whsec_'.length)
    : webhookSecret
  const secretBytes = Buffer.from(secret, 'base64')
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`
  const expectedSignature = crypto
    .createHmac('sha256', secretBytes)
    .update(signedContent)
    .digest('base64')

  const signatures = parseSvixSignatureHeader(svixSignature)

  return signatures.some((signature) => {
    const actual = Buffer.from(signature, 'base64')
    const expected = Buffer.from(expectedSignature, 'base64')
    if (actual.length !== expected.length) return false
    return crypto.timingSafeEqual(actual, expected)
  })
}

export async function POST(request: NextRequest) {
  const payload = await request.text()

  try {
    let event: ResendWebhookEvent

    if (env.RESEND_WEBHOOK_SECRET) {
      const signatureValid = verifyResendWebhookSignature({
        payload,
        svixId: request.headers.get('svix-id') ?? '',
        svixTimestamp: request.headers.get('svix-timestamp') ?? '',
        svixSignature: request.headers.get('svix-signature') ?? '',
        webhookSecret: env.RESEND_WEBHOOK_SECRET,
      })

      if (!signatureValid) {
        console.error('[resend-webhook] Invalid signature')
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
      }

      event = JSON.parse(payload) as ResendWebhookEvent
    } else {
      event = JSON.parse(payload) as ResendWebhookEvent
    }

    const eventType = event.type || 'unknown'
    const resendEmailId = event.data?.email_id || event.data?.id || null

    console.log('[resend-webhook] Event received', {
      eventType,
      resendEmailId,
    })

    if (!SUPPORTED_EVENTS.has(eventType)) {
      console.warn('[resend-webhook] Unsupported event type', { eventType, resendEmailId })
      return NextResponse.json({ ok: true, ignored: true }, { status: 200 })
    }

    if (!resendEmailId) {
      console.warn('[resend-webhook] Supported event missing email ID, skipping persistence', { eventType })
      return NextResponse.json({ ok: true }, { status: 200 })
    }

    {
      const recipient = normalizeEmail(event.data?.to)
      const now = new Date().toISOString()

      const { error } = await supabaseAdmin
        .from('email_logs')
        .upsert(
          {
            email: recipient || 'unknown@unknown.local',
            type: eventType,
            status: STATUS_BY_EVENT[eventType] || 'received',
            resend_email_id: resendEmailId,
            metadata: event,
            updated_at: now,
          },
          {
            onConflict: 'resend_email_id',
          }
        )

      if (error) {
        console.error('[resend-webhook] Failed to upsert email_logs', {
          error: error.message,
          eventType,
          resendEmailId,
        })

        return NextResponse.json(
          { error: 'Failed to persist webhook event' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (error) {
    console.error('[resend-webhook] Processing error', error)
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 })
  }
}
