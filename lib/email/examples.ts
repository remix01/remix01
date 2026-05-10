/**
 * Example implementations for Resend email sending
 * Shows both single and batch patterns from the Resend quick-start guide
 */

import { sendEmail, sendBatchEmails, sendTemplatedEmail } from './resend-utils'
import { generateIdempotencyKey, generateBatchIdempotencyKey } from './idempotency'
import {
  welcomeEmailTemplate,
  newJobRequestEmailTemplate,
  paymentConfirmationEmailTemplate,
  paymentFailedEmailTemplate,
  jobCompletedEmailTemplate,
  reviewReminderEmailTemplate,
} from './basic-templates'

/**
 * SINGLE EMAIL EXAMPLES
 * Use when: sending one email, email needs attachments, email needs scheduling
 */

/**
 * Example 1: Send welcome email (simplest case)
 */
export async function sendWelcomeEmail(
  userEmail: string,
  userName: string,
  appUrl: string
) {
  const template = welcomeEmailTemplate(userName, appUrl)

  return sendTemplatedEmail({
    to: userEmail,
    template,
    eventType: 'welcome-email',
    entityId: userEmail,
  })
}

/**
 * Example 2: Send new job request notification
 */
export async function sendJobRequestNotification(
  providerEmail: string,
  providerName: string,
  jobId: string,
  jobTitle: string,
  jobDescription: string,
  customerName: string,
  appUrl: string
) {
  const template = newJobRequestEmailTemplate(
    providerName,
    jobTitle,
    jobDescription,
    customerName,
    appUrl
  )

  return sendTemplatedEmail({
    to: providerEmail,
    template,
    eventType: 'job-request',
    entityId: jobId,
  })
}

/**
 * Example 3: Send payment confirmation
 */
export async function sendPaymentConfirmation(
  userEmail: string,
  userName: string,
  amount: number,
  jobDescription: string,
  transactionId: string,
  appUrl: string
) {
  const template = paymentConfirmationEmailTemplate(
    userName,
    amount,
    'USD',
    jobDescription,
    transactionId,
    appUrl
  )

  return sendTemplatedEmail({
    to: userEmail,
    template,
    eventType: 'payment-confirmed',
    entityId: transactionId,
  })
}

/**
 * Example 4: Send payment failed notification
 */
export async function sendPaymentFailed(
  userEmail: string,
  userName: string,
  amount: number,
  reason: string,
  appUrl: string
) {
  return sendEmail({
    to: userEmail,
    subject: `Payment Failed: ${amount}`,
    html: paymentFailedEmailTemplate(userName, amount, 'USD', reason, appUrl).html,
    eventType: 'payment-failed',
    entityId: userEmail,
  })
}

/**
 * Example 5: Send email with CC and BCC
 */
export async function sendJobCompletionWithCopy(
  customerEmail: string,
  adminEmail: string,
  jobId: string,
  jobTitle: string,
  providerName: string,
  appUrl: string
) {
  const template = jobCompletedEmailTemplate(
    'Customer',
    jobTitle,
    providerName,
    appUrl
  )

  return sendTemplatedEmail({
    to: customerEmail,
    template,
    eventType: 'job-completed',
    entityId: jobId,
    cc: [adminEmail],
  })
}

/**
 * BATCH EMAIL EXAMPLES
 * Use when: sending 2+ distinct emails at once, bulk notifications, reducing API calls
 * Limitations: No attachments, no scheduling, atomic (all or nothing)
 */

/**
 * Example 6: Bulk send job requests to multiple providers
 * Sends unique emails to each provider in one API call
 */
export async function sendJobRequestsToBatch(
  jobId: string,
  jobTitle: string,
  jobDescription: string,
  customerName: string,
  appUrl: string,
  providers: Array<{
    email: string
    name: string
  }>
) {
  // Build unique email for each provider
  const emails = providers.map((provider) => {
    const template = newJobRequestEmailTemplate(
      provider.name,
      jobTitle,
      jobDescription,
      customerName,
      appUrl
    )
    return {
      to: provider.email,
      subject: template.subject,
      html: template.html,
    }
  })

  if (emails.length < 2) {
    console.warn(
      '[sendJobRequestsToBatch] Need at least 2 emails for batch, using single email instead'
    )
    if (emails.length === 1) {
      return sendEmail({
        to: emails[0].to,
        subject: emails[0].subject,
        html: emails[0].html,
        eventType: 'job-request-single',
        entityId: jobId,
      })
    }
    return { success: false, error: 'No emails to send' }
  }

  return sendBatchEmails({
    emails,
    eventType: 'job-requests-batch',
    batchId: jobId,
  })
}

