# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

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
| Framework | Next.js 16, App Router, TypeScript 5.7 |
| UI | React 19, shadcn/ui, Tailwind 3 |
| Database | Supabase PostgreSQL + RLS |
| Auth | Supabase Auth |
| Payments | Stripe (subscriptions + escrow) |
| AI | Anthropic Claude + Vercel AI SDK (`ai` 4.3) |
| Queue | Upstash QStash + Redis |
| Deploy | Vercel |
| Observability | Sentry, PostHog, LangSmith |

---

## Commands

```bash
pnpm dev                  # Start dev server
pnpm build                # Type-check + Next.js build (also deletes middleware.ts first!)
pnpm lint                 # TypeScript type-check only (tsc --noEmit)
pnpm test:unit            # Unit tests (jest, __tests__/unit/)
pnpm test:marketplace     # Marketplace integration tests
pnpm test:escrow          # Escrow tests
pnpm test:stripe          # Stripe integration tests
pnpm openapi:generate     # Re-generate docs/openapi.json
```

Run a single unit test file:
```bash
pnpm test:unit -- --testPathPattern='state-machine'
```

Deploy Supabase edge function:
```bash
pnpm deploy:resend-email
```

> **Important:** `build` script does `rm -f middleware.ts` before building. The actual middleware logic lives in `proxy.ts` (not `middleware.ts`). Never put logic in `middleware.ts`.

---

## Route Structure

### Public
```
/                         → Landing
/[category]/[city]        → SEO category+city pages (dynamic, crawler-cached)
/mojstri/[id]             → Public craftsman profile
/iskanje                  → Search
/cenik                    → Pricing
```

### Naročnik (Customer) — route group `app/(narocnik)/`
```
/dashboard                → Customer dashboard
/novo-povprasevanje       → Create new task
/povprasevanja/[id]       → Task detail + ponudbe
/sporocila                → Messages
/profil                   → Profile
/ocena/[taskId]           → Leave review
/moj-dom                  → Home maintenance log
/narocnina                → Subscription
```

### Obrtnik (Craftsman) — route group `app/(obrtnik)/obrtnik/`
```
/partner-dashboard        → Main craftsman dashboard
/obrtnik/povprasevanja    → Browse tasks
/obrtnik/ponudbe          → My offers
/obrtnik/sporocila        → Messages
/obrtnik/profil           → Profile
/obrtnik/narocnine        → Subscription
/obrtnik/portfolio        → Portfolio
/obrtnik/statistike       → Stats
/obrtnik/razpolozljivost  → Availability
```

### Auth
```
/prijava                  → Login (also handles post-login role redirect)
/registracija             → Register
/registracija-mojster     → Craftsman registration
/pozabljeno-geslo         → Password reset
```

### Admin — `app/admin/`
Protected by `admin_users` table (not `profiles.role`).

### API versioning convention
- Existing `/api/*` routes stay as-is (breaking changes)
- New public/mobile routes go under `/api/v1/`
- Internal routes (admin, webhooks, cron) stay unversioned

---

## Architecture

### Middleware (`proxy.ts`)
The file `proxy.ts` (not `middleware.ts`) exports `proxy()` and `config`. It handles:
- Bot/scanner blocking
- Canonical domain redirect (vercel.app → liftgo.net)
- Route protection by role (`narocnik`, `obrtnik`, `admin`)
- Post-login redirect based on role

### Supabase Clients
Two clients — always use the right one:
| Client | File | Key | Use |
|--------|------|-----|-----|
| Server (RLS) | `lib/supabase/server.ts` → `createClient()` | anon | API routes, Server Components |
| Admin (no RLS) | `lib/supabase-admin.ts` → `supabaseAdmin` | service_role | Admin ops, cron, webhooks |

Never put either client in a module-level global — always instantiate per-request.

### Data Access Layer (`lib/dal/`)
All DB queries go through DAL files (`povprasevanja.ts`, `obrtniki.ts`, `ponudbe.ts`, etc.). API routes call DAL functions, not Supabase directly.

### Service Layer (`lib/services/`)
Business logic above the DAL:
- `taskOrchestrator` — task lifecycle (create, status transitions, matching trigger)
- `matchingService` — partner-task matching
- `offerService` — ponudba creation + acceptance
- `paymentService` — Stripe payment intents + escrow
- `notificationService` — push + email notifications

### Liquidity Engine (`lib/marketplace/liquidityEngine.ts`)
Called when a new povprasevanje is created. Flow:
1. `matchPartnersForRequest()` — Smart Matching Agent scores partners (0–100, boosted by tier)
2. Creates `lead_assignments` ranked 1–5
3. Notifies rank-1 contractor immediately
4. Cron (`/api/cron/lead-response-sla`) escalates to next rank after `LEAD_SLA_HOURS=4`

Matching score breakdown: category (25) + proximity (25) + response speed (20) + rating (20) + activity (10), × subscription multiplier.

### State Machines (`lib/agent/state-machine/`)
Three XState-style guards enforce valid DB transitions:
- `escrowMachine` — escrow hold/capture/release/refund
- `inquiryMachine` — task: `draft → open → has_ponudbe → in_progress → completed / cancelled / expired`
- `offerMachine` — ponudba: pending → accepted / rejected / withdrawn

