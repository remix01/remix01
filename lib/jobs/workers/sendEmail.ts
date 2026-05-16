import { Job } from '../queue'
import { getResendClient, getDefaultFrom, resolveEmailRecipients } from '@/lib/resend'

/**
 * Send email notifications (async job)
 * Runs after DB transaction commits
 * Idempotent: sending duplicate emails is acceptable (checked by email provider)
 */
export async function handleSendEmail(job: Job) {
  const { to, template, escrowId, customData } = job.data

  if (!to || !template) {
    throw new Error('Missing to or template in job data')
  }

  try {
    console.log(`[EMAIL] Sending ${template} email to ${to}`)

    const resend = getResendClient()
    if (!resend) {
      console.warn('[EMAIL] RESEND_API_KEY not configured — email skipped', { template, to })
      return
    }

    const emailContent = buildEmailContent(template, { escrowId, ...customData })
    const { to: resolvedTo } = resolveEmailRecipients(to)

    const result = await resend.emails.send({
      from: getDefaultFrom(),
      to: resolvedTo,
      subject: emailContent.subject,
      html: emailContent.html,
    })

    if (result.error) throw result.error

    console.log(`[EMAIL] Successfully sent ${template} to ${resolvedTo.join(', ')}`)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[EMAIL] Failed to send ${template} to ${to}: ${errorMsg}`)
    throw err // Let queue handle retries
  }
}

/**
 * Build email content based on template
 */
function buildEmailContent(
  template: string,
  data: Record<string, any>
): { subject: string; html: string } {
  switch (template) {
    case 'escrow_created':
      return {
        subject: 'LiftGO - Escrow Payment Created',
        html: `<p>Your escrow payment has been created. Escrow ID: ${data.escrowId}</p>`,
      }
    case 'escrow_released':
      return {
        subject: 'LiftGO - Payment Released',
        html: `<p>Your payment has been released. Escrow ID: ${data.escrowId}</p>`,
      }
    case 'escrow_refunded':
      return {
        subject: 'LiftGO - Payment Refunded',
        html: `<p>Your payment has been refunded. Escrow ID: ${data.escrowId}</p>`,
      }
    case 'dispute_opened':
      return {
        subject: 'LiftGO - Dispute Opened',
        html: `<p>A dispute has been opened for your escrow. Escrow ID: ${data.escrowId}</p>`,
      }
    case 'povprasevanje_confirmation_public':
    case 'povprasevanje_confirmation':
      return {
        subject: `✅ Povpraševanje oddano: ${data.title || data.storitev || 'Novo povpraševanje'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #0d9488;">Vaše povpraševanje je bilo uspešno oddano!</h2>
            <p>Pozdravljeni${data.narocnikName ? ' ' + data.narocnikName : ''},</p>
            <p>Prejeli smo vaše povpraševanje in ga posredujemo preverjenim mojstrom.</p>
            <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
              <tr>
                <td style="padding:8px; border-bottom:1px solid #e2e8f0; color:#64748b; width:40%;">Storitev:</td>
                <td style="padding:8px; border-bottom:1px solid #e2e8f0;"><strong>${data.title || data.storitev || 'N/A'}</strong></td>
              </tr>
              <tr>
                <td style="padding:8px; border-bottom:1px solid #e2e8f0; color:#64748b;">Lokacija:</td>
                <td style="padding:8px; border-bottom:1px solid #e2e8f0;"><strong>${data.location || data.lokacija || 'N/A'}</strong></td>
              </tr>
            </table>
            <p style="background:#f0fdf4; border-left:4px solid #0d9488; padding:12px; border-radius:4px;">
              ⏱️ Preverjen mojster vas bo kontaktiral v <strong>manj kot 2 urah</strong> na vaš email ali telefon.
            </p>
            <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;">
            <p style="color:#94a3b8; font-size:12px;">
              LiftGO — Najdi obrtnika v Sloveniji v 30 sekundah<br>
              <a href="https://liftgo.net" style="color:#0d9488;">liftgo.net</a>
            </p>
          </div>
        `,
      }
    default:
      throw new Error(`Unknown email template: ${template}`)
  }
}
