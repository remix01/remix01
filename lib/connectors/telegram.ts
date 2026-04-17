/**
 * Telegram Bot API Connector
 *
 * Sends push notifications to admin chat or per-user Telegram accounts.
 *
 * Env vars required:
 *   TELEGRAM_BOT_TOKEN   — BotFather token
 *   TELEGRAM_ADMIN_CHAT  — default admin chat/group ID (negative for groups)
 *
 * Usage:
 *   await sendTelegramMessage('Plačilo padlo! Escrow #123', { chatId: '-100...' })
 *   await alertAdmin('Kritična napaka v Stripe webhookt')
 */

import type { Connector, ConnectorHealth } from './index'

const TELEGRAM_API = 'https://api.telegram.org'

export interface TelegramSendOptions {
  chatId?: string | number      // defaults to TELEGRAM_ADMIN_CHAT
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  disableNotification?: boolean // silent message
  threadId?: number             // message_thread_id for topic groups
}

export interface TelegramMessage {
  text: string
  options?: TelegramSendOptions
}

export interface TelegramResult {
  ok: boolean
  messageId?: number
  error?: string
}

// ── Connector interface ──────────────────────────────────────────────────────

class TelegramConnector implements Connector {
  name = 'telegram' as const

  isConfigured(): boolean {
    return !!(
      process.env.TELEGRAM_BOT_TOKEN &&
      process.env.TELEGRAM_ADMIN_CHAT
    )
  }

  async healthCheck(): Promise<ConnectorHealth> {
    if (!this.isConfigured()) {
      return { name: this.name, healthy: false, error: 'Not configured' }
    }

    const start = Date.now()
    try {
      const res = await fetch(
        `${TELEGRAM_API}/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`,
        { signal: AbortSignal.timeout(5000) }
      )
      const data = await res.json()
      return {
        name: this.name,
        healthy: data.ok === true,
        latencyMs: Date.now() - start,
        error: data.ok ? undefined : data.description,
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

export const telegramConnector = new TelegramConnector()

// ── Core send function ───────────────────────────────────────────────────────

export async function sendTelegramMessage(
  text: string,
  options: TelegramSendOptions = {}
): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const defaultChat = process.env.TELEGRAM_ADMIN_CHAT

  if (!token || !defaultChat) {
    console.warn('[Telegram] Not configured — message skipped')
    return { ok: false, error: 'Not configured' }
  }

  const chatId = options.chatId ?? defaultChat

  try {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: options.parseMode ?? 'HTML',
      disable_notification: options.disableNotification ?? false,
    }
    if (options.threadId) body.message_thread_id = options.threadId

    const res = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    })

    const data = await res.json()

    if (!data.ok) {
      console.error('[Telegram] API error:', data.description)
      return { ok: false, error: data.description }
    }

    return { ok: true, messageId: data.result?.message_id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Telegram] Send error:', msg)
    return { ok: false, error: msg }
  }
}

// ── High-level helpers ───────────────────────────────────────────────────────

/** Send a critical alert to the admin Telegram chat */
export async function alertAdmin(
  title: string,
  body?: string,
  level: 'info' | 'warning' | 'critical' = 'info'
): Promise<TelegramResult> {
  const emoji = { info: 'ℹ️', warning: '⚠️', critical: '🚨' }[level]
  const text = body
    ? `${emoji} <b>${title}</b>\n\n${body}`
    : `${emoji} <b>${title}</b>`

  return sendTelegramMessage(text, { parseMode: 'HTML' })
}

/** Alert when a Stripe payment fails */
export async function alertPaymentFailed(params: {
  escrowId: string
  amount: number
  userId: string
  error: string
}): Promise<TelegramResult> {
  return alertAdmin(
    'Plačilo neuspešno',
    `Escrow: <code>${params.escrowId}</code>\nZnesek: <b>${params.amount / 100} €</b>\nStrank: <code>${params.userId}</code>\nNapaka: ${params.error}`,
    'critical'
  )
}

/** Alert when a dispute is opened */
export async function alertDisputeOpened(params: {
  disputeId: string
  escrowId: string
  reason: string
}): Promise<TelegramResult> {
  return alertAdmin(
    'Novi spor odprt',
    `Spor: <code>${params.disputeId}</code>\nEscrow: <code>${params.escrowId}</code>\nRazlog: ${params.reason}`,
    'warning'
  )
}

/** Notify a specific craftsman via their saved Telegram chat ID */
export async function notifyCraftsman(params: {
  telegramChatId: string | number
  text: string
  silent?: boolean
}): Promise<TelegramResult> {
  return sendTelegramMessage(params.text, {
    chatId: params.telegramChatId,
    parseMode: 'HTML',
    disableNotification: params.silent,
  })
}
