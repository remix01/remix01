## Task Orchestrator - Quick Reference

### Core Concepts

**Task** - A service request through its complete lifecycle  
**Job** - Async operation triggered by task state changes  
**State Machine** - Enforces valid task status transitions  
**Orchestrator** - Service that manages task states and enqueues jobs

### Task Lifecycle at a Glance

```
pending → matches_found → offer_accepted → payment_pending → active → in_progress → completed → paid
```

### Common Operations

#### 1. Create a Task
```typescript
import { taskOrchestrator } from '@/lib/services'

const task = await taskOrchestrator.createTask({
  request_id: 'req-123',
  customer_id: 'user-456',
  title: 'Fix kitchen cabinet',
  category: 'carpentry',
  location: { lat: 46.0569, lng: 14.5058 },
  budget: 500,
})
// → Automatically enqueues match_request job
```

#### 2. Accept an Offer
```typescript
const task = await taskOrchestrator.acceptOffer(
  taskId,
  offerId,
  customerId
)
// → Automatically enqueues create_escrow job
```

#### 3. Start Work
```typescript
const task = await taskOrchestrator.startTask(taskId, craftworkerId)
// → Automatically enqueues task_started and activate_guarantee jobs
```

#### 4. Complete Work
```typescript
const task = await taskOrchestrator.completeTask(taskId, craftworkerId)
// → Automatically enqueues request_review job
```

#### 5. Confirm Payment
```typescript
const task = await taskOrchestrator.confirmPayment(
  taskId,
  customerId,
  paymentIntentId
)
// → Automatically enqueues release_escrow job
```

#### 6. Get Task Status
```typescript
const task = await taskOrchestrator.getTask(taskId, userId)
console.log(task.status) // 'active', 'in_progress', etc.
console.log(task.offer_amount) // Payment amount
console.log(task.started_at) // Work start timestamp
```

#### 7. List User's Tasks
```typescript
const tasks = await taskOrchestrator.listTasks(userId, {
  status: 'active',
  role: 'customer', // or 'craftworker'
})
```

### API Endpoint

**POST** `/api/tasks`

```bash
# Create task
curl -X POST /api/tasks -d '{
  "action": "create_task",
  "data": { /* task data */ }
}'

# Accept offer
curl -X POST /api/tasks -d '{
  "action": "accept_offer",
  "taskId": "task-123",
  "data": { "offerId": "offer-456" }
}'

# Get task
curl -X POST /api/tasks -d '{
  "action": "get_task",
  "taskId": "task-123"
}'

# List tasks
curl -X POST /api/tasks -d '{
  "action": "list_tasks",
  "data": { "filter": { "status": "active" } }
}'
```

### Job Types

| Type | Triggered By | Handles |
|------|--------------|---------|
| `match_request` | Task created | Run matching algorithm |
| `notify_partners` | Matches found | Send emails to partners |
| `create_escrow` | Offer accepted | Create Stripe payment intent |
| `activate_guarantee` | Work started | Activate SLA guarantee |
| `task_started` | Work started | Update timeline |
| `request_review` | Work completed | Ask customer for review |
| `release_escrow` | Payment confirmed | Release payment to craftworker |
| `cancel_escrow` | Task cancelled | Refund customer |

### Task Statuses

```
pending               → Just created, waiting for matches
matches_found         → Matches available, customer can review
offer_accepted        → Customer accepted offer, waiting for payment
payment_pending       → Payment intent created, waiting for confirmation
active                → Payment confirmed, ready for work
in_progress           → Craftworker working on task
completed             → Work finished, review requested
paid                  → Payment released to craftworker (terminal)
expired               → No action within deadline (terminal)
payment_failed        → Payment failed or timeout (terminal)
```

### Database Tables

**service_requests** (extended)
- `id` - Task ID (UUID)
- `status` - Current task status
- `customer_id` - Customer user ID
- `craftworker_id` - Assigned craftworker
- `offer_amount` - Final accepted price
- `started_at` - When work started
- `completed_at` - When work completed
- `guarantee_activated` - If SLA active
- `customer_email` - For notifications
- `metadata` - Custom JSON data

**task_queue_jobs**
- `id` - Job ID (UUID)
- `task_id` - FK to service_requests
- `job_type` - Type of job
- `status` - pending | processing | completed | failed
- `payload` - Input data (JSON)
- `result` - Output data (JSON)
- `error_details` - Error info if failed
- `created_at` - When enqueued
- `started_at` - When processing started
- `completed_at` - When finished

### Error Handling

If a job fails:
1. QStash retries up to 5 times (exponential backoff)
2. After all retries exhausted, marked as `failed`
3. Error details stored in `task_queue_jobs.error_details`
4. Task status may change to error state (e.g., `payment_failed`)
5. Support team alerted

### Monitoring

Check job queue status:
```sql
SELECT 
  job_type, 
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
FROM task_queue_jobs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY job_type;
```

Check failed jobs:
```sql
SELECT * FROM task_queue_jobs 
WHERE status = 'failed' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Troubleshooting

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Task stuck in `payment_pending` | Check `task_queue_jobs` for `create_escrow` failures | Look at `error_details` for Stripe errors |
| No emails sent | Check QStash dashboard | Verify `sendEmail` jobs exist and completed |
| Task not progressing | Check job processor logs | Verify `/api/jobs/process` is receiving webhooks |
| Invalid state transition | Check task status before operation | Only valid transitions allowed |
| Race conditions | Concurrent updates to same task | Add optimistic locking or use transactions |

### Development

**Run locally**:
```bash
# Start dev server
npm run dev

# Monitor logs
tail -f .next/server.log | grep task_queue

# Test task creation
curl http://localhost:3000/api/tasks -d '{...}'
```

**Database**:
```bash
# Connect to Supabase
psql $DATABASE_URL

# Watch task_queue_jobs
SELECT * FROM task_queue_jobs ORDER BY created_at DESC LIMIT 10;
```

### Files & Locations

- **Orchestrator**: `lib/services/taskOrchestrator.ts`
- **Job Processor**: `lib/jobs/processor.ts`
- **Job Handlers**: `lib/jobs/workers/taskProcessor.ts`
- **API Route**: `app/api/tasks/route.ts`
- **Database**: `supabase/migrations/20250310_task_queue_jobs.sql`
- **Docs**: `docs/TASK_ORCHESTRATOR.md`
- **Examples**: `docs/ORCHESTRATOR_EXAMPLES.ts`

### See Also

- Full API reference: `docs/TASK_ORCHESTRATOR.md`
- Code examples: `docs/ORCHESTRATOR_EXAMPLES.ts`
- Implementation notes: `docs/STEP_2_SUMMARY.md`
- Service layer guide: `docs/SERVICE_LAYER.md` (from Step 1)
