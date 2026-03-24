# SKILL.md Patch — AI Agent Patterns v2.0

Add the following content to your `SKILL.md` file under the AI / Orchestration section.

---

## PATCH: AI Agent Patterns v2.0

Paste this block after the existing AI Orchestrator section in SKILL.md:

```markdown
## AI Agent Patterns v2.0

Five high-level execution patterns layered on top of the base `executeAgent` function.
Import from `@/lib/ai/extended-orchestrator`.

### Unified API

\`\`\`typescript
import { AI } from '@/lib/ai/extended-orchestrator'
\`\`\`

### Pattern 1: Sequential Pipeline

Run agents in sequence. Each step receives the previous step's output.

\`\`\`typescript
const result = await AI.sequential({
  userId,
  initialMessage: 'Zamenjati pipe v kopalnici',
  taskId,
  steps: [
    { agentType: 'work_description' },
    {
      agentType: 'quote_generator',
      buildMessage: (prev) => \`Na podlagi opisa:\n\${prev}\n\nSestavi ponudbo.\`,
    },
  ],
})
// result.finalOutput — last step response
// result.steps — per-step results
\`\`\`

Convenience builders: `buildTaskProcessingPipeline()`, `buildOfferEvaluationPipeline()`

### Pattern 2: Parallel Execution

Run independent agents simultaneously with `Promise.allSettled`.

\`\`\`typescript
const result = await AI.parallel({
  userId,
  tasks: buildCraftsmanParallelTasks(description, taskId),
  concurrencyLimit: 3,
})
// result.results.quote?.result?.response
// result.results.materials?.result?.response
// result.allSucceeded
\`\`\`

Convenience builders: `buildCraftsmanParallelTasks()`, `buildNarocnikParallelTasks()`

### Pattern 3: Agent Router

Auto-select agent from user message via keyword classification + tier/quota check.

\`\`\`typescript
const result = await AI.route({
  userId,
  userRole: 'narocnik',
  message: 'Primerjaj ponudbe ki sem jih dobil',
  taskId,
})
// result.selectedAgent  — 'offer_comparison'
// result.selectionReason — 'keyword'
// result.executionResult.response
\`\`\`

Throws `AgentAccessError` or `QuotaExceededError` as appropriate.

Quota inspection: `getAgentQuotaMetrics(userId, agent)`, `getAllAgentQuotaMetrics(userId, role)`

### Pattern 4: Human-in-the-Loop (HITL)

Pause AI execution for human approval. Backed by `hitl_approvals` table + Realtime.

\`\`\`typescript
// Create request
const req = await AI.hitl.create({ executionId, agentName, description, context })

// Wait (server-side poll)
const approval = await AI.hitl.wait(req.approvalId, { timeoutMs: 300_000 })

// Subscribe (client-side realtime)
const unsub = AI.hitl.subscribe(executionId, (a) => { ... })

// Admin inbox
const pending = await AI.hitl.getPending(adminUserId)

// Approve / reject
await AI.hitl.approve(id, approverId, note?)
await AI.hitl.reject(id, approverId, note?)
\`\`\`

Requires migration: `supabase/migrations/20260324_add_hitl_approval_system.sql`

### Pattern 5: Dynamic Spawn

Claude Haiku analyses task complexity and spawns recommended agents in parallel. Outputs are merged by Haiku into a single coherent response.

\`\`\`typescript
// Auto: analyse + spawn + merge
const { analysis, pool } = await AI.spawn.auto(userId, { taskDescription, taskId })
// analysis.complexity  — 'simple' | 'moderate' | 'complex'
// analysis.recommendedAgents — ['quote_generator', 'materials_agent', ...]
// pool.mergedResponse — single Slovenian text

// Manual pool
const pool = await AI.spawn.pool(userId, [
  { agentType: 'quote_generator', message: '...' },
  { agentType: 'materials_agent', message: '...' },
])

// Complexity analysis only
const analysis = await AI.spawn.analyse(taskDescription)
\`\`\`

### Key files

\`\`\`
lib/ai/
├── patterns/
│   ├── index.ts
│   ├── sequential-pipeline.ts
│   ├── parallel-execution.ts
│   ├── agent-router.ts
│   ├── human-in-the-loop.ts
│   └── dynamic-spawn.ts
└── extended-orchestrator.ts    ← AI object

supabase/migrations/
└── 20260324_add_hitl_approval_system.sql

docs/ai-patterns/               ← Full documentation
examples/ai-patterns/           ← Usage examples
\`\`\`

### Error handling

\`\`\`typescript
import { AgentAccessError, QuotaExceededError } from '@/lib/ai/extended-orchestrator'
import { HITLError, HITLTimeoutError } from '@/lib/ai/patterns'
\`\`\`

### Existing code compatibility

`executeAgent()` is unchanged. All v2.0 patterns call it internally. Zero regression risk.
```

---

## Additional entries for the Quick IDs section

No changes needed — Supabase project ID `whabaeatixtymbccwigu` is already documented.

---

## Additional entries for the Key Files section

Add to the existing Key Files table:

```markdown
lib/ai/extended-orchestrator.ts  → AI object with all 5 patterns
lib/ai/patterns/index.ts         → Pattern barrel exports
```

---

## Additional entry for the Database Tables section

Add to the existing tables table:

```markdown
| `hitl_approvals` | Human-in-the-loop approval requests |
```
