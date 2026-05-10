import { supabaseAdmin } from '@/lib/supabase-admin'

export type EmailLogStatus =
  | 'pending'
  | 'sent'
  | 'failed'
  | 'blocked'
  | 'rate_limited'
  | 'honeypot'

/**
 * Validates if a string is a valid UUID v4 format
 */
function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false
  // UUID v4 format: 8-4-4-4-12 hexadecimal digits
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

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

  // Validate resendEmailId if provided
  if (resendEmailId && !isValidUUID(resendEmailId)) {
    console.warn('[email-logs] Invalid Resend email ID format (must be UUID)', {
      type,
      status,
      resendEmailId,
    })
  }

  try {
    await supabaseAdmin.from('email_logs').insert({
      email,
      type,
      status,
      user_id: userId ?? null,
      resend_email_id: isValidUUID(resendEmailId) ? resendEmailId : null,
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
