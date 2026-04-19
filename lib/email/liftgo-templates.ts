/**
 * LiftGO-specific email templates with official LiftGO branding
 * Uses designated email addresses:
 * - info@liftgo.net: General inquiries and updates
 * - support@liftgo.net: Support and customer service
 * - noreply@liftgo.net: Transactional emails
 * - team@liftgo.net: Internal team notifications
 */

export interface LiftGOEmailTemplate {
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
}

// Email address constants
export const LIFTGO_EMAILS = {
  INFO: 'info@liftgo.net',
  SUPPORT: 'support@liftgo.net',
  NOREPLY: 'noreply@liftgo.net',
  TEAM: 'team@liftgo.net',
} as const

const BRAND_COLOR = '#2563eb' // LiftGO blue
const SUCCESS_COLOR = '#16a34a' // Success green
const WARNING_COLOR = '#dc2626' // Warning red
const NEUTRAL_COLOR = '#6b7280' // Neutral gray

/**
 * Base email template with LiftGO branding
 */
function getLiftGOEmailStyle(): string {
  return `
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background-color: #f3f4f6;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, ${BRAND_COLOR} 0%, #1d4ed8 100%);
      color: white;
      padding: 40px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .logo {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 15px;
      letter-spacing: 2px;
    }
    .content {
      padding: 40px 30px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      font-size: 18px;
      font-weight: 600;
      margin: 0 0 15px 0;
      color: #1f2937;
    }
    .section p {
      margin: 0 0 12px 0;
      font-size: 15px;
      color: #4b5563;
    }
    .button {
      display: inline-block;
      background: ${BRAND_COLOR};
      color: white;
      padding: 13px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 15px;
      margin: 20px 0;
      transition: background 0.2s;
      border: none;
      cursor: pointer;
    }
    .button:hover {
      background: #1d4ed8;
    }
    .button-secondary {
      background: ${NEUTRAL_COLOR};
      margin-left: 10px;
    }
    .button-secondary:hover {
      background: #4b5563;
    }
    .button-success {
      background: ${SUCCESS_COLOR};
    }
    .button-success:hover {
      background: #15803d;
    }
    .button-warning {
      background: ${WARNING_COLOR};
    }
    .button-warning:hover {
      background: #b91c1c;
    }
    .info-box {
      background: #eff6ff;
      border-left: 4px solid ${BRAND_COLOR};
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .success-box {
      background: #f0fdf4;
      border-left: 4px solid ${SUCCESS_COLOR};
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .warning-box {
      background: #fee2e2;
      border-left: 4px solid ${WARNING_COLOR};
      padding: 15px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .divider {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 30px 0;
    }
    .detail-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .detail-table tr {
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-table td {
      padding: 12px 0;
    }
    .detail-table td:first-child {
      font-weight: 600;
      color: #1f2937;
      width: 40%;
    }
    .detail-table td:last-child {
      text-align: right;
      color: #4b5563;
    }
    .amount {
      font-size: 32px;
      font-weight: 700;
      color: ${SUCCESS_COLOR};
      text-align: center;
      margin: 20px 0;
    }
    .list-item {
      margin: 10px 0;
      padding-left: 20px;
      position: relative;
    }
    .list-item:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: ${SUCCESS_COLOR};
      font-weight: bold;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
      font-size: 13px;
      color: #6b7280;
    }
    .footer-links {
      margin-bottom: 20px;
    }
    .footer-links a {
      color: ${BRAND_COLOR};
      text-decoration: none;
      margin: 0 10px;
    }
    .footer-links a:hover {
      text-decoration: underline;
    }
    .cta-section {
      background: #f0f9ff;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
  `
}

/**
 * Welcome email for new customers
 */
