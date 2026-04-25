import type { EmailTemplate } from './templates'
import { getDefaultFrom, getResendClient, resolveEmailRecipients } from '@/lib/resend'

/**
 * Send email using Resend. Falls back to a no-op warning if RESEND_API_KEY is not set.
 */
export async function sendEmail(to: string, template: EmailTemplate): Promise<void> {
  const resend = getResendClient()
  if (!resend) {
    console.warn('[sendEmail] RESEND_API_KEY not configured, skipping email send')
    console.warn('[sendEmail] Would send:', { to, subject: template.subject })
    return
  }

  const { error } = await resend.emails.send({
    from: getDefaultFrom(),
    to: resolveEmailRecipients(to).to,
    subject: template.subject,
    html: template.html,
  })

  if (error) {
    throw new Error(`[sendEmail] Resend error: ${error.message}`)
  }
}
