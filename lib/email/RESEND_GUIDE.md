# Resend Email Integration Guide

This guide covers the complete implementation of production-ready email sending with Resend for LiftGO.

## 📋 Table of Contents

1. [Setup](#setup)
2. [Core Concepts](#core-concepts)
3. [Single Email vs Batch](#single-email-vs-batch)
4. [API Examples](#api-examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Setup

### Environment Variables

Make sure you have `RESEND_API_KEY` configured:

```bash
RESEND_API_KEY=your_api_key_here
RESEND_FROM=noreply@yourdomain.com  # Optional, defaults to noreply@liftgo.net
```

### SDK Version

Current implementation uses `resend@^4.0.4`

---

## Core Concepts

### 1. Idempotency Keys

**Why**: Prevent duplicate emails if your request fails and you retry.

**Format**:
- Single email: `<event-type>/<entity-id>` (e.g., `welcome-email/user-123`)
- Batch: `batch-<event-type>/<batch-id>` (e.g., `batch-orders/batch-456`)

**Expiration**: 24 hours

```typescript
import { generateIdempotencyKey } from '@/lib/email/resend-utils'

const key = generateIdempotencyKey('welcome-email', 'user-123')
// Result: "welcome-email/user-123"
```

### 2. Retry Strategy

- **Only retry on**: 429 (rate limit) and 500 (server error)
- **Don't retry on**: 400, 401, 403, 409, 422
- **Backoff**: Exponential (1s, 2s, 4s, 8s...)
- **Max retries**: 3-5 attempts

The utility functions handle retries automatically!

### 3. Error Handling

| Code | Meaning | Action |
|------|---------|--------|
| 400, 422 | Invalid request | Fix and resend (don't retry) |
| 401, 403 | Auth/domain issue | Check API key and domain settings |
| 409 | Idempotency conflict | Use new key or verify payload matches |
| 429 | Rate limited | Retry with backoff (automatic) |
| 500 | Server error | Retry with backoff (automatic) |

---

## Single Email vs Batch

### Use Single Email When:
- ✅ Sending one email
- ✅ Email needs attachments
- ✅ Email needs to be scheduled
- ✅ Different recipients need different timing

### Use Batch When:
- ✅ Sending 2-100 emails in one request
- ✅ Different emails for different recipients
- ✅ Reducing API calls is important (rate limit is 2 req/sec)
- ✅ Bulk notifications or daily jobs

### Batch Limitations:
- ❌ No attachments
- ❌ No scheduling
- ❌ Atomic: if one email fails validation, entire batch fails
- ❌ Max 100 emails per request
- ❌ Max 50 recipients per email in batch

---

## API Examples

### Single Email - Basic

```typescript
import { sendEmail } from '@/lib/email/resend-utils'

const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to LiftGO',
  html: '<p>Welcome aboard!</p>',
  eventType: 'welcome-email',
  entityId: 'user-123',
})

if (result.success) {
  console.log('Email sent:', result.messageId)
} else {
  console.error('Failed:', result.error)
}
```

### Single Email - With Templates

```typescript
import { sendTemplatedEmail } from '@/lib/email/resend-utils'
import { welcomeEmailTemplate } from '@/lib/email/basic-templates'

const template = welcomeEmailTemplate('John', 'https://app.liftgo.com')

const result = await sendTemplatedEmail({
  to: 'john@example.com',
  template,
  eventType: 'welcome-email',
  entityId: 'user-123',
})
```

### Single Email - Advanced Options

```typescript
const result = await sendEmail({
  to: 'user@example.com',
  subject: 'New job request',
  html: '<p>A job matches your skills</p>',
  cc: ['manager@company.com'],
  bcc: ['archive@company.com'],
  replyTo: 'support@liftgo.net',
  tags: [
    { name: 'type', value: 'job-request' },
    { name: 'priority', value: 'high' },
  ],
  headers: {
    'X-Custom-Header': 'value',
  },
  eventType: 'job-request',
  entityId: 'job-456',
})
```

### Batch Email - Basic

```typescript
import { sendBatchEmails } from '@/lib/email/resend-utils'

const result = await sendBatchEmails({
  emails: [
    {
      to: 'user1@example.com',
      subject: 'Job available',
      html: '<p>Job 1 details</p>',
    },
    {
      to: 'user2@example.com',
      subject: 'Job available',
      html: '<p>Job 2 details</p>',
    },
  ],
  eventType: 'job-requests',
  batchId: 'batch-001',
})

// Returns: { success: true, messageIds: ['id1', 'id2'] }
//       or { success: false, error: 'error message' }
```

### Batch Email - Multiple Recipients

```typescript
const result = await sendBatchEmails({
  emails: [
    {
      to: ['user1@example.com', 'user2@example.com'],
      subject: 'Team announcement',
      html: '<p>Announcement text</p>',
      tags: [{ name: 'type', value: 'announcement' }],
    },
    {
      to: 'manager@example.com',
      subject: 'Team announcement (approval)',
      html: '<p>Announcement with approval request</p>',
    },
  ],
  eventType: 'announcements',
  batchId: `daily-${new Date().toISOString().split('T')[0]}`,
})
```

### Scheduled Email (Single Only)

```typescript
const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)

const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Reminder',
  html: '<p>This was scheduled for tomorrow</p>',
  scheduledAt: tomorrow.toISOString(),
})
```

---

## Best Practices

### 1. Use Templates

Always use the built-in templates for consistency:

```typescript
import { sendWelcomeEmail } from '@/lib/email/examples'

// This handles template, idempotency, retries automatically
await sendWelcomeEmail('user@example.com', 'John', 'https://app.liftgo.com')
```

### 2. Always Provide Idempotency Keys

```typescript
// DO THIS - Safe if retried
const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Payment Confirmed',
  html: '<p>$100 paid</p>',
  eventType: 'payment-confirmed',
  entityId: 'transaction-789', // Unique identifier
})

// NOT THIS - Could result in duplicates on retry
const result = await sendEmail({
  to: 'user@example.com',
  subject: 'Payment Confirmed',
  html: '<p>$100 paid</p>',
})
```

### 3. Pre-Validate Batch Emails

The utility validates, but do your own validation too:

```typescript
const emails = [/* ... */]

// Validate before batch sending
for (const email of emails) {
  if (!email.to || !email.subject || (!email.html && !email.text)) {
    console.error('Invalid email:', email)
    return
  }
}

// Safe to send now
await sendBatchEmails({ emails })
```

### 4. Log Meaningful Errors

```typescript
const result = await sendEmail({
  to: userEmail,
  subject: 'Welcome',
  html: template.html,
  eventType: 'welcome',
  entityId: userId,
})

if (!result.success) {
  // Log with context
  console.error('[Email] Failed to send welcome email', {
    userId,
    email: userEmail,
    error: result.error,
    timestamp: new Date().toISOString(),
  })

  // Could also send to Sentry/DataDog
}
```

### 5. Use Batch for Bulk Operations

```typescript
// DON'T DO THIS - Makes 1000 API calls
for (const user of users) {
  await sendEmail({ to: user.email, ... })
}

// DO THIS - Makes 10 API calls (100 emails per batch)
for (let i = 0; i < users.length; i += 100) {
  const batch = users.slice(i, i + 100)
  await sendBatchEmails({
    emails: batch.map(user => ({ ... })),
  })
}
```

### 6. Add Tags for Tracking

```typescript
const result = await sendEmail({
  to: userEmail,
  subject: 'Welcome',
  html: template.html,
  tags: [
    { name: 'type', value: 'welcome' },
    { name: 'user_plan', value: 'premium' },
    { name: 'signup_source', value: 'google' },
  ],
})

// Helps track metrics in Resend dashboard
```

---

## Integration Patterns

### Server Action Pattern

```typescript
// app/actions/send-welcome.ts
'use server'

import { sendWelcomeEmail } from '@/lib/email/examples'

export async function handleUserSignup(email: string, name: string) {
  // ... create user in database ...

  const result = await sendWelcomeEmail(
    email,
    name,
    process.env.NEXT_PUBLIC_APP_URL!
  )

  if (!result.success) {
    console.error('Welcome email failed:', result.error)
    // Decide: throw error, or continue anyway?
  }

  return { success: true, userId }
}
```

### API Route Pattern

```typescript
// app/api/webhook/stripe/route.ts
import { sendPaymentConfirmation } from '@/lib/email/examples'

export async function POST(request: Request) {
  const event = await request.json()

  if (event.type === 'payment_intent.succeeded') {
    await sendPaymentConfirmation(
      event.data.object.receipt_email,
      event.data.object.metadata.user_name,
      event.data.object.amount / 100,
      event.data.object.metadata.job_description,
      event.data.object.id,
      process.env.NEXT_PUBLIC_APP_URL!
    )
  }

  return Response.json({ received: true })
}
```

### Cron Job Pattern (QStash)

```typescript
// app/api/cron/send-review-reminders/route.ts
import { sendReviewRemindersBatch } from '@/lib/email/examples'

export async function POST(request: Request) {
  // Verify QStash signature
  const signature = request.headers.get('authorization')
  // ... verify ...

  // Get pending reviews from database
  const reminders = await db.getReviewReminders()

  if (reminders.length > 0) {
    await sendReviewRemindersBatch(
      reminders,
      process.env.NEXT_PUBLIC_APP_URL!
    )
  }

  return Response.json({ sent: reminders.length })
}
```

---

## Troubleshooting

### "RESEND_API_KEY not configured"

Make sure your API key is set in environment variables:

```bash
# In Vercel dashboard:
# Settings > Environment Variables
# Add: RESEND_API_KEY=re_xxx...
```

### Email appears in console but not sent

This is normal! If RESEND_API_KEY is missing, it logs a warning instead of failing:

```typescript
// This code in resend-utils.ts handles it:
if (!env.RESEND_API_KEY) {
  console.warn('[sendEmail] RESEND_API_KEY not configured')
  return { success: false, error: 'Email service not configured' }
}
```

### "Idempotency key exceeds 256 characters"

Make sure your eventType and entityId are reasonably short:

```typescript
// DON'T:
generateIdempotencyKey(
  'very_long_event_type_name_that_is_way_too_long',
  'also_a_very_long_id_that_exceeds_reasonable_limits'
)

// DO:
generateIdempotencyKey('payment-confirmed', transactionId) // ~40 chars
```

### "409 Idempotency conflict"

This means you're using the same idempotency key with different content:

```typescript
// First call (succeeds):
await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<p>Welcome</p>',
  eventType: 'welcome',
  entityId: 'user-123',
})

// Second call with SAME key but DIFFERENT content (fails with 409):
await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!', // Different!
  html: '<p>Welcome to LiftGO</p>', // Different!
  eventType: 'welcome',
  entityId: 'user-123', // Same key
})
```

Solution: Either use the same content, or use a different idempotency key.

### Batch email fails with "Batch size must be between 2 and 100"

```typescript
// DON'T - Single email in batch
await sendBatchEmails({
  emails: [{ to: 'user@example.com', subject: '...', html: '...' }]
})

// DO - Use sendEmail for single emails
await sendEmail({
  to: 'user@example.com',
  subject: '...',
  html: '...',
})

// DO - Use batch for 2+ emails
await sendBatchEmails({
  emails: [
    { to: 'user1@example.com', ... },
    { to: 'user2@example.com', ... },
  ]
})
```

---

## File Structure

```
lib/email/
├── resend-utils.ts          # Core sending utilities
├── basic-templates.ts       # Pre-built email templates
├── examples.ts              # Example implementations
├── RESEND_GUIDE.md         # This file
├── sender.ts               # Legacy implementation (deprecated)
├── templates.ts            # Legacy templates (can be merged into basic-templates)
├── notification-templates.ts # Legacy templates (can be merged)
└── logs/                    # Email send logs (optional)
```

---

## Next Steps

1. ✅ Install: `pnpm add resend@^4.0.4` (already installed)
2. ✅ Configure: Set `RESEND_API_KEY` env var
3. ✅ Test: Use `sendWelcomeEmail()` in a server action
4. 📊 Monitor: Check Resend dashboard for delivery rates
5. 🔄 Iterate: Customize templates for your use case

---

## Support

For issues:
1. Check this guide's troubleshooting section
2. Check Resend docs: https://resend.com/docs
3. Check email logs: Look for `[sendEmail]` or `[sendBatchEmails]` in console

For Resend API issues:
- Visit Resend dashboard to verify domain setup
- Check email lists for bounced/invalid addresses
- Review rate limiting (2 requests per second)
