/**
 * Webhook Worker — Send webhooks to partners about escrow status changes
 */

import crypto from 'crypto'
import { Job } from '../queue'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface WebhookJobPayload {
  transactionId: string
  statusBefore: string
  statusAfter: string
  partnerWebhookUrl?: string
  metadata?: Record<string, any>
}

export async function handleWebhook(job: Job<WebhookJobPayload>): Promise<void> {
  const { transactionId, statusBefore, statusAfter, partnerWebhookUrl, metadata } = job.data

  // Fetch escrow transaction
  const { data: escrow } = await supabaseAdmin
    .from('escrow_transactions')
    .select('*, partner:partner_id(*)')
    .eq('id', transactionId)
    .maybeSingle()

  if (!escrow) {
    throw new Error(`[WEBHOOK] Escrow transaction not found: ${transactionId}`)
  }

  // Get partner's webhook URL if not provided
  const webhookUrl = partnerWebhookUrl || escrow.partner?.webhook_url

  if (!webhookUrl) {
    console.log(`[WEBHOOK] No webhook URL configured for transaction ${transactionId}`)
    return
  }

  // Build webhook payload
  const payload_data = {
    event: 'escrow.status_changed',
    timestamp: new Date().toISOString(),
    data: {
      transactionId,
      statusBefore,
      statusAfter,
      amountCents: escrow.amount_cents,
      customerEmail: escrow.customer_email,
      metadata,
    },
  }

  try {
    console.log(`[WEBHOOK] Sending webhook to ${webhookUrl}`, payload_data)

    const body = JSON.stringify(payload_data)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-LiftGO-Signature': generateWebhookSignature(body),
      },
      body,
    })

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
    }

    console.log(`[WEBHOOK] Webhook sent successfully to ${webhookUrl}`)
  } catch (error: unknown) {
    console.error(`[WEBHOOK] Failed to send webhook to ${webhookUrl}:`, error)
    throw error // Retry
  }
}

function generateWebhookSignature(body: string): string {
  const secret = process.env.WEBHOOK_SIGNING_SECRET
  if (!secret) throw new Error('[WEBHOOK] WEBHOOK_SIGNING_SECRET not configured')
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`
}
