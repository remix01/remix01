import { Resend } from 'resend'
import type { EmailTemplate } from './templates'

/**
 * Send email using Resend. Falls back to a no-op warning if RESEND_API_KEY is not set.
 */
export async function sendEmail(to: string, template: EmailTemplate): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[sendEmail] RESEND_API_KEY not configured, skipping email send')
    console.warn('[sendEmail] Would send:', { to, subject: template.subject })
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM || 'LiftGO <noreply@liftgo.net>',
    to,
    subject: template.subject,
    html: template.html,
  })

  if (error) {
    throw new Error(`[sendEmail] Resend error: ${error.message}`)
  }
}
