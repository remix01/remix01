# Claude Code — Quick Reference (LiftGO)

## Start / Auth
```bash
claude                    # start
claude auth login         # authenticate
claude doctor             # diagnose
claude --version          # version
```

## One-shot Commands
```bash
claude "fix TypeScript error in lib/agents/ai-router.ts"
claude "write a test for the acceptPonudba function"
claude "explain how proxy.ts middleware works"
claude --continue         # resume last session
```

## Slash Commands
```
/init              Re-generate CLAUDE.md from codebase
/review            Review branch changes
/security-review   Security audit of pending changes
/simplify          Refactor & quality check
```

## MCP Servers (ask Claude directly)
```
"check Sentry errors"              → sentry MCP
"show tasks table schema"          → supabase MCP
"list active Stripe subs"          → stripe MCP
"check Redis queue depth"          → upstash MCP
"latest Vercel deployment"         → vercel MCP
"list recent email sends"          → resend MCP
```

---

## LiftGO Key Paths

| What | Path |
|------|------|
| Middleware | `proxy.ts` (NOT middleware.ts) |
| AI routing | `lib/agents/ai-router.ts` |
| State machine | `lib/guards/state-machine-guard.ts` |
| Stripe webhooks | `lib/stripe/webhooks.ts` |
| Supabase admin | `lib/supabase/admin.ts` |
| Naročnik dashboard | `app/(narocnik)/dashboard/page.tsx` |
| Obrtnik dashboard | `app/(obrtnik)/dashboard/page.tsx` |
| New API routes | `app/api/v1/` |

## Slovenian Terms
```
naročnik   = customer       povpraševanje = task/job request
obrtnik    = craftsman      ponudba       = offer/quote
prijava    = login          sporočilo     = message
ocena      = review
```

## Task Lifecycle
```
draft → open → has_ponudbe → in_progress → completed
                   ↓
              cancelled / expired
```

## AI Agents by Tier
```
START tier:  work_description · offer_comparison · scheduling_assistant
PRO tier:    quote_generator · materials_agent · video_diagnosis · job_summary
```

## DB Tables
```
profiles          obrtnik_profiles (NOT obrtniki!)
tasks             ponudbe
sporocila         ai_usage_logs
```

## API Convention
```
New public routes:   /api/v1/...
Internal/admin:      /api/...  (no version)
```

## GitHub Actions Status
```
ci.yml                    → Type Check · Tests · Build · OpenAPI
pr-validation.yml         → Title lint · Auto-label · Size check
claude-code-validation.yml→ Type safety · Secrets scan · RLS check · API versioning
codeql-analysis.yml       → Security · Dependency review
supabase-deploy.yml       → DB migrations → production
```

## Secrets Sync (one command)
```bash
./scripts/sync-vercel-to-github-secrets.sh --dry-run  # preview
./scripts/sync-vercel-to-github-secrets.sh             # apply
```

## Quick Fixes
```bash
pnpm lint              # type check
pnpm test:unit         # unit tests
pnpm build             # build check
pnpm openapi:check     # OpenAPI drift
```
