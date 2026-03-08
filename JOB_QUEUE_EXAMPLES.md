# Job Queue - Integration Examples

## Quick Start

### 1. Enqueue a Job in an API Route

```typescript
// app/api/escrow/release/route.ts
import { enqueueJob } from '@/lib/jobs/queue'

export async function POST(request: NextRequest) {
  // ... critical operations ...
  
  // After DB update is complete, enqueue side effects
  try {
    await enqueueJob('send_release_email', {
      transactionId: escrow.id,
      recipientEmail: escrow.customer_email,
      recipientName: escrow.customer_name,
      amount: escrow.amount_cents,
    }, {
      dedupeKey: `escrow-${escrow.id}-release-email`,
      maxAttempts: 3,
    })
  } catch (err) {
    console.error('Failed to enqueue email job:', err)
    // Don't fail the request if enqueue fails
  }
  
  return apiSuccess({ message: 'Payment released' })
}
```

### 2. Set Up Background Processing

#### Option A: Vercel Cron

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

The processor will automatically run every minute and process jobs.

#### Option B: External Cron Service

Use **EasyCron**, **cron-job.org**, or **AWS CloudWatch**:

```bash
# Every minute
curl -X POST https://yourapp.com/api/jobs/process \
  -H "Authorization: Bearer $JOB_PROCESSOR_SECRET_TOKEN" \
  -d '{ "action": "process-batch", "limit": 10 }'
```

#### Option C: Node.js Scheduler (Dev Only)

```typescript
// scripts/job-worker.ts
import { processBatch } from '@/lib/jobs/processor'

async function worker() {
  const types = [
    'send_release_email',
    'stripe_capture_payment',
    'webhook_escrow_status_changed',
  ]
  
  const results = await processBatch(types, limit = 20)
  console.log('Processed:', results)
}

// Run every 5 seconds
setInterval(worker, 5000)
```

## Job Examples

### Example 1: Release Payment

```typescript
// Enqueue email notification
await enqueueJob('send_release_email', {
  transactionId: 'escrow-abc123',
  recipientEmail: 'customer@example.com',
  recipientName: 'John Doe',
  partnerName: 'Service Provider LLC',
  amount: 50000, // $500.00
}, {
  dedupeKey: 'escrow-abc123-release-email',
  maxAttempts: 3,
})

// Enqueue webhook notification
await enqueueJob('webhook_escrow_status_changed', {
  transactionId: 'escrow-abc123',
  statusBefore: 'paid',
  statusAfter: 'released',
  metadata: { releasedBy: 'partner' },
}, {
  dedupeKey: 'escrow-abc123-webhook-released',
})
```

**Workers will:**
1. Send email to customer with release confirmation
2. POST to partner's webhook endpoint
3. Retry up to 3 times with exponential backoff

### Example 2: Process Refund

```typescript
// Admin refunds payment
await enqueueJob('send_refund_email', {
  transactionId: 'escrow-xyz789',
  recipientEmail: 'customer@example.com',
  recipientName: 'Jane Smith',
  amount: 25000, // $250.00
  reason: 'Service not provided',
}, {
  dedupeKey: 'escrow-xyz789-refund-email',
  maxAttempts: 3,
})
```

**Worker will:**
1. Build refund email with amount and reason
2. Send email confirming 5-10 business day processing time
3. Retry with exponential backoff if email service fails

### Example 3: Open Dispute

```typescript
// Customer opens dispute
await Promise.all([
  // Notify customer
  enqueueJob('send_dispute_email', {
    transactionId: 'escrow-disp001',
    recipientEmail: 'customer@example.com',
    recipientName: 'Customer Name',
    reason: 'Partner opened dispute: Work quality not as described',
  }, {
    dedupeKey: 'escrow-disp001-dispute-customer',
  }),
  
  // Notify partner
  enqueueJob('send_dispute_email', {
    transactionId: 'escrow-disp001',
    recipientEmail: 'partner@example.com',
    recipientName: 'Partner Name',
    reason: 'You opened dispute: Work quality not as described',
  }, {
    dedupeKey: 'escrow-disp001-dispute-partner',
  }),
  
  // Alert system via webhook
  enqueueJob('webhook_escrow_status_changed', {
    transactionId: 'escrow-disp001',
    statusBefore: 'paid',
    statusAfter: 'disputed',
    metadata: {
      openedBy: 'partner',
      reason: 'Work quality not as described',
    },
  }, {
    dedupeKey: 'escrow-disp001-webhook-disputed',
  }),
])
```

## Processing Jobs Manually

### Check Queue Stats

```typescript
import { getQueueStats } from '@/lib/jobs/queue'

const stats = await getQueueStats()
console.log('Queue stats:', stats)
// Output:
// {
//   send_release_email: 5,
//   send_refund_email: 0,
//   send_dispute_email: 2,
//   stripe_capture_payment: 1,
//   webhook_escrow_status_changed: 8,
//   dead_letter: 1,
// }
```

### Get Job Status

