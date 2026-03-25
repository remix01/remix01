# LiftGO AI Patterns v2.0 — API Reference

Complete API reference for all functions exported from `@/lib/ai/extended-orchestrator` and `@/lib/ai/patterns`.

---

## Import paths

```typescript
// Recommended: unified namespace
import { AI } from '@/lib/ai/extended-orchestrator'

// Direct pattern imports
import { runSequentialPipeline } from '@/lib/ai/patterns/sequential-pipeline'
import { runParallelAgents } from '@/lib/ai/patterns/parallel-execution'
import { routeToAgent } from '@/lib/ai/patterns/agent-router'
import { createHITLRequest, approveRequest, rejectRequest } from '@/lib/ai/patterns/human-in-the-loop'
import { spawnAgent, spawnAgentPool, autoSpawn } from '@/lib/ai/patterns/dynamic-spawn'

// Barrel import
import { runSequentialPipeline, runParallelAgents, routeToAgent } from '@/lib/ai/patterns'
```

---

## AI Object (Unified Namespace)

### `AI.sequential(options)`

Runs agents in sequential order. Returns after all steps complete (or first failure if `failFast: true`).

**Parameters:** `PipelineOptions`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `userId` | `string` | required | LiftGO user ID |
| `initialMessage` | `string` | required | Starting message |
| `steps` | `PipelineStep[]` | required | Ordered steps |
| `taskId` | `string?` | — | For RAG context |
| `failFast` | `boolean` | `true` | Stop on first error |

**Returns:** `Promise<PipelineResult>`

| Field | Type | Description |
|-------|------|-------------|
| `finalOutput` | `string` | Last step response |
| `steps` | `PipelineStepResult[]` | Per-step details |
| `totalInputTokens` | `number` | Sum of input tokens |
| `totalOutputTokens` | `number` | Sum of output tokens |
| `totalCostUsd` | `number` | Total cost |
| `totalDurationMs` | `number` | Wall-clock duration |
| `success` | `boolean` | All steps completed |

---

### `AI.parallel(options)`

Runs multiple agents simultaneously. Uses `Promise.allSettled` — individual failures don't abort others.

**Parameters:** `ParallelAgentOptions`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `userId` | `string` | required | LiftGO user ID |
| `tasks` | `ParallelAgentTask[]` | required | Tasks to run |
| `concurrencyLimit` | `number?` | unlimited | Max concurrent requests |

**`ParallelAgentTask` fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `label` | `string` | required | Key in results map |
| `agentType` | `AIAgentType` | required | Agent to use |
| `userMessage` | `string` | required | Prompt for this agent |
| `taskId` | `string?` | — | For RAG context |
| `conversationId` | `string?` | — | For message history |
| `additionalContext` | `string?` | — | Extra system context |
| `useRAG` | `boolean?` | `true` | Enable RAG |
| `useTools` | `boolean?` | `false` | Enable tool calling |

**Returns:** `Promise<ParallelExecutionResult>`

| Field | Type | Description |
|-------|------|-------------|
| `results` | `Record<string, ParallelTaskResult>` | Label-keyed map |
| `fulfilled` | `ParallelTaskResult[]` | Successful tasks |
| `rejected` | `ParallelTaskResult[]` | Failed tasks |
| `totalCostUsd` | `number` | Sum of fulfilled costs |
| `totalDurationMs` | `number` | Wall-clock duration |
| `allSucceeded` | `boolean` | No failures |

---

### `AI.route(input)`

Intelligently routes a message to the best agent. Enforces tier access and daily quota.

**Parameters:** `RouterInput`

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `userId` | `string` | required | LiftGO user ID |
| `userRole` | `'narocnik' \| 'obrtnik'` | required | User role |
| `message` | `string` | required | Message to classify |
| `agentOverride` | `AIAgentType?` | — | Skip classification |
| `taskId` | `string?` | — | For RAG context |
| `conversationId` | `string?` | — | For message history |
| `additionalContext` | `string?` | — | Extra system context |
| `useRAG` | `boolean?` | `true` | Enable RAG |
| `useTools` | `boolean?` | `false` | Enable tool calling |

**Returns:** `Promise<RouterResult>`

| Field | Type | Description |
|-------|------|-------------|
| `selectedAgent` | `AIAgentType` | Agent that ran |
| `selectionReason` | `'override' \| 'keyword' \| 'role_heuristic' \| 'fallback'` | How selected |
| `executionResult` | `AgentExecutionResult` | Full response |
| `quotaChecked` | `boolean` | Always true on success |
| `dailyUsage` | `number` | Calls used today |
| `dailyLimit` | `number` | Max calls per day |

**Throws:**
- `AgentAccessError` — agent requires higher tier
- `QuotaExceededError` — daily limit reached

---

### `AI.hitl.create(params)`

Creates a HITL approval request in `hitl_approvals`.

**Parameters:** `CreateHITLRequestParams`

| Field | Type | Description |
|-------|------|-------------|
| `executionId` | `string` | Unique execution run ID |
| `agentName` | `string` | Agent requesting approval |
| `description` | `string` | What needs approval |
| `context` | `Record<string, unknown>` | Data for the approver |

**Returns:** `Promise<HITLRequestResult>`

| Field | Type | Description |
|-------|------|-------------|
| `approvalId` | `string` | UUID of the created record |
| `executionId` | `string` | Echo of input |
| `status` | `'pending'` | Always pending on creation |
| `createdAt` | `string` | ISO timestamp |

---

### `AI.hitl.approve(id, approverId, note?)`

Approves a pending request.

**Parameters:**
- `id: string` — hitl_approvals.id
- `approverId: string` — LiftGO user ID
- `note?: string` — optional approval note

