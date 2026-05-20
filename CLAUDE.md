# CLAUDE.md — LiftGO Codebase Guide

## Quick IDs
```
Supabase:    whabaeatixtymbccwigu
Vercel:      Team: info-36187542s-projects | Project: v0-liftgo-platform-concept
GitHub:      remix01/remix01
Stripe:      START=prod_U7z9Ymkbh2zRAW (0€,10%) | PRO=prod_SpS7ixowByASns (29€,5%)
```

---

## Project Overview
**LiftGO** — Slovenian home services marketplace connecting customers (naročniki) with craftsmen (obrtniki).

---

## Tech Stack
| Layer | Tech |
|-------|------|
| Framework | Next.js 15, App Router, TypeScript |
| UI | React 19, shadcn/ui, Tailwind 4 |
| Database | Supabase PostgreSQL + RLS |
| Auth | Supabase Auth |
| Payments | Stripe (subscriptions) |
| AI | Anthropic Claude (5 bus agents + 10 AI personas) |
| Queue | Upstash QStash + Redis |
| Deploy | Vercel |
| Observability | Sentry + Grafana Alloy + Structured logging |
| Email | Resend + MCP integration |

---

## Database Tables
| Table | Purpose |
|-------|---------|
| `profiles` | All users |
| `obrtnik_profiles` | Craftsmen (**NE** `obrtniki`!) |
| `tasks` | Job requests (povpraševanja) |
| `ponudbe` | Offers/quotes |
| `sporocila` | Messages (realtime) |
| `ai_usage_logs` | AI cost tracking |
| `hitl_approvals` | Human-in-the-Loop approval queue (v2.0) |

---

## 🏠 Naročnik (Customer) Flow

### Routes
```
/prijava              → Login
/registracija         → Register
/narocnik/dashboard   → Main dashboard
/narocnik/novo-povprasevanje → Create task
/narocnik/povprasevanja      → My tasks
/narocnik/sporocila          → Messages
/narocnik/profil             → Profile
/narocnik/ocena              → Leave review
```

### Task Lifecycle
```
draft → open → has_ponudbe → in_progress → completed
                    ↓
               cancelled / expired
```

### Key Actions
| Action | Endpoint/Function |
|--------|-------------------|
| Create task | `POST /api/tasks` or `novo-povprasevanje` form |
| View ponudbe | `/narocnik/povprasevanja/[id]` |
| Accept ponudba | `acceptPonudba(taskId, ponudbaId)` |
| Send message | `/api/messages` or realtime |
| Leave review | `/narocnik/ocena/[taskId]` |

### Task Fields
```sql
id, title, description, status, created_by, customer_id,
category_id, assigned_to, priority,
created_at, published_at, accepted_at, completed_at, expires_at
```

### AI Agents (Customer)
| Agent | Tier | Purpose |
|-------|------|---------|
| work_description | START | Help describe the job |
| offer_comparison | START | Compare ponudbe |
| scheduling_assistant | START | Schedule work |

---

## 🛠️ Obrtnik (Craftsman) Flow

### Routes
```
/prijava              → Login
/obrtnik/dashboard    → Main dashboard  
/obrtnik/povprasevanja → Browse tasks
/obrtnik/ponudbe      → My offers
/obrtnik/sporocila    → Messages
/obrtnik/profil       → Profile
/obrtnik/narocnine    → Subscription
```

### Key Actions
| Action | Function |
|--------|----------|
| Submit ponudba | `createPonudba(taskId, price, details)` |
| View task | `/obrtnik/povprasevanja/[id]` |
| Upgrade to PRO | Stripe checkout |

### AI Agents (Craftsman)
| Agent | Tier | Purpose |
|-------|------|---------|
| quote_generator | PRO | Auto-generate ponudbe |
| materials_agent | PRO | Calculate materials |
| video_diagnosis | PRO | Analyze videos |
| job_summary | PRO | Summarize completed jobs |

---

## Architecture (8 Modules)

1. **Serverless** — Vercel + Supabase + Upstash
2. **Security** — RLS + RBAC + SECURITY DEFINER
3. **Realtime** — Supabase channels
4. **AI** — 5 message-bus agents + persona router (10 AI personas), tier-gated
5. **Stripe** — Subscriptions + webhooks
6. **Async** — XState + QStash
7. **Observability** — Structured logging
8. **DevOps** — GitHub → Vercel auto-deploy

