# Module 4 Extended: AI Agent Patterns v2.0

## LiftGO AI Orchestration — Extended Module

This module extends the base AI orchestration system with five advanced execution patterns. After completing this module you will be able to implement multi-step pipelines, parallel agent pools, smart routing, human approval gates, and dynamic agent spawning in LiftGO.

---

## Prerequisites

- Module 1-3 complete (Supabase, Auth, core agents)
- Anthropic SDK installed (`@anthropic-ai/sdk`)
- `executeAgent` function working (`lib/ai/orchestrator.ts`)
- Supabase migration `20260324_add_hitl_approval_system.sql` applied

---

## 4.1 Sequential Pipeline

### Concept

Chain agents so each one refines the output of the previous. Ideal for the classic LiftGO workflow: describe job → generate quote → write summary.

### Implementation

```typescript
// lib/ai/patterns/sequential-pipeline.ts
export async function runSequentialPipeline(options: PipelineOptions): Promise<PipelineResult>
```

### Key points

- `buildMessage` lets you transform the previous output before passing it to the next step
- `failFast: false` allows the pipeline to skip failed steps and continue
- Each step independently uses RAG, quota, and logging

### LiftGO use case

```typescript
// When narocnik submits a task request
const result = await AI.sequential({
  userId,
  initialMessage: taskDescription,
  taskId,
  steps: buildTaskProcessingPipeline(),
})
// result.finalOutput is the job summary ready to display
```

### Testing checklist

- [ ] Pipeline runs all 3 steps for a simple plumbing request
- [ ] `failFast: true` stops at step 2 when `quote_generator` hits quota
- [ ] `failFast: false` skips step 2 and still produces a summary
- [ ] `totalCostUsd` matches sum of individual step costs

---

## 4.2 Parallel Execution

### Concept

Run independent agents simultaneously. PRO obrtniki need quote, materials list, and summary — why wait for each one sequentially?

### Implementation

```typescript
// lib/ai/patterns/parallel-execution.ts
export async function runParallelAgents(options: ParallelAgentOptions): Promise<ParallelExecutionResult>
```

### Key points

- Uses `Promise.allSettled` — one failure never blocks others
- `concurrencyLimit` prevents API rate limiting (recommended: 3 for PRO, 2 for START)
- Results keyed by `label` for easy access: `result.results.quote?.result?.response`

### LiftGO use case

```typescript
// PRO obrtnik submits quote — run 3 agents at once
const result = await AI.parallel({
  userId,
  tasks: buildCraftsmanParallelTasks(taskDescription, taskId),
})
const { quote, materials, summary } = {
  quote: result.results.quote?.result?.response,
  materials: result.results.materials?.result?.response,
  summary: result.results.summary?.result?.response,
}
```

### Performance impact

| Approach | Typical latency |
|----------|----------------|
| Sequential (3 agents) | ~9s |
| Parallel (3 agents) | ~3s |

### Testing checklist

- [ ] All 3 agents return results for a bathroom renovation description
- [ ] One agent failing (quota) doesn't abort the others
- [ ] `allSucceeded` is false when any agent fails
- [ ] `concurrencyLimit: 1` degrades to sequential behavior

---

## 4.3 Agent Router

### Concept

Auto-select the right agent from a user's free-form message. No more hardcoded agent selection in every route handler.

### Implementation

```typescript
// lib/ai/patterns/agent-router.ts
export async function routeToAgent(input: RouterInput): Promise<RouterResult>
```

### Routing algorithm

1. Override → keyword → role heuristic → fallback
2. Keyword scoring: longer keywords = higher specificity = higher score
3. Role filtering: narocnik and obrtnik see different agent candidates

### Quota display

```typescript
const metrics = await getAgentQuotaMetrics(userId, 'quote_generator')
// { agent: 'quote_generator', dailyUsage: 3, dailyLimit: 30, remainingCalls: 27, tier: 'pro' }
```

### LiftGO use case

```typescript
// Universal chat endpoint — handles any user message
const result = await AI.route({
  userId,
  userRole: session.role as UserRole,
  message: req.body.message,
  taskId: req.body.taskId,
})
// Automatically routes to offer_comparison, scheduling_assistant, etc.
```

### Testing checklist

- [ ] "Primerjaj ponudbe" routes to `offer_comparison`
- [ ] "Kdaj lahko pride" routes to `scheduling_assistant`
- [ ] Unknown message for obrtnik falls back to `quote_generator`
- [ ] PRO agent request from START user throws `AgentAccessError`
- [ ] Exhausted quota throws `QuotaExceededError`

---

## 4.4 Human-in-the-Loop (HITL)

### Concept

Insert a human decision point into an AI workflow. The AI pauses, a human approves or rejects, and the AI resumes or aborts.

### Database requirement

Run migration before using HITL:

```bash
# Apply migration
supabase db push
# or via MCP:
# Supabase:apply_migration → 20260324_add_hitl_approval_system.sql
```

### Implementation

