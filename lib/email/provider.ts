import { Resend } from 'resend'
import { env } from '@/lib/env'
import { extractEmailAddress } from '@/lib/resend'

export type EmailProviderName = 'resend' | 'sendgrid'

export interface SendEmailInput {
  to: string[]
  subject: string
  html: string
  idempotencyKey?: string
}

export interface EmailProvider {
  readonly name: EmailProviderName
  send(input: SendEmailInput): Promise<{ id: string | null }>
}

class ResendProvider implements EmailProvider {
  readonly name: EmailProviderName = 'resend'
  private readonly client: Resend
  constructor() {
    if (!env.RESEND_API_KEY) throw new Error('[EMAIL] RESEND_API_KEY missing')
    this.client = new Resend(env.RESEND_API_KEY)
  }
  async send(input: SendEmailInput): Promise<{ id: string | null }> {
    const result = await this.client.emails.send({
      from: getFromEmail(),
      to: input.to,
      subject: input.subject,
      html: input.html,
    } as any, input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined)

    if (result.error) throw new Error(`[EMAIL][resend] ${result.error.message}`)
    return { id: result.data?.id ?? null }
  }
}

class SendGridProvider implements EmailProvider {
  readonly name: EmailProviderName = 'sendgrid'
  private readonly apiKey: string
  constructor() {
    this.apiKey = process.env.SENDGRID_API_KEY ?? ''
    if (!this.apiKey) throw new Error('[EMAIL] SENDGRID_API_KEY missing')
  }

  async send(input: SendEmailInput): Promise<{ id: string | null }> {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: { email: extractEmailAddress(getFromEmail()) },
        personalizations: [{ to: input.to.map((email) => ({ email })) }],
        subject: input.subject,
        content: [{ type: 'text/html', value: input.html }],
        custom_args: input.idempotencyKey ? { idempotency_key: input.idempotencyKey } : undefined,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`[EMAIL][sendgrid] HTTP ${response.status}: ${body}`)
    }

    return { id: response.headers.get('x-message-id') }
  }
}

export function getFromEmail(): string {
  const from = process.env.FROM_EMAIL || env.EMAIL_FROM || env.DEFAULT_FROM_EMAIL || env.RESEND_FROM || 'noreply@liftgo.net'
  return from.includes('<') ? from : `LiftGO <${from}>`
}

export function getEmailProvider(): EmailProvider {
  const selected = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase() as EmailProviderName | ''

  if (selected === 'sendgrid') return new SendGridProvider()
  if (selected === 'ses') {
    throw new Error('[EMAIL] EMAIL_PROVIDER=ses is not supported in this deployment. Use resend or sendgrid.')
  }
  if (selected === 'resend') return new ResendProvider()

  if (env.RESEND_API_KEY) return new ResendProvider()
  if (process.env.SENDGRID_API_KEY) return new SendGridProvider()

  throw new Error('[EMAIL] No email provider configured. Set EMAIL_PROVIDER and provider credentials.')
}
