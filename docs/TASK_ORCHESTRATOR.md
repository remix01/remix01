## Task Orchestrator & Job Queue Lifecycle

Complete guide to using the Task Orchestrator and Job Queue system for managing long-running async operations.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Task Orchestrator                           │
│  (Manages state machine, validates transitions, tracks tasks)   │
└─────────────────┬───────────────────────────────────────────────┘
                  │
                  ├─ Creates tasks (state: pending)
                  ├─ Validates state transitions
                  ├─ Updates task metadata
                  └─ Enqueues jobs for state changes
                  
┌─────────────────────────────────────────────────────────────────┐
│                      Job Queue (QStash)                         │
│      (Async task processing with retries & error handling)      │
└─────────────────┬───────────────────────────────────────────────┘
                  │
        ┌─────────┼─────────┬─────────┬─────────┬──────────┐
        │         │         │         │         │          │
        ↓         ↓         ↓         ↓         ↓          ↓
    match_   notify_  create_   task_    request_  release_
    request  partners escrow   started  review    escrow
    
   (Algorithm)  (Email)  (Payment) (Timeline) (Email)  (Payment)
```

### Task Lifecycle State Machine

```
pending
   │
   ├─ (match_request job processes) ──→ matches_found
   │
   └─ (no matches after 24h) ──→ expired
   
matches_found
   │
   ├─ (customer accepts offer) ──→ offer_accepted
   │
   └─ (no response after 7 days) ──→ expired

offer_accepted
   │
   ├─ (create_escrow job succeeds) ──→ payment_pending
   │
   └─ (payment fails) ──→ payment_failed

payment_pending
   │
   ├─ (customer confirms payment) ──→ active
   │
   └─ (no payment after 3 days) ──→ payment_failed

active
   │
   ├─ (craftworker starts work) ──→ in_progress
   │
   └─ (task expires) ──→ expired

in_progress
   │
   ├─ (craftworker completes) ──→ completed
   │
   ├─ (customer initiates review) ──→ review_pending
   │
   └─ (task exceeds SLA) ──→ expired_in_progress

completed / review_pending
   │
   ├─ (payment released) ──→ paid
   │
   └─ (customer disputes) ──→ disputed

paid / disputed → terminal state
```

### Job Types

| Job Type | Triggers | Handler | Result |
|----------|----------|---------|--------|
| `match_request` | Task created | `handleMatchRequest` | Updates task with matches |
| `notify_partners` | Matches found | `handleNotifyPartners` | Sends emails to matched partners |
| `create_escrow` | Offer accepted | `handleCreateEscrow` | Creates Stripe payment intent |
| `release_escrow` | Task completed | `handleReleaseEscrow` | Releases payment to craftworker |
| `cancel_escrow` | Task cancelled | `handleCancelEscrow` | Refunds customer payment |
| `activate_guarantee` | Task started | `handleActivateGuarantee` | Activates SLA guarantee period |
| `task_started` | Craftworker starts | `handleTaskStarted` | Updates timeline, sends notifications |
| `request_review` | Task completed | `handleRequestReview` | Sends review request to customer |

### Using the Task Orchestrator

#### 1. Create a New Task

```typescript
import { taskOrchestrator } from '@/lib/services'

const task = await taskOrchestrator.createTask({
  request_id: 'req-123',
  customer_id: 'user-456',
  title: 'Kitchen cabinet repair',
  category: 'carpentry',
  location: {
    lat: 46.0569,
    lng: 14.5058
  },
  budget: 500,
  deadline: new Date('2025-03-20'),
  description: 'Fix broken hinges and adjust alignment'
})

// Result: task with status='pending'
// → match_request job automatically enqueued
```

#### 2. Accept an Offer

```typescript
const task = await taskOrchestrator.acceptOffer(
  taskId,
  offerId,
  customerId
)

// Result: task with status='offer_accepted'
// → create_escrow job automatically enqueued
```

#### 3. Start Task Work

```typescript
const task = await taskOrchestrator.startTask(
  taskId,
  craftworkerId
)

// Result: task with status='in_progress'
// → task_started job + activate_guarantee job enqueued
```

#### 4. Complete Task

```typescript
const task = await taskOrchestrator.completeTask(
  taskId,
  craftworkerId
)

// Result: task with status='completed'
// → request_review job enqueued
```

#### 5. Confirm Payment

```typescript
const task = await taskOrchestrator.confirmPayment(
  taskId,
  customerId,
  paymentIntentId
)

// Result: task with status='active' (after payment verified)
```

### API Endpoint: `/api/tasks`

**POST** - Execute task operations

```bash
# Create new task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "action": "create_task",
    "data": {
      "request_id": "req-123",
      "title": "Kitchen repair",
      "category": "carpentry",
      "location": { "lat": 46.0569, "lng": 14.5058 },
      "budget": 500
    }
  }'

# Accept offer
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "action": "accept_offer",
    "taskId": "task-789",
    "data": { "offerId": "offer-456" }
  }'

# Get task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get_task",
    "taskId": "task-789"
  }'

