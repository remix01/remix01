/**
 * Basic email templates for common use cases
 * Each template includes subject and html (plus optional text for email clients without HTML support)
 */

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

/**
 * Welcome email for new users
 */
export function welcomeEmailTemplate(userName: string, appUrl: string): EmailTemplate {
  return {
    subject: 'Welcome to LiftGO',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome, ${userName}! 🎉</h1>
    </div>
    <div class="content">
      <p>Thank you for joining LiftGO. We're excited to have you on board!</p>
      
      <h3>Get Started</h3>
      <p>Complete your profile and start connecting with service providers today:</p>
      
      <a href="${appUrl}/dashboard" class="button">Go to Dashboard</a>
      
      <h3>What's Next?</h3>
      <ul>
        <li>Complete your profile information</li>
        <li>Post your first service request</li>
        <li>Connect with qualified professionals</li>
        <li>Complete your first job</li>
      </ul>
      
      <p>If you have any questions, don't hesitate to reach out to our support team.</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Welcome, ${userName}! Thank you for joining LiftGO. Visit ${appUrl}/dashboard to get started.`,
  }
}

/**
 * Job request notification for service providers
 */
export function newJobRequestEmailTemplate(
  providerName: string,
  jobTitle: string,
  jobDescription: string,
  customerName: string,
  appUrl: string
): EmailTemplate {
  return {
    subject: `New Service Request: ${jobTitle}`,
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
    .job-card { background: white; padding: 20px; border: 1px solid #e5e7eb; border-radius: 6px; margin: 20px 0; }
    .button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Service Request! 🔔</h1>
    </div>
    <div class="content">
      <p>Hi ${providerName},</p>
      
      <p>A new service request matches your expertise:</p>
      
      <div class="job-card">
        <h3>${jobTitle}</h3>
        <p><strong>From:</strong> ${customerName}</p>
        <p><strong>Description:</strong></p>
        <p>${jobDescription}</p>
      </div>
      
      <p>View this request and accept to start working:</p>
      <a href="${appUrl}/jobs" class="button">Review Request</a>
      
      <p>This is a limited-time opportunity. Other providers may be viewing this request too!</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `New service request from ${customerName}: ${jobTitle}. ${jobDescription}. Review at ${appUrl}/jobs`,
  }
}

/**
 * Payment confirmation email
 */
export function paymentConfirmationEmailTemplate(
  userName: string,
  amount: number,
  currency: string = 'USD',
  jobDescription: string,
  transactionId: string,
  appUrl: string
): EmailTemplate {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)

  return {
    subject: `Payment Received: ${formattedAmount}`,
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
    .amount-box { background: white; padding: 20px; border: 2px solid #16a34a; border-radius: 6px; text-align: center; margin: 20px 0; }
    .amount { font-size: 36px; font-weight: bold; color: #16a34a; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Confirmed ✓</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      
      <p>Your payment has been successfully received.</p>
      
      <div class="amount-box">
        <div class="amount">${formattedAmount}</div>
      </div>
      
      <div class="detail-row">
        <strong>Transaction ID:</strong>
        <span>${transactionId}</span>
      </div>
      
      <div class="detail-row">
        <strong>Service:</strong>
        <span>${jobDescription}</span>
      </div>
      
      <p>View your transaction details and receipt:</p>
      <a href="${appUrl}/payments" class="button">View Details</a>
      
      <p>Thank you for using LiftGO!</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Payment confirmed: ${formattedAmount}. Transaction ID: ${transactionId}. Service: ${jobDescription}. View details at ${appUrl}/payments`,
  }
}

/**
 * Payment failed notification
 */
export function paymentFailedEmailTemplate(
  userName: string,
  amount: number,
  currency: string = 'USD',
  reason: string,
  appUrl: string
): EmailTemplate {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)

  return {
    subject: `Payment Failed: ${formattedAmount}`,
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
    .error-box { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .button-secondary { display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; margin-left: 10px; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Payment Failed ✗</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      
      <p>We couldn't process your payment for ${formattedAmount}.</p>
      
      <div class="error-box">
        <strong>Reason:</strong> ${reason}
      </div>
      
      <h3>What You Can Do</h3>
      <ul>
        <li>Check your payment method is valid and has sufficient funds</li>
        <li>Verify the card details are correct</li>
        <li>Try a different payment method</li>
        <li>Contact your bank if you see unauthorized charges</li>
      </ul>
      
      <p>Please try again or contact our support team:</p>
      <a href="${appUrl}/billing" class="button">Retry Payment</a>
      <a href="${appUrl}/support" class="button-secondary">Contact Support</a>
    </div>
    <div class="footer">
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Payment failed for ${formattedAmount}. Reason: ${reason}. Retry at ${appUrl}/billing or contact support.`,
  }
}

/**
 * Job completed notification
 */
export function jobCompletedEmailTemplate(
  userName: string,
  jobTitle: string,
  providerName: string,
  appUrl: string
): EmailTemplate {
  return {
    subject: `Job Completed: ${jobTitle}`,
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
      <h1>Job Completed! ✓</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      
      <div class="success-box">
        <p><strong>${jobTitle}</strong> has been marked as completed by ${providerName}.</p>
      </div>
      
      <h3>Next Steps</h3>
      <ul>
        <li>Review the completed work</li>
        <li>Leave feedback and rate the service provider</li>
        <li>Make the final payment if not already done</li>
      </ul>
      
      <p>Your feedback helps maintain quality on LiftGO and helps providers improve their service.</p>
      
      <a href="${appUrl}/jobs" class="button">View Job Details</a>
    </div>
    <div class="footer">
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Job completed: ${jobTitle} by ${providerName}. Review and rate at ${appUrl}/jobs`,
  }
}

/**
 * Review reminder email
 */
export function reviewReminderEmailTemplate(
  userName: string,
  jobTitle: string,
  providerName: string,
  appUrl: string
): EmailTemplate {
  return {
    subject: `Don't Forget: Leave a Review for ${providerName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2563eb; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .reminder-box { background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Leave a Review 🌟</h1>
    </div>
    <div class="content">
      <p>Hi ${userName},</p>
      
      <div class="reminder-box">
        <p>We noticed you haven't left a review for <strong>${providerName}</strong> on the job <strong>"${jobTitle}"</strong> yet.</p>
      </div>
      
      <h3>Why Reviews Matter</h3>
      <ul>
        <li>Help other customers make informed decisions</li>
        <li>Reward great service providers</li>
        <li>Build trust in the LiftGO community</li>
        <li>Improve the platform for everyone</li>
      </ul>
      
      <p>It only takes 2 minutes!</p>
      
      <a href="${appUrl}/reviews" class="button">Leave Your Review</a>
      
      <p>Thank you for helping us maintain quality on LiftGO!</p>
    </div>
    <div class="footer">
      <p>&copy; 2026 LiftGO. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `,
    text: `Leave a review for ${providerName} on job "${jobTitle}". Visit ${appUrl}/reviews`,
  }
}
