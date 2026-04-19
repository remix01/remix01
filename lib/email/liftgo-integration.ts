/**
 * LiftGO Email Integration Examples
 * Real-world usage patterns for email automations in LiftGO workflows
 */

import {
  automationWelcomeNewCustomer,
  automationWelcomeNewProvider,
  automationNewServiceRequest,
  automationJobAccepted,
  automationPaymentReminder,
  automationPaymentConfirmed,
  automationPaymentFailed,
  automationRequestReview,
  automationAccountSuspended,
  automationDailyReviewReminders,
  automationWeeklyProviderDigest,
} from './liftgo-automations'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'

/**
 * INTEGRATION EXAMPLES
 * Copy these patterns into your actual application code
 */

// ============================================================================
// CUSTOMER LIFECYCLE
// ============================================================================

/**
 * Call this when a customer completes registration
 */
export async function onCustomerRegistered(
  email: string,
  name: string
) {
  console.log('[LiftGO Email] Sending welcome email to customer:', email)

  const result = await automationWelcomeNewCustomer(
    email,
    name,
    APP_URL
  )

  if (!result.success) {
    console.error('[LiftGO Email] Failed to send welcome email:', result.error)
  }

  return result
}

/**
 * Call this when a service provider is approved by admin
 */
export async function onProviderApproved(
  email: string,
  name: string,
  serviceName: string
) {
  console.log('[LiftGO Email] Sending welcome email to provider:', email)

  const result = await automationWelcomeNewProvider(
    email,
    name,
    serviceName,
    APP_URL
  )

  if (!result.success) {
    console.error('[LiftGO Email] Failed to send provider welcome:', result.error)
  }

  return result
}

// ============================================================================
// SERVICE REQUEST LIFECYCLE
// ============================================================================

/**
 * Call this when a customer posts a new service request
 * This will notify all matching service providers
 */
export async function onServiceRequestCreated(
  jobId: string,
  customerEmail: string,
  customerName: string,
  serviceName: string,
  location: string,
  budget: string,
  description: string,
  matchedProviders: Array<{ email: string; name: string }>
) {
  console.log(`[LiftGO Email] Notifying ${matchedProviders.length} providers of new request:`, jobId)

  const result = await automationNewServiceRequest(
    jobId,
    customerName,
    serviceName,
    location,
    budget,
    description,
    APP_URL,
    matchedProviders
  )

  if (!result.success) {
    console.error('[LiftGO Email] Failed to notify providers:', result.error)
  }

  return result
}

/**
 * Call this when a provider accepts a job
 */
export async function onJobAccepted(
  jobId: string,
  customerEmail: string,
  customerName: string,
  providerEmail: string,
  providerName: string,
  serviceName: string,
  scheduledDate: string
) {
  console.log('[LiftGO Email] Notifying both parties - job accepted:', jobId)

  const result = await automationJobAccepted(
    jobId,
    customerEmail,
    customerName,
    providerEmail,
    providerName,
    serviceName,
    scheduledDate,
    APP_URL
  )

  if (!result.success) {
    console.error('[LiftGO Email] Failed to notify job acceptance:', result.error)
  }

  return result
}

// ============================================================================
// PAYMENT LIFECYCLE
// ============================================================================

/**
 * Call this when a job is marked complete
 * Sends payment reminder to customer (after delay)
 */
export async function onJobCompleted(
  jobId: string,
  customerEmail: string,
  customerName: string,
  providerName: string,
  serviceName: string,
  amount: number
) {
  console.log('[LiftGO Email] Sending payment reminder:', jobId)

  const result = await automationPaymentReminder(
    customerEmail,
    customerName,
    providerName,
    serviceName,
    amount,
    APP_URL
  )

  if (!result.success) {
    console.error('[LiftGO Email] Failed to send payment reminder:', result.error)
  }

  return result
}

/**
 * Call this when payment is successfully processed
 */
export async function onPaymentSuccessful(
  jobId: string,
  customerEmail: string,
  customerName: string,
  providerEmail: string,
  providerName: string,
  serviceName: string,
  amount: number,
  transactionId: string
) {
  console.log('[LiftGO Email] Confirming payment to both parties:', transactionId)

  const result = await automationPaymentConfirmed(
    jobId,
    customerEmail,
    customerName,
    providerEmail,
    providerName,
    serviceName,
    amount,
    transactionId,
    APP_URL
  )

  if (!result.success) {
    console.error('[LiftGO Email] Failed to confirm payment:', result.error)
  }

  return result
}

