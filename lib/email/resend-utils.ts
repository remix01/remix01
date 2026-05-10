import { Resend } from 'resend'
import { env } from '@/lib/env'
import { v4 as uuidv4 } from 'uuid'
import {
  FROM_EMAIL,
  FROM_NAME,
  getResendClient as getSharedResendClient,
  resolveEmailRecipients,
} from '@/lib/resend'

/**
 * Production-ready Resend email utilities with:
 * - Idempotency keys to prevent duplicate emails
 * - Exponential backoff retry strategy
 * - Error handling and logging
 * - Support for both single and batch emails
 */

function getEmailRenderPayload(html?: string, text?: string): { html?: string; text?: string } {
  if (html && text) return { html, text }
  if (html) return { html }
  if (text) return { text }
  throw new Error('Either html or text content is required')
}

/**
 * Configuration for email sending
 */
export const EMAIL_CONFIG = {
  FROM_EMAIL,
  FROM_NAME,
  MAX_RETRIES: 3,
  INITIAL_BACKOFF_MS: 1000,
  MAX_BACKOFF_MS: 30000,
}

/**
 * Retry strategy with exponential backoff
 * Only retries on: 429 (rate limit) and 500 (server error)
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = EMAIL_CONFIG.MAX_RETRIES
): Promise<T> {
  let lastError: any
  let backoffMs = EMAIL_CONFIG.INITIAL_BACKOFF_MS

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      const statusCode = error.statusCode || error.status

      // Only retry on 429 (rate limit) and 500 (server error)
      if (![429, 500].includes(statusCode)) {
        throw error // Don't retry on other errors
      }

      if (attempt < maxRetries) {
        console.log(
          `[Resend] Retry attempt ${attempt + 1}/${maxRetries} after ${backoffMs}ms`,
          { statusCode }
        )
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
        backoffMs = Math.min(backoffMs * 2, EMAIL_CONFIG.MAX_BACKOFF_MS)
      }
    }
  }

  throw lastError
}

/**
 * Generate idempotency key for single emails
 * Format: <event-type>/<entity-id>
 * Example: welcome-email/user-123
 */
export function generateIdempotencyKey(eventType: string, entityId: string): string {
  if (!eventType || !entityId) {
    throw new Error('eventType and entityId are required for idempotency key')
  }
  const key = `${eventType}/${entityId}`
  if (key.length > 256) {
    throw new Error(`Idempotency key exceeds 256 character limit: ${key.length}`)
  }
  return key
}

/**
 * Generate batch idempotency key
 * Format: batch-<event-type>/<batch-id>
 * Example: batch-orders/batch-456
 */
export function generateBatchIdempotencyKey(
  eventType: string,
  batchId: string
): string {
  const key = `batch-${eventType}/${batchId}`
  if (key.length > 256) {
    throw new Error(`Batch idempotency key exceeds 256 character limit: ${key.length}`)
  }
  return key
}

/**
 * Send a single email with idempotency key, retries, and error handling
 */
