# Human-in-the-Loop & Dynamic Spawn — Deep Dive

This document provides a comprehensive guide to the two most advanced AI patterns in LiftGO v2.0.

---

## Human-in-the-Loop (HITL)

### What it does

HITL pauses an AI execution and waits for a human to approve or reject before the workflow continues. Approval requests are stored in the `hitl_approvals` Supabase table and surfaced via Realtime.

### Database table: `hitl_approvals`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `execution_id` | TEXT | Links to your AI execution run |
| `agent_name` | TEXT | Which agent triggered the request |
| `description` | TEXT | What the human needs to review |
| `context` | JSONB | Arbitrary data for the approver |
| `status` | TEXT | `pending`, `approved`, or `rejected` |
| `approver_id` | UUID | Who approved/rejected (nullable) |
| `approver_note` | TEXT | Optional reason/note |
| `created_at` | TIMESTAMPTZ | When created |
| `updated_at` | TIMESTAMPTZ | Auto-updated on change |

### RLS Policies

- **Service role**: full access (used by server-side code)
- **Authenticated user**: can view and decide on requests assigned to them, or requests with no designated approver
- **Admin role**: can view and decide on all pending requests

### Full server-side HITL flow

```typescript
import { v4 as uuidv4 } from 'uuid'
import { AI, waitForApproval, HITLTimeoutError } from '@/lib/ai/extended-orchestrator'

async function generateQuoteWithApproval(userId: string, taskId: string, description: string) {
  const executionId = uuidv4()

  // 1. Generate the quote
  const quoteResult = await AI.route({
    userId,
    userRole: 'obrtnik',
    message: description,
    agentOverride: 'quote_generator',
    taskId,
  })

  // 2. Create HITL request — execution pauses here logically
  const req = await AI.hitl.create({
    executionId,
    agentName: 'quote_generator',
    description: 'Pregledaj ponudbo pred pošiljanjem',
    context: {
      taskId,
      quote: quoteResult.executionResult.response,
      costUsd: quoteResult.executionResult.costUsd,
    },
  })

  // 3. Poll until decision (server-side)
  try {
    const approval = await AI.hitl.wait(req.approvalId, {
      pollIntervalMs: 5000,
      timeoutMs: 300_000, // 5 minutes
    })

    return approval.status === 'approved'
      ? { sent: true, quote: quoteResult.executionResult.response }
      : { sent: false, note: approval.approver_note }
  } catch (e) {
    if (e instanceof HITLTimeoutError) return { sent: false, note: 'Timeout' }
    throw e
  }
}
```

### Client-side Realtime subscription

```typescript
// In a React component
import { useEffect } from 'react'
import { AI } from '@/lib/ai/extended-orchestrator'

function ApprovalStatus({ executionId }: { executionId: string }) {
  useEffect(() => {
    const unsubscribe = AI.hitl.subscribe(executionId, (approval) => {
      if (approval.status === 'approved') {
        toast.success('Ponudba odobrena!')
      } else if (approval.status === 'rejected') {
        toast.error(`Zavrnjeno: ${approval.approver_note}`)
      }
    })

    return () => unsubscribe()
  }, [executionId])

  return <div>Čakam na odobritev...</div>
}
```

### Admin inbox

```typescript
// Fetch all pending approvals
const pending = await AI.hitl.getPending(adminUserId)

// pending = [
//   { id, execution_id, agent_name, description, context, status, created_at, ... },
//   ...
// ]

// Approve one
await AI.hitl.approve(pending[0].id, adminUserId, 'Ponudba je OK')

// Reject one
await AI.hitl.reject(pending[0].id, adminUserId, 'Cena previsoka')
```

### LiftGO-specific use cases

| Trigger | Description |
|---------|-------------|
| Auto-generated quote > 500 EUR | Require obrtnik to confirm before sending |
| Video diagnosis flagged as urgent | Admin reviews before notifying narocnik |
| AI offers sent to premium narocnik | Manager approval on high-value leads |
| Materials list auto-ordered | Require confirmation before any external action |

### HITL Function Reference

| Function | Description |
|----------|-------------|
| `createHITLRequest(params)` | Create approval request, returns `approvalId` |
| `approveRequest(id, approverId, note?)` | Mark as approved |
| `rejectRequest(id, approverId, note?)` | Mark as rejected |
| `getPendingApprovals(userId)` | Fetch pending requests for a user |
| `getApproval(id)` | Fetch specific approval |
| `subscribeToApprovals(executionId, cb)` | Realtime subscription, returns unsubscribe fn |
| `waitForApproval(id, opts?)` | Server-side polling until terminal state |

---

## Dynamic Agent Spawning

### What it does

Allows an orchestrator to spawn sub-agents dynamically based on detected task complexity. Sub-agents run in parallel, and their outputs are merged into a single coherent response by Claude Haiku.

