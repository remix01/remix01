# LiftGO AI Agent Patterns v2.0 — Documentation

This directory contains all documentation for the AI Agent Patterns v2.0 system.

---

## Documentation Index

| File | Description |
|------|-------------|
| `README.md` | This file — overview and navigation |
| `AI_AGENT_PATTERNS.md` | Comprehensive guide to all 5 patterns with examples |
| `HITL_AND_DYNAMIC_SPAWN.md` | Deep dive: Human-in-the-Loop and Dynamic Spawn |
| `API_REFERENCE.md` | Full API reference for all exported functions and types |
| `ARCHITECTURE_DIAGRAMS.md` | Mermaid diagrams for all patterns |
| `SKILL_MODULE_4_EXTENDED.md` | Extended Module 4 — learning guide with checklists |
| `MIGRATION_GUIDE.md` | Migrating from the old AI router to new patterns |
| `PROJECT_SUMMARY_V2.md` | Summary of v2.0 changes and what's new |
| `SKILL_MD_PATCH.md` | Patch to add to the LiftGO SKILL.md file |

---

## Quick Start

### Install

No new packages required. Uses existing:
- `@anthropic-ai/sdk` — already installed
- `@supabase/supabase-js` — already installed

### Apply database migration

```bash
# From the project root
supabase db push
# This applies: supabase/migrations/20260324_add_hitl_approval_system.sql
```

### Import patterns

```typescript
// Unified API (recommended)
import { AI } from '@/lib/ai/extended-orchestrator'

// Direct pattern imports
import { runSequentialPipeline, runParallelAgents, routeToAgent } from '@/lib/ai/patterns'

// HITL specific
import { createHITLRequest, approveRequest, rejectRequest, subscribeToApprovals } from '@/lib/ai/patterns'
```

---

## Pattern Overview

### Sequential Pipeline

Run agents one after another. Each step receives the previous step's output.

```typescript
await AI.sequential({ userId, initialMessage, steps: buildTaskProcessingPipeline() })
```

**Use when:** work_description → quote_generator → job_summary

---

### Parallel Execution

Run multiple independent agents at the same time.

```typescript
await AI.parallel({ userId, tasks: buildCraftsmanParallelTasks(description, taskId) })
```

**Use when:** PRO obrtnik needs quote + materials + summary simultaneously

---

### Agent Router

Auto-select the right agent from a user's free-form message.

```typescript
await AI.route({ userId, userRole: 'narocnik', message, taskId })
```

**Use when:** Universal chat endpoint

---

### Human-in-the-Loop

Pause AI execution until a human approves or rejects.

```typescript
const req = await AI.hitl.create({ executionId, agentName, description, context })
const approval = await AI.hitl.wait(req.approvalId) // or subscribe for realtime
```

**Use when:** Auto-generated quotes above threshold, admin review workflows

---

### Dynamic Spawn

Let Claude decide which agents are needed and spawn them automatically.

```typescript
const { analysis, pool } = await AI.spawn.auto(userId, { taskDescription, taskId })
```

**Use when:** Complex renovation tasks with multiple trade categories

---

## Source Files

```
lib/ai/
├── patterns/
│   ├── index.ts                  ← Barrel exports
│   ├── sequential-pipeline.ts    ← Pattern 1
│   ├── parallel-execution.ts     ← Pattern 2
│   ├── agent-router.ts           ← Pattern 3
│   ├── human-in-the-loop.ts      ← Pattern 4
│   └── dynamic-spawn.ts          ← Pattern 5
├── extended-orchestrator.ts      ← AI object + re-exports
└── orchestrator.ts               ← Base executeAgent (unchanged)

supabase/migrations/
└── 20260324_add_hitl_approval_system.sql

examples/ai-patterns/
├── usage-examples.ts             ← Sequential, parallel, router examples
└── hitl-spawn-examples.ts        ← HITL and dynamic spawn examples
```

---

## Subscription Tiers

| Tier | Daily AI calls | PRO agents |
|------|---------------|------------|
| START | 10 | No |
| PRO | 100 | Yes |

PRO-only agents: `video_diagnosis`, `materials_agent`, `offer_writing`, `profile_optimization`

All patterns enforce tier and quota before executing.

---

## Supabase Project

Project ID: `whabaeatixtymbccwigu`

New table added: `hitl_approvals` (HITL pattern)

Realtime enabled on `hitl_approvals` for live approval notifications.