/**
 * Example 7: Send payment confirmations to multiple users
 */
export async function sendPaymentConfirmationsBatch(
  payments: Array<{
    email: string
    name: string
    amount: number
    jobDescription: string
    transactionId: string
  }>,
  appUrl: string,
  batchId: string
) {
  const emails = payments.map((payment) => {
    const template = paymentConfirmationEmailTemplate(
      payment.name,
      payment.amount,
      'USD',
      payment.jobDescription,
      payment.transactionId,
      appUrl
    )
    return {
      to: payment.email,
      subject: template.subject,
      html: template.html,
    }
  })

  if (emails.length < 2) {
    console.warn(
      '[sendPaymentConfirmationsBatch] Need at least 2 emails for batch'
    )
    return { success: false, error: 'Batch requires at least 2 emails' }
  }

  return sendBatchEmails({
    emails,
    eventType: 'payment-confirmations',
    batchId,
  })
}

/**
 * Example 8: Send review reminders to multiple customers (daily job)
 */
export async function sendReviewRemindersBatch(
  reminders: Array<{
    email: string
    name: string
    jobTitle: string
    providerName: string
  }>,
  appUrl: string
) {
  const emails = reminders.map((reminder) => {
    const template = reviewReminderEmailTemplate(
      reminder.name,
      reminder.jobTitle,
      reminder.providerName,
      appUrl
    )
    return {
      to: reminder.email,
      subject: template.subject,
      html: template.html,
      tags: [
        {
          name: 'type',
          value: 'review-reminder',
        },
        {
          name: 'sent_date',
          value: new Date().toISOString().split('T')[0],
        },
      ],
    }
  })

  if (emails.length < 2) {
    console.warn('[sendReviewRemindersBatch] Need at least 2 emails for batch')
    return { success: false, error: 'Batch requires at least 2 emails' }
  }

  // Use date as batch ID for daily jobs
  const today = new Date().toISOString().split('T')[0]
  return sendBatchEmails({
    emails,
    eventType: 'review-reminders',
    batchId: `daily-${today}`,
  })
}

/**
 * ADVANCED EXAMPLES
 */

/**
 * Example 9: Send email with custom headers and tags for tracking
 */
export async function sendTrackableEmail(
  to: string,
  subject: string,
  html: string,
  tags?: Array<{ name: string; value: string }>
) {
  return sendEmail({
    to,
    subject,
    html,
    tags: tags || [
      {
        name: 'sent_at',
        value: new Date().toISOString(),
      },
    ],
    headers: {
      'X-Custom-Header': 'value',
    },
  })
}

/**
 * Example 10: Send email with scheduled delivery
 * Note: Scheduled emails only work with single send, not batch
 */
export async function sendScheduledEmail(
  to: string,
  subject: string,
  html: string,
  scheduledFor: Date
) {
  return sendEmail({
    to,
    subject,
    html,
    scheduledAt: scheduledFor.toISOString(),
  })
}

/**
 * Example 11: Error handling pattern
 */
export async function sendEmailWithErrorHandling(
  to: string,
  template: { subject: string; html: string }
) {
  const result = await sendTemplatedEmail({
    to,
    template,
  })

  if (!result.success) {
    // Log to error tracking service
    console.error('[Email Error]', {
      to,
      error: result.error,
      timestamp: new Date().toISOString(),
    })

    // You could send to Sentry, DataDog, etc.
    // await captureException(result.error)

    // Optionally re-throw or return gracefully
    return result
  }

  return result
}

/**
 * Example 12: Retry pattern with custom idempotency key
 */
export async function sendEmailWithCustomIdempotency(
  to: string,
  eventType: string,
  entityId: string,
  subject: string,
  html: string
) {
  const idempotencyKey = generateIdempotencyKey(eventType, entityId)

  return sendEmail({
    to,
    subject,
    html,
    idempotencyKey,
    eventType,
    entityId,
  })
}