# List tasks
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list_tasks",
    "data": { "filter": { "status": "active" } }
  }'
```

### Job Processing Flow

#### Example: Request Lifecycle

```
1. Customer creates request (POST /api/tasks)
   └─ taskOrchestrator.createTask()
      └─ Saves task (status=pending)
      └─ enqueue({ type: 'match_request', ... })

2. QStash triggers /api/jobs/process
   └─ processJob('match_request', job)
   └─ handleMatchRequest(job)
      └─ Runs smartMatchingAgent algorithm
      └─ Saves matches to task.matches
      └─ Updates task (status=matches_found)
      └─ enqueue({ type: 'notify_partners', ... })

3. QStash triggers /api/jobs/process (notify)
   └─ handleNotifyPartners(job)
      └─ Fetches matched partners
      └─ Sends emails via sendEmail jobs
      └─ Updates task_queue_jobs record

4. Partner accepts offer (POST /api/tasks)
   └─ taskOrchestrator.acceptOffer()
      └─ Updates task (status=offer_accepted)
      └─ enqueue({ type: 'create_escrow', ... })

5. QStash triggers /api/jobs/process (escrow)
   └─ handleCreateEscrow(job)
      └─ Creates Stripe PaymentIntent
      └─ Saves escrow_transaction record
      └─ Updates task (status=payment_pending)

6. Customer confirms payment (Stripe webhook)
   └─ taskOrchestrator.confirmPayment()
      └─ Updates task (status=active)
      └─ enqueue({ type: 'activate_guarantee', ... })

7-9. [Craftworker starts, works, completes]
   └─ Each enqueues appropriate jobs
   └─ Timeline is updated via task_started jobs
```

### Error Handling & Retries

Jobs are processed with automatic retries via QStash:
- **Default retry**: 5 times over 24 hours
- **Exponential backoff**: 1s → 2s → 5s → 10s → 30s

If a job fails after all retries:
1. Error recorded in `task_queue_jobs.error_details`
2. Task status set to error state (e.g., `payment_failed`)
3. Alert sent to support team
4. Customer notified via email

### Database Schema

**task_queue_jobs** (tracks async job lifecycle)
```sql
id (UUID)              -- Unique job ID
task_id (UUID)         -- FK to service_requests
job_type (JobType)     -- Type of job to process
status (enum)          -- pending, processing, completed, failed
payload (jsonb)        -- Job input data
result (jsonb)         -- Job output data
error_details (jsonb)  -- Error info if failed
retry_count (int)      -- Number of retry attempts
created_at (timestamp) -- When job was enqueued
started_at (timestamp) -- When job processing started
completed_at (timestamp) -- When job finished
```

**service_requests** (extended columns)
```sql
-- New columns added to support orchestrator:
guarantee_activated (boolean)   -- SLA guarantee is active
started_at (timestamp)          -- When craftworker started
offer_amount (decimal)          -- Final offer price accepted
customer_email (varchar)        -- Customer email for notifications
title (varchar)                 -- Task title/description
```

### Best Practices

1. **Always check task state** before accepting operations
   ```typescript
   const task = await taskOrchestrator.getTask(taskId)
   if (task.status !== 'matches_found') throw new Error('Invalid state')
   ```

2. **Use task.metadata** for tracking custom data
   ```typescript
   await taskOrchestrator.updateTask(taskId, {
     metadata: { inspectionRequired: true, notes: '...' }
   })
   ```

3. **Monitor job queue** for failures
   ```typescript
   const failedJobs = await supabase
     .from('task_queue_jobs')
     .select('*')
     .eq('status', 'failed')
   ```

4. **Set appropriate timeouts** for SLA guarantees
   ```typescript
   const task = await taskOrchestrator.createTask({
     ...
     sla_hours: 48  // Guarantee completion within 48 hours
   })
   ```

5. **Log state transitions** for debugging
   ```typescript
   console.log(`[Task ${task.id}] Transitioned from ${oldStatus} to ${task.status}`)
   ```

### Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Task stuck in `payment_pending` | Payment job failed | Check `task_queue_jobs.error_details` for Stripe errors |
| Matches not found | Matching algorithm error | Review `task_queue_jobs` logs and smartMatchingAgent output |
| No emails sent | Email job queued but not processed | Check QStash dashboard for failed jobs |
| Task state invalid | Race condition in concurrent updates | Implement optimistic locking on task updates |

### Migration & Deployment

1. **Run migration** to create tables:
   ```bash
   psql -d $DATABASE_URL -f supabase/migrations/20250310_task_queue_jobs.sql
   ```

2. **Deploy new code**:
   ```bash
   git push origin service-layer-refactor
   # → Deploy to Vercel
   ```

3. **Configure QStash webhook** (if not auto-configured):
   ```bash
   npx qstash url add \
     http://your-app.vercel.app/api/jobs/process \
     --receiver-key $QSTASH_CURRENT_SIGNING_KEY
   ```

4. **Test workflow**:
   ```typescript
   const task = await taskOrchestrator.createTask(...)
   // Monitor logs: tail -f /var/log/app.log | grep task_queue_jobs
   ```