---

## 📂 **Project Structure (Advanced)**

### Root Level Files
```
.dockerignore          → Docker build ignore
.env.build             → Build-time variables
.env.example           → Environment template (14.3 KB)
.node-version          → Node version pinning
.nvmrc                 → NVM config
.vercel-trigger        → Manual deploy trigger
.mcp.json              → MCP server definitions (Resend, custom)
.gitignore             → Git ignore rules
components.json        → shadcn/ui config
Dockerfile             → Docker image definition
docker-compose.yml     → Production compose (4.9 KB)
docker-compose.dev.yml → Development compose (2.7 KB)
compose-dev.yaml       → Alternative dev compose
eslint.config.mjs      → ESLint configuration
jest.config.cjs        → Main test config
jest.config.escrow.cjs → Escrow-specific tests
jest.config.marketplace.cjs → Marketplace-specific tests
next.config.ts         → Next.js config (12.6 KB)
nginx.conf             → Nginx reverse proxy (4.0 KB)
package.json           → Dependencies & scripts (5.4 KB)
pnpm-lock.yaml         → pnpm lock file (524 KB)
postcss.config.mjs     → PostCSS config
proxy.ts               → Request middleware (8.9 KB) ⚠️ KEY FILE
tailwind.config.ts     → Tailwind CSS config (3.2 KB)
tsconfig.json          → TypeScript config (700 B)
vercel.json            → Vercel deployment config (1.2 KB)
```

### Application Structure
```
app/                   → Next.js App Router
├── (narocnik)/         → Customer routes
│   ├── dashboard/
│   ├── novo-povprasevanje/
│   ├── povprasevanja/
│   ├── sporocila/
│   ├── profil/
│   └── ocena/
├── (obrtnik)/          → Craftsman routes
│   ├── dashboard/
│   ├── povprasevanja/
│   ├── ponudbe/
│   ├── sporocila/
│   ├── profil/
│   └── narocnine/
├── api/                → API routes
│   ├── tasks/
│   ├── ponudbe/
│   ├── messages/
│   ├── webhooks/       → Stripe, external
│   ├── health          → Health check endpoint
│   └── v1/             → New public API version
├── auth/               → Auth routes (Supabase)
└── layout.tsx          → Root layout

components/            → React components (shadcn + custom)
├── ui/                 → shadcn/ui components
├── forms/              → Form components
├── cards/              → Card components
├── modals/             → Modal dialogs
└── shared/             → Shared components

hooks/                 → React hooks
├── useAuth.ts
├── useTask.ts
├── useMessages.ts
└── ... tier-specific hooks

lib/                   → Core business logic
├── ai/                 → AI orchestration (ADVANCED)
│   ├── patterns/       → 5 AI patterns
│   │   ├── sequential-pipeline.ts
│   │   ├── parallel-execution.ts
│   │   ├── agent-router.ts
│   │   ├── human-in-the-loop.ts    ← HITL approval system
│   │   └── dynamic-spawn.ts         ← Auto-agent spawning
│   ├── extended-orchestrator.ts     ← AI.sequential(), AI.parallel(), etc.
│   ├── orchestrator.ts              ← Base executeAgent()
│   └── personas/       → 10 AI personas
├── agents/             → Agent definitions
│   ├── ai-router.ts    → Route message to right agent
│   └── ... agent configs
├── stripe/
│   ├── webhooks.ts     → Subscription lifecycle
│   ├── client.ts
│   └── utils.ts
├── supabase/
│   ├── admin.ts        → Admin client (RLS bypass)
│   ├── client.ts       → Public client
│   └── types.ts        → Database types
├── guards/
│   └── state-machine-guard.ts → Task transition validation
├── utils/
│   ├── validators.ts
│   ├── formatters.ts
│   └── helpers.ts
└── db/                 → Database queries
    └── ... query functions

styles/                → Global styles
├── globals.css
└── ... component styles

public/                → Static assets
├── images/
├── icons/
└── ...

supabase/              → Supabase configuration
├── migrations/         → Database migrations
│   └── 20260324_add_hitl_approval_system.sql
├── functions/          → PostgreSQL functions
└── config.toml

types/                 → TypeScript type definitions
├── database.ts
├── api.ts
├── domain.ts
└── ...

__tests__/             → Jest test files
├── unit/
├── integration/
└── e2e/

docs/                  → Documentation
├── ai-patterns/        → AI Pattern v2.0 docs (COMPREHENSIVE)
│   ├── README.md
│   ├── AI_AGENT_PATTERNS.md
│   ├── HITL_AND_DYNAMIC_SPAWN.md
│   ├── API_REFERENCE.md
│   ├── ARCHITECTURE_DIAGRAMS.md
│   ├── SKILL_MODULE_4_EXTENDED.md
│   ├── MIGRATION_GUIDE.md
│   ├── PROJECT_SUMMARY_V2.md
│   └── SKILL_MD_PATCH.md
└── ... other docs

scripts/               → Utility scripts
└── ... shell/node scripts

examples/              → Example code
├── usage-examples.ts
└── hitl-spawn-examples.ts

grafana-alloy/         → Observability config
└── ... Grafana Alloy setup

resend-mcp/            → Resend email MCP server
└── ... MCP implementation

instrumentation.ts     → Server-side instrumentation
instrumentation-client.ts → Client-side instrumentation
sentry.server.config.ts → Sentry error tracking (server)
sentry.edge.config.ts  → Sentry error tracking (edge)

build-output.log       → Last build log
liftgo-ai-module.tar_1.gz → AI module archive
LICENSE                → MIT License
README.md              → Project readme
SECURITY.md            → Security policy
CLAUDE.md              → This file ← YOU ARE HERE
```

