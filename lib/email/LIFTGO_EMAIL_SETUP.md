# LiftGO Email System Setup Guide

Complete guide for implementing email templates and automations in LiftGO.

## Table of Contents

1. [Overview](#overview)
2. [Email Addresses](#email-addresses)
3. [Templates](#templates)
4. [Automations](#automations)
5. [Integration Examples](#integration-examples)
6. [Setup Instructions](#setup-instructions)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The LiftGO email system provides:

- **Professional HTML templates** with consistent branding
- **Automated workflows** triggered by user actions and scheduled events
- **Batch sending** for efficient bulk operations
- **Error handling** and retry logic
- **Tracking & monitoring** with tags and event types

### Features

- ✅ Welcome emails for customers and providers
- ✅ Service request notifications
- ✅ Job acceptance confirmations
- ✅ Payment reminders and confirmations
- ✅ Payment failure notifications
- ✅ Review request automations
- ✅ Account suspension notices
- ✅ Daily review reminders (scheduled)
- ✅ Weekly provider digests (scheduled)

## Required Environment Variables

- `EMAIL_PROVIDER` (`resend` | `sendgrid`). If omitted, provider auto-selects configured key (`RESEND_API_KEY` first, then `SENDGRID_API_KEY`).
- `FROM_EMAIL` sender address used in transactional emails (example: `LiftGO <noreply@liftgo.net>`).
- `APP_BASE_URL` absolute app URL for deep links in templates (fallback: `NEXT_PUBLIC_APP_URL`).
- Provider credentials:
  - Resend: `RESEND_API_KEY`
  - SendGrid: `SENDGRID_API_KEY`
  - AWS SES keys may exist in env, but SES is not selectable until adapter wiring is implemented.

---

## Email Addresses

LiftGO uses four dedicated email addresses for different purposes:

### 1. **info@liftgo.net**
- **Purpose**: General inquiries and information requests
- **Use Cases**: Company updates, feature announcements, general communications
- **Reply-To**: support@liftgo.net

### 2. **support@liftgo.net**
- **Purpose**: Customer support and help inquiries
- **Use Cases**: Replies from automated emails, support requests, escalations
- **Response Time**: 24 hours

### 3. **noreply@liftgo.net**
- **Purpose**: Transactional emails (no replies expected)
- **Use Cases**: Confirmations, notifications, alerts, updates
- **No Replies**: Do not reply to this address

### 4. **team@liftgo.net**
- **Purpose**: Internal team notifications and reports
- **Use Cases**: Internal alerts, system notifications, admin communications
- **Access**: Internal team only

---

## Templates

### Available Templates

#### 1. Welcome Customer
```typescript
import { welcomeCustomerTemplate } from '@/lib/email/liftgo-templates'

const template = welcomeCustomerTemplate('John Doe', appUrl)
// Welcomes new customers and explains how to get started
```

#### 2. Welcome Provider
```typescript
const template = welcomeProviderTemplate('Jane Smith', 'Plumbing', appUrl)
// Welcomes newly approved service providers
```

#### 3. New Service Request
```typescript
const template = newServiceRequestTemplate(
  providerName,
  customerName,
  serviceName,
  location,
  budget,
  description,
  appUrl
)
// Notifies provider of new service request matching their skills
```

#### 4. Job Accepted
```typescript
const template = jobAcceptedTemplate(
  recipientName,
  otherPartyName,
  serviceName,
  scheduledDate,
  appUrl,
  isProvider // boolean
)
// Confirms job acceptance to both parties
```

#### 5. Payment Reminder
```typescript
const template = paymentReminderTemplate(
  customerName,
  providerName,
  serviceName,
  amount,
  'USD',
  appUrl
)
// Reminds customer to pay for completed service
```

#### 6. Payment Confirmed
```typescript
const template = paymentConfirmedTemplate(
  recipientName,
  amount,
  serviceName,
  transactionId,
  'USD',
  appUrl,
  isProvider // boolean
)
// Confirms payment to both customer and provider
```

#### 7. Payment Failed
```typescript
const template = paymentFailedTemplate(
  customerName,
  amount,
  serviceName,
  reason,
  appUrl,
  'USD'
)
// Notifies customer of payment failure
```

#### 8. Review Request
```typescript
const template = reviewRequestTemplate(
  customerName,
  providerName,
  serviceName,
  appUrl
)
// Requests customer leave feedback
```

#### 9. Account Suspension
```typescript
const template = accountSuspensionTemplate(userName, reason, appUrl)
// Notifies user of account suspension and appeal process
```

---

## Automations

### Event-Triggered Automations

| Automation | Trigger | Recipients | Purpose |
|-----------|---------|-----------|---------|
| Welcome Customer | Customer signs up | Customer | Initial onboarding |
| Welcome Provider | Provider approved | Provider | Partnership introduction |
| New Service Request | Request posted | Matched providers | Opportunity notification |
| Job Accepted | Provider accepts | Both parties | Confirmation |
| Payment Reminder | Job completed | Customer | Payment prompt |
| Payment Confirmed | Payment successful | Both parties | Receipt confirmation |
| Payment Failed | Payment rejected | Customer | Error notification |
| Review Request | Job completion + 24h | Customer | Feedback request |
| Account Suspended | Policy violation | User | Enforcement notice |

### Scheduled Automations

| Automation | Schedule | Recipients | Purpose |
|-----------|----------|-----------|---------|
| Daily Review Reminders | Daily 9 AM | Customers with pending reviews | Engagement |
| Weekly Provider Digest | Monday 8 AM | Active providers | Activity summary |

---

## Integration Examples

### Example 1: Send Welcome Email After Registration

```typescript
import { onCustomerRegistered } from '@/lib/email/liftgo-integration'

// In your user registration handler
export async function registerCustomer(email: string, name: string) {
  // Save customer to database
  const customer = await db.customer.create({ email, name })

  // Send welcome email (non-blocking)
  onCustomerRegistered(email, name).catch(err => {
    console.error('Email send failed:', err)
    // Log to error tracking service if needed
  })

  return customer
}
```

### Example 2: Notify Providers of New Request

```typescript
import { onServiceRequestCreated } from '@/lib/email/liftgo-integration'

// In your service request creation handler
export async function createServiceRequest(
  customerId: string,
  serviceName: string,
  description: string
) {
  // Create request in database
  const request = await db.request.create({
    customerId,
    serviceName,
    description,
  })

  // Find matching providers
  const providers = await findMatchingProviders(serviceName)

  const customer = await db.customer.findById(customerId)

  // Notify providers
  await onServiceRequestCreated(
    request.id,
    customer.email,
    customer.name,
    serviceName,
    request.location,
    request.budget,
    description,
    providers.map(p => ({ email: p.email, name: p.name }))
  )

  return request
}
```

### Example 3: API Route Integration

```typescript
// app/api/webhooks/email/route.ts
import { NextRequest } from 'next/server'
import {
  onCustomerRegistered,
  onServiceRequestCreated,
  onJobAccepted,
  onPaymentSuccessful,
} from '@/lib/email/liftgo-integration'

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get('x-webhook-secret')
  if (secret !== process.env.WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = await req.json()

  try {
    switch (event.type) {
      case 'customer.registered':
        await onCustomerRegistered(event.email, event.name)
        break

      case 'request.created':
        await onServiceRequestCreated(
          event.jobId,
          event.customerEmail,
          event.customerName,
          event.serviceName,
          event.location,
          event.budget,
          event.description,
          event.matchedProviders
        )
        break

      case 'job.accepted':
        await onJobAccepted(
          event.jobId,
          event.customerEmail,
          event.customerName,
          event.providerEmail,
          event.providerName,
          event.serviceName,
          event.scheduledDate
        )
        break

      case 'payment.successful':
        await onPaymentSuccessful(
          event.jobId,
          event.customerEmail,
          event.customerName,
          event.providerEmail,
          event.providerName,
          event.serviceName,
          event.amount,
          event.transactionId
        )
        break

      default:
        return Response.json(
          { error: 'Unknown event type' },
          { status: 400 }
        )
    }

    return Response.json({ success: true, event: event.type })
  } catch (error) {
    console.error('[Email Webhook] Error:', error)
    return Response.json(
      { error: 'Failed to process event' },
      { status: 500 }
    )
  }
}
```

### Example 4: Scheduled Cron Jobs

```typescript
// app/api/cron/daily-review-reminders/route.ts
import { sendDailyReviewReminders } from '@/lib/email/liftgo-integration'

export async function GET(req: Request) {
  // Verify cron secret (Vercel sends this automatically)
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all customers with pending reviews from database
    const pendingReviews = await db.review.findPendingReminders()

    if (pendingReviews.length === 0) {
      return Response.json({ success: true, sent: 0 })
    }

    // Send reminders
    const result = await sendDailyReviewReminders(pendingReviews)

    return Response.json({
      success: result.success,
      sent: pendingReviews.length,
      error: result.error,
    })
  } catch (error) {
    console.error('[Cron] Daily review reminders failed:', error)
    return Response.json(
      { error: 'Failed to process' },
      { status: 500 }
    )
  }
}
```

Configure in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-review-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/weekly-provider-digests",
      "schedule": "0 8 * * 1"
    }
  ]
}
```

---

## Setup Instructions

### Step 1: Verify Resend Integration

Ensure `RESEND_API_KEY` is set in your environment:

```bash
# In Vercel dashboard > Settings > Environment Variables
# Or in .env.local for local development
RESEND_API_KEY=your_api_key_here
```

### Step 2: Verify Email Addresses

Confirm the four LiftGO email addresses are configured in Resend:

```
✓ info@liftgo.net
✓ support@liftgo.net
✓ noreply@liftgo.net
✓ team@liftgo.net
```

### Step 3: Configure App URL

```typescript
// In your .env or environment
NEXT_PUBLIC_APP_URL=https://liftgo.net  // Production
NEXT_PUBLIC_APP_URL=http://localhost:3000  // Development
```

### Step 4: Implement Event Handlers

Start with the integration examples above in your application code.

### Step 5: Test Emails

```typescript
import { testEmailSetup } from '@/lib/email/liftgo-integration'

// Run in development
const result = await testEmailSetup()
console.log(result)
```

### Step 6: Monitor Email Delivery

Use Resend dashboard to monitor:
- Delivery rates
- Open rates
- Click-through rates
- Bounces and complaints
- Error logs

---

## Testing

### Local Development Testing

```typescript
// 1. Add test endpoint
// app/api/test-email/route.ts
import { onCustomerRegistered } from '@/lib/email/liftgo-integration'

export async function POST(req: Request) {
  const { email, name } = await req.json()

  const result = await onCustomerRegistered(email, name)
  return Response.json(result)
}

// 2. Send test request
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User"}'
```

### Resend Testing

Use Resend's testing features:

1. **Send test email** in Resend dashboard
2. **Check delivery status** in logs
3. **Preview HTML** in editor
4. **Use sandbox mode** for development

### Common Test Cases

```typescript
// Test new customer
await onCustomerRegistered('customer@test.com', 'John Customer')

// Test new provider
await onProviderApproved('provider@test.com', 'Jane Provider', 'Plumbing')

// Test service request
await onServiceRequestCreated(
  'job-123',
  'customer@test.com',
  'John Customer',
  'Plumbing',
  'San Francisco, CA',
  '$200-$300',
  'Fix leaky pipe',
  [
    { email: 'provider1@test.com', name: 'Provider 1' },
    { email: 'provider2@test.com', name: 'Provider 2' },
  ]
)

// Test payment
await onPaymentSuccessful(
  'job-123',
  'customer@test.com',
  'John Customer',
  'provider@test.com',
  'Jane Provider',
  'Plumbing',
  250.00,
  'txn-123456'
)
```

---

## Troubleshooting

### Issue: Emails not sending

**Check:**
1. Is `RESEND_API_KEY` set correctly?
2. Are email addresses validated in Resend?
3. Check Resend dashboard logs for errors
4. Verify email address format is correct

### Issue: Emails marked as spam

**Solutions:**
1. Add SPF record: `v=spf1 include:sendingdomain.resend.dev ~all`
2. Add DKIM records (Resend provides these)
3. Add DMARC record: `v=DMARC1; p=quarantine`
4. Use consistent From address

### Issue: Batch emails failing

**Note:**
- Batch emails require minimum 2 recipients
- If only 1 recipient, use `sendTemplatedEmail` instead
- Check that all email addresses are valid

### Issue: Scheduled tasks not running

**Check:**
1. Cron configuration in `vercel.json` is correct
2. Cron secret is set: `CRON_SECRET`
3. API route is accessible at `/api/cron/...`
4. Check Vercel function logs

### Issue: Email content not showing correctly

**Fix:**
1. Verify HTML is valid and properly escaped
2. Test with multiple email clients
3. Check that CSS is inline (many clients don't support `<style>` tags)
4. Use Resend preview feature

---

## Best Practices

### 1. Always use error handling

```typescript
onCustomerRegistered(email, name).catch(err => {
  console.error('Failed to send welcome email:', err)
  // Send alert to monitoring service
})
```

### 2. Use queue for batch operations

```typescript
// Don't wait for email to send
emailQueue.push({ type: 'customer.registered', email, name })

// Process asynchronously
emailQueue.subscribe(async msg => {
  if (msg.type === 'customer.registered') {
    await onCustomerRegistered(msg.email, msg.name)
  }
})
```

### 3. Monitor email metrics

```typescript
// Track in your analytics
analytics.track('email_sent', {
  type: 'welcome',
  recipient_type: 'customer',
  timestamp: new Date(),
})
```

### 4. Use tags for filtering and analysis

```typescript
// All emails include tags for monitoring
{
  tags: [
    { name: 'automation', value: 'payment' },
    { name: 'event', value: 'confirmed' },
  ]
}
```

### 5. Test before production deployment

```bash
# Run email tests in staging
npm run test:email

# Monitor first day metrics closely
```

---

## File Structure

```
lib/email/
├── liftgo-templates.ts          # All email templates
├── liftgo-automations.ts        # Automation workflows
├── liftgo-integration.ts        # Integration examples
├── resend-utils.ts              # Core Resend utilities
├── basic-templates.ts           # Generic templates
├── examples.ts                  # Usage examples
├── testing.ts                   # Test utilities
├── LIFTGO_EMAIL_SETUP.md        # This file
├── RESEND_GUIDE.md              # Resend reference
├── QUICK_REFERENCE.md           # Quick lookup
└── RESEND_CHECKLIST.md          # Implementation checklist
```

---

## Support

For help:
1. Check this documentation
2. Review integration examples
3. Test with `testEmailSetup()`
4. Check Resend dashboard logs
5. Contact: support@liftgo.net

---

Last updated: 2026-04-19
Version: 1.0.0