Use `assertTransition(resource, id, targetStatus)` before any status-changing DB write. Terminal states never transition.

### Event Bus + Outbox (`lib/events/`)
Pub/sub for task and payment lifecycle events. Events are:
1. Persisted to `event_outbox` table first (reliability)
2. Dispatched immediately to in-memory handlers (low latency)
3. Retried by cron (`/api/cron/event-processor`) if dispatch failed

Key events: `task.created`, `task.matched`, `task.accepted`, `task.completed`, `payment.released`, `offer.sent`.

### AI Pipeline (`lib/ai/orchestrator.ts`)
Main entry point: `executeAgent({ userId, agentType, userMessage, ... })`. Pipeline:
1. **Quota check** — `ai_usage_logs` table, enforced per tier/day
2. **RAG** — fetches relevant context from DB (`lib/ai/rag.ts`)
3. **Model routing** — `lib/model-router.ts`: Haiku for simple (≤8 words, no complex keywords), Sonnet for complex
4. **Tool calling loop** — up to `maxToolIterations` rounds with `AI_TOOLS`
5. **Usage logging** — cost tracked in `ai_usage_logs`

Agent types map to 4 core roles: `onboarding_assistant`, `provider_coach`, `payment_helper`, `support_agent`.

### Job Queue (`lib/jobs/queue.ts`)
Async side effects via Upstash QStash. Enqueue with `enqueue(jobType, payload)`. Workers at `/api/webhooks/` process jobs with automatic retries and exponential backoff.

### Guardrails (`lib/agent/guardrails/`)
Run before every tool execution in order:
1. Permissions (role + ownership)
2. Schema validation
3. Injection detection
4. Amount validation
5. Rate limiting

### Stripe (`lib/stripe/`)
- `webhooks.ts` — `constructStripeEvent()` tries multiple signing secrets (rotation support)
- `handlers/` — per-event-type handlers
- Webhook endpoint: `app/api/webhooks/stripe/route.ts`
- Idempotency: `isStripeEventProcessed(event.id)` checked before processing

### Cron Jobs (`app/api/cron/`)
Protected by `CRON_SECRET` header. Key jobs:
- `lead-response-sla` — escalate unresponded leads
- `escrow-auto-release` — auto-release after `ESCROW_AUTO_RELEASE_DAYS=7`
- `event-processor` — drain `event_outbox` table
- `sla-task-expiry`, `risk-check`, `detect-anomalies`, `weekly-provider-digest`

---

## Database Tables (key ones)
| Table | Purpose |
|-------|---------|
| `profiles` | All users (`role`: `narocnik`/`obrtnik`) |
| `obrtnik_profiles` | Craftsman detail (**NOT** `obrtniki`) |
| `povprasevanja` | Job requests |
| `ponudbe` | Offers/quotes |
| `sporocila` | Messages |
| `lead_assignments` | Ranked match results per task |
| `escrow_holds` / `escrow_transactions` | Payment escrow |
| `ai_usage_logs` | AI cost tracking + quota |
| `event_outbox` | Reliable event delivery |
| `admin_users` | Admin access (separate from `profiles`) |

### Povprasevanje fields
```
id, narocnik_id, category_id, status, lat, lng, location_city,
title, description, urgency, budget_min, budget_max,
created_at, published_at, accepted_at, completed_at, expires_at
```

---

## Key Files
```
proxy.ts                           → Middleware (NOT middleware.ts!)
lib/env.ts                         → All env vars with safe defaults
lib/supabase-admin.ts              → Admin client (bypasses RLS)
lib/supabase/server.ts             → Per-request server client (RLS enforced)
lib/agents/ai-router.ts            → Agent types, tier limits, model routing
lib/ai/orchestrator.ts             → Main AI execution pipeline
lib/marketplace/liquidityEngine.ts → Matching + lead distribution entry point
lib/agents/matching/smartMatchingAgent.ts → Scoring algorithm
lib/agent/state-machine/index.ts   → assertTransition() — use before status writes
lib/events/eventBus.ts             → Pub/sub with outbox pattern
lib/jobs/queue.ts                  → QStash job enqueue
lib/stripe/webhooks.ts             → Stripe event construction + idempotency
lib/services/index.ts              → Service layer exports
```

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
| narocnina | subscription |
| razpoložljivost | availability |

---

## Debugging Commands
```
Vercel:list_deployments → projectId: v0-liftgo-platform-concept, teamId: info-36187542s
Vercel:get_runtime_logs → level: ["error"]
Supabase:execute_sql → project_id: whabaeatixtymbccwigu
Stripe:list_subscriptions → status: "active"
GitHub LiftGO:github_get_file → path
GET /api/health → production health check
```

---

## v0.dev Rules
1. ALWAYS audit existing files first — never duplicate components
2. Use exact paths: `app/(narocnik)/dashboard/page.tsx`
3. Table is `obrtnik_profiles` NOT `obrtniki`
4. Obrtnik dashboard is at `/partner-dashboard` NOT `/obrtnik/dashboard`

---

*Last updated: May 2026*
