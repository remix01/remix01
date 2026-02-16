import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is missing from environment variables')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM_EMAIL = process.env.NEXT_PUBLIC_FROM_EMAIL || 'noreply@liftgo.net'
