# CLAUDE.md — LiftGO Codebase Guide

This file provides AI assistants with the essential context needed to navigate and contribute to the LiftGO codebase effectively.

---

## Project Overview

**LiftGO** is a marketplace platform connecting customers with verified professional craftsmen and service providers in Slovenia. Core capabilities:

- Job posting and AI-powered craftsman matching
- Escrow payment system (Stripe-backed)
- Anti-bypass communication monitoring (Twilio)
- Role-based dashboards for customers, craftsmen, and admins
- AI agents for intelligent automation (matching, dispute resolution, notifications)

**Primary language of the domain:** Slovenian (routes, variable names, and UI labels mix Slovenian and English).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Server Actions) |
| Language | TypeScript 5.7 (strict mode) |
| UI | React 19, shadcn/ui, Radix UI, Tailwind CSS 3 |
| Database | PostgreSQL via Supabase |
| ORM | Supabase SDK directly (Prisma is deprecated—schema kept for reference only) |
| Auth | Supabase Auth (OAuth + email/password) |
| Payments | Stripe v3 + custom escrow logic |
| AI | Anthropic Claude SDK (multi-agent system) |
| Job Queue | Upstash QStash |
| Cache | Upstash Redis |
| Messaging | Twilio Conversations |
| Email | Resend |
| Push Notifications | Web Push API (VAPID) |
| Observability | Langfuse (LLM tracing) |
| Deployment | Vercel (serverless) |
| Package Manager | pnpm 9 |

---

## Repository Structure

```
remix01/
├── app/                    # Next.js App Router
│   ├── api/                # 100+ REST API routes (organized by domain)
│   ├── admin/              # Admin dashboard
│   ├── (auth)/             # Login / signup pages
│   ├── (narocnik)/         # Customer dashboard (Slovenian: naročnik = customer)
│   ├── (obrtnik)/          # Craftsman dashboard (Slovenian: obrtnik = craftsman)
│   ├── (public)/           # Public landing pages
│   ├── blog/               # Blog section
│   ├── mojstri/            # Craftsman directory (Slovenian: mojster = master craftsman)
│   └── partner-dashboard/  # Partner management
├── lib/                    # Core business logic
│   ├── agents/             # AI agent system (orchestrator + 5 specialized agents)
│   ├── jobs/               # Upstash QStash job queue workers
│   ├── state-machine/      # Explicit state machines (inquiry, offer, escrow)
│   ├── stripe/             # Stripe helpers
│   ├── loyalty/            # Commission & tier calculation
│   ├── riskScoring/        # Anti-bypass violation detection
│   ├── supabase/           # Supabase client factories
│   ├── auth/               # Auth utilities
│   ├── notifications/      # Push + Twilio + Slack notifications
│   ├── email/              # Resend email service
│   ├── observability/      # Langfuse LLM tracing
│   └── [20+ other utilities]
├── components/             # React components (shadcn/ui based)
│   ├── ui/                 # Base UI primitives
│   ├── admin/              # Admin-specific components
│   ├── chat/               # Claude-style chat UI
│   ├── jobs/               # Job management UI
│   └── [8+ other domains]
├── __tests__/              # Jest test suites
│   ├── escrow/             # Escrow payment flow tests
│   ├── unit/               # Unit tests (permissions, state-machine, guardrails)
│   ├── integration/        # Full-flow integration tests
│   ├── performance/        # Load & latency benchmarks
│   └── security/           # Security tests
├── prisma/                 # DEPRECATED ORM schema (kept for reference)
│   └── schema.prisma       # 14+ models — reference only, not active
├── supabase/
│   └── migrations/         # SQL migration files
├── hooks/                  # React hooks
├── types/                  # Shared TypeScript type definitions
├── docs/                   # Feature documentation
├── scripts/                # Build/utility scripts
└── public/                 # Static assets
```

---

## Key Conventions

### TypeScript
- **Strict mode** is enabled. Never use `any` unless absolutely necessary.
- All database operations go through the Supabase SDK — **do not use Prisma** (it is deprecated).
- Path aliases: use `@/*` for imports (maps to project root).
- Type definitions live in `types/` for shared types.

### Component Patterns
- UI primitives are in `components/ui/` (shadcn/ui wrappers).
- Domain components are grouped by feature (e.g., `components/chat/`, `components/jobs/`).
- All forms use **React Hook Form + Zod** for validation.

### Database Access
- **Server-side admin operations:** use `supabaseAdmin` from `lib/supabase-admin.ts`.
- **Client-side access:** use `createClient()` from `lib/supabase/client.ts`.
- **Server component / server action access:** use `createClient()` from `lib/supabase/server.ts`.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

### API Routes
- All API routes live under `app/api/`.
- Cron jobs are protected by verifying `Authorization: Bearer ${CRON_SECRET}`.
- Webhooks verify signatures (Stripe, Twilio, QStash) — never skip verification.
- Use standard Next.js `NextRequest` / `NextResponse` patterns.

