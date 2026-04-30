/**
 * Email Worker — Send escrow-related and povprasevanja emails
 * 
 * Jobs:
 * - send_release_email: Notify customer & partner of release
 * - send_refund_email: Notify customer of refund
 * - send_dispute_email: Notify both parties of dispute
 * - send_payment_confirmed_email: Confirm payment received
 * - povprasevanje_confirmation: Confirm povprasevanje submitted
 */

import { Job } from '../queue'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { resolveEmailRecipients } from '@/lib/resend'
import { getEmailProvider } from '@/lib/email/provider'

interface EmailJobPayload {
  to?: string | string[]
  template?: string
  escrowId?: string
  customData?: Record<string, any>
  transactionId?: string
  recipientEmail?: string
  recipientName?: string
  recipientUserId?: string
  partnerName?: string
  amount?: number
  reason?: string
  metadata?: Record<string, any>
  // povprasevanje fields
  jobType?: string
  povprasevanjeId?: string
  narocnikId?: string
  narocnikEmail?: string
  narocnikName?: string
  title?: string
  category?: string
  location?: string
  urgency?: string
  budget?: number
}

export async function handleEmailJob(job: Job<EmailJobPayload> & { type?: string }): Promise<void> {
  const type = (job as any).type
  const payload = job.data
  const { to, template, escrowId, customData, jobType, povprasevanjeId, narocnikId, narocnikEmail, narocnikName, title, category, location, urgency, budget, transactionId, recipientEmail, recipientName, recipientUserId, partnerName, amount, reason, metadata } = payload

  const provider = getEmailProvider()

  // Handle povprasevanje confirmation (both authenticated and public)
  if ((jobType === 'povprasevanje_confirmation' || jobType === 'povprasevanje_confirmation_public') && povprasevanjeId) {
    try {
      let emailAddress = narocnikEmail
      let fullName = narocnikName

      // For authenticated submissions, fetch from profile if email not provided
      if (narocnikId && !emailAddress) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email, ime')
          .eq('id', narocnikId)
          .single()

        if (profile?.email) {
          emailAddress = profile.email
          fullName = profile.ime || fullName
        }
      }

      if (!emailAddress) throw new Error(`[EMAIL] No email address found for povprasevanje: ${povprasevanjeId}`)

      const htmlBody = buildPovprasevanjeConfirmationEmail(fullName || 'Naročnik', title || '', category || '', location || '', urgency || '', budget)
      const resolvedRecipients = resolveEmailRecipients(emailAddress)
      if (!resolvedRecipients.to.length) throw new Error('[EMAIL] No recipients after resolution')
      const emailResult = await provider.send({
        to: resolvedRecipients.to,
        subject: `✅ Povpraševanje oddano: ${escapeHtml(title || 'Novo povpraševanje')}`,
        html: htmlBody,
        idempotencyKey: `povprasevanje:${povprasevanjeId}:confirmation`,
      })

      console.log('[EMAIL] Sent', {
        type: jobType,
        povprasevanjeId,
        provider: provider.name,
        resendMessageId: emailResult?.id ?? null,
        recipientsCount: resolvedRecipients.to.length,
        redirected: resolvedRecipients.redirected,
      })
      return
    } catch (error) {
      console.error('[EMAIL] Error sending povprasevanje confirmation:', error)
      throw error
    }
  }

  if (type === 'sendEmail') {
    const effectiveTemplate = template || jobType
    let recipient = to
    if (!recipient && narocnikEmail) recipient = narocnikEmail
    if (!recipient && narocnikId) {
      const { data: profile } = await supabaseAdmin.from('profiles').select('email').eq('id', narocnikId).single()
      recipient = profile?.email
    }
    if (!recipient) throw new Error('[EMAIL] Missing recipient for sendEmail job')
    if (!effectiveTemplate) throw new Error('[EMAIL] Missing template/jobType for sendEmail job')
    const resolvedRecipients = resolveEmailRecipients(recipient)
    if (!resolvedRecipients.to.length) throw new Error('[EMAIL] No recipients after resolution')
    const emailContent = buildGenericEmailContent(effectiveTemplate, { escrowId, ...customData, ...payload })
    const idempotencySource = povprasevanjeId || escrowId || transactionId || 'generic'
    const reminderSuffix = customData?.reminder ? `:${customData.reminder}` : ':initial'
    const emailResult = await provider.send({
      to: resolvedRecipients.to,
      subject: emailContent.subject,
      html: emailContent.html,
      idempotencyKey: `${effectiveTemplate}:${idempotencySource}${reminderSuffix}`,
    })
    console.log('[EMAIL] Sent', {
      type,
      template: effectiveTemplate,
      id: idempotencySource,
      provider: provider.name,
      resendMessageId: emailResult?.id ?? null,
      recipientsCount: resolvedRecipients.to.length,
      redirected: resolvedRecipients.redirected,
    })
    return
  }

  // Handle escrow emails (existing logic)
  if (!transactionId) {
    throw new Error('[EMAIL] No transaction ID or povprasevanje ID provided')
  }

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
  let notificationType = ''
  let notificationTitle = ''
  let notificationBody = ''

  // Build email based on job type
  switch (type) {
    case 'send_release_email':
      subject = `Payment Released - Transaction ${transactionId.slice(0, 8)}`
      htmlBody = buildReleaseEmail(
        escapeHtml(recipientName || 'Valued Customer'),
        escapeHtml(partnerName || 'Partner'),
        amount || escrow.amount_cents
      )
      notificationType = 'escrow_released'
      notificationTitle = 'Payment Released'
      notificationBody = `Your payment of $${((amount || escrow.amount_cents) / 100).toFixed(2)} has been released.`
      break

    case 'send_refund_email':
      subject = `Refund Processed - Transaction ${transactionId.slice(0, 8)}`
      htmlBody = buildRefundEmail(
        escapeHtml(recipientName || 'Valued Customer'),
        amount || escrow.amount_cents,
        escapeHtml(reason || 'Your request')
      )
      notificationType = 'escrow_released'
      notificationTitle = 'Refund Processed'
      notificationBody = `Your refund of $${((amount || escrow.amount_cents) / 100).toFixed(2)} has been processed.`
      break

    case 'send_dispute_email':
      subject = `Dispute Notification - Transaction ${transactionId.slice(0, 8)}`
      htmlBody = buildDisputeEmail(
        escapeHtml(recipientName || 'Valued Customer'),
        escapeHtml(reason || 'A dispute has been opened')
      )
      notificationType = 'dispute_opened'
      notificationTitle = 'Dispute Opened'
      notificationBody = escapeHtml(reason || 'A dispute has been opened on your transaction.')
      break

    case 'send_payment_confirmed_email':
      subject = `Payment Confirmed - Transaction ${transactionId.slice(0, 8)}`
      htmlBody = buildPaymentConfirmedEmail(
        escapeHtml(recipientName || 'Valued Customer'),
        escapeHtml(partnerName || 'Partner'),
        amount || escrow.amount_cents
      )
      notificationType = 'escrow_captured'
      notificationTitle = 'Payment Confirmed'
      notificationBody = `Your payment of $${((amount || escrow.amount_cents) / 100).toFixed(2)} has been confirmed.`
      break

    default:
      throw new Error(`Unknown email job type: ${type}`)
  }

  if (!recipientEmail) throw new Error(`[EMAIL] Missing recipientEmail for ${type}`)
  const resolvedRecipients = resolveEmailRecipients(recipientEmail)
  if (!resolvedRecipients.to.length) throw new Error('[EMAIL] No recipients after resolution')
  const eventType = type.replace('send_', '').replace('_email', '')
  const emailResult = await provider.send({
    to: resolvedRecipients.to,
    subject,
    html: htmlBody,
    idempotencyKey: `escrow:${transactionId}:${eventType}`,
  })
  console.log('[EMAIL] Sent', {
    type,
    transactionId,
    provider: provider.name,
    resendMessageId: emailResult?.id ?? null,
    recipientsCount: resolvedRecipients.to.length,
    redirected: resolvedRecipients.redirected,
  })

  // Insert notification record if we have a user ID
  if (recipientUserId && notificationType) {
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: recipientUserId,
        type: notificationType,
        title: notificationTitle,
        body: notificationBody,
        message: notificationBody,
        resource_id: transactionId,
        resource_type: 'escrow',
        metadata: metadata || {},
      })
    } catch (error) {
      console.error('[EMAIL] Failed to insert notification:', error)
      // Don't fail the email sending if notification insertion fails
    }
  }

}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildGenericEmailContent(template: string, data: Record<string, any>): { subject: string; html: string } {
  switch (template) {
    case 'povprasevanje_confirmation_public':
    case 'povprasevanje_confirmation':
      return {
        subject: `✅ Povpraševanje oddano: ${escapeHtml(data.title || data.storitev || 'Novo povpraševanje')}`,
        html: buildPovprasevanjeConfirmationEmail(
          escapeHtml(data.narocnikName || data.stranka_ime || 'Naročnik'),
          escapeHtml(data.title || data.storitev || ''),
          escapeHtml(data.category || data.kategorija || ''),
          escapeHtml(data.location || data.lokacija || ''),
          escapeHtml(data.urgency || ''),
          data.budget
        ),
      }
    case 'marketplace_match_new_request':
      return {
        subject: `Novo povpraševanje: ${escapeHtml(data.category || data.title || 'Storitev')} v ${escapeHtml(data.location || 'vaši okolici')}`,
        html: `
          <p>${escapeHtml(data.customer_name || 'Naročnik')} potrebuje ${escapeHtml(data.category || data.title || 'storitev')} v ${escapeHtml(data.location || 'vaši okolici')}.</p>
          <p>Dela: ${escapeHtml(data.description || '—')}</p>
          <p>Budget: ${escapeHtml(String(data.budget || 'Po dogovoru'))}</p>
          <p>Pošlji ponudbo: <a href="${escapeHtml(data.link || '#')}">${escapeHtml(data.link || 'Odpri povpraševanje')}</a></p>
        `
      }
    case 'marketplace_offer_received':
      return {
        subject: 'Prejeli ste novo ponudbo',
        html: `
          <p>${escapeHtml(data.craftsman_name || 'Obrtnik')} vam je poslal ponudbo za vaše povpraševanje.</p>
          <p>Cena: ${escapeHtml(String(data.price || 'Po dogovoru'))}</p>
          <p>Sporočilo: ${escapeHtml(data.message || '—')}</p>
          <p>Preglej ponudbo: <a href="${escapeHtml(data.link || '#')}">${escapeHtml(data.link || 'Odpri ponudbo')}</a></p>
        `
      }
    default:
      throw new Error(`Unknown email template: ${template}`)
  }
}

// ── EMAIL TEMPLATES
function buildPovprasevanjeConfirmationEmail(firstName: string, title: string, category: string, location: string, urgency: string, budget?: number): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0d9488;">Vaše povpraševanje je bilo uspešno oddano!</h2>
      <p>Pozdravljeni ${firstName},</p>
      <p>Vaše povpraševanje <strong>${title}</strong> je bilo oddano.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Kategorija:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>${category}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Lokacija:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>${location}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Nujnost:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>${urgency}</strong></td>
        </tr>
        ${budget ? `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Proračun:</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;"><strong>€${budget}</strong></td>
        </tr>` : ''}
      </table>
      <p style="color: #64748b; margin-top: 24px; font-size: 14px;">
        Obrtniki bodo kmalu kontaktirali. Povprečni odzivni čas je manj kot 2 uri.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 12px;">LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah</p>
    </div>
  `
}

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
