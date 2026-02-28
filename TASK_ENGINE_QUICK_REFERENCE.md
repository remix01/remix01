# Task Engine - Quick Reference

## One-Liner Imports

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

import {
  calculateWorkerScore,
  scoreWorkers,
  isWorkerQualified,
  getWorkerPerformanceSummary,
} from '@/lib/task-engine'
```

## Hook Cheat Sheet

| Hook | Purpose | Status Transitions | Returns |
|------|---------|-------------------|---------|
| `usePublishTask()` | Make task available | pending → published | `{ publishTask, loading, error, data }` |
| `useClaimTask()` | Claim for worker | published → claimed | `{ claimTask, loading, error, data }` |
| `useAcceptTask()` | Confirm acceptance | claimed → accepted | `{ acceptTask, loading, error, data }` |
| `useStartTask()` | Begin work | accepted → in_progress | `{ startTask, loading, error, data }` |
| `useCompleteTask()` | Finish work | in_progress → completed | `{ completeTask, loading, error, data }` |
| `useCancelTask()` | Cancel task | any → cancelled | `{ cancelTask, loading, error, data }` |
| `useTaskEvents()` | Real-time updates | - | `{ isSubscribed, error, unsubscribe }` |
| `useTaskFilters()` | Query tasks | - | `{ tasks, loading, error, loadMore, hasMore }` |

## Quick Examples

### Publish a Task
```tsx
const { publishTask } = usePublishTask()
await publishTask(taskId, 24) // 24-hour SLA
```

### Claim Task
```tsx
const { claimTask } = useClaimTask()
await claimTask(taskId, workerId)
```

### Filter Tasks
```tsx
const { tasks } = useTaskFilters('my_tasks')
const { tasks: open } = useTaskFilters('available')
const { tasks: late } = useTaskFilters('overdue')
```

### Real-Time Subscribe
```tsx
useTaskEvents({
  userId: 'user-123',
  onTaskUpdate: (task) => console.log('Updated:', task),
})
```

### Score Workers
```tsx
const score = calculateWorkerScore(workerStats)
const ranked = scoreWorkers(allWorkerStats)
```

## Task Status Transitions

```
pending
   ↓
published ← ← ← ← ← ← ← ← ← cancelled
   ↓
claimed → accepted → in_progress → completed
   ↓          ↓            ↓            ↓
published   cancelled  cancelled    expired
```

## File Locations

**Hooks**: `lib/hooks/tasks/`
- useTaskRpc.ts (base)
- usePublishTask.ts
- useClaimTask.ts
- useAcceptTask.ts
- useStartTask.ts
- useCompleteTask.ts
- useCancelTask.ts
- useTaskEvents.ts
- useTaskFilters.ts

**Types & Utils**: `lib/task-engine/`
- types.ts (all definitions)
- constants.ts (config)
- scoring.ts (worker matching)
- index.ts (exports)

**API Routes**: `app/api/tasks/`
- [id]/publish/route.ts
- filter/route.ts

## Error Handling Pattern

```tsx
const { publishTask, error } = usePublishTask({
  onError: (err) => {
    console.error(err.code, err.message)
    // err.code: TASK_001, TASK_002, etc.
  },
})
```

## Scoring Weights

| Factor | Weight | Formula |
|--------|--------|---------|
| Completion Rate | 30% | completed_jobs / total_jobs |
| Rating | 25% | (rating - 3) / 2 × 100 (3-5 scale) |
| Response Time | 20% | 100 - time_penalty |
| On-Time Rate | 15% | on_time_jobs / total_jobs |
| Cancellation | 10% | (1 - cancellation_rate) × 100 |

## Minimum Requirements (to be ranked)

- 5+ completed jobs
- 3.0+ average rating
- < 120 minute response time

## Filter Types

- `'my_tasks'` - All tasks I'm involved in (customer or worker)
- `'available'` - Open tasks available to claim
- `'overdue'` - Tasks past SLA deadline
- `'completed'` - Finished tasks from past 7 days
- `'all'` - All tasks without filter

## Configuration Keys

In `lib/task-engine/constants.ts`:

```tsx
SLA_DEFAULTS         // Hours by priority
SCORING_WEIGHTS      // Percentages for each factor
SCORING_THRESHOLDS   // Min values for qualification
VISIBILITY_RULES     // Auto-expire timings
NOTIFICATION_CONFIG  // Which events trigger notifications
MATCHING_RULES       // Worker matching filters
```

## Common Errors

| Code | Meaning | Solution |
|------|---------|----------|
| TASK_001 | Invalid task ID | Check taskId exists |
| TASK_002 | Invalid transition | Check current status |
| TASK_003 | Task not found | Verify taskId |
| TASK_005 | Permission denied | Check user role |
| TASK_006 | SLA expired | Task past deadline |
| TASK_007 | Already claimed | Another worker claimed it |

## Performance Tips

1. Use `useTaskFilters` with pagination to load 20-50 tasks at a time
2. Subscribe to `useTaskEvents` only for relevant userId
3. Use `calculateWorkerScore` for multiple workers (avoid N+1)
4. Filter before scoring to reduce computation

## Debugging

Enable logs in components:
```tsx
const { tasks, error, loading } = useTaskFilters('my_tasks')
console.log('[v0] Tasks loaded:', tasks.length)
if (error) console.error('[v0] Task error:', error)
```

Check Supabase Realtime status:
```tsx
const { isSubscribed, error } = useTaskEvents()
console.log('[v0] Realtime subscribed:', isSubscribed)
if (error) console.error('[v0] Subscription error:', error)
```

## Documentation

- Full guide: `TASK_ENGINE_INTEGRATION.md`
- Implementation details: `TASK_ENGINE_SUMMARY.md`
- Type definitions: `lib/task-engine/types.ts`

---

**Last Updated**: 2026
**Status**: Production Ready ✅
