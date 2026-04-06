import { Resend } from 'resend'
import { env } from './env'

export const resend = new Resend(env.RESEND_API_KEY || 'placeholder')

export const FROM_EMAIL = (process.env['NEXT_PUBLIC_FROM_EMAIL'] as string) || 'noreply@liftgo.net'

