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
| AI | Anthropic Claude (7 agents) |
| Queue | Upstash QStash + Redis |
| Deploy | Vercel |

---

## Database Tables
| Table | Purpose |
|-------|---------|
| `profiles` | All users |
| `obrtnik_profiles` | Craftsmen (**NE** `obrtniki`!) |
| `tasks` | Job requests (povpraševanja) |
| `ponudbe` | Offers/quotes |
| `sporocila` | Messages |
| `ai_usage_logs` | AI cost tracking |

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
4. **AI** — 7 agents, tier-gated (START: 10/day, PRO: 100/day)
5. **Stripe** — Subscriptions + webhooks
6. **Async** — XState + QStash
7. **Observability** — Structured logging
8. **DevOps** — GitHub → Vercel auto-deploy

---

## Key Files
```
proxy.ts                    → Middleware (NOT middleware.ts!)
lib/agents/ai-router.ts     → AI agent routing
lib/guards/state-machine-guard.ts → State transitions
lib/stripe/webhooks.ts      → Stripe handlers
lib/supabase/admin.ts       → Admin client
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

---

## Debugging Commands
```
Vercel:list_deployments → projectId: v0-liftgo-platform-concept, teamId: info-36187542s
Vercel:get_runtime_logs → level: ["error"]
Supabase:execute_sql → project_id: whabaeatixtymbccwigu
Stripe:list_subscriptions → status: "active"
GitHub LiftGO:github_get_file → path
```

---

## v0.dev Rules
1. ALWAYS audit existing files first
2. NEVER duplicate components
3. ALWAYS use exact paths: `app/(narocnik)/dashboard/page.tsx`
4. Table is `obrtnik_profiles` NOT `obrtniki`

---

*Last updated: March 2025*
