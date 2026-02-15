import nodemailer from 'nodemailer'
import type { EmailTemplate } from './templates'

/**
 * Send email using SMTP configuration from environment variables
 */
export async function sendEmail(to: string, template: EmailTemplate): Promise<void> {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('[sendEmail] SMTP not configured, skipping email send')
    console.log('[sendEmail] Would send:', { to, subject: template.subject })
    return
  }

  const transporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: template.subject,
    html: template.html,
  })

  console.log('[sendEmail] Email sent successfully to:', to)
}