### Authentication & Authorization
- Middleware at `proxy.ts` enforces route-level protection.
- Role hierarchy: `SUPER_ADMIN > MODERATOR > OPERATER > CRAFTWORKER > CUSTOMER`.
- Admin roles come from the `Zaposleni` table; user roles come from the `User` table.
- Protected route groups: `/admin` (super admin), `/obrtnik` (craftsman), `/narocnik` & `/dashboard` (customer).

### Payments
- All payments flow through the escrow system in `lib/escrow.ts`.
- States: `UNPAID → HELD → RELEASED | REFUNDED`.
- Every financial event must be written to the audit log via `lib/audit.ts`.
- Commission is calculated in `lib/loyalty/` — **never hardcode fee percentages**.

### AI Agents
Located in `lib/agents/`. Architecture:
1. `ai-router.ts` — determines which agent handles a request.
2. `orchestrator-agent/` — coordinates multi-agent workflows.
3. `matching/` — ML-based job-to-craftsman matching.
4. `inquiry-agent/` — processes incoming customer inquiries.
5. `dispute-agent/` — mediates disputes between parties.
6. `escrow-agent/` — manages payment lifecycle decisions.
7. `notify-agent/` — dispatches cross-channel notifications.

All agent calls must be traced via Langfuse (`lib/observability/`).

### State Machines
Business workflows use explicit state machines in `lib/state-machine/`:
- `inquiryMachine.ts` — Customer inquiry lifecycle.
- `offerMachine.ts` — Offer/quote lifecycle.
- `escrowMachine.ts` — Payment escrow states.

Always transition via the state machine — never mutate status fields directly.

### Styling
- **Tailwind CSS** for all styling (no CSS modules or raw CSS unless in `styles/`).
- Dark mode is supported; use `dark:` variants.
- Custom theme tokens are defined in `tailwind.config.ts`.
- Use `clsx` / `cn()` utility for conditional class names.

### Slovenian Domain Vocabulary
| Slovenian | English |
|-----------|---------|
| naročnik | customer |
| obrtnik / mojster | craftsman / service provider |
| povprasevanje | inquiry / request |
| zaposleni | employee (admin staff) |

---

## Development Workflows

### Setup
```bash
pnpm install
cp .env.example .env.local   # Fill in required keys
pnpm dev                      # Start dev server on localhost:3000
```

### Common Commands
```bash
pnpm dev          # Development server
pnpm build        # Production build
pnpm start        # Production server
pnpm lint         # ESLint (next lint)
```

### Testing
```bash
pnpm test:unit     # Unit tests
pnpm test:e2e      # End-to-end escrow flow
pnpm test:stripe   # Stripe integration tests
pnpm test:escrow   # All escrow-related tests
```

**Coverage thresholds** (enforced by Jest): 80% lines, 80% functions, 70% branches, 80% statements.

### Database Migrations
- Migrations live in `supabase/migrations/` as plain SQL files.
- Name format: `YYYYMMDD_description.sql`.
- Apply via Supabase dashboard or CLI: `supabase db push`.

---

## Environment Variables

Key variables (see `.env.example` for the full list):

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude AI agents |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side DB admin (never expose to client) |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anon key |
| `STRIPE_SECRET_KEY` | Stripe server-side operations |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature verification |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client-side Stripe |
| `QSTASH_TOKEN` | Upstash job queue auth |
| `CRON_SECRET` | Protects cron API routes |
| `RESEND_API_KEY` | Email delivery |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Messaging |
| `LANGFUSE_SECRET_KEY` | LLM observability |
| `NEXT_PUBLIC_APP_URL` | Base URL of the deployed app |

---

## Deployment

- **Platform:** Vercel (serverless).
- **Cron jobs** defined in `vercel.json` (6 jobs: event processor, health sweep, risk checks, tier upgrades, escrow auto-release, notification sweep).
- Build errors are currently suppressed (`ignoreBuildErrors: true` in `next.config.ts`) — fix TypeScript errors rather than relying on this.
- Turbopack is enabled for faster local development builds.

---

## Security Considerations

- All webhook endpoints **verify signatures** — never bypass.
- Cron endpoints check `CRON_SECRET` bearer token.
- Row-Level Security (RLS) is enabled in Supabase — trust the database policies.
- Anti-bypass system (`lib/riskScoring/`) detects attempts to share contact info outside the platform.
- Admin routes are protected by both middleware and server-side role checks — always double-check authorization.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — use only in server-side code where required.

---

## Architecture Decision Records

1. **Prisma → Supabase SDK migration:** Prisma is deprecated. `schema.prisma` exists for reference only. All new DB work uses Supabase SDK.
2. **State machines over ad-hoc status updates:** Business entity lifecycle (jobs, offers, escrow) is managed via explicit state machines to prevent invalid transitions.
3. **Multi-agent AI architecture:** Specialized agents with a central orchestrator allow each domain (matching, disputes, notifications) to evolve independently.
4. **Escrow-first payments:** All payments flow through escrow before release, providing consumer protection and enabling dispute resolution.
5. **Twilio for messaging:** Phone number masking via Twilio Conversations proxy prevents off-platform contact until terms are satisfied.
