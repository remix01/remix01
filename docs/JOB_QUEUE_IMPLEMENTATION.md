# Job Queue Implementation — Async Side Effects Architecture

## Overview

The job queue system decouples side effects from critical escrow operations, enabling faster HTTP responses and resilient background processing. All async work (emails, webhooks, Stripe operations) is queued to Upstash Redis and processed asynchronously.

## Architecture

```
HTTP Request
    ↓
[Validation, Auth, State Machine Guard]
    ↓
[Critical DB + Stripe Operations]
    ↓
[Enqueue Side Effects] → Fire-and-forget
    ↓
[Return Response] (200 OK)
    
Meanwhile:
    ↓
[Background Worker / Cron]
    ↓
[Job Processor API] (authenticated)
    ↓
[dequeueAndProcess] → Exponential backoff + retries
    ↓
[Job Workers] (Email, Stripe, Webhooks)
    ↓
[Completed / Dead Letter Queue]
```

## Job Types

| Type | Triggered By | Payload | Example |
|------|-------------|---------|---------|
| `send_release_email` | Release | transactionId, email, amount | When partner releases payment |
| `send_refund_email` | Refund | transactionId, email, reason | When admin refunds payment |
| `send_dispute_email` | Dispute | transactionId, email | When dispute is opened |
| `send_payment_confirmed_email` | Payment Intent | transactionId, email | After payment captured |
| `stripe_capture_payment` | Release | paymentIntentId | Async capture (fallback) |
| `stripe_refund_payment` | Refund | paymentIntentId | Async refund (fallback) |
| `webhook_escrow_status_changed` | Any status change | statusBefore, statusAfter | Notify partners |
| `notify_dispute_resolved` | Dispute resolved | escrowId, resolution | Notify parties |
| `audit_log_created` | Any event | eventData | Fire-and-forget logging |

## Core Components

### 1. Queue System (`lib/jobs/queue.ts`)

**Key Functions:**

```typescript
// Enqueue a job
const jobId = await enqueueJob('send_release_email', {
  transactionId: 'esc-123',
  recipientEmail: 'user@example.com',
  amount: 10000, // cents
}, {
  dedupeKey: `escrow-esc-123-release`, // Prevent duplicates (1 hour window)
  maxAttempts: 3,
})

// Dequeue and process
const job = await dequeueAndProcess('send_release_email', async (job) => {
  // Your handler code
  await sendEmail(job.payload)
})

// Get status
const status = await getJobStatus(jobId)

// Get queue stats
const stats = await getQueueStats()
// Returns: { send_release_email: 5, stripe_capture_payment: 2, dead_letter: 1, ... }

// List dead letter queue
const failed = await getDeadLetterJobs(limit)
```

**Storage:**

- **Jobs**: `job:{jobId}` → JSON metadata (24-hour TTL)
- **Queues**: `queue:{type}` → Redis list (FIFO)
- **Deduplication**: `dedupe:{type}:{key}` → jobId (1-hour TTL)
- **Dead Letter**: `queue:dead_letter` → Failed jobs (7-day TTL)

### 2. Job Workers (`lib/jobs/workers/`)

#### Email Worker (`emailWorker.ts`)
Sends escrow-related emails with templated HTML.

```typescript
await handleEmailJob(job)
// Handles: send_release_email, send_refund_email, send_dispute_email, send_payment_confirmed_email
```

#### Stripe Worker (`stripeWorker.ts`)
Manages payment operations (capture, refund).

```typescript
await handleStripeJob(job)
// Handles: stripe_capture_payment, stripe_refund_payment
// Implements non-retryable error detection
```

#### Webhook Worker (`webhookWorker.ts`)
Notifies partners of escrow state changes.

```typescript
await handleWebhookJob(job)
// Handles: webhook_escrow_status_changed
// Generates HMAC-SHA256 signatures for security
```

### 3. Job Processor (`lib/jobs/processor.ts`)

Routes jobs to their handlers and coordinates batch processing.

```typescript
// Process single job
const job = await processNextJob('send_release_email')

// Process all of one type
const count = await processAllJobsOfType('stripe_capture_payment')

// Process batch across types
const results = await processBatch([
  'send_release_email',
  'stripe_capture_payment',
  'webhook_escrow_status_changed',
], limit = 10)
```

### 4. Processor API (`app/api/jobs/process/route.ts`)

Protected endpoint for background workers to trigger job processing.

```bash
# Process single job type
curl -X POST http://localhost:3000/api/jobs/process \
  -H "Authorization: Bearer $JOB_PROCESSOR_SECRET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "action": "process-type", "type": "send_release_email" }'

# Process batch (5 jobs per type)
curl -X POST http://localhost:3000/api/jobs/process \
  -H "Authorization: Bearer $JOB_PROCESSOR_SECRET_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "action": "process-batch", "limit": 5 }'

# Get stats
curl http://localhost:3000/api/jobs/process \
  -H "Authorization: Bearer $JOB_PROCESSOR_SECRET_TOKEN"
```

## Integration Points

### In Escrow Routes

Jobs are enqueued **after** critical operations complete:

```typescript
// app/api/escrow/release/route.ts

// 1. Auth + State machine
// 2. Stripe capture (sync)
// 3. DB update (sync)
// ✓ Critical section complete

// 4. Enqueue side effects (async)
Promise.all([
  enqueueJob('send_release_email', { ... }),
  enqueueJob('webhook_escrow_status_changed', { ... }),
]).catch(err => console.error('Enqueue failed:', err))

return apiSuccess(...)
```

This pattern ensures:
- **No slow response times** due to side effects
- **No blocking operations** in critical path
- **Graceful degradation** if queue is down
- **Observable failures** for monitoring