**Returns:** `Promise<ApprovalActionResult>`

---

### `AI.hitl.reject(id, approverId, note?)`

Rejects a pending request.

**Parameters:** same as `approve`

**Returns:** `Promise<ApprovalActionResult>`

---

### `AI.hitl.getPending(userId)`

Returns all pending approvals for a user.

**Parameters:** `userId: string`

**Returns:** `Promise<HITLApproval[]>`

---

### `AI.hitl.get(id)`

Returns a specific approval by ID.

**Returns:** `Promise<HITLApproval>`

---

### `AI.hitl.subscribe(executionId, callback)`

Subscribes to Realtime updates for an execution's approval.

**Parameters:**
- `executionId: string`
- `callback: (approval: HITLApproval) => void`

**Returns:** `() => void` — call to unsubscribe

---

### `AI.hitl.wait(approvalId, options?)`

Server-side polling until the approval reaches a terminal state.

**Parameters:**
- `approvalId: string`
- `options?: { pollIntervalMs?: number; timeoutMs?: number }`
  - `pollIntervalMs` default: 3000
  - `timeoutMs` default: 300000 (5 min)

**Returns:** `Promise<HITLApproval>`

**Throws:** `HITLTimeoutError` if timeout exceeded

---

### `AI.spawn.one(userId, config)`

Spawns a single agent.

**Parameters:**
- `userId: string`
- `config: SpawnConfig`

**`SpawnConfig` fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `agentType` | `AIAgentType` | required | Agent to spawn |
| `message` | `string` | required | Prompt |
| `additionalContext` | `string?` | — | Extra context |
| `useRAG` | `boolean?` | `false` | Enable RAG |

**Returns:** `Promise<SpawnResult>`

---

### `AI.spawn.pool(userId, configs)`

Spawns multiple agents in parallel.

**Parameters:**
- `userId: string`
- `configs: SpawnConfig[]`

**Returns:** `Promise<SpawnPoolResult>`

---

### `AI.spawn.analyse(taskDescription)`

Analyses task complexity and recommends agents.

**Parameters:** `taskDescription: string`

**Returns:** `Promise<ComplexityAnalysis>`

| Field | Type | Description |
|-------|------|-------------|
| `domains` | `string[]` | Detected work domains |
| `recommendedAgents` | `AIAgentType[]` | Suggested agents |
| `complexity` | `'simple' \| 'moderate' \| 'complex'` | Complexity level |
| `reasoning` | `string` | Claude's explanation |

---

### `AI.spawn.auto(userId, params)`

Analyses and spawns in one call.

**Parameters:**
- `userId: string`
- `params: { taskDescription: string; taskId?: string }`

**Returns:** `Promise<{ analysis: ComplexityAnalysis; pool: SpawnPoolResult }>`

---

## Standalone Functions (top-level exports)

| Function | Import | Description |
|----------|--------|-------------|
| `getPendingApprovals(userId)` | `@/lib/ai/extended-orchestrator` | Alias for `AI.hitl.getPending` |
| `approveRequest(id, approverId, note?)` | `@/lib/ai/extended-orchestrator` | Alias for `AI.hitl.approve` |
| `rejectRequest(id, approverId, note?)` | `@/lib/ai/extended-orchestrator` | Alias for `AI.hitl.reject` |
| `subscribeToApprovals(executionId, cb)` | `@/lib/ai/extended-orchestrator` | Alias for `AI.hitl.subscribe` |
| `classifyIntent(message, role)` | `@/lib/ai/patterns` | Returns agent + reason without executing |
| `getAgentQuotaMetrics(userId, agent)` | `@/lib/ai/patterns` | Returns quota metrics |
| `getAllAgentQuotaMetrics(userId, role)` | `@/lib/ai/patterns` | Returns all accessible agent metrics |
| `buildTaskProcessingPipeline()` | `@/lib/ai/patterns` | Returns 3-step default pipeline |
| `buildOfferEvaluationPipeline()` | `@/lib/ai/patterns` | Returns 2-step offer evaluation pipeline |
| `buildCraftsmanParallelTasks(desc, id?)` | `@/lib/ai/patterns` | Returns 3 craftsman parallel tasks |
| `buildNarocnikParallelTasks(desc, id?)` | `@/lib/ai/patterns` | Returns 2 narocnik parallel tasks |

---

## Type Exports

All types are exported from `@/lib/ai/patterns` and re-exported from `@/lib/ai/extended-orchestrator`:

```typescript
// Pipeline
import type { PipelineStep, PipelineOptions, PipelineResult, PipelineStepResult } from '@/lib/ai/patterns'

// Parallel
import type { ParallelAgentTask, ParallelAgentOptions, ParallelExecutionResult, ParallelTaskResult } from '@/lib/ai/patterns'

// Router
import type { UserRole, RouterInput, RouterResult, RouterMetrics } from '@/lib/ai/patterns'

// HITL
import type { HITLApproval, HITLStatus, CreateHITLRequestParams, HITLRequestResult, ApprovalActionResult } from '@/lib/ai/patterns'

// Spawn
import type { SpawnConfig, SpawnResult, SpawnPoolResult, ComplexityAnalysis } from '@/lib/ai/patterns'
```

---

## Error Classes

| Class | Import | When thrown |
|-------|--------|-------------|
| `AgentAccessError` | `@/lib/ai/extended-orchestrator` | Agent requires higher tier |
| `QuotaExceededError` | `@/lib/ai/extended-orchestrator` | Daily quota exhausted |
| `HITLError` | `@/lib/ai/patterns` | HITL DB error |
| `HITLTimeoutError` | `@/lib/ai/patterns` | waitForApproval exceeded timeout |