### Core architecture

```
taskDescription
      |
      v
analyseTaskComplexity()  ← Claude Haiku classifies domains
      |
      v
recommendedAgents: ['quote_generator', 'materials_agent', 'job_summary']
      |
      v
spawnAgentPool()  ← Promise.allSettled
      |
      v
[quote_result, materials_result, summary_result]
      |
      v
mergeAgentOutputs()  ← Claude Haiku combines
      |
      v
mergedResponse (single coherent text)
```

### Complexity levels

| Level | Description | Typical agent count |
|-------|-------------|---------------------|
| `simple` | Single trade, straightforward task | 1 |
| `moderate` | Multiple steps, one trade | 2-3 |
| `complex` | Multiple trades, full renovation | 3-5 |

### Auto-spawn (recommended for most use cases)

```typescript
const { analysis, pool } = await AI.spawn.auto(userId, {
  taskDescription: 'Prenova kopalnice: keramika, instalacija, luči',
  taskId: 'task-123',
})

console.log(analysis.complexity)           // 'complex'
console.log(analysis.domains)             // ['tiling', 'plumbing', 'electrical']
console.log(analysis.recommendedAgents)  // ['quote_generator', 'materials_agent', ...]
console.log(pool.mergedResponse)          // Single merged response
```

### Manual pool (more control)

```typescript
const pool = await AI.spawn.pool(userId, [
  {
    agentType: 'quote_generator',
    message: 'Cena za elektriko v dnevni sobi',
    useRAG: false,
  },
  {
    agentType: 'materials_agent',
    message: 'Kateri materiali za elektriko dnevne sobe?',
    useRAG: false,
  },
])

// Access individual results
pool.results.forEach((r) => {
  if (r.success) console.log(r.agentType, r.result.response)
  else console.error(r.agentType, r.error)
})
```

### Single spawn

```typescript
const result = await AI.spawn.one(userId, {
  agentType: 'materials_agent',
  message: 'Seznam materiala za menjavo pip, kopalnica 10m²',
})

console.log(result.success)        // true
console.log(result.result.response)
```

### Adaptive processing pattern

```typescript
const analysis = await AI.spawn.analyse(description)

if (analysis.complexity === 'simple') {
  // Just route to one agent
  return AI.route({ userId, userRole: 'obrtnik', message: description })
} else {
  // Spawn multiple agents
  return AI.spawn.auto(userId, { taskDescription: description, taskId })
}
```

### SpawnPoolResult fields

| Field | Type | Description |
|-------|------|-------------|
| `results` | `SpawnResult[]` | All results (success + failure) |
| `succeeded` | `SpawnResult[]` | Only successful results |
| `failed` | `SpawnResult[]` | Only failed results |
| `mergedResponse` | `string` | Claude-merged output of all succeeded |
| `totalCostUsd` | `number` | Sum of all successful agent costs |
| `durationMs` | `number` | Wall-clock time (reflects parallelism) |

### Combining HITL + Spawn

A powerful pattern: spawn agents in parallel, then require human approval before delivering the merged output.

```typescript
const { analysis, pool } = await AI.spawn.auto(userId, { taskDescription, taskId })

const req = await AI.hitl.create({
  executionId: uuidv4(),
  agentName: 'orchestrator',
  description: 'Pregledaj AI-generirani povzetek pred dostavo',
  context: {
    complexity: analysis.complexity,
    mergedOutput: pool.mergedResponse,
    totalCostUsd: pool.totalCostUsd,
  },
})

const approval = await AI.hitl.wait(req.approvalId)

if (approval.status === 'approved') {
  return pool.mergedResponse
}
```

### Token and cost flow

Each spawned agent:
- Runs `executeAgent()` independently
- Is quota-checked against the user's tier
- Logs usage to `ai_usage_logs`

The merge step uses Claude Haiku (cheapest model) to keep costs low.

Total cost = sum of all spawned agent costs + merge call cost.

---

## Error Handling

### HITL errors

```typescript
import { HITLError, HITLTimeoutError } from '@/lib/ai/patterns'

try {
  await AI.hitl.create(...)
} catch (e) {
  if (e instanceof HITLError) {
    // DB error, constraint violation, etc.
  }
}

try {
  await AI.hitl.wait(id, { timeoutMs: 60_000 })
} catch (e) {
  if (e instanceof HITLTimeoutError) {
    // Decision not made in time
  }
}
```

### Spawn errors

Individual agent failures in a pool are captured as `SpawnResult.error` strings.
The pool itself never throws unless all agents fail.

```typescript
const pool = await AI.spawn.pool(userId, configs)
if (pool.failed.length > 0) {
  pool.failed.forEach((f) => {
    console.warn(`Agent ${f.agentType} failed: ${f.error}`)
  })
}
// pool.mergedResponse still works if at least one agent succeeded
```
