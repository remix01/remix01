import { Job } from '../queue'

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

    // TODO: Implement email sending via your email provider (e.g., SendGrid, Mailgun, Resend, etc.)
    // For now, just log the email
    
    const emailContent = buildEmailContent(template, { escrowId, ...customData })
    
    // Example with Resend (uncomment and configure as needed):
    // import { Resend } from 'resend'
    // const resend = new Resend(process.env.RESEND_API_KEY)
    // const result = await resend.emails.send({
    //   from: 'noreply@liftgo.com',
    //   to,
    //   subject: emailContent.subject,
    //   html: emailContent.html,
    // })
    // if (result.error) throw result.error

    console.log(`[EMAIL] Successfully sent ${template} to ${to}`)
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
    default:
      throw new Error(`Unknown email template: ${template}`)
  }
}
