/**
 * LiftGO Email Automations
 * 
 * Automated email workflows triggered by user actions, time-based events, and system triggers.
 * These define when and to whom emails should be sent across the entire LiftGO lifecycle.
 */

import {
  sendEmail,
  sendTemplatedEmail,
  sendBatchEmails,
} from './resend-utils'
import {
  generateIdempotencyKey,
  generateBatchIdempotencyKey,
} from './idempotency'
import {
  welcomeCustomerTemplate,
  welcomeProviderTemplate,
  newServiceRequestTemplate,
  jobAcceptedTemplate,
  paymentReminderTemplate,
  paymentConfirmedTemplate,
  paymentFailedTemplate,
  reviewRequestTemplate,
  accountSuspensionTemplate,
  LIFTGO_EMAILS,
} from './liftgo-templates'

/**
 * USER LIFECYCLE AUTOMATIONS
 */

/**
 * Send welcome email when new customer signs up
 * Trigger: Customer completes registration
 */
export async function automationWelcomeNewCustomer(
  customerEmail: string,
  customerName: string,
  appUrl: string
) {
  const template = welcomeCustomerTemplate(customerName, appUrl)

  return sendTemplatedEmail({
    to: customerEmail,
    template,
    from: template.from,
    replyTo: template.replyTo,
    eventType: 'customer-welcome',
    entityId: customerEmail,
    tags: [
      { name: 'automation', value: 'lifecycle' },
      { name: 'event', value: 'signup' },
    ],
  })
}

/**
 * Send welcome email when new service provider is approved
 * Trigger: Provider profile approved by admin
 */
export async function automationWelcomeNewProvider(
  providerEmail: string,
  providerName: string,
  serviceName: string,
  appUrl: string
) {
  const template = welcomeProviderTemplate(providerName, serviceName, appUrl)

  return sendTemplatedEmail({
    to: providerEmail,
    template,
    from: template.from,
    replyTo: template.replyTo,
    eventType: 'provider-welcome',
    entityId: providerEmail,
    tags: [
      { name: 'automation', value: 'lifecycle' },
      { name: 'event', value: 'approved' },
    ],
  })
}

/**
 * SERVICE REQUEST AUTOMATIONS
 */

/**
 * Notify matching service providers of new request
 * Trigger: Customer posts a new service request
 */
export async function automationNewServiceRequest(
  jobId: string,
  customerName: string,
  serviceName: string,
  location: string,
  budget: string,
  description: string,
  appUrl: string,
  matchedProviders: Array<{
    email: string
    name: string
  }>
) {
  // Send unique email to each matched provider
  const emails = matchedProviders.map((provider) => {
    const template = newServiceRequestTemplate(
      provider.name,
      customerName,
      serviceName,
      location,
      budget,
      description,
      appUrl
    )

    return {
      to: provider.email,
      subject: template.subject,
      html: template.html,
      headers: {
        'X-Job-ID': jobId,
      },
      tags: [
        { name: 'automation', value: 'request' },
        { name: 'job_id', value: jobId },
        { name: 'service', value: serviceName },
      ],
    }
  })

  if (emails.length === 0) {
    return { success: false, error: 'No matched providers' }
  }

  if (emails.length === 1) {
    // Single provider - use single send
    return sendTemplatedEmail({
      to: emails[0].to,
      template: newServiceRequestTemplate(
        matchedProviders[0].name,
        customerName,
        serviceName,
        location,
        budget,
        description,
        appUrl
      ),
      from: LIFTGO_EMAILS.NOREPLY,
      replyTo: LIFTGO_EMAILS.SUPPORT,
      eventType: 'service-request',
      entityId: jobId,
    })
  }

  // Multiple providers - use batch send
  return sendBatchEmails({
    emails: emails.map((email) => ({
      to: email.to,
      subject: email.subject,
      html: email.html,
      tags: email.tags,
    })),
    eventType: 'service-requests-batch',
    batchId: jobId,
  })
}

/**
 * JOB ACCEPTANCE AUTOMATIONS
 */

/**
 * Notify both parties when provider accepts job
 * Trigger: Service provider clicks accept on request
 */
