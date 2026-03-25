# LiftGO AI Agent Patterns v2.0

Comprehensive documentation for all five AI execution patterns available in LiftGO.

---

## Overview

LiftGO v2.0 introduces five high-level AI orchestration patterns built on top of the base `executeAgent` function. Each pattern solves a specific orchestration need:

| Pattern | Use When |
|---------|----------|
| Sequential Pipeline | Steps depend on each other's output |
| Parallel Execution | Steps are independent and can run simultaneously |
| Agent Router | You need smart intent-based agent selection |
| Human-in-the-Loop | A human must approve before the AI continues |
| Dynamic Spawn | Task complexity determines which agents are needed |

All patterns are exported from `@/lib/ai/extended-orchestrator` via the `AI` object.

---

## Pattern 1: Sequential Pipeline

**File:** `lib/ai/patterns/sequential-pipeline.ts`

Chains multiple agents in sequence. Each step receives the output of the previous step as its input. Order matters.

### When to use

- Multi-step workflows where each step refines the previous output
- Processing a task from raw description to final quote to summary
- Any workflow where step N depends on step N-1

### API

```typescript
import { AI } from '@/lib/ai/extended-orchestrator'

const result = await AI.sequential({
  userId: 'user-123',
  initialMessage: 'Zamenjati pipe v kopalnici',
  taskId: 'task-456',
  steps: [
    { agentType: 'work_description' },
    {
      agentType: 'quote_generator',
      buildMessage: (prev) => `Na podlagi opisa:\n${prev}\n\nSestavi ponudbo.`,
    },
    {
      agentType: 'job_summary',
      buildMessage: (prev) => `Na podlagi ponudbe:\n${prev}\n\nSestavi povzetek.`,
    },
  ],
})

console.log(result.finalOutput)
console.log(result.totalCostUsd)
```

### PipelineStep fields

| Field | Type | Description |
|-------|------|-------------|
| `agentType` | `AIAgentType` | Which agent to run |
| `userMessage` | `string?` | Static message (overrides buildMessage) |
| `buildMessage` | `(prev, original) => string` | Dynamic message builder |
| `additionalContext` | `string?` | Extra context injected into system prompt |
| `useRAG` | `boolean?` | Default: true |
| `useTools` | `boolean?` | Default: false |

### PipelineResult fields

| Field | Type | Description |
|-------|------|-------------|
| `finalOutput` | `string` | Response from the last successful step |
| `steps` | `PipelineStepResult[]` | Per-step results |
| `totalCostUsd` | `number` | Combined cost |
| `totalDurationMs` | `number` | Wall-clock time |
| `success` | `boolean` | True if all steps completed |

### Convenience builders

```typescript
import { buildTaskProcessingPipeline, buildOfferEvaluationPipeline } from '@/lib/ai/patterns'

// work_description → quote_generator → job_summary
const steps = buildTaskProcessingPipeline()

// offer_comparison → scheduling_assistant
const steps = buildOfferEvaluationPipeline()
```

---

## Pattern 2: Parallel Execution

**File:** `lib/ai/patterns/parallel-execution.ts`

Runs multiple independent agents simultaneously using `Promise.allSettled`. One agent failing does not abort the others.

### When to use

- Independent analyses that don't need each other's output
- PRO obrtnik generating quote + materials list + summary at the same time
- Any scenario where latency reduction matters more than sequencing

### API

```typescript
import { AI } from '@/lib/ai/extended-orchestrator'

const result = await AI.parallel({
  userId: 'user-123',
  tasks: [
    {
      label: 'quote',
      agentType: 'quote_generator',
      userMessage: 'Zamenjava pip, 3 kopalnice',
      taskId: 'task-456',
    },
    {
      label: 'materials',
      agentType: 'materials_agent',
      userMessage: 'Seznam materiala za menjavo pip',
    },
  ],
  concurrencyLimit: 2,  // Optional: limit concurrent API calls
})

console.log(result.results.quote?.result?.response)
console.log(result.results.materials?.result?.response)
console.log(result.allSucceeded)
```

### ParallelAgentTask fields

| Field | Type | Description |
|-------|------|-------------|
| `label` | `string` | Key in the results map |
| `agentType` | `AIAgentType` | Which agent to run |
| `userMessage` | `string` | The message for this agent |
| `taskId` | `string?` | Optional RAG context |
| `useRAG` | `boolean?` | Default: true |

### ParallelExecutionResult fields

| Field | Type | Description |
|-------|------|-------------|
| `results` | `Record<label, ParallelTaskResult>` | Map of label to result |
| `fulfilled` | `ParallelTaskResult[]` | Successful tasks |
| `rejected` | `ParallelTaskResult[]` | Failed tasks |
| `allSucceeded` | `boolean` | True if no rejections |
| `totalCostUsd` | `number` | Sum of fulfilled task costs |

### Convenience builders