export async function sendEmail({
  from,
  to,
  subject,
  html,
  text,
  cc,
  bcc,
  replyTo,
  scheduledAt,
  attachments,
  tags,
  headers,
  idempotencyKey,
  eventType,
  entityId,
}: {
  from?: string
  to: string | string[]
  subject: string
  html?: string
  text?: string
  cc?: string[]
  bcc?: string[]
  replyTo?: string | string[]
  scheduledAt?: string
  attachments?: Array<{ filename: string; content: Buffer | string }>
  tags?: Array<{ name: string; value: string }>
  headers?: Record<string, string>
  idempotencyKey?: string
  eventType?: string
  entityId?: string
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    if (!env.RESEND_API_KEY) {
      console.warn('[sendEmail] RESEND_API_KEY not configured')
      return { success: false, error: 'Email service not configured' }
    }

    const renderPayload = getEmailRenderPayload(html, text)

    // Generate idempotency key if not provided
    let key = idempotencyKey
    if (!key && eventType && entityId) {
      key = generateIdempotencyKey(eventType, entityId)
    }

    // Normalize to array for consistency
    const resolvedRecipients = resolveEmailRecipients(to)
    const toArray = resolvedRecipients.to
    if (toArray.length > 50) {
      throw new Error(`To list exceeds 50 recipients: ${toArray.length}`)
    }
    for (const address of toArray) {
      if (!isValidEmail(address)) {
        throw new Error(`Invalid to email address: ${address}`)
      }
    }

    if (cc) {
      for (const address of cc) {
        if (!isValidEmail(address)) {
          throw new Error(`Invalid cc email address: ${address}`)
        }
      }
    }

    if (bcc) {
      for (const address of bcc) {
        if (!isValidEmail(address)) {
          throw new Error(`Invalid bcc email address: ${address}`)
        }
      }
    }

    const resend = getSharedResendClient()
    if (!resend) {
      throw new Error('Email service not configured')
    }

    const data = await retryWithBackoff(async () => {
      const response = await resend.emails.send({
        from: from || `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
        to: toArray,
        subject,
        ...renderPayload,
        cc,
        bcc,
        replyTo,
        scheduledAt,
        attachments,
        tags,
        headers,
      } as any, key ? { idempotencyKey: key } : undefined)

      if (response.error) {
        const error = new Error(`[Resend] ${response.error.message}`) as any
        // Preserve status code for retry logic
        error.statusCode = (response.error as any).statusCode || 500
        throw error
      }

      return response.data
    })

    console.log('[sendEmail] Success', {
      messageId: data?.id,
      to: toArray,
      subject,
      idempotencyKey: key,
    })

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (error: any) {
    console.error('[sendEmail] Error', {
      error: error.message,
      to,
      subject,
      statusCode: error.statusCode || error.status,
    })

    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Interface for batch email
 */
export interface BatchEmailItem {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  cc?: string[]
  bcc?: string[]
  replyTo?: string | string[]
  tags?: Array<{ name: string; value: string }>
  headers?: Record<string, string>
}

/**
 * Send batch emails (2-100 emails in one request)
 * Important: No attachments or scheduling support
 * Atomic: If one email fails validation, the entire batch fails
 */
export async function sendBatchEmails({
  emails,
  idempotencyKey,
  eventType,
  batchId,
}: {
  emails: BatchEmailItem[]
  idempotencyKey?: string
  eventType?: string
  batchId?: string
}): Promise<{ success: boolean; messageIds?: string[]; error?: string }> {
  try {
    if (!env.RESEND_API_KEY) {
      console.warn('[sendBatchEmails] RESEND_API_KEY not configured')
      return { success: false, error: 'Email service not configured' }
    }

    // Validation
    if (emails.length < 2 || emails.length > 100) {
      throw new Error(
        `Batch size must be between 2 and 100 emails: ${emails.length} provided`
      )
    }

    // Pre-validate all emails before sending
    for (const email of emails) {
      if (!email.to || !email.subject || (!email.html && !email.text)) {
        throw new Error('All emails must have: to, subject, and either html or text')
      }

      const toArray = Array.isArray(email.to) ? email.to : [email.to]
      if (toArray.length > 50) {
        throw new Error(
          `Individual email exceeds 50 recipients: ${toArray.length}`
        )
      }

      // Validate email formats
      for (const address of toArray) {
        if (!isValidEmail(address)) {
          throw new Error(`Invalid email address: ${address}`)
        }
      }
    }

    // Generate batch idempotency key if not provided
    let key = idempotencyKey
    if (!key && eventType && batchId) {
      key = generateBatchIdempotencyKey(eventType, batchId)
    } else if (!key) {
      // Generate a unique batch ID if none provided
      key = generateBatchIdempotencyKey(
        eventType || 'batch-email',
        uuidv4().substring(0, 8)
      )
    }

    const emailData = emails.map((email) => {
      const renderPayload = getEmailRenderPayload(email.html, email.text)
      return {
        from: `${EMAIL_CONFIG.FROM_NAME} <${EMAIL_CONFIG.FROM_EMAIL}>`,
        to: resolveEmailRecipients(email.to).to,
        subject: email.subject,
        ...renderPayload,
        cc: email.cc,
        bcc: email.bcc,
        replyTo: email.replyTo,
        tags: email.tags,
        headers: email.headers,
      }
    })

    const resend = getSharedResendClient()
    if (!resend) {
      throw new Error('Email service not configured')
    }

    const data = await retryWithBackoff(async () => {
      const response = await resend.batch.send(
        emailData as any,
        key ? { idempotencyKey: key } : undefined
      )

      if (response.error) {
        const error = new Error(`[Resend Batch] ${response.error.message}`) as any
        // Preserve status code for retry logic
        error.statusCode = (response.error as any).statusCode || 500
        throw error
      }

      return response.data
    })

    const messageIds = data?.data?.map((item: { id: string }) => item.id) || []

    console.log('[sendBatchEmails] Success', {
      batchSize: emails.length,
      messageIds,
      idempotencyKey: key,
    })

    return {
      success: true,
      messageIds,
    }
  } catch (error: any) {
    console.error('[sendBatchEmails] Error', {
      error: error.message,
      batchSize: emails.length,
      statusCode: error.statusCode || error.status,
    })

    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Helper to send templated emails (combines template with sending logic)
 */
export async function sendTemplatedEmail({
  from,
  to,
  template,
  eventType,
  entityId,
  cc,
  bcc,
  replyTo,
  scheduledAt,
  attachments,
  tags,
  headers,
}: {
  from?: string
  to: string | string[]
  template: { subject: string; html: string; text?: string }
  eventType?: string
  entityId?: string
  cc?: string[]
  bcc?: string[]
  replyTo?: string | string[]
  scheduledAt?: string
  attachments?: Array<{ filename: string; content: Buffer | string }>
  tags?: Array<{ name: string; value: string }>
  headers?: Record<string, string>
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return sendEmail({
    from,
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
    eventType,
    entityId,
    cc,
    bcc,
    replyTo,
    scheduledAt,
    attachments,
    tags,
    headers,
  })
}