---

## 🔑 Critical Files (Advanced)

| File | Purpose | Key Points |
|------|---------|-----------|
| `proxy.ts` | Request middleware | NOT `middleware.ts`! Handles auth, logging, etc. |
| `lib/ai/patterns/*` | 5 AI execution patterns | Sequential, Parallel, Router, HITL, Dynamic Spawn |
| `lib/agents/ai-router.ts` | AI agent routing | Routes user message → best agent |
| `lib/guards/state-machine-guard.ts` | Task state validation | Prevents invalid transitions |
| `lib/stripe/webhooks.ts` | Stripe subscription lifecycle | customer.subscription.created/updated/deleted |
| `lib/supabase/admin.ts` | Admin Supabase client | Bypasses RLS for server operations |
| `instrumentation.ts` | Server instrumentation | Logs, metrics, traces |
| `instrumentation-client.ts` | Client instrumentation | Browser-side observability |
| `sentry.*.config.ts` | Error tracking | Sentry initialization (server/edge) |
| `next.config.ts` | Next.js configuration | 12.6 KB of build/optimization config |

---

## 🧠 **AI Agent Patterns v2.0** (ADVANCED)

### 5 Execution Patterns

#### 1️⃣ **Sequential Pipeline**
```typescript
await AI.sequential({ 
  userId, 
  initialMessage, 
  steps: [
    { agent: 'work_description', prompt: 'Help refine...' },
    { agent: 'offer_comparison', prompt: 'Compare...' }
  ]
})
```
**Use:** work_description → quote_generator → job_summary

#### 2️⃣ **Parallel Execution**
```typescript
await AI.parallel({ 
  userId, 
  tasks: [
    { agent: 'quote_generator', ... },
    { agent: 'materials_agent', ... },
    { agent: 'video_diagnosis', ... }
  ]
})
```
**Use:** PRO obrtnik needs multiple agents simultaneously

#### 3️⃣ **Agent Router**
```typescript
await AI.route({ 
  userId, 
  userRole: 'narocnik', 
  message: 'I need help with...', 
  taskId 
})
```
**Use:** Universal chat endpoint. Claude picks the right agent.

#### 4️⃣ **Human-in-the-Loop (HITL)** ⭐ NEW
```typescript
const req = await AI.hitl.create({ 
  executionId, 
  agentName: 'quote_generator', 
  description: 'Quote > €5000', 
  context 
})
const approval = await AI.hitl.wait(req.approvalId)
// OR subscribe for realtime: AI.hitl.subscribe(approvalId)
```
**Use:** 
- Auto-generated quotes above threshold
- Admin review workflows
- Risk mitigation

**Database:** `hitl_approvals` table tracks approvals

#### 5️⃣ **Dynamic Spawn** ⭐ NEW
```typescript
const { analysis, pool } = await AI.spawn.auto(userId, { 
  taskDescription: 'Renovate kitchen + fix bathroom + rewire house',
  taskId 
})
// Claude decides: need carpentry_agent + plumbing_agent + electrical_agent
```
**Use:** Complex multi-trade tasks. Claude dynamically spawns agents.

