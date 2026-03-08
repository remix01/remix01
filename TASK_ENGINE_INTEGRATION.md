# Task Engine Integration Guide

## Overview

The Task Engine is now fully integrated into your LiftGo frontend. It provides type-safe React hooks, real-time subscriptions, worker scoring, and task filtering.

## Quick Start

### 1. Import Hooks

```tsx
import {
  usePublishTask,
  useClaimTask,
  useAcceptTask,
  useStartTask,
  useCompleteTask,
  useCancelTask,
  useTaskEvents,
  useTaskFilters,
} from '@/lib/hooks/tasks'
```

### 2. Use in Components

```tsx
export function TaskCard({ task }: { task: Task }) {
  const { publishTask, loading, error } = usePublishTask({
    onSuccess: (updatedTask) => {
      console.log('Task published:', updatedTask)
    },
  })

  return (
    <div>
      <h3>{task.title}</h3>
      <button
        onClick={() => publishTask(task.id, 24)}
        disabled={loading}
      >
        {loading ? 'Publishing...' : 'Publish'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </div>
  )
}
```

## Available Hooks

### Task Operations (State Transitions)

#### usePublishTask()
Publishes a task to make it available for worker claims.

```tsx
const { publishTask, loading, error, data } = usePublishTask({
  onSuccess: (task) => console.log('Published:', task),
  onError: (error) => console.error(error),
})

await publishTask(taskId, 24) // 24-hour SLA
```

#### useClaimTask()
Worker claims a task showing intent to complete it.

```tsx
const { claimTask, loading } = useClaimTask()
await claimTask(taskId, workerId)
```

#### useAcceptTask()
Worker confirms they're en route to the job.

```tsx
const { acceptTask, loading } = useAcceptTask()
await acceptTask(taskId)
```

#### useStartTask()
Worker marks work as in progress.

```tsx
const { startTask, loading } = useStartTask()
await startTask(taskId)
```

#### useCompleteTask()
Worker marks work as complete.

```tsx
const { completeTask, loading } = useCompleteTask()
await completeTask(taskId, 'Optional notes')
```

#### useCancelTask()
Customer or admin cancels a task.

```tsx
const { cancelTask, loading } = useCancelTask()
await cancelTask(taskId, 'Task cancelled due to weather')
```

### Real-Time & Queries

#### useTaskEvents()
Subscribe to real-time task updates.

```tsx
const { isSubscribed, error, unsubscribe } = useTaskEvents({
  userId: 'user-123',
  onTaskUpdate: (task) => console.log('Task updated:', task),
})
```

#### useTaskFilters()
Query tasks with built-in filtering.

```tsx
const { tasks, loading, hasMore, loadMore } = useTaskFilters('my_tasks', {
  limit: 20,
  autoLoad: true,
})

// Available filters: 'my_tasks', 'available', 'overdue', 'completed', 'all'
```

## Hook Patterns

### Pattern 1: Basic Usage

```tsx
export function PublishButton({ taskId }: { taskId: string }) {
  const { publishTask, loading } = usePublishTask()

  return (
    <button onClick={() => publishTask(taskId, 24)} disabled={loading}>
      {loading ? 'Publishing...' : 'Publish Task'}
    </button>
  )
}
```

### Pattern 2: With Error Handling

```tsx
export function ClaimTaskButton({ taskId }: { taskId: string }) {
  const { claimTask, loading, error } = useClaimTask({
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <>
      <button
        onClick={() => claimTask(taskId, currentWorkerId)}
        disabled={loading || !!error}
      >
        Claim Task
      </button>
      {error && <Alert type="error">{error.message}</Alert>}
    </>
  )
}
```

### Pattern 3: Combining Hooks

```tsx
export function TaskList() {
  const { tasks, loading } = useTaskFilters('available')
  const { isSubscribed } = useTaskEvents({
    onTaskUpdate: (task) => {
      console.log('Task updated via realtime:', task)
    },
  })

  return (
    <div>
      {!isSubscribed && <div className="banner">Connecting to updates...</div>}
      {loading ? (
        <Spinner />
      ) : (
        <ul>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </ul>
      )}
    </div>
  )
}
```

### Pattern 4: Optimistic Updates

```tsx
export function TaskWithOptimisticUpdate({ task }: { task: Task }) {
  const [optimisticStatus, setOptimisticStatus] = useState(task.status)
  const { completeTask } = useCompleteTask({
    onSuccess: () => console.log('Completed!'),
  })

  const handleComplete = async () => {
    setOptimisticStatus('completed')
    try {
      await completeTask(task.id)
    } catch (error) {
      setOptimisticStatus(task.status)
    }
  }

  return (
    <div>
      <p>Status: {optimisticStatus}</p>
      <button onClick={handleComplete}>Mark Complete</button>
    </div>
  )
}
```