```typescript
import { buildCraftsmanParallelTasks, buildNarocnikParallelTasks } from '@/lib/ai/patterns'

// quote_generator + materials_agent + job_summary
const tasks = buildCraftsmanParallelTasks(description, taskId)

// work_description + scheduling_assistant
const tasks = buildNarocnikParallelTasks(description, taskId)
```

---

## Pattern 3: Agent Router

**File:** `lib/ai/patterns/agent-router.ts`

Intelligently selects the best agent based on message intent, user role, and subscription tier. Enforces quota before executing.

### When to use

- Chat interfaces where the user's intent determines which agent to use
- When you don't want to hardcode agent selection
- Multi-purpose chat endpoints that serve both narocniki and obrtniki

### API

```typescript
import { AI } from '@/lib/ai/extended-orchestrator'

const result = await AI.route({
  userId: 'user-123',
  userRole: 'narocnik',
  message: 'Primerjaj ponudbe ki sem jih dobil',
  taskId: 'task-456',
  useRAG: true,
})

console.log(result.selectedAgent)      // 'offer_comparison'
console.log(result.selectionReason)   // 'keyword'
console.log(result.dailyLimit - result.dailyUsage)  // remaining calls
```

### Routing logic

1. **Override** — if `agentOverride` is set, use it directly
2. **Keyword matching** — score each agent's keyword list against the message
3. **Role heuristic** — narocnik defaults to `work_description`, obrtnik to `quote_generator`
4. **Fallback** — `general_chat`

### RouterInput fields

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `string` | LiftGO user ID |
| `userRole` | `'narocnik' \| 'obrtnik'` | User role for filtering |
| `message` | `string` | Raw message to classify |
| `agentOverride` | `AIAgentType?` | Skip classification |
| `taskId` | `string?` | Optional RAG context |

### RouterResult fields

| Field | Type | Description |
|-------|------|-------------|
| `selectedAgent` | `AIAgentType` | The agent that ran |
| `selectionReason` | `string` | How it was selected |
| `executionResult` | `AgentExecutionResult` | Full execution output |
| `dailyUsage` | `number` | Calls used today |
| `dailyLimit` | `number` | Max calls today |

### Quota inspection

```typescript
import { getAgentQuotaMetrics, getAllAgentQuotaMetrics } from '@/lib/ai/patterns'

// Single agent
const metrics = await getAgentQuotaMetrics(userId, 'quote_generator')
// { agent, dailyUsage, dailyLimit, remainingCalls, tier }

// All accessible agents for a role
const all = await getAllAgentQuotaMetrics(userId, 'obrtnik')
```

---

## Pattern 4: Human-in-the-Loop (HITL)

See `HITL_AND_DYNAMIC_SPAWN.md` for a deep dive.

**Quick reference:**

```typescript
import { AI } from '@/lib/ai/extended-orchestrator'

// Create approval request
const req = await AI.hitl.create({ executionId, agentName, description, context })

// Wait for decision (server-side)
const approval = await AI.hitl.wait(req.approvalId)

if (approval.status === 'approved') { /* continue */ }
if (approval.status === 'rejected') { /* abort */ }

// Subscribe (client-side)
const unsub = AI.hitl.subscribe(executionId, (a) => { ... })
```

---

## Pattern 5: Dynamic Spawn

See `HITL_AND_DYNAMIC_SPAWN.md` for a deep dive.

**Quick reference:**

```typescript
import { AI } from '@/lib/ai/extended-orchestrator'

// Auto-analyse and spawn
const { analysis, pool } = await AI.spawn.auto(userId, { taskDescription, taskId })

// Manual pool
const pool = await AI.spawn.pool(userId, [
  { agentType: 'quote_generator', message: '...' },
  { agentType: 'materials_agent', message: '...' },
])

// Complexity analysis only
const analysis = await AI.spawn.analyse(taskDescription)
```

---

## Error Handling

All patterns propagate errors from the base orchestrator:

```typescript
import { AgentAccessError, QuotaExceededError } from '@/lib/ai/extended-orchestrator'

try {
  await AI.route({ ... })
} catch (error) {
  if (error instanceof AgentAccessError) {
    // User needs PRO subscription
  }
  if (error instanceof QuotaExceededError) {
    // Daily limit reached
  }
}
```

Sequential pipeline with `failFast: false` captures errors per step and continues.

Parallel execution uses `Promise.allSettled` — individual failures appear in `result.rejected`.

---

## Subscription Tiers

| Tier | Daily Limit | PRO Agents |
|------|-------------|------------|
| START | 10 total | No |
| PRO | 100 total | Yes |

PRO-only agents: `video_diagnosis`, `materials_agent`, `offer_writing`, `profile_optimization`

All START agents: `work_description`, `offer_comparison`, `scheduling_assistant`, `quote_generator`, `job_summary`, `general_chat`
