import type { EmailTemplate } from './templates'
import { getDefaultFrom, getResendClient, resolveEmailRecipients } from '@/lib/resend'
import { writeEmailLog } from '@/lib/email/email-logs'

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

  await writeEmailLog({
    email: to,
    type: 'generic_template_email',
    status: 'pending',
    metadata: { subject: template.subject },
  })

  const response = await resend.emails.send({
    from: getDefaultFrom(),
    to: resolveEmailRecipients(to).to,
    subject: template.subject,
    html: template.html,
  })

  if (response.error) {
    await writeEmailLog({
      email: to,
      type: 'generic_template_email',
      status: 'failed',
      errorMessage: response.error.message,
      metadata: { subject: template.subject },
    })
    throw new Error(`[sendEmail] Resend error: ${response.error.message}`)
  }

  await writeEmailLog({
    email: to,
    type: 'generic_template_email',
    status: 'sent',
    resendEmailId: response.data?.id,
    metadata: { subject: template.subject },
  })
}