## Scoring System

The worker matching system calculates scores (0-100) based on:

```tsx
import { calculateWorkerScore, scoreWorkers } from '@/lib/task-engine'

const workerStats = await fetchWorkerStats(workerId)
const score = calculateWorkerScore(workerStats) // 0-100

// Or score multiple workers
const allWorkers = await fetchAllWorkers()
const ranked = scoreWorkers(allWorkers)
// Returns sorted by score with reasons
```

**Scoring Breakdown:**
- 30% - Completion rate (jobs completed / total)
- 25% - Customer rating (1-5 stars)
- 20% - Response time (faster = higher)
- 15% - On-time delivery rate
- 10% - Cancellation penalty (lower = higher)

**Minimum Requirements:**
- 5+ completed jobs
- 3.0+ average rating
- < 120 minute response time

## Error Handling

All hooks follow consistent error structure:

```tsx
interface RpcError {
  code: string
  message: string
  details?: Record<string, any>
}
```

Common error codes:

```tsx
ERROR_CODES = {
  INVALID_TASK_ID: 'TASK_001',
  INVALID_TRANSITION: 'TASK_002',
  TASK_NOT_FOUND: 'TASK_003',
  INVALID_WORKER: 'TASK_004',
  PERMISSION_DENIED: 'TASK_005',
  SLA_EXPIRED: 'TASK_006',
  WORKER_ALREADY_CLAIMED: 'TASK_007',
  TASK_LOCKED: 'TASK_008',
}
```

## State Machine Protection

All RPC calls are automatically protected by the State Machine Guard, which validates valid task status transitions:

```
pending → published → claimed → accepted → in_progress → completed
                   ↓                                    ↓
                cancelled ← ← ← ← ← ← ← ← ← ← ← ← cancelled
```

Attempting invalid transitions throws an error before making the RPC call.

## Task Status Workflow

1. **pending** - Newly created, waiting for publication
2. **published** - Live, available for worker claims
3. **claimed** - Worker claimed it, waiting for acceptance
4. **accepted** - Worker confirmed, en route
5. **in_progress** - Work has started
6. **completed** - Work finished, awaiting review
7. **expired** - SLA deadline passed
8. **cancelled** - Cancelled by customer or admin

## API Endpoints

### POST /api/tasks/[id]/publish

Publish a task with custom SLA.

```bash
curl -X POST /api/tasks/task-123/publish \
  -H "Content-Type: application/json" \
  -d '{ "slaHours": 24 }'
```

### GET /api/tasks/filter

Query tasks with advanced filtering.

```bash
curl /api/tasks/filter?type=my_tasks&limit=20&offset=0&priority=high
```

Query parameters:
- `type`: 'my_tasks' | 'available' | 'overdue' | 'completed' | 'all'
- `limit`: max 100 (default 20)
- `offset`: pagination offset
- `priority`: optional filter
- `category`: optional filter

## Configuration

Adjust SLA thresholds and scoring in `/lib/task-engine/constants.ts`:

```tsx
// SLA Configuration (in hours)
export const SLA_DEFAULTS = {
  LOW: 48,
  MEDIUM: 24,
  HIGH: 12,
  URGENT: 4,
}

// Scoring weights (sum to 100)
export const SCORING_WEIGHTS = {
  COMPLETION_RATE: 30,
  RATING: 25,
  RESPONSE_TIME: 20,
  ON_TIME_RATE: 15,
  CANCELLATION_RATE: 10,
}
```

## Next Steps

1. Wire hooks to existing UI components
2. Create example components (TaskCard, TaskList, etc.)
3. Set up SLA expiry cron job
4. Test real-time subscriptions
5. Integrate worker matching in task assignment

## Troubleshooting

### "Supabase client not initialized"
Ensure environment variables are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### "Invalid state transition"
Check task current status against allowed transitions in STATE_MACHINE.

### Realtime not working
- Verify Supabase Realtime is enabled in your project settings
- Check RLS policies allow postgres_changes events
- Monitor browser console for subscription errors

## Type Definitions

All types are in `/lib/task-engine/types.ts`:

```tsx
// Main task type
interface Task {
  id: string
  customer_id: string
  worker_id: string | null
  title: string
  status: TaskStatus
  priority: TaskPriority
  sla_deadline: string | null
  created_at: string
  updated_at: string
}

// Worker scoring
interface WorkerStats {
  total_completed: number
  avg_rating: number
  response_time_minutes: number
  completion_rate: number
  cancellation_rate: number
  on_time_rate: number
}
```

For complete type reference, see the source files.
