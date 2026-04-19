// Email utility for LiftGO notifications
// Uses Resend for production email delivery

import {
  sendPaymentConfirmation,
  sendPaymentFailed,
} from './email/examples'

/**
 * Send payment confirmation to customer
 */
export async function sendPaymentConfirmationToCustomer(
  customerEmail: string,
  customerName: string,
  amount: number,
  jobDescription: string,
  transactionId: string
) {
  console.log('[v0] Sending payment confirmation to customer:', customerEmail)
  
  return sendPaymentConfirmation(
    customerEmail,
    customerName,
    amount,
    jobDescription,
    transactionId,
    process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'
  )
}

/**
 * Send payment confirmation to craftsman
 */
export async function sendPaymentConfirmationToCraftsman(
  craftsmanEmail: string,
  craftsmanName: string,
  amount: number,
  jobDescription: string,
  transactionId: string
) {
  console.log('[v0] Sending payment confirmation to craftsman:', craftsmanEmail)
  
  return sendPaymentConfirmation(
    craftsmanEmail,
    craftsmanName,
    amount,
    jobDescription,
    transactionId,
    process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'
  )
}

/**
 * Send payment failed notification to customer
 */
export async function sendPaymentFailedToCustomer(
  customerEmail: string,
  customerName: string,
  amount: number,
  reason: string = 'Payment processing failed. Please try again or contact support.'
) {
  console.log('[v0] Sending payment failed notification to customer:', customerEmail)
  
  return sendPaymentFailed(
    customerEmail,
    customerName,
    amount,
    reason,
    process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'
  )
}

/**
 * Send Stripe onboarding notification
 */
export async function sendStripeOnboardingNotification(
  craftsmanEmail: string,
  craftsmanName: string,
  onboardingComplete: boolean
) {
  console.log('[v0] Sending Stripe onboarding notification:', craftsmanEmail, onboardingComplete)
  
  if (onboardingComplete) {
    const template = {
      subject: 'Stripe Onboarding Complete',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #16a34a; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .success-box { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Stripe Setup Complete! ✓</h1>
    </div>
    <div class="content">
      <p>Hi ${craftsmanName},</p>
      
      <div class="success-box">
        <p>Your Stripe account is now fully set up and verified. You can start receiving payments from customers!</p>
      </div>
      
      <h3>You're All Set!</h3>
      <ul>
        <li>✓ Stripe account connected</li>
        <li>✓ Bank account verified</li>
        <li>✓ Ready to accept payments</li>
      </ul>
      
      <p>Start accepting job requests and grow your business on LiftGO.</p>
      
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/partner-dashboard" class="button">Go to Dashboard</a>
    </div>
    <div class="footer">
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `Hi ${craftsmanName}, your Stripe setup is complete. You can now receive payments on LiftGO.`,
    }

    const { sendTemplatedEmail } = await import('./email/resend-utils')
    
    return sendTemplatedEmail({
      to: craftsmanEmail,
      template,
      eventType: 'stripe-onboarding-complete',
      entityId: craftsmanEmail,
    })
  } else {
    const template = {
      subject: 'Action Required: Complete Your Stripe Setup',
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .warning-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Complete Your Stripe Setup</h1>
    </div>
    <div class="content">
      <p>Hi ${craftsmanName},</p>
      
      <div class="warning-box">
        <p>Your Stripe setup is not yet complete. You'll need to finish the setup process to start receiving payments.</p>
      </div>
      
      <h3>What's Needed?</h3>
      <ul>
        <li>Verify your bank account details</li>
        <li>Provide identity verification</li>
        <li>Accept Stripe's terms and conditions</li>
      </ul>
      
      <p>Complete your setup now to start accepting jobs:</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/partner/stripe-setup" class="button">Complete Setup</a>
      
      <p>If you have questions, our support team is here to help!</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `Hi ${craftsmanName}, please complete your Stripe setup to start receiving payments.`,
    }

    const { sendTemplatedEmail } = await import('./email/resend-utils')
    
    return sendTemplatedEmail({
      to: craftsmanEmail,
      template,
      eventType: 'stripe-onboarding-pending',
      entityId: craftsmanEmail,
    })
  }
}
