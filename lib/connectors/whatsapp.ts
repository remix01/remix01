/**
 * WhatsApp Business Cloud API Connector
 *
 * Sends template messages to customers & craftsmen via Meta's Cloud API.
 * Only approved message templates can be sent to users who haven't
 * messaged the business in the last 24h.
 *
 * Env vars required:
 *   WHATSAPP_ACCESS_TOKEN    — Meta system user token (permanent)
 *   WHATSAPP_PHONE_NUMBER_ID — Phone number ID from Meta Business
 *   WHATSAPP_API_VERSION     — e.g. "v19.0" (defaults to v19.0)
 *
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 */

import type { Connector, ConnectorHealth } from './index'

const DEFAULT_API_VERSION = 'v19.0'

export interface WhatsAppTextMessage {
  to: string              // E.164 format: +38641123456
  text: string
}

export interface WhatsAppTemplateMessage {
  to: string
  templateName: string    // Must be approved in Meta Business Manager
  languageCode: string    // e.g. 'sl' | 'en_US'
  components?: WhatsAppTemplateComponent[]
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button'
  parameters: Array<{
    type: 'text' | 'currency' | 'date_time'
    text?: string
    currency?: { fallback_value: string; code: string; amount_1000: number }
  }>
}

export interface WhatsAppResult {
  ok: boolean
  messageId?: string
  error?: string
}

// ── Connector interface ──────────────────────────────────────────────────────

class WhatsAppConnector implements Connector {
  name = 'whatsapp' as const

  isConfigured(): boolean {
    return !!(
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID
    )
  }

  async healthCheck(): Promise<ConnectorHealth> {
    if (!this.isConfigured()) {
      return { name: this.name, healthy: false, error: 'Not configured' }
    }

    const version = process.env.WHATSAPP_API_VERSION ?? DEFAULT_API_VERSION
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const start = Date.now()

    try {
      const res = await fetch(
        `https://graph.facebook.com/${version}/${phoneId}`,
        {
          headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` },
          signal: AbortSignal.timeout(5000),
        }
      )
      const data = await res.json()
      return {
        name: this.name,
        healthy: res.ok && !!data.id,
        latencyMs: Date.now() - start,
        error: res.ok ? undefined : data.error?.message,
      }
    } catch (err) {
      return {
        name: this.name,
        healthy: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
    }
  }
}

export const whatsAppConnector = new WhatsAppConnector()

// ── Internal sender ──────────────────────────────────────────────────────────

async function sendToCloud(body: Record<string, unknown>): Promise<WhatsAppResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const version = process.env.WHATSAPP_API_VERSION ?? DEFAULT_API_VERSION

  if (!token || !phoneId) {
    console.warn('[WhatsApp] Not configured — message skipped')
    return { ok: false, error: 'Not configured' }
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${version}/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
        signal: AbortSignal.timeout(8000),
      }
    )

    const data = await res.json()

    if (!res.ok) {
      console.error('[WhatsApp] API error:', data.error?.message)
      return { ok: false, error: data.error?.message }
    }

    return { ok: true, messageId: data.messages?.[0]?.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[WhatsApp] Send error:', msg)
    return { ok: false, error: msg }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a free-form text message (only valid within 24h customer-initiated window).
 */
export async function sendWhatsAppText(msg: WhatsAppTextMessage): Promise<WhatsAppResult> {
  return sendToCloud({
    to: msg.to,
    type: 'text',
    text: { body: msg.text },
  })
}

/**
 * Send an approved template message (works anytime).
 */
export async function sendWhatsAppTemplate(msg: WhatsAppTemplateMessage): Promise<WhatsAppResult> {
  return sendToCloud({
    to: msg.to,
    type: 'template',
    template: {
      name: msg.templateName,
      language: { code: msg.languageCode },
      components: msg.components ?? [],
    },
  })
}

// ── LiftGO-specific templates ────────────────────────────────────────────────

/**
 * Notify craftsman that a new matching request arrived.
 * Template: liftgo_nova_naloga (must be approved in Meta)
 */
export async function notifyNewRequestWhatsApp(params: {
  to: string            // craftsman's WhatsApp number in E.164
  taskTitle: string
  taskId: string
}): Promise<WhatsAppResult> {
  return sendWhatsAppTemplate({
    to: params.to,
    templateName: 'liftgo_nova_naloga',
    languageCode: 'sl',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.taskTitle },
          { type: 'text', text: params.taskId },
        ],
      },
    ],
  })
}

/**
 * Notify customer that an offer was received.
 * Template: liftgo_nova_ponudba
 */
export async function notifyOfferReceivedWhatsApp(params: {
  to: string
  craftsmanName: string
  priceEur: number
}): Promise<WhatsAppResult> {
  return sendWhatsAppTemplate({
    to: params.to,
    templateName: 'liftgo_nova_ponudba',
    languageCode: 'sl',
    components: [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: params.craftsmanName },
          {
            type: 'currency',
            currency: {
              fallback_value: `${params.priceEur} €`,
              code: 'EUR',
              amount_1000: params.priceEur * 1000,
            },
          },
        ],
      },
    ],
  })
}