export async function automationJobAccepted(
  jobId: string,
  customerEmail: string,
  customerName: string,
  providerEmail: string,
  providerName: string,
  serviceName: string,
  scheduledDate: string,
  appUrl: string
) {
  // Notify customer
  const customerTemplate = jobAcceptedTemplate(
    customerName,
    providerName,
    serviceName,
    scheduledDate,
    appUrl,
    false
  )

  // Notify provider
  const providerTemplate = jobAcceptedTemplate(
    providerName,
    customerName,
    serviceName,
    scheduledDate,
    appUrl,
    true
  )

  const emails = [
    {
      to: customerEmail,
      subject: customerTemplate.subject,
      html: customerTemplate.html,
      tags: [
        { name: 'automation', value: 'job-lifecycle' },
        { name: 'event', value: 'accepted' },
        { name: 'role', value: 'customer' },
      ],
    },
    {
      to: providerEmail,
      subject: providerTemplate.subject,
      html: providerTemplate.html,
      tags: [
        { name: 'automation', value: 'job-lifecycle' },
        { name: 'event', value: 'accepted' },
        { name: 'role', value: 'provider' },
      ],
    },
  ]

  return sendBatchEmails({
    emails,
    eventType: 'job-accepted',
    batchId: jobId,
  })
}

/**
 * PAYMENT AUTOMATIONS
 */

/**
 * Send payment reminder to customer after job completion
 * Trigger: Provider marks job as complete
 */
export async function automationPaymentReminder(
  customerEmail: string,
  customerName: string,
  providerName: string,
  serviceName: string,
  amount: number,
  appUrl: string
) {
  const template = paymentReminderTemplate(
    customerName,
    providerName,
    serviceName,
    amount,
    'USD',
    appUrl
  )

  return sendTemplatedEmail({
    to: customerEmail,
    template,
    from: template.from,
    replyTo: template.replyTo,
    eventType: 'payment-reminder',
    entityId: customerEmail,
    tags: [
      { name: 'automation', value: 'payment' },
      { name: 'event', value: 'reminder' },
    ],
  })
}

/**
 * Send payment confirmation to both parties
 * Trigger: Payment successfully processed
 */
export async function automationPaymentConfirmed(
  jobId: string,
  customerEmail: string,
  customerName: string,
  providerEmail: string,
  providerName: string,
  serviceName: string,
  amount: number,
  transactionId: string,
  appUrl: string
) {
  const customerTemplate = paymentConfirmedTemplate(
    customerName,
    amount,
    serviceName,
    transactionId,
    'USD',
    appUrl,
    false
  )

  const providerTemplate = paymentConfirmedTemplate(
    providerName,
    amount,
    serviceName,
    transactionId,
    'USD',
    appUrl,
    true
  )

  const emails: { to: string; subject: string; html: string; tags: { name: string; value: string }[] }[] = []

  // Always send customer confirmation
  emails.push({
    to: customerEmail,
    subject: customerTemplate.subject,
    html: customerTemplate.html,
    tags: [
      { name: 'automation', value: 'payment' },
      { name: 'event', value: 'confirmed' },
      { name: 'role', value: 'customer' },
      { name: 'transaction_id', value: transactionId },
    ],
  })

  // Only send provider confirmation if email is valid
  if (providerEmail && providerEmail.trim()) {
    emails.push({
      to: providerEmail,
      subject: providerTemplate.subject,
      html: providerTemplate.html,
      tags: [
        { name: 'automation', value: 'payment' },
        { name: 'event', value: 'confirmed' },
        { name: 'role', value: 'provider' },
        { name: 'transaction_id', value: transactionId },
      ],
    })
  }

  // Use batch send only if we have 2+ emails, otherwise use single send
  if (emails.length > 1) {
    return sendBatchEmails({
      emails,
      eventType: 'payment-confirmed',
      batchId: transactionId,
    })
  }

  // Send single customer email if provider email is missing
  return sendTemplatedEmail({
    to: customerEmail,
    template: customerTemplate,
    from: customerTemplate.from,
    replyTo: customerTemplate.replyTo,
    eventType: 'payment-confirmed',
    entityId: transactionId,
    tags: [
      { name: 'automation', value: 'payment' },
      { name: 'event', value: 'confirmed' },
      { name: 'role', value: 'customer' },
      { name: 'transaction_id', value: transactionId },
    ],
  })
}

/**
 * Send payment failed notification
 * Trigger: Payment processing fails
 */
