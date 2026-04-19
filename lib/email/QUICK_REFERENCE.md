# Resend Email - Quick Reference Card

## ⚡ 30-Second Setup

```bash
# 1. Set environment variable
RESEND_API_KEY=re_your_key_here

# 2. That's it! You're ready to go.
```

## 📧 Send Emails in 2 Lines

### Single Email
```typescript
import { sendWelcomeEmail } from '@/lib/email/examples'
await sendWelcomeEmail('user@example.com', 'John', 'https://liftgo.net')
```

### Batch Email
```typescript
import { sendBatchEmails } from '@/lib/email/resend-utils'
await sendBatchEmails({
  emails: [
    { to: 'user1@example.com', subject: '...', html: '...' },
    { to: 'user2@example.com', subject: '...', html: '...' },
  ]
})
```

## 🎯 Choose Your Approach

| Use Case | Function | Example |
|----------|----------|---------|
| Welcome | `sendWelcomeEmail()` | New user signup |
| Job request | `sendJobRequestNotification()` | New job for provider |
| Payment OK | `sendPaymentConfirmation()` | Transaction succeeded |
| Payment failed | `sendPaymentFailed()` | Transaction failed |
| Job done | `sendJobCompletionWithCopy()` | Work completed |
| Review reminder | `sendReviewRemindersBatch()` | Daily batch job |
| Custom | `sendEmail()` | Full control |
| Custom batch | `sendBatchEmails()` | 2-100 emails at once |

## 🏗️ Architecture

```
User Action
    ↓
Server Action / API Route
    ↓
sendWelcomeEmail() / sendEmail() / sendBatchEmails()
    ↓
Resend API
    ↓
Email Sent ✓
```

## 📋 Response Format

All functions return:
```typescript
{
  success: boolean,
  messageId?: string,     // Email ID for tracking
  error?: string,         // Error message if failed
  messageIds?: string[],  // For batch sends
}
```

## ✅ What's Automatic

- ✅ Idempotency (prevents duplicates)
- ✅ Retries (with exponential backoff)
- ✅ Error handling (smart retry logic)
- ✅ Rate limiting (respects 2 req/sec)
- ✅ Logging (all sends logged)
- ✅ Validation (email format, templates)

## ⚙️ Customization

### Change From Address
Edit `EMAIL_CONFIG.FROM_EMAIL` in `lib/email/resend-utils.ts`

### Add New Template
1. Create function in `lib/email/basic-templates.ts`
2. Create example in `lib/email/examples.ts`
3. Use anywhere

### Change Default Retries
Edit `MAX_RETRIES` in `EMAIL_CONFIG`

## 🐛 Quick Debug

```typescript
import { testEmailSending, logEmailDebug } from '@/lib/email/testing'

// Full diagnostic
await testEmailSending()

// Debug specific email
logEmailDebug('user@example.com', 'Subject', '<p>HTML</p>')
```

## 🚨 Common Issues

| Issue | Fix |
|-------|-----|
| "Email service not configured" | Set `RESEND_API_KEY` environment variable |
| Batch requires 2+ emails | Use `sendEmail()` for single emails |
| 409 Idempotency conflict | Use different `eventType`/`entityId` |
| Email not received | Check domain verified in Resend dashboard |
| Rate limited (429) | Automatic retry with backoff |

## 📊 Status Codes

| Code | Retry? | Action |
|------|--------|--------|
| 200 | ✓ | Success |
| 400/422 | ✗ | Fix data, try again |
| 401/403 | ✗ | Check API key, domain |
| 409 | ✗ | Use different key or payload |
| 429 | ✓ | Automatic backoff retry |
| 500 | ✓ | Automatic retry |

## 💡 Best Practices

1. **Always use idempotency keys** (automatic with examples)
2. **Pre-validate batch emails** (before sending)
3. **Use templates** (consistency, less error-prone)
4. **Log all sends** (helps debugging)
5. **Use batch for bulk** (reduces API calls)
6. **Use single for attachments** (batch doesn't support)
7. **Check environment var** (before trying to send)

## 🔗 File Map

```
Need quick help? → QUICK_REFERENCE.md (this file)
Need details? → RESEND_GUIDE.md
Need examples? → examples.ts
Need to customize? → basic-templates.ts
Need to troubleshoot? → testing.ts
Need core logic? → resend-utils.ts
```

## 🎮 Copy-Paste Templates

### Server Action
```typescript
'use server'

import { sendWelcomeEmail } from '@/lib/email/examples'

export async function signup(email: string, name: string) {
  await sendWelcomeEmail(email, name, process.env.NEXT_PUBLIC_APP_URL!)
  return { success: true }
}
```

### API Route
```typescript
import { sendPaymentConfirmation } from '@/lib/email/examples'

export async function POST(request: Request) {
  const data = await request.json()
  await sendPaymentConfirmation(
    data.email,
    data.name,
    data.amount,
    data.job,
    data.transactionId,
    process.env.NEXT_PUBLIC_APP_URL!
  )
  return Response.json({ success: true })
}
```

### Batch Job
```typescript
import { sendReviewRemindersBatch } from '@/lib/email/examples'

export async function GET(request: Request) {
  const reminders = await db.getPendingReviews()
  if (reminders.length > 0) {
    await sendReviewRemindersBatch(reminders, process.env.NEXT_PUBLIC_APP_URL!)
  }
  return Response.json({ sent: reminders.length })
}
```

## 📞 Need Help?

1. Check RESEND_GUIDE.md (troubleshooting section)
2. Run `testEmailSending()` to diagnose
3. Check Resend dashboard: https://resend.com
4. Check logs for `[sendEmail]` errors

## ✨ Key Numbers

- **Rate Limit**: 2 requests/second
- **Batch Size**: 2-100 emails
- **Recipients per Email**: Max 50 (in batch)
- **Message Size**: Max 40MB (attachments)
- **Idempotency Key Length**: Max 256 chars
- **Retry Attempts**: 3 by default
- **Initial Backoff**: 1 second
- **Max Backoff**: 30 seconds
- **Idempotency Expiration**: 24 hours

---

**Last Updated**: 2026-04-19
**Status**: ✅ Production Ready
