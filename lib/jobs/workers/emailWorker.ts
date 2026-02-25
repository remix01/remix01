/**
 * Email Worker — Send escrow-related emails
 * 
 * Jobs:
 * - send_release_email: Notify customer & partner of release
 * - send_refund_email: Notify customer of refund
 * - send_dispute_email: Notify both parties of dispute
 * - send_payment_confirmed_email: Confirm payment received
 */

import { Job } from '../queue'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface EmailJobPayload {
  transactionId: string
  recipientEmail: string
  recipientName?: string
  partnerName?: string
  amount?: number
  reason?: string
  metadata?: Record<string, any>
}

export async function handleEmailJob(job: Job<EmailJobPayload>): Promise<void> {
  const { type, payload } = job
  const { transactionId, recipientEmail, recipientName, partnerName, amount, reason, metadata } = payload

  // Fetch transaction details if needed
  const { data: escrow } = await supabaseAdmin
    .from('escrow_transactions')
    .select('*')
    .eq('id', transactionId)
    .maybeSingle()

  if (!escrow) {
    throw new Error(`[EMAIL] Escrow transaction not found: ${transactionId}`)
  }

  let subject = ''
  let htmlBody = ''

  // Build email based on job type
  switch (type) {
    case 'send_release_email':
      subject = `Payment Released - Transaction ${transactionId.slice(0, 8)}`
      htmlBody = buildReleaseEmail(
        recipientName || 'Valued Customer',
        partnerName || 'Partner',
        amount || escrow.amount_cents
      )
      break

    case 'send_refund_email':
      subject = `Refund Processed - Transaction ${transactionId.slice(0, 8)}`
      htmlBody = buildRefundEmail(
        recipientName || 'Valued Customer',
        amount || escrow.amount_cents,
        reason || 'Your request'
      )
      break

    case 'send_dispute_email':
      subject = `Dispute Notification - Transaction ${transactionId.slice(0, 8)}`
      htmlBody = buildDisputeEmail(
        recipientName || 'Valued Customer',
        reason || 'A dispute has been opened'
      )
      break

    case 'send_payment_confirmed_email':
      subject = `Payment Confirmed - Transaction ${transactionId.slice(0, 8)}`
      htmlBody = buildPaymentConfirmedEmail(
        recipientName || 'Valued Customer',
        partnerName || 'Partner',
        amount || escrow.amount_cents
      )
      break

    default:
      throw new Error(`Unknown email job type: ${type}`)
  }

  // Send email via Resend or similar provider
  // For now, we'll just log it (integrate your email provider)
  console.log(`[EMAIL] Sending ${type} to ${recipientEmail}`, {
    subject,
    transactionId,
    metadata,
  })

  // TODO: Integrate with Resend or your email provider
  // const { error } = await resend.emails.send({
  //   from: 'noreply@liftgo.com',
  //   to: recipientEmail,
  //   subject,
  //   html: htmlBody,
  // })
  // if (error) throw new Error(`Email send failed: ${error.message}`)
}

// ── EMAIL TEMPLATES
function buildReleaseEmail(customerName: string, partnerName: string, amountCents: number): string {
  const amount = (amountCents / 100).toFixed(2)
  return `
    <h2>Payment Released</h2>
    <p>Hi ${customerName},</p>
    <p>Great news! Your payment of <strong>$${amount}</strong> has been released to ${partnerName}.</p>
    <p>The transaction is now complete. Thank you for using LiftGO!</p>
  `
}

function buildRefundEmail(customerName: string, amountCents: number, reason: string): string {
  const amount = (amountCents / 100).toFixed(2)
  return `
    <h2>Refund Processed</h2>
    <p>Hi ${customerName},</p>
    <p>Your refund of <strong>$${amount}</strong> has been processed.</p>
    <p>Reason: ${reason}</p>
    <p>The funds should appear in your account within 5-10 business days.</p>
  `
}

function buildDisputeEmail(customerName: string, reason: string): string {
  return `
    <h2>Dispute Opened</h2>
    <p>Hi ${customerName},</p>
    <p>${reason}</p>
    <p>Our support team will review this and contact you shortly.</p>
  `
}

function buildPaymentConfirmedEmail(customerName: string, partnerName: string, amountCents: number): string {
  const amount = (amountCents / 100).toFixed(2)
  return `
    <h2>Payment Received</h2>
    <p>Hi ${customerName},</p>
    <p>Your payment of <strong>$${amount}</strong> to ${partnerName} has been confirmed and is being held securely.</p>
    <p>The payment will be released once both parties confirm completion.</p>
  `
}