export async function automationPaymentFailed(
  jobId: string,
  customerEmail: string,
  customerName: string,
  serviceName: string,
  amount: number,
  failureReason: string,
  appUrl: string
) {
  const template = paymentFailedTemplate(
    customerName,
    amount,
    serviceName,
    failureReason,
    appUrl,
    'USD'
  )

  return sendTemplatedEmail({
    to: customerEmail,
    template,
    from: template.from,
    replyTo: template.replyTo,
    eventType: 'payment-failed',
    entityId: jobId,
    tags: [
      { name: 'automation', value: 'payment' },
      { name: 'event', value: 'failed' },
      { name: 'reason', value: failureReason.slice(0, 50) },
    ],
  })
}

/**
 * REVIEW AUTOMATIONS
 */

/**
 * Request customer leave review after job completion
 * Trigger: Job marked complete, after 1 day delay
 */
export async function automationRequestReview(
  jobId: string,
  customerEmail: string,
  customerName: string,
  providerName: string,
  serviceName: string,
  appUrl: string
) {
  const template = reviewRequestTemplate(
    customerName,
    providerName,
    serviceName,
    appUrl
  )

  return sendTemplatedEmail({
    to: customerEmail,
    template,
    from: template.from,
    replyTo: template.replyTo,
    eventType: 'review-request',
    entityId: jobId,
    tags: [
      { name: 'automation', value: 'engagement' },
      { name: 'event', value: 'review-request' },
    ],
  })
}

/**
 * ACCOUNT AUTOMATIONS
 */

/**
 * Send account suspension notice
 * Trigger: Account flagged for policy violation
 */
export async function automationAccountSuspended(
  userEmail: string,
  userName: string,
  reason: string,
  appUrl: string
) {
  const template = accountSuspensionTemplate(userName, reason, appUrl)

  return sendTemplatedEmail({
    to: userEmail,
    template,
    from: template.from,
    replyTo: template.replyTo,
    eventType: 'account-suspended',
    entityId: userEmail,
    tags: [
      { name: 'automation', value: 'compliance' },
      { name: 'event', value: 'suspension' },
      { name: 'severity', value: 'high' },
    ],
  })
}

/**
 * BATCH AUTOMATIONS
 * For scheduled/bulk operations
 */

/**
 * Send daily review reminders to customers with pending reviews
 * Trigger: Daily scheduled job (e.g., 9 AM)
 */
export async function automationDailyReviewReminders(
  pendingReviews: Array<{
    email: string
    name: string
    jobTitle: string
    providerName: string
  }>,
  appUrl: string
) {
  if (pendingReviews.length === 0) {
    return { success: true, message: 'No pending reviews to remind' }
  }

  const emails = pendingReviews.map((review) => {
    const template = reviewRequestTemplate(
      review.name,
      review.providerName,
      review.jobTitle,
      appUrl
    )

    return {
      to: review.email,
      subject: template.subject,
      html: template.html,
      tags: [
        { name: 'automation', value: 'review-reminder' },
        { name: 'batch_type', value: 'daily' },
        { name: 'sent_date', value: new Date().toISOString().split('T')[0] },
      ],
    }
  })

  if (emails.length < 2) {
    // Single email
    const review = pendingReviews[0]
    const today = new Date().toISOString().split('T')[0]
    const template = reviewRequestTemplate(
      review.name,
      review.providerName,
      review.jobTitle,
      appUrl
    )

    return sendEmail({
      to: review.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: LIFTGO_EMAILS.NOREPLY,
      replyTo: LIFTGO_EMAILS.SUPPORT,
      tags: [
        { name: 'automation', value: 'review-reminder' },
        { name: 'batch_type', value: 'daily' },
        { name: 'sent_date', value: today },
      ],
      idempotencyKey: generateIdempotencyKey(
        'review-reminder',
        `${review.email}-${today}`
      ),
    })
  }

  const today = new Date().toISOString().split('T')[0]
  return sendBatchEmails({
    emails,
    eventType: 'review-reminders-batch',
    batchId: `daily-reminders-${today}`,
  })
}

/**
 * Send weekly digest to active service providers
 * Trigger: Weekly scheduled job (e.g., Monday at 8 AM)
 */