/**
 * Call this when a payment fails
 */
export async function onPaymentFailed(
  jobId: string,
  customerEmail: string,
  customerName: string,
  serviceName: string,
  amount: number,
  failureReason: string
) {
  console.log('[LiftGO Email] Notifying customer of payment failure:', jobId)

  const result = await automationPaymentFailed(
    jobId,
    customerEmail,
    customerName,
    serviceName,
    amount,
    failureReason,
    APP_URL
  )

  if (!result.success) {
    console.error('[LiftGO Email] Failed to send payment failure notice:', result.error)
  }

  return result
}

// ============================================================================
// REVIEW & FEEDBACK
// ============================================================================

/**
 * Call this to request a review from customer (with delay)
 */
export async function requestCustomerReview(
  jobId: string,
  customerEmail: string,
  customerName: string,
  providerName: string,
  serviceName: string
) {
  console.log('[LiftGO Email] Requesting review from customer:', jobId)

  const result = await automationRequestReview(
    jobId,
    customerEmail,
    customerName,
    providerName,
    serviceName,
    APP_URL
  )

  if (!result.success) {
    console.error('[LiftGO Email] Failed to request review:', result.error)
  }

  return result
}

// ============================================================================
// ACCOUNT & COMPLIANCE
// ============================================================================

/**
 * Call this when account is suspended
 */
export async function onAccountSuspended(
  userEmail: string,
  userName: string,
  reason: string
) {
  console.log('[LiftGO Email] Sending suspension notice:', userEmail)

  const result = await automationAccountSuspended(
    userEmail,
    userName,
    reason,
    APP_URL
  )

  if (!result.success) {
    console.error('[LiftGO Email] Failed to send suspension notice:', result.error)
  }

  return result
}

// ============================================================================
// SCHEDULED BATCH OPERATIONS
// ============================================================================

/**
 * Run this daily (e.g., 9 AM) to send review reminders
 * Query your database for customers with pending reviews
 */
export async function sendDailyReviewReminders(
  pendingReviews: Array<{
    email: string
    name: string
    jobTitle: string
    providerName: string
  }>
) {
  console.log('[LiftGO Email] Sending daily review reminders to', pendingReviews.length, 'customers')

  const result = await automationDailyReviewReminders(
    pendingReviews,
    APP_URL
  )

  if (!result.success) {
    console.error('[LiftGO Email] Failed to send review reminders:', result.error)
  }

  return result
}

/**
 * Run this weekly (e.g., Monday 8 AM) to send provider digest
 * Query your database for active providers with their weekly stats
 */
export async function sendWeeklyProviderDigests(
  providers: Array<{
    email: string
    name: string
    newRequests: number
    pendingJobs: number
    totalEarnings: number
  }>
) {
  console.log('[LiftGO Email] Sending weekly digests to', providers.length, 'providers')

  const result = await automationWeeklyProviderDigest(
    providers,
    APP_URL
  )

  if (!result.success) {
    console.error('[LiftGO Email] Failed to send digests:', result.error)
  }

  return result
}

// ============================================================================
// DIRECT INTEGRATION PATTERNS
// ============================================================================

/**
 * PATTERN 1: API Route Integration
 * Place this in app/api/webhooks/email/route.ts
 * 
 * export async function POST(req: Request) {
 *   const event = await req.json()
 *   
 *   switch(event.type) {
 *     case 'customer.registered':
 *       return onCustomerRegistered(event.email, event.name)
 *     
 *     case 'provider.approved':
 *       return onProviderApproved(event.email, event.name, event.service)
 *     
 *     case 'request.created':
 *       return onServiceRequestCreated(
 *         event.jobId,
 *         event.customerEmail,
 *         event.customerName,
 *         event.serviceName,
 *         event.location,
 *         event.budget,
 *         event.description,
 *         event.matchedProviders
 *       )
 *     
 *     case 'job.accepted':
 *       return onJobAccepted(
 *         event.jobId,
 *         event.customerEmail,
 *         event.customerName,
 *         event.providerEmail,
 *         event.providerName,
 *         event.serviceName,
 *         event.scheduledDate
 *       )
 *     
 *     case 'payment.successful':
 *       return onPaymentSuccessful(...)
 *     
 *     case 'payment.failed':
 *       return onPaymentFailed(...)
 *     
 *     default:
 *       return { error: 'Unknown event' }
 *   }
 * }
 */