## Retry Strategy

### Exponential Backoff

```
Attempt 1: Fails immediately
  ↓
Wait 2^1 * 1000ms = 2 seconds
  ↓
Attempt 2: Fails again
  ↓
Wait 2^2 * 1000ms = 4 seconds
  ↓
Attempt 3: Fails
  ↓
Move to Dead Letter Queue (7-day retention)
```

**Max Attempts:** 3 (configurable per job)

### Error Handling

- **Retryable**: 5xx errors, rate limits (429), timeouts
- **Non-retryable**: 4xx client errors (invalid input, auth failure)
- **Stripe-specific**: Rate limit detection (429) triggers retry

## Monitoring & Observability

### Queue Stats

```typescript
const stats = await getQueueStats()
// {
//   send_release_email: 5,
//   send_refund_email: 0,
//   send_dispute_email: 2,
//   stripe_capture_payment: 0,
//   webhook_escrow_status_changed: 8,
//   dead_letter: 1,
// }
```

### Dead Letter Queue

```typescript
const failed = await getDeadLetterJobs(100)
// Each job includes:
// - Last error message
// - Number of attempts
// - Timestamp
// - Original payload
```

### Job Status

```typescript
const status = await getJobStatus('job-1706234567890-abc123def')
// {
//   id: 'job-...',
//   type: 'send_release_email',
//   status: 'completed' | 'processing' | 'failed' | 'dead_letter',
//   attemptCount: 1,
//   lastError: null,
//   createdAt: 1706234567890,
// }
```

## Production Setup

### Environment Variables

```env
# Upstash Redis
KV_REST_API_URL=https://xxx.upstash.io
KV_REST_API_TOKEN=...

# Job Processor Authentication
JOB_PROCESSOR_SECRET_TOKEN=your-secret-token-here

# Optional: Email Provider
RESEND_API_KEY=...
# Or
MAILGUN_API_KEY=...

# Optional: Webhook Signing
WEBHOOK_SIGNING_SECRET=...
```

### Background Worker Setup

#### Option 1: Vercel Cron

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/jobs/process",
      "schedule": "*/1 * * * *"
    }
  ]
}
```

Then in your route handler:

```typescript
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.JOB_PROCESSOR_SECRET_TOKEN}`) {
  return unauthorized()
}
```

#### Option 2: External Cron Service

Use **EasyCron**, **Cron-job.org**, or **AWS CloudWatch**:

```bash
POST https://yourapp.vercel.app/api/jobs/process
Headers:
  Authorization: Bearer $JOB_PROCESSOR_SECRET_TOKEN
Body:
  { "action": "process-batch", "limit": 10 }
```

#### Option 3: BullMQ (Advanced)

For higher throughput, migrate to **BullMQ** with Redis:

```typescript
import Queue from 'bull'

const emailQueue = new Queue('send_release_email', process.env.REDIS_URL)

emailQueue.process(async (job) => {
  await handleEmailJob(job)
})
```

## Best Practices

### 1. Use Deduplication Keys

Prevent duplicate jobs for the same escrow operation:

```typescript
await enqueueJob('send_release_email', payload, {
  dedupeKey: `escrow-${escrowId}-release-email`, // 1-hour window
})
```

### 2. Handle Idempotency

Jobs may be processed multiple times. Ensure handlers are idempotent:

```typescript
// BAD: Creates multiple audit logs
await supabase.from('audit').insert({ ... })

// GOOD: Checks if already processed
const existing = await supabase
  .from('audit')
  .select()
  .eq('job_id', jobId)
  .maybeSingle()

if (!existing) {
  await supabase.from('audit').insert({ job_id: jobId, ... })
}
```

### 3. Log Meaningful Context

```typescript
console.log(`[EMAIL] Sending release notification`, {
  jobId: job.id,
  transactionId: job.payload.transactionId,
  recipientEmail: job.payload.recipientEmail,
  attempt: job.attemptCount,
})
```

### 4. Monitor Dead Letter Queue

Set up alerts when jobs enter DLQ:

```typescript
export async function checkDeadLetterQueue() {
  const dlq = await getDeadLetterJobs(100)
  
  if (dlq.length > 10) {
    await alertAdmin(`${dlq.length} jobs in DLQ, investigation required`)
  }
}
```

### 5. Test Locally

```typescript
// Simulate job processing
import { enqueueJob, dequeueAndProcess } from '@/lib/jobs/queue'

const jobId = await enqueueJob('send_release_email', {
  transactionId: 'test-123',
  recipientEmail: 'test@example.com',
})

const result = await dequeueAndProcess('send_release_email', handleEmailJob)
console.log('Job processed:', result.status)
```

## Troubleshooting

### Jobs Not Processing

1. Check `/api/jobs/process` endpoint is accessible
2. Verify `JOB_PROCESSOR_SECRET_TOKEN` is set
3. Check Redis connection: `KV_REST_API_URL`, `KV_REST_API_TOKEN`
4. Verify background worker is running/calling the endpoint

### Stuck Jobs

Check dead letter queue:

```typescript
const dlq = await getDeadLetterJobs(100)
dlq.forEach(job => {
  console.log(`Failed: ${job.id} - ${job.lastError}`)
})
```

### High Latency

- Increase batch limit: `processBatch(types, limit: 50)`
- Add more worker instances
- Check Upstash Redis performance

## Future Enhancements

- [ ] Email delivery status tracking
- [ ] Webhook retry with exponential backoff
- [ ] Job scheduling (delay enqueue)
- [ ] Rate limiting per job type
- [ ] Metrics export (Prometheus)
- [ ] Dashboard for monitoring
- [ ] Automatic dead letter recovery