export async function automationWeeklyProviderDigest(
  providers: Array<{
    email: string
    name: string
    newRequests: number
    pendingJobs: number
    totalEarnings: number
  }>,
  appUrl: string
) {
  if (providers.length === 0) {
    return { success: true, message: 'No active providers' }
  }

  const emails = providers.map((provider) => {
    const earningsFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(provider.totalEarnings)

    return {
      to: provider.email,
      subject: `Your Weekly Summary - ${provider.newRequests} New Requests`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 12px; }
    .header { background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px; }
    .stat { background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #2563eb; }
    .button { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Summary 📊</h1>
    </div>
    <div style="padding: 30px;">
      <p>Hi ${provider.name},</p>
      <p>Here's your weekly activity on LiftGO:</p>
      
      <div class="stat">
        <strong>New Service Requests:</strong> ${provider.newRequests}
      </div>
      <div class="stat">
        <strong>Pending Jobs:</strong> ${provider.pendingJobs}
      </div>
      <div class="stat">
        <strong>This Week's Earnings:</strong> ${earningsFormatted}
      </div>
      
      <p><a href="${appUrl}/partner-dashboard" class="button">View Dashboard</a></p>
    </div>
  </div>
</body>
</html>
      `,
      tags: [
        { name: 'automation', value: 'digest' },
        { name: 'batch_type', value: 'weekly' },
        { name: 'sent_date', value: new Date().toISOString().split('T')[0] },
      ],
    }
  })

  if (emails.length < 2) {
    const singleDigest = emails[0]
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    const weekId = weekStart.toISOString().split('T')[0]
    return sendEmail({
      to: singleDigest.to,
      subject: singleDigest.subject,
      html: singleDigest.html,
      tags: singleDigest.tags,
      idempotencyKey: generateIdempotencyKey(
        'weekly-digest',
        `${providers[0].email}-${weekId}`
      ),
    })
  }

  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
  const weekId = weekStart.toISOString().split('T')[0]

  return sendBatchEmails({
    emails,
    eventType: 'weekly-digest',
    batchId: `weekly-digest-${weekId}`,
  })
}

/**
 * AUTOMATION CONFIGURATION
 * Defines all automated workflows and their triggers
 */

export interface AutomationConfig {
  id: string
  name: string
  trigger: string
  enabled: boolean
  description: string
}

export const AUTOMATION_CONFIGS: AutomationConfig[] = [
  {
    id: 'welcome-customer',
    name: 'Welcome New Customer',
    trigger: 'customer_registration_complete',
    enabled: true,
    description: 'Send welcome email to new customers',
  },
  {
    id: 'welcome-provider',
    name: 'Welcome New Provider',
    trigger: 'provider_profile_approved',
    enabled: true,
    description: 'Send welcome email to newly approved service providers',
  },
  {
    id: 'new-service-request',
    name: 'New Service Request',
    trigger: 'service_request_created',
    enabled: true,
    description: 'Notify matched providers of new service requests',
  },
  {
    id: 'job-accepted',
    name: 'Job Accepted',
    trigger: 'job_accepted',
    enabled: true,
    description: 'Notify both parties when job is accepted',
  },
  {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    trigger: 'job_completion_24h',
    enabled: true,
    description: 'Remind customer to pay for completed service',
  },
  {
    id: 'payment-confirmed',
    name: 'Payment Confirmed',
    trigger: 'payment_successful',
    enabled: true,
    description: 'Confirm payment to both customer and provider',
  },
  {
    id: 'payment-failed',
    name: 'Payment Failed',
    trigger: 'payment_failed',
    enabled: true,
    description: 'Notify customer of payment failure',
  },
  {
    id: 'review-request',
    name: 'Review Request',
    trigger: 'job_completion_24h',
    enabled: true,
    description: 'Request customer leave review for completed service',
  },
  {
    id: 'account-suspended',
    name: 'Account Suspended',
    trigger: 'account_suspension',
    enabled: true,
    description: 'Notify user of account suspension',
  },
  {
    id: 'daily-review-reminders',
    name: 'Daily Review Reminders',
    trigger: 'daily_scheduled_09:00',
    enabled: true,
    description: 'Send daily review reminders to customers with pending reviews',
  },
  {
    id: 'weekly-provider-digest',
    name: 'Weekly Provider Digest',
    trigger: 'weekly_scheduled_monday_08:00',
    enabled: true,
    description: 'Send weekly activity summary to service providers',
  },
]

/**
 * Get automation config by ID
 */
export function getAutomationConfig(id: string): AutomationConfig | undefined {
  return AUTOMATION_CONFIGS.find((config) => config.id === id)
}

/**
 * Check if automation is enabled
 */
export function isAutomationEnabled(id: string): boolean {
  const config = getAutomationConfig(id)
  return config?.enabled ?? false
}