export function welcomeCustomerTemplate(
  customerName: string,
  appUrl: string
): LiftGOEmailTemplate {
  return {
    subject: 'Welcome to LiftGO - Your Home Service Marketplace',
    from: LIFTGO_EMAILS.NOREPLY,
    replyTo: LIFTGO_EMAILS.SUPPORT,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${getLiftGOEmailStyle()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LIFTGO</div>
      <h1>Welcome Aboard! 🎉</h1>
    </div>
    <div class="content">
      <div class="section">
        <p>Hi ${customerName},</p>
        <p>Welcome to LiftGO! We're thrilled to have you join our community of homeowners and service providers.</p>
      </div>

      <div class="success-box">
        <strong>Your account is ready!</strong> You can now browse service providers, post requests, and hire trusted professionals.
      </div>

      <div class="section">
        <h2>Get Started in 3 Steps</h2>
        <div class="list-item">Complete your profile with your address and preferences</div>
        <div class="list-item">Post your first service request</div>
        <div class="list-item">Review and hire from trusted service providers</div>
      </div>

      <div class="cta-section">
        <p><strong>Ready to find your perfect service provider?</strong></p>
        <a href="${appUrl}/dashboard" class="button">Go to Dashboard</a>
      </div>

      <hr class="divider">

      <div class="section">
        <h2>Why LiftGO?</h2>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Vetted and verified service providers</li>
          <li>Transparent pricing with no hidden fees</li>
          <li>Secure payment processing</li>
          <li>24/7 customer support</li>
        </ul>
      </div>

      <div class="section">
        <p>Have questions? Our support team is here to help:</p>
        <a href="mailto:${LIFTGO_EMAILS.SUPPORT}" class="button">${LIFTGO_EMAILS.SUPPORT}</a>
      </div>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${appUrl}/help">Help Center</a>
        <a href="${appUrl}/contact">Contact Us</a>
        <a href="${appUrl}/terms">Terms</a>
        <a href="${appUrl}/privacy">Privacy</a>
      </div>
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
      <p>LiftGO - Connecting you with trusted home service professionals</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Hi ${customerName}, welcome to LiftGO! Get started at ${appUrl}/dashboard. Questions? Email ${LIFTGO_EMAILS.SUPPORT}`,
  }
}

/**
 * Welcome email for new service providers
 */
export function welcomeProviderTemplate(
  providerName: string,
  serviceName: string,
  appUrl: string
): LiftGOEmailTemplate {
  return {
    subject: 'Welcome to LiftGO Partner Program',
    from: LIFTGO_EMAILS.NOREPLY,
    replyTo: LIFTGO_EMAILS.SUPPORT,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${getLiftGOEmailStyle()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LIFTGO</div>
      <h1>Welcome to Our Partner Program! 🚀</h1>
    </div>
    <div class="content">
      <div class="section">
        <p>Hi ${providerName},</p>
        <p>Congratulations! Your profile has been approved and you're now a LiftGO Partner specializing in <strong>${serviceName}</strong>.</p>
      </div>

      <div class="success-box">
        <strong>You're all set!</strong> Start receiving service requests from customers in your area immediately.
      </div>

      <div class="section">
        <h2>Complete Your Setup</h2>
        <div class="list-item">Add your service photos and descriptions</div>
        <div class="list-item">Set your pricing and availability</div>
        <div class="list-item">Connect your payment method (Stripe)</div>
        <div class="list-item">Enable notifications for new requests</div>
      </div>

      <div class="cta-section">
        <p><strong>Ready to start earning?</strong></p>
        <a href="${appUrl}/provider/setup" class="button">Complete Setup</a>
      </div>

      <hr class="divider">

      <div class="section">
        <h2>Partnership Benefits</h2>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Access to 10,000+ customers</li>
          <li>Secure payment processing via Stripe</li>
          <li>Professional business tools and analytics</li>
          <li>24/7 dedicated partner support</li>
          <li>Marketing boost for top-rated providers</li>
        </ul>
      </div>

      <div class="section">
        <h2>Next Steps</h2>
        <p>Check out our Partner Resources to maximize your earnings:</p>
        <a href="${appUrl}/partner/resources" class="button">View Resources</a>
      </div>
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="${appUrl}/partner/help">Partner Help</a>
        <a href="${appUrl}/contact">Contact Us</a>
        <a href="${appUrl}/partner/terms">Partner Terms</a>
      </div>
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
      <p>LiftGO Partner Program - Grow Your Business Today</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Hi ${providerName}, welcome to LiftGO! Complete setup at ${appUrl}/provider/setup to start receiving requests.`,
  }
}

/**
 * New service request for provider
 */
export function newServiceRequestTemplate(
  providerName: string,
  customerName: string,
  serviceName: string,
  location: string,
  budget: string,
  description: string,
  appUrl: string
): LiftGOEmailTemplate {
  return {
    subject: `New ${serviceName} Request from ${customerName}`,
    from: LIFTGO_EMAILS.NOREPLY,
    replyTo: LIFTGO_EMAILS.SUPPORT,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${getLiftGOEmailStyle()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LIFTGO</div>
      <h1>New Service Request! 🔔</h1>
    </div>
    <div class="content">
      <div class="section">
        <p>Hi ${providerName},</p>
        <p>A new service request matches your expertise:</p>
      </div>

      <div class="info-box">
        <table class="detail-table">
          <tr>
            <td><strong>Service:</strong></td>
            <td>${serviceName}</td>
          </tr>
          <tr>
            <td><strong>Customer:</strong></td>
            <td>${customerName}</td>
          </tr>
          <tr>
            <td><strong>Location:</strong></td>
            <td>${location}</td>
          </tr>
          <tr>
            <td><strong>Budget:</strong></td>
            <td>${budget}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h2>Request Details</h2>
        <p>${description}</p>
      </div>

      <div class="warning-box">
        <strong>⏱️ Time-sensitive!</strong> Multiple providers are viewing this request. Accept quickly to secure the job.
      </div>

      <div class="cta-section">
        <a href="${appUrl}/requests" class="button">View Request & Accept</a>
      </div>

      <div class="section">
        <h2>This Could Be Your Next Job</h2>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Fast and easy job acceptance</li>
          <li>Secure messaging with customer</li>
          <li>Protected payment processing</li>
          <li>Build your reviews and reputation</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>You received this because you match the requested service. Customize your preferences in settings.</p>
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `New ${serviceName} request from ${customerName} in ${location}. Budget: ${budget}. View at ${appUrl}/requests`,
  }
}

/**
 * Job accepted confirmation
 */
export function jobAcceptedTemplate(
  recipientName: string,
  otherPartyName: string,
  serviceName: string,
  scheduledDate: string,
  appUrl: string,
  isProvider: boolean
): LiftGOEmailTemplate {
  const roleText = isProvider ? 'customer' : 'service provider'
  const header = isProvider ? 'Job Accepted! ✓' : 'Service Provider Assigned ✓'

  return {
    subject: `${serviceName} Job Accepted - Scheduled for ${scheduledDate}`,
    from: LIFTGO_EMAILS.NOREPLY,
    replyTo: LIFTGO_EMAILS.SUPPORT,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${getLiftGOEmailStyle()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LIFTGO</div>
      <h1>${header}</h1>
    </div>
    <div class="content">
      <div class="section">
        <p>Hi ${recipientName},</p>
        <p>${otherPartyName} has confirmed your ${serviceName} request for <strong>${scheduledDate}</strong>.</p>
      </div>

      <div class="success-box">
        <strong>You're all set!</strong> Review the details below and prepare for the appointment.
      </div>

      <div class="section">
        <h2>Appointment Details</h2>
        <table class="detail-table">
          <tr>
            <td><strong>Service:</strong></td>
            <td>${serviceName}</td>
          </tr>
          <tr>
            <td><strong>${isProvider ? 'Customer' : 'Provider'}:</strong></td>
            <td>${otherPartyName}</td>
          </tr>
          <tr>
            <td><strong>Scheduled:</strong></td>
            <td>${scheduledDate}</td>
          </tr>
        </table>
      </div>

      <div class="cta-section">
        <p><strong>Need to communicate?</strong></p>
        <a href="${appUrl}/jobs" class="button">Message & View Details</a>
      </div>

      <div class="section">
        <h2>What's Next?</h2>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Review all service details in your dashboard</li>
          <li>Confirm you have the right address and time</li>
          <li>Chat with ${otherPartyName} if you have questions</li>
          <li>Complete the job on the scheduled date</li>
        </ul>
      </div>
    </div>
    <div class="footer">
      <p>Have questions? Message your ${roleText} directly or contact support.</p>
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `${header}. ${serviceName} scheduled for ${scheduledDate} with ${otherPartyName}. View details at ${appUrl}/jobs`,
  }
}

/**
 * Payment reminder/receipt
 */
export function paymentReminderTemplate(
  customerName: string,
  providerName: string,
  serviceName: string,
  amount: number,
  currency: string = 'USD',
  appUrl: string
): LiftGOEmailTemplate {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)

  return {
    subject: `Payment Due: ${serviceName} - ${formattedAmount}`,
    from: LIFTGO_EMAILS.NOREPLY,
    replyTo: LIFTGO_EMAILS.SUPPORT,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${getLiftGOEmailStyle()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LIFTGO</div>
      <h1>Payment Reminder 💳</h1>
    </div>
    <div class="content">
      <div class="section">
        <p>Hi ${customerName},</p>
        <p>Your ${serviceName} service with <strong>${providerName}</strong> is complete. Please complete the payment below:</p>
      </div>

      <div class="info-box">
        <div class="amount">${formattedAmount}</div>
        <table class="detail-table">
          <tr>
            <td><strong>Service:</strong></td>
            <td>${serviceName}</td>
          </tr>
          <tr>
            <td><strong>Provider:</strong></td>
            <td>${providerName}</td>
          </tr>
        </table>
      </div>

      <div class="cta-section">
        <p><strong>Ready to pay?</strong></p>
        <a href="${appUrl}/payments" class="button button-success">Make Payment</a>
      </div>

      <div class="section">
        <h2>How It Works</h2>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Pay securely through LiftGO</li>
          <li>Your payment is protected</li>
          <li>Provider receives payment after completion</li>
          <li>Leave feedback to help others</li>
        </ul>
      </div>

      <hr class="divider">

      <div class="section">
        <h2>Don't Forget to Rate</h2>
        <p>Your feedback helps maintain quality on LiftGO. Take 2 minutes to leave a review:</p>
        <a href="${appUrl}/reviews" class="button">Leave Review</a>
      </div>
    </div>
    <div class="footer">
      <p>Questions about payment? Contact ${LIFTGO_EMAILS.SUPPORT}</p>
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Payment due: ${formattedAmount} for ${serviceName} with ${providerName}. Pay at ${appUrl}/payments`,
  }
}

/**
 * Payment received/confirmed
 */
export function paymentConfirmedTemplate(
  recipientName: string,
  amount: number,
  serviceName: string,
  transactionId: string,
  currency: string = 'USD',
  appUrl: string,
  isProvider: boolean
): LiftGOEmailTemplate {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)

  return {
    subject: `Payment Confirmed - ${formattedAmount}`,
    from: LIFTGO_EMAILS.NOREPLY,
    replyTo: LIFTGO_EMAILS.SUPPORT,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${getLiftGOEmailStyle()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LIFTGO</div>
      <h1>Payment Confirmed ✓</h1>
    </div>
    <div class="content">
      <div class="section">
        <p>Hi ${recipientName},</p>
        <p>${isProvider ? 'Payment has been received' : 'Your payment has been processed successfully'}.</p>
      </div>

      <div class="success-box">
        <div class="amount">${formattedAmount}</div>
      </div>

      <div class="section">
        <h2>Payment Details</h2>
        <table class="detail-table">
          <tr>
            <td><strong>Service:</strong></td>
            <td>${serviceName}</td>
          </tr>
          <tr>
            <td><strong>Amount:</strong></td>
            <td>${formattedAmount}</td>
          </tr>
          <tr>
            <td><strong>Transaction ID:</strong></td>
            <td>${transactionId}</td>
          </tr>
          <tr>
            <td><strong>Date:</strong></td>
            <td>${new Date().toLocaleDateString()}</td>
          </tr>
        </table>
      </div>

      <div class="cta-section">
        <a href="${appUrl}/payments" class="button">View Receipt & Invoice</a>
      </div>

      ${
        isProvider
          ? `
      <div class="section">
        <h2>Payment Processed</h2>
        <p>Your earnings have been credited and will be available in your connected bank account within 2-3 business days.</p>
      </div>
      `
          : `
      <div class="section">
        <h2>What's Next?</h2>
        <p>Thank you for using LiftGO! Don't forget to leave feedback for your service provider.</p>
        <a href="${appUrl}/reviews" class="button">Leave Review</a>
      </div>
      `
      }
    </div>
    <div class="footer">
      <p>Keep this email as your receipt. Invoice available in your account.</p>
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Payment confirmed: ${formattedAmount}. Transaction: ${transactionId}. Details at ${appUrl}/payments`,
  }
}

/**
 * Payment failed notification
 */
export function paymentFailedTemplate(
  customerName: string,
  amount: number,
  serviceName: string,
  reason: string,
  appUrl: string,
  currency: string = 'USD'
): LiftGOEmailTemplate {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)

  return {
    subject: `Payment Failed - ${formattedAmount}`,
    from: LIFTGO_EMAILS.NOREPLY,
    replyTo: LIFTGO_EMAILS.SUPPORT,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${getLiftGOEmailStyle()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LIFTGO</div>
      <h1>Payment Failed ✗</h1>
    </div>
    <div class="content">
      <div class="section">
        <p>Hi ${customerName},</p>
        <p>We couldn't process your payment for <strong>${serviceName}</strong>.</p>
      </div>

      <div class="warning-box">
        <strong>Reason:</strong> ${reason}
      </div>

      <div class="section">
        <h2>Troubleshooting</h2>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Check that your card has sufficient funds</li>
          <li>Verify the card details are correct</li>
          <li>Ensure the card hasn't expired</li>
          <li>Contact your bank if charges were declined</li>
          <li>Try a different payment method</li>
        </ul>
      </div>

      <div class="cta-section">
        <p><strong>Try Again</strong></p>
        <a href="${appUrl}/payments" class="button button-warning">Retry Payment</a>
      </div>

      <hr class="divider">

      <div class="section">
        <h2>Need Help?</h2>
        <p>Our support team is ready to assist you:</p>
        <a href="mailto:${LIFTGO_EMAILS.SUPPORT}" class="button button-secondary">${LIFTGO_EMAILS.SUPPORT}</a>
      </div>
    </div>
    <div class="footer">
      <p>Questions? Contact support or call our helpline.</p>
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Payment failed for ${serviceName}: ${formattedAmount}. Reason: ${reason}. Retry at ${appUrl}/payments`,
  }
}

/**
 * Review request notification
 */
export function reviewRequestTemplate(
  customerName: string,
  providerName: string,
  serviceName: string,
  appUrl: string
): LiftGOEmailTemplate {
  return {
    subject: `Share Your Feedback - Review ${providerName}`,
    from: LIFTGO_EMAILS.NOREPLY,
    replyTo: LIFTGO_EMAILS.SUPPORT,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${getLiftGOEmailStyle()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LIFTGO</div>
      <h1>Share Your Feedback 🌟</h1>
    </div>
    <div class="content">
      <div class="section">
        <p>Hi ${customerName},</p>
        <p>How was your experience with <strong>${providerName}</strong> for your <strong>${serviceName}</strong> service?</p>
      </div>

      <div class="info-box">
        <p>Your feedback helps:</p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Other customers find the best providers</li>
          <li>Providers improve their service quality</li>
          <li>Build trust in the LiftGO community</li>
        </ul>
      </div>

      <div class="cta-section">
        <p><strong>Takes only 2 minutes!</strong></p>
        <a href="${appUrl}/reviews" class="button">Leave Your Review</a>
      </div>

      <div class="section">
        <h2>What to Include</h2>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Star rating (1-5 stars)</li>
          <li>Brief description of the service</li>
          <li>Quality of work and professionalism</li>
          <li>Would you recommend them?</li>
        </ul>
      </div>

      <hr class="divider">

      <div class="section">
        <p>Had a problem? We want to help:</p>
        <a href="mailto:${LIFTGO_EMAILS.SUPPORT}" class="button button-secondary">Report an Issue</a>
      </div>
    </div>
    <div class="footer">
      <p>Reviews help us maintain the highest quality service on LiftGO.</p>
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Please review ${providerName}'s service. Your feedback helps the community. Leave a review at ${appUrl}/reviews`,
  }
}

/**
 * Account suspension notification
 */
export function accountSuspensionTemplate(
  userName: string,
  reason: string,
  appUrl: string
): LiftGOEmailTemplate {
  return {
    subject: 'Account Suspension Notice',
    from: LIFTGO_EMAILS.SUPPORT,
    replyTo: LIFTGO_EMAILS.SUPPORT,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${getLiftGOEmailStyle()}</style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LIFTGO</div>
      <h1>Account Suspension</h1>
    </div>
    <div class="content">
      <div class="section">
        <p>Hi ${userName},</p>
        <p>We've temporarily suspended your LiftGO account due to a policy violation.</p>
      </div>

      <div class="warning-box">
        <strong>Reason:</strong> ${reason}
      </div>

      <div class="section">
        <h2>What This Means</h2>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>You cannot post new requests or accept jobs</li>
          <li>Existing jobs remain active</li>
          <li>You can still communicate with current contacts</li>
          <li>You have 7 days to appeal</li>
        </ul>
      </div>

      <div class="cta-section">
        <p><strong>Want to appeal?</strong></p>
        <a href="${appUrl}/appeals" class="button">File an Appeal</a>
      </div>

      <hr class="divider">

      <div class="section">
        <h2>Questions?</h2>
        <p>Our team is here to discuss this suspension:</p>
        <a href="mailto:${LIFTGO_EMAILS.SUPPORT}" class="button button-secondary">Contact Support</a>
      </div>

      <div class="section">
        <p><small>LiftGO maintains community standards to ensure everyone has a safe and trustworthy experience.</small></p>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated message. Do not reply directly.</p>
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Your account has been suspended. Reason: ${reason}. Appeal at ${appUrl}/appeals or contact ${LIFTGO_EMAILS.SUPPORT}`,
  }
}
