import { Resend } from 'resend'
import { env } from './env'

export function getResendClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null
  return new Resend(env.RESEND_API_KEY)
}

export const FROM_EMAIL =
  env.EMAIL_FROM ||
  env.DEFAULT_FROM_EMAIL ||
  env.RESEND_FROM ||
  process.env.NEXT_PUBLIC_FROM_EMAIL ||
  'noreply@liftgo.net'

export const FROM_NAME = 'LiftGO'

export function getDefaultFrom(senderName: string = FROM_NAME): string {
  return `${senderName} <${FROM_EMAIL}>`
}

function isNonProductionEnvironment(): boolean {
  const nodeEnv = process.env.NODE_ENV
  const vercelEnv = process.env.VERCEL_ENV
  const appEnv = process.env.APP_ENV || process.env.ENVIRONMENT || process.env.STAGE
  const hasEmailSafetyOverrides = Boolean(
    env.EMAIL_DEV_REDIRECT_TO.trim() || env.EMAIL_ALLOWED_RECIPIENTS.trim()
  )
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''

  if (appEnv) return !['production', 'prod'].includes(appEnv.toLowerCase())
  if (vercelEnv) return vercelEnv !== 'production'
  if (hasEmailSafetyOverrides) return true
  if (/(localhost|127\.0\.0\.1|staging|preview|dev)/i.test(appUrl)) return true
  return nodeEnv !== 'production'
}

export function resolveEmailRecipients(to: string | string[]): {
  to: string[]
  originalTo: string[]
  redirected: boolean
} {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const recipients = Array.from(new Set((Array.isArray(to) ? to : [to])
    .map((value) => value.trim())
    .filter(Boolean)))

  const invalidRecipients = recipients.filter((recipient) => !emailRegex.test(recipient))
  if (invalidRecipients.length > 0) {
    throw new Error(`[email-safety] Invalid recipient email format: ${invalidRecipients.join(', ')}`)
  }

  const originalTo = [...recipients]

  if (!isNonProductionEnvironment()) {
    return { to: recipients, originalTo, redirected: false }
  }

  const allowedRecipients = env.EMAIL_ALLOWED_RECIPIENTS
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)

  if (allowedRecipients.length > 0) {
    const disallowed = recipients.filter(
      (recipient) => !allowedRecipients.includes(recipient.toLowerCase())
    )

    if (disallowed.length > 0) {
      throw new Error(
        `[email-safety] Blocked non-allowed recipients in non-production: ${disallowed.join(', ')}`
      )
    }
  }

  const redirectTo = env.EMAIL_DEV_REDIRECT_TO.trim()
  if (redirectTo) {
    console.warn('[email-safety] Redirecting email recipients in non-production', {
      originalTo,
      redirectTo,
    })
    return { to: [redirectTo], originalTo, redirected: true }
  }

  return { to: recipients, originalTo, redirected: false }
}