```typescript
import { getJobStatus } from '@/lib/jobs/queue'

const job = await getJobStatus('job-1706234567890-abc123')
if (job) {
  console.log(job.status) // 'completed', 'processing', 'failed', or 'dead_letter'
  console.log(job.attemptCount) // 1, 2, or 3
  if (job.lastError) {
    console.log(job.lastError) // Error message if failed
  }
}
```

### Process Jobs Manually

```typescript
import { processNextJob, processAllJobsOfType } from '@/lib/jobs/processor'

// Process one job at a time
const job = await processNextJob('send_release_email')
if (job) {
  console.log(`Processed job ${job.id}`)
}

// Process all of one type
const count = await processAllJobsOfType('send_release_email')
console.log(`Processed ${count} email jobs`)

// Process batch across types
import { processBatch } from '@/lib/jobs/processor'

const results = await processBatch([
  'send_release_email',
  'stripe_capture_payment',
], limit = 20)

results.forEach((count, type) => {
  console.log(`${type}: ${count} jobs`)
})
```

### List Dead Letter Jobs

```typescript
import { getDeadLetterJobs } from '@/lib/jobs/queue'

const failed = await getDeadLetterJobs(20)

failed.forEach(job => {
  console.log(`Job ${job.id}:`)
  console.log(`  Type: ${job.type}`)
  console.log(`  Attempts: ${job.attemptCount}/${job.maxAttempts}`)
  console.log(`  Error: ${job.lastError}`)
  console.log(`  Created: ${new Date(job.createdAt).toISOString()}`)
})
```

## Monitoring Dashboard Example

```typescript
// app/admin/jobs/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { getQueueStats, getDeadLetterJobs } from '@/lib/jobs/queue'

export default function JobsDashboard() {
  const [stats, setStats] = useState(null)
  const [dlq, setDlq] = useState([])

  useEffect(() => {
    const interval = setInterval(async () => {
      const stats = await getQueueStats()
      const dlq = await getDeadLetterJobs(10)
      setStats(stats)
      setDlq(dlq)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  if (!stats) return <div>Loading...</div>

  const totalPending = Object.values(stats).reduce((a, b) => a + (b as number), 0) - stats.dead_letter

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Job Queue Dashboard</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-blue-100 rounded">
          <div className="text-sm text-gray-600">Pending Jobs</div>
          <div className="text-3xl font-bold">{totalPending}</div>
        </div>
        <div className="p-4 bg-red-100 rounded">
          <div className="text-sm text-gray-600">Dead Letter</div>
          <div className="text-3xl font-bold">{stats.dead_letter}</div>
        </div>
        <div className="p-4 bg-green-100 rounded">
          <div className="text-sm text-gray-600">Emails</div>
          <div className="text-3xl font-bold">
            {(stats.send_release_email || 0) +
             (stats.send_refund_email || 0) +
             (stats.send_dispute_email || 0)}
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-bold mb-4">Queue Breakdown</h2>
        <div className="space-y-2">
          {Object.entries(stats).map(([type, count]) => (
            <div key={type} className="flex justify-between p-2 bg-gray-100 rounded">
              <span>{type}</span>
              <span className="font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {dlq.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Dead Letter Queue</h2>
          <div className="space-y-2">
            {dlq.map(job => (
              <div key={job.id} className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                <div className="font-mono text-xs text-gray-600">{job.id}</div>
                <div>{job.type}</div>
                <div className="text-red-600">{job.lastError}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
```

## Error Handling

### Non-Retryable Errors

```typescript
// In stripe worker:
try {
  await stripe.refunds.create(...)
} catch (error: any) {
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    // Don't retry 4xx errors (invalid input, auth failure)
    throw new Error(`[STRIPE] Non-retryable error: ${error.message}`)
  }
  // Retry 5xx and network errors
  throw error
}
```

### Idempotent Processing

```typescript
// In email worker:
// Don't send duplicate emails
const { data: sent } = await supabase
  .from('email_log')
  .select()
  .eq('job_id', job.id)
  .eq('type', 'send_release_email')
  .maybeSingle()

if (sent) {
  console.log(`Email already sent, skipping`)
  return // Job still marks as completed
}

// Send email
await resend.emails.send({ ... })

// Log that we sent it
await supabase
  .from('email_log')
  .insert({ job_id: job.id, type: 'send_release_email', sent_at: now() })
```

## Configuration

### Increase Retry Attempts

```typescript
await enqueueJob('send_release_email', payload, {
  maxAttempts: 5, // Default is 3
  dedupeKey: 'key',
})
```

### Add Custom Job Type

1. Add to `JobType` union:
```typescript
export type JobType = 
  | 'send_release_email'
  | 'my_custom_job'  // ← NEW
```

2. Create worker:
```typescript
// lib/jobs/workers/myWorker.ts
export async function handleMyJob(job: Job): Promise<void> {
  // Implementation
}
```

3. Add to processor:
```typescript
function getProcessor(type: JobType) {
  switch (type) {
    case 'my_custom_job':
      return handleMyJob
    // ...
  }
}
```

4. Enqueue:
```typescript
await enqueueJob('my_custom_job', { ... })
```