/**
 * PATTERN 2: Direct Function Call in Service Layer
 * 
 * // In your user service
 * export async function createCustomer(data) {
 *   const customer = await db.customer.create(data)
 *   
 *   // Send welcome email (fire and forget)
 *   onCustomerRegistered(customer.email, customer.name).catch(err => {
 *     console.error('Email send failed:', err)
 *   })
 *   
 *   return customer
 * }
 */

/**
 * PATTERN 3: Event-Driven with Message Queue
 * 
 * // In your job acceptance handler
 * export async function acceptJob(jobId: string, providerId: string) {
 *   const job = await acceptJobInDb(jobId, providerId)
 *   
 *   // Queue email for async processing
 *   await emailQueue.push({
 *     type: 'job.accepted',
 *     payload: {
 *       jobId: job.id,
 *       customerEmail: job.customer.email,
 *       customerName: job.customer.name,
 *       providerEmail: job.provider.email,
 *       providerName: job.provider.name,
 *       serviceName: job.service.name,
 *       scheduledDate: job.scheduledDate,
 *     }
 *   })
 *   
 *   return job
 * }
 * 
 * // In your queue worker
 * emailQueue.subscribe(async (message) => {
 *   if (message.type === 'job.accepted') {
 *     await onJobAccepted(...message.payload)
 *   }
 * })
 */

/**
 * PATTERN 4: Cron Job for Scheduled Tasks
 * 
 * // In app/api/cron/daily-reminders/route.ts
 * export async function GET(req: Request) {
 *   // Verify cron secret
 *   if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
 *     return Response.json({ error: 'Unauthorized' }, { status: 401 })
 *   }
 *   
 *   // Get pending reviews from database
 *   const pendingReviews = await db.review.findPending()
 *   
 *   // Send reminders
 *   const result = await sendDailyReviewReminders(pendingReviews)
 *   
 *   return Response.json({
 *     success: true,
 *     sent: pendingReviews.length,
 *     result
 *   })
 * }
 * 
 * // Then set up in Vercel Cron: every day at 9 AM
 * // In vercel.json: "crons": [{ "path": "/api/cron/daily-reminders", "schedule": "0 9 * * *" }]
 */

// ============================================================================
// ERROR HANDLING & LOGGING
// ============================================================================

/**
 * Wrapper to add logging and error handling to any email automation
 */
export async function sendEmailWithErrorHandling(
  automationId: string,
  automationFn: () => Promise<any>,
  fallbackAction?: (error: any) => Promise<void>
) {
  try {
    const result = await automationFn()

    if (result.success) {
      console.log(`[LiftGO Email] ✓ ${automationId} sent successfully`)
    } else {
      console.error(`[LiftGO Email] ✗ ${automationId} failed:`, result.error)

      if (fallbackAction) {
        await fallbackAction(result.error)
      }
    }

    return result
  } catch (error) {
    console.error(`[LiftGO Email] Exception in ${automationId}:`, error)

    if (fallbackAction) {
      await fallbackAction(error)
    }

    throw error
  }
}

// ============================================================================
// TESTING HELPERS
// ============================================================================

/**
 * Test function to verify email setup
 * Use in development/testing only
 */
export async function testEmailSetup() {
  const testEmail = 'test@example.com'
  const testName = 'Test User'

  console.log('[LiftGO Email] Running setup test...')

  try {
    // Test 1: Welcome customer
    const welcome = await automationWelcomeNewCustomer(
      testEmail,
      testName,
      APP_URL
    )
    console.log('[Test 1] Welcome customer:', welcome.success ? '✓' : '✗')

    // Test 2: New request notification
    const request = await automationNewServiceRequest(
      'test-job-123',
      testName,
      'Plumbing',
      'San Francisco, CA',
      '$100-$200',
      'Fix leaky faucet',
      APP_URL,
      [{ email: testEmail, name: 'Test Provider' }]
    )
    console.log('[Test 2] New request:', request.success ? '✓' : '✗')

    console.log('[LiftGO Email] Setup test complete')
    return { success: true, message: 'All tests passed' }
  } catch (error) {
    console.error('[LiftGO Email] Setup test failed:', error)
    return { success: false, error }
  }
}
