# LiftGO Agent Skills

Modular, conversational skills that sit between the user and the base orchestrator.

## Architecture

```
User message
     │
     ▼
orchestrator-enhanced.ts
     │
     ├─ skillExecutor.process()
     │       │
     │       ├─ Trigger match?  ──No──► base orchestrator (orchestrate.ts)
     │       │
     │       └─ Yes ──► Q&A state machine
     │                       │
     │                       ├─ More questions? ──► return clarification
     │                       │
     │                       └─ All done ──► skill.execute()
     │                                           │
     │                                           ├─ toolCall? ──► tool-router
     │                                           └─ message   ──► user
     │
     ▼
EnhancedOrchestratorResponse
```

## Files

```
lib/agent/skills/
├── index.ts                    ← Barrel export
├── types.ts                    ← SkillDefinition, SkillResult, SkillState
├── executor.ts                 ← skillRegistry + skillExecutor
├── matching-rules.ts           ← Scoring weights for craftsman matching
├── pricing-rules.ts            ← Hourly rate benchmarks per category
├── README.md                   ← This file
└── core/
    ├── understanding-request.ts  ← Collect job description, location, urgency
    ├── matching-craftsmen.ts     ← Find top obrtniki for a povprasevanje
    └── managing-escrow.ts        ← Release/check escrow payments
```

## Implemented Skills (v1)

| Skill | Triggers | Questions | Output |
|-------|----------|-----------|--------|
| `understanding-request` | "potrebujem", "iščem", "mojster"… | description, location, urgency, budget? | Summary + structured data |
| `matching-craftsmen` | "najdi mojstr", "primerjaj"… | povprasevanjeId | Top 3 ranked obrtniki |
| `managing-escrow` | "plačilo", "sprosti plačilo"… | escrowId, action | Release toolCall or status |

## Roadmap (v2)

- `negotiating-terms` — assist with offer negotiation
- `tracking-progress` — job status updates
- `collecting-reviews` — post-job review flow
- `handling-disputes` — dispute escalation

## Adding a New Skill

1. Create `lib/agent/skills/core/my-skill.ts`
2. Define and export a `SkillDefinition`
3. Call `skillRegistry.register(mySkill)` at the bottom of the file
4. Import the file in `orchestrator-enhanced.ts` (side-effect import)
5. Export it from `lib/agent/skills/index.ts`

```typescript
// lib/agent/skills/core/my-skill.ts
import type { SkillDefinition } from '../types'
import { skillRegistry } from '../executor'

const mySkill: SkillDefinition = {
  name: 'my-skill',
  description: 'Short description',
  triggers: { keywords: ['trigger word'] },
  questions: [
    { field: 'info', question: 'What do you need?', required: true },
  ],
  async execute(data, context) {
    return { success: true, message: `Got: ${data.info}` }
  },
}

skillRegistry.register(mySkill)
export { mySkill }
```

## State Management

Skill state is stored in-process (Map). Each session has at most one active skill.

For multi-instance / serverless deployments replace the Map in `executor.ts`
with Redis (Upstash is already configured in this project).

## Usage

```typescript
import { orchestrateWithSkills } from '@/lib/agent/orchestrator-enhanced'

const result = await orchestrateWithSkills(userMessage, agentContext)

if (result.clarificationNeeded) {
  // Show result.message to the user as a question
} else if (result.toolCall) {
  // Route through tool-router
} else {
  // Display result.message
}
```
