# Migration Guide: AI Router v1 → AI Agent Patterns v2.0

This guide explains how to migrate existing LiftGO code from the original `executeAgent` / `ai-router` approach to the new v2.0 patterns.

---

## What changed

### v1.0 (before)

- Single `executeAgent()` call per agent
- Manual tier and quota checking inline in route handlers
- No pipeline orchestration
- No parallel execution
- No human approval gates
- No dynamic agent selection

### v2.0 (new)

- Five execution patterns via `AI` object
- All tier/quota checking happens inside patterns
- Sequential pipelines with `buildMessage` transformers
- Parallel execution with `Promise.allSettled`
- HITL approval gates with Realtime
- Dynamic agent spawning based on Claude complexity analysis

---

## Step 1: Apply the database migration

The HITL pattern requires the `hitl_approvals` table.

```bash
# From project root
supabase db push
```

Verify:
```sql
-- In Supabase SQL editor
SELECT COUNT(*) FROM information_schema.tables
WHERE table_name = 'hitl_approvals';
-- Expected: 1
```

---

## Step 2: Single executeAgent → AI.route

**Before (v1):**

```typescript
import { executeAgent } from '@/lib/ai/orchestrator'
import { isAgentAccessible, AGENT_DAILY_LIMITS } from '@/lib/agents/ai-router'

// Route handler — manual tier check
const userTier = await getUserTier(userId)
if (!isAgentAccessible('offer_comparison', userTier)) {
  return { error: 'PRO required' }
}

const dailyUsage = await getDailyUsage(userId, 'offer_comparison')
if (dailyUsage >= AGENT_DAILY_LIMITS[userTier].offer_comparison) {
  return { error: 'Quota exceeded' }
}

const result = await executeAgent({
  userId,
  agentType: 'offer_comparison',
  userMessage: message,
  taskId,
})
```

**After (v2):**

```typescript
import { AI } from '@/lib/ai/extended-orchestrator'
import { AgentAccessError, QuotaExceededError } from '@/lib/ai/extended-orchestrator'

try {
  const result = await AI.route({
    userId,
    userRole: 'narocnik',
    message,
    taskId,
    agentOverride: 'offer_comparison',  // explicit, or omit for auto-routing
  })
  return { response: result.executionResult.response }
} catch (e) {
  if (e instanceof AgentAccessError) return { error: 'PRO required' }
  if (e instanceof QuotaExceededError) return { error: 'Quota exceeded' }
  throw e
}
```

---

## Step 3: Multi-step workflows → AI.sequential

**Before (v1) — manual chaining:**

```typescript
// Step 1
const descResult = await executeAgent({
  userId,
  agentType: 'work_description',
  userMessage: rawInput,
})

// Step 2 — manually pass previous output
const quoteResult = await executeAgent({
  userId,
  agentType: 'quote_generator',
  userMessage: `Na podlagi opisa:\n${descResult.response}\n\nSestavi ponudbo.`,
})
```

**After (v2):**

```typescript
const result = await AI.sequential({
  userId,
  initialMessage: rawInput,
  steps: [
    { agentType: 'work_description' },
    {
      agentType: 'quote_generator',
      buildMessage: (prev) => `Na podlagi opisa:\n${prev}\n\nSestavi ponudbo.`,
    },
  ],
})
```

---

## Step 4: Multiple independent calls → AI.parallel

**Before (v1) — sequential when should be parallel:**

```typescript
const quoteResult = await executeAgent({ userId, agentType: 'quote_generator', userMessage })
const materialsResult = await executeAgent({ userId, agentType: 'materials_agent', userMessage })
const summaryResult = await executeAgent({ userId, agentType: 'job_summary', userMessage })
// Total: ~9 seconds
```

**After (v2):**

```typescript
const result = await AI.parallel({
  userId,
  tasks: buildCraftsmanParallelTasks(userMessage, taskId),
})
// Total: ~3 seconds (all run at once)

const { quote, materials, summary } = {
  quote: result.results.quote?.result?.response,
  materials: result.results.materials?.result?.response,
  summary: result.results.summary?.result?.response,
}
```

---

## Step 5: Add HITL where needed

If you have workflows where AI output should be reviewed before delivery, add HITL:

```typescript
// After generating the AI output
const req = await AI.hitl.create({
  executionId: uuidv4(),
  agentName: 'quote_generator',
  description: 'Preglej ponudbo pred pošiljanjem',
  context: { taskId, quote: aiOutput },
})

// Option A: Server-side poll
const approval = await AI.hitl.wait(req.approvalId)

// Option B: Return approvalId to client, let UI subscribe
return { approvalId: req.approvalId, executionId: req.executionId }
```

On the client side:

```typescript
// Previously: no approval mechanism
// After: realtime subscription
const unsub = AI.hitl.subscribe(executionId, (approval) => {
  if (approval.status === 'approved') proceedWithDelivery()
})
```

---

## Step 6: Update existing API routes

### `/api/ai/chat` (or similar)

```typescript
// Before
export async function POST(req: Request) {
  const { userId, agentType, message } = await req.json()
  const result = await executeAgent({ userId, agentType, userMessage: message })
  return Response.json({ response: result.response })
}

// After — auto-routing based on role
export async function POST(req: Request) {
  const { userId, message, taskId } = await req.json()
  const user = await getSessionUser()  // your auth helper

  const result = await AI.route({
    userId,
    userRole: user.role as UserRole,
    message,
    taskId,
  })

  return Response.json({
    response: result.executionResult.response,
    agent: result.selectedAgent,
    remainingCalls: result.dailyLimit - result.dailyUsage - 1,
  })
}
```

---

## Backwards Compatibility

The existing `executeAgent` function is unchanged and still exported from `@/lib/ai/orchestrator` and `@/lib/ai/extended-orchestrator`. All existing code that directly calls `executeAgent` will continue to work without any changes.

The new patterns are additive — you can migrate route-by-route at your own pace.

---

## Checklist

- [ ] Migration SQL applied (`20260324_add_hitl_approval_system.sql`)
- [ ] At least one route updated to use `AI.route`
- [ ] Multi-step workflows converted to `AI.sequential`
- [ ] Parallel-worthy calls converted to `AI.parallel`
- [ ] HITL added to at least one approval workflow
- [ ] Dynamic spawn tested on a complex renovation task
- [ ] `AgentAccessError` and `QuotaExceededError` handled in all updated routes
- [ ] Quota display updated to use `getAgentQuotaMetrics`
