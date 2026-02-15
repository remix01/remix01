// Email utility for LiftGO notifications
// In production, replace with actual email service (Resend, SendGrid, etc.)

export async function sendPaymentConfirmationToCustomer(
  customerEmail: string,
  craftsmanName: string,
  amount: number,
  jobDescription: string
) {
  console.log('[v0] Sending payment confirmation to customer:', customerEmail)
  // TODO: Implement with actual email service
  // Example: await resend.emails.send({ ... })
}

export async function sendPaymentConfirmationToCraftsman(
  craftsmanEmail: string,
  customerName: string,
  amount: number,
  jobDescription: string
) {
  console.log('[v0] Sending payment confirmation to craftsman:', craftsmanEmail)
  // TODO: Implement with actual email service
}

export async function sendPaymentFailedToCustomer(
  customerEmail: string,
  amount: number
) {
  console.log('[v0] Sending payment failed notification to customer:', customerEmail)
  // TODO: Implement with actual email service
}

export async function sendStripeOnboardingNotification(
  craftsmanEmail: string,
  onboardingComplete: boolean
) {
  console.log('[v0] Sending Stripe onboarding notification:', craftsmanEmail, onboardingComplete)
  // TODO: Implement with actual email service
}
