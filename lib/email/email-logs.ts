import { supabaseAdmin } from '@/lib/supabase-admin'

export type EmailLogStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'blocked'
  | 'rate_limited'
  | 'honeypot'

export async function writeEmailLog(params: {
  email: string
  type: string
  status: EmailLogStatus
  userId?: string | null
  resendEmailId?: string | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}) {
  const {
    email,
    type,
    status,
    userId,
    resendEmailId,
    errorMessage,
    metadata,
  } = params

  try {
    await supabaseAdmin.from('email_logs').insert({
      email,
      type,
      status,
      user_id: userId ?? null,
      resend_email_id: resendEmailId ?? null,
      error_message: errorMessage ?? null,
      metadata: metadata ?? null,
    })
  } catch (error) {
    console.warn('[email-logs] Failed to write email_logs row (table missing or unavailable)', {
      type,
      status,
      error,
    })
  }
}