---

## Tier Gating & Quotas

| Tier | Monthly | Daily AI Calls | PRO Agents | Price |
|------|---------|---------------|-----------|-------|
| **START** | Unlimited | 10 | 3 basic agents | €0 |
| **PRO** | Unlimited | 100 | 7 agents (includes video_diagnosis, materials_agent, etc.) | €29 |

**Enforcement:** Every pattern checks `ai_usage_logs` before executing.

---

## State Machine Guards

```typescript
// Enforced transitions
draft     → open      (only by creator)
open      → has_ponudbe (after ponudbe received)
has_ponudbe → in_progress (only by assigned obrtnik)
in_progress → completed (only by assigned obrtnik)
* → cancelled (creator or admin)
```

**Guard file:** `lib/guards/state-machine-guard.ts`

---

## Slovenian Terms
| SL | EN |
|----|----|
| naročnik | customer |
| obrtnik/mojster | craftsman |
| povpraševanje | task/job request |
| ponudba | offer/quote |
| sporočilo | message |
| prijava | login |
| ocena | review |
| naročnine | subscriptions |

---

## Debugging Commands

```bash
# Health check
curl -i https://liftgo.net/api/health

# Vercel deployment logs
Vercel:list_deployments → projectId: v0-liftgo-platform-concept, teamId: info-36187542s
Vercel:get_runtime_logs → level: ["error"]

# Supabase SQL execution
Supabase:execute_sql → project_id: whabaeatixtymbccwigu

# Stripe subscriptions
Stripe:list_subscriptions → status: "active"

# Test AI patterns locally
npm run test:ai-patterns
```

---

## API Versioning Convention
- **Existing** `/api/*` routes stay as-is (NO BREAKING CHANGES)
- **New public/mobile routes** → `/api/v1/`
- **Internal** (admin, webhooks, jobs, cron) → no version
- **Current v1:** `analytics/track`, `devices`, `notifications`

---

## v0.dev Rules (CRITICAL)
1. ✅ **ALWAYS audit existing files first** — don't duplicate
2. ❌ **NEVER modify `/api/*` routes** — breaking change
3. ✅ **Use exact paths:** `app/(narocnik)/dashboard/page.tsx`
4. ⚠️ **Table is `obrtnik_profiles` NOT `obrtniki`**
5. ✅ **Use Slovenian terms correctly** (naročnik, ponudba, povpraševanje)
6. ✅ **Check tier gates** before spawning PRO agents

---

## Environment Setup

```bash
# Node version
node 20.x (see .node-version, .nvmrc)

# Package manager
pnpm (preferred over npm)

# Install
pnpm install

# Run dev
pnpm dev

# Build
pnpm build

# Test
pnpm test
pnpm test:escrow
pnpm test:marketplace

# Lint
pnpm lint
```

---

## Observability Stack

| Component | Purpose |
|-----------|---------|
| **Sentry** | Error tracking (server + edge) |
| **Grafana Alloy** | Metrics collection |
| **Structured Logging** | JSON logs to Sentry/Loki |
| **Instrumentation** | Server & client-side tracing |

**Config files:**
- `sentry.server.config.ts` — Server error tracking
- `sentry.edge.config.ts` — Edge function errors
- `instrumentation.ts` — Server instrumentation
- `instrumentation-client.ts` — Client instrumentation
- `grafana-alloy/` — Observability config

---

## Deployment

**Platform:** Vercel

**Trigger:** 
- Auto-deploy on GitHub push to `main`
- Manual trigger via `.vercel-trigger` file

**Configuration:**
- `vercel.json` — Deployment settings
- Environment variables in Vercel dashboard
- Supabase, Stripe, OpenAI keys

**Preview:** Every PR gets a preview URL

---

## Testing

**Frameworks:**
- Jest (unit + integration)
- React Testing Library (component tests)

**Config:**
- `jest.config.cjs` — Main config
- `jest.config.escrow.cjs` — Escrow module tests
- `jest.config.marketplace.cjs` — Marketplace tests

**Run:**
```bash
pnpm test                    # All tests
pnpm test:watch             # Watch mode
pnpm test:escrow            # Escrow tests
pnpm test:marketplace       # Marketplace tests
```

---

*Last updated: May 2026*
*Advanced section added with comprehensive codebase structure*