```typescript
// lib/ai/patterns/human-in-the-loop.ts
export async function createHITLRequest(params): Promise<HITLRequestResult>
export async function approveRequest(id, approverId, note?): Promise<ApprovalActionResult>
export async function rejectRequest(id, approverId, note?): Promise<ApprovalActionResult>
export async function getPendingApprovals(userId): Promise<HITLApproval[]>
export function subscribeToApprovals(executionId, callback): () => void
export async function waitForApproval(approvalId, options?): Promise<HITLApproval>
```

### Two wait strategies

**Server-side polling** (API routes, background jobs):
```typescript
const approval = await AI.hitl.wait(approvalId, { timeoutMs: 300_000 })
```

**Client-side realtime** (React components):
```typescript
const unsub = AI.hitl.subscribe(executionId, (a) => setStatus(a.status))
```

### LiftGO use case

Auto-generated quotes above 500 EUR require obrtnik confirmation before sending.

### Testing checklist

- [ ] `createHITLRequest` inserts a row with `status='pending'`
- [ ] `approveRequest` updates to `status='approved'` only for pending records
- [ ] `rejectRequest` with note updates `approver_note` field
- [ ] `subscribeToApprovals` fires callback when status changes via Realtime
- [ ] `waitForApproval` throws `HITLTimeoutError` after `timeoutMs`
- [ ] `getPendingApprovals` only returns `status='pending'` records

---

## 4.5 Dynamic Spawn

### Concept

Let Claude decide which agents to spawn based on task complexity. The orchestrator analyses the task, spawns recommended agents in parallel, and merges results.

### Implementation

```typescript
// lib/ai/patterns/dynamic-spawn.ts
export async function spawnAgent(userId, config): Promise<SpawnResult>
export async function spawnAgentPool(userId, configs): Promise<SpawnPoolResult>
export async function analyseTaskComplexity(taskDescription): Promise<ComplexityAnalysis>
export async function autoSpawn(userId, params): Promise<{ analysis, pool }>
```

### Merge strategy

After parallel agents complete, Claude Haiku merges all outputs into a single coherent Slovenian response. The merge uses the cheapest model to keep costs minimal.

### LiftGO use case

Full bathroom renovation with multiple trades → Claude detects complexity and spawns quote, materials, and summary agents automatically.

### Cost model

| Component | Model | Typical cost |
|-----------|-------|-------------|
| Complexity analysis | claude-haiku-4-5 | ~$0.0003 |
| Each spawned agent | claude-sonnet-4-6 | ~$0.005-0.02 |
| Merge step | claude-haiku-4-5 | ~$0.0005 |

### Testing checklist

- [ ] Simple description ("zamenjaj žarnico") → complexity: `simple`, 1 agent
- [ ] Complex renovation → complexity: `complex`, 3+ agents
- [ ] `spawnAgentPool` runs agents in parallel (check timing)
- [ ] Failed agent doesn't appear in `mergedResponse`
- [ ] `mergedResponse` is coherent Slovenian text combining all outputs

---

## 4.6 Combining Patterns

The most powerful use cases combine multiple patterns. Here are the recommended combinations:

### Pipeline → HITL

```
work_description → quote_generator → [HITL: human reviews] → send to narocnik
```

### Spawn → HITL

```
analyseComplexity → spawnPool([quote, materials, summary]) → [HITL: admin reviews] → deliver
```

### Router → Pipeline

```
route(message) → if complex task detected → runSequentialPipeline([describe, quote, summarize])
```

### Testing combined patterns

- [ ] Pipeline + HITL: quote not sent until approved
- [ ] Spawn + HITL: merged output held until admin approval
- [ ] Router falls back gracefully when preferred agent quota is exhausted

---

## 4.7 Quota Monitoring

Display real-time quota usage in the UI:

```typescript
// For a specific agent
const metrics = await getAgentQuotaMetrics(userId, 'quote_generator')
// { dailyUsage: 15, dailyLimit: 30, remainingCalls: 15, tier: 'pro' }

// For all accessible agents
const all = await getAllAgentQuotaMetrics(userId, 'obrtnik')
// Array of metrics for each agent the user can access
```

Use `remainingCalls` to show progress bars in the obrtnik dashboard.

---

## Module 4 Completion Checklist

- [ ] `lib/ai/patterns/sequential-pipeline.ts` created and tested
- [ ] `lib/ai/patterns/parallel-execution.ts` created and tested
- [ ] `lib/ai/patterns/agent-router.ts` created and tested
- [ ] `lib/ai/patterns/human-in-the-loop.ts` created and tested
- [ ] `lib/ai/patterns/dynamic-spawn.ts` created and tested
- [ ] `lib/ai/patterns/index.ts` exports all patterns
- [ ] `lib/ai/extended-orchestrator.ts` exposes `AI` object
- [ ] `supabase/migrations/20260324_add_hitl_approval_system.sql` applied
- [ ] Examples in `examples/ai-patterns/` reviewed
- [ ] All 5 patterns work in local dev environment
- [ ] Error handling tested for `AgentAccessError` and `QuotaExceededError`
