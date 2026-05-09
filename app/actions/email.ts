'use server'

import {
  automationWelcomeNewCustomer,
  automationWelcomeNewProvider,
  automationPaymentConfirmed,
  automationPaymentFailed,
  automationRequestReview,
  automationJobAccepted,
} from '@/lib/email/liftgo-automations'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'

export async function sendWelcomeEmail(
  email: string,
  name: string,
  role: 'narocnik' | 'obrtnik'
): Promise<void> {
  try {
    if (role === 'obrtnik') {
      await automationWelcomeNewProvider(email, name, 'Obrtnik / Mojster', APP_URL)
    } else {
      await automationWelcomeNewCustomer(email, name, APP_URL)
    }
  } catch (error) {
    // Don't throw — email failure shouldn't block registration
    console.error('[sendWelcomeEmail] Failed:', error)
  }
}

export async function sendPaymentConfirmedEmail(
  jobId: string,
  customerEmail: string,
  customerName: string,
  providerEmail: string,
  providerName: string,
  serviceName: string,
  amountCents: number,
  transactionId: string
): Promise<void> {
  try {
    await automationPaymentConfirmed(
      jobId,
      customerEmail,
      customerName,
      providerEmail,
      providerName,
      serviceName,
      amountCents / 100,
      transactionId,
      APP_URL
    )
  } catch (error) {
    console.error('[sendPaymentConfirmedEmail] Failed:', error)
  }
}

export async function sendPaymentFailedEmail(
  jobId: string,
  customerEmail: string,
  customerName: string,
  serviceName: string,
  amountCents: number,
  failureReason: string
): Promise<void> {
  try {
    await automationPaymentFailed(
      jobId,
      customerEmail,
      customerName,
      serviceName,
      amountCents / 100,
      failureReason,
      APP_URL
    )
  } catch (error) {
    console.error('[sendPaymentFailedEmail] Failed:', error)
  }
}

export async function sendReviewRequestEmail(
  jobId: string,
  customerEmail: string,
  customerName: string,
  providerName: string,
  serviceName: string
): Promise<void> {
  try {
    await automationRequestReview(
      jobId,
      customerEmail,
      customerName,
      providerName,
      serviceName,
      APP_URL
    )
  } catch (error) {
    console.error('[sendReviewRequestEmail] Failed:', error)
  }
}

export async function sendJobAcceptedEmail(
  jobId: string,
  customerEmail: string,
  customerName: string,
  providerEmail: string,
  providerName: string,
  serviceName: string,
  scheduledDate: string
): Promise<void> {
  try {
    await automationJobAccepted(
      jobId,
      customerEmail,
      customerName,
      providerEmail,
      providerName,
      serviceName,
      scheduledDate,
      APP_URL
    )
  } catch (error) {
    console.error('[sendJobAcceptedEmail] Failed:', error)
  }
}
