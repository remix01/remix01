# GitHub Secrets Setup — LiftGO CI/CD

## Navigation
**GitHub → Settings → Secrets and variables → Actions → New repository secret**

---

## Priority Tiers

| 🔴 Critical | CI pipeline fails without these |
| 🟡 Required | Runtime features break without these |
| 🟢 Optional | Monitoring / analytics / fallbacks |

---

## 🔴 TIER 1 — Critical (CI must pass)

Add these first. Without them `ci.yml` build and type-check jobs fail.

| Secret Name | Value | Where to find |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://whabaeatixtymbccwigu.supabase.co` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase → Project Settings → API → **anon/public** key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Stripe → Developers → API keys → Publishable key |
| `SENTRY_AUTH_TOKEN` | `sntrys_...` | sentry.io → Settings → Auth Tokens → Create new token (scope: `project:releases`) |

> **Note:** `NEXT_PUBLIC_SUPABASE_URL` is already known — `https://whabaeatixtymbccwigu.supabase.co`

---

## 🔴 TIER 2 — Supabase (migrations workflow)

Required for `supabase-deploy.yml` to push migrations to production.

| Secret Name | Value | Where to find |
|---|---|---|
| `SUPABASE_PROJECT_ID` | `whabaeatixtymbccwigu` | Already known — copy/paste this value |
| `SUPABASE_ACCESS_TOKEN` | `sbp_...` | supabase.com → Account (top-right avatar) → Access Tokens → Generate new token |
| `SUPABASE_DB_URL` | `postgresql://postgres:[PASSWORD]@db.whabaeatixtymbccwigu.supabase.co:5432/postgres` | Supabase → Project Settings → Database → Connection string → URI |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase → Project Settings → API → **service_role** key (click Reveal) |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — never expose client-side.

---

## 🟡 TIER 3 — Stripe (payments runtime)

| Secret Name | Value | Where to find |
|---|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_...` | Stripe → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Stripe → Developers → Webhooks → Select endpoint → Signing secret |
| `STRIPE_START_PRODUCT_ID` | `prod_U7z9Ymkbh2zRAW` | Already known (CLAUDE.md) |
| `STRIPE_PRO_PRODUCT_ID` | `prod_SpS7ixowByASns` | Already known (CLAUDE.md) |

---

## 🟡 TIER 4 — AI & Queue (core features)

| Secret Name | Value | Where to find |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | console.anthropic.com → API Keys |
| `QSTASH_TOKEN` | `eyJ...` | console.upstash.com → QStash → Dashboard → QSTASH_TOKEN |
| `QSTASH_CURRENT_SIGNING_KEY` | `sig_...` | console.upstash.com → QStash → Dashboard → QSTASH_CURRENT_SIGNING_KEY |
| `QSTASH_NEXT_SIGNING_KEY` | `sig_...` | console.upstash.com → QStash → Dashboard → QSTASH_NEXT_SIGNING_KEY |
| `UPSTASH_REDIS_REST_URL` | `https://...upstash.io` | console.upstash.com → Redis → REST API → UPSTASH_REDIS_REST_URL |
| `UPSTASH_REDIS_REST_TOKEN` | `AX...` | console.upstash.com → Redis → REST API → UPSTASH_REDIS_REST_TOKEN |

---

## 🟡 TIER 5 — Email & Notifications

| Secret Name | Value | Where to find |
|---|---|---|
| `RESEND_API_KEY` | `re_...` | resend.com → API Keys → Create API Key |
| `CRON_SECRET` | 32+ char random string | Generate: `openssl rand -hex 32` |
| `NEXTAUTH_SECRET` | 32+ char random string | Generate: `openssl rand -base64 32` |
| `SLACK_WEBHOOK_URL` | `https://hooks.slack.com/...` | Slack → Apps → Incoming Webhooks (optional) |

---

## 🟡 TIER 6 — VAPID Push Notifications

Generate keys once with: `npx web-push generate-vapid-keys`

| Secret Name | Value |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key from command above |
| `VAPID_PRIVATE_KEY` | Private key from command above |

---

## 🟢 TIER 7 — Monitoring & Analytics (optional)

| Secret Name | Value | Where to find |
|---|---|---|
| `SENTRY_DSN` | `https://...@o0.ingest.sentry.io/0` | sentry.io → Project Settings → Client Keys (DSN) |
| `NEXT_PUBLIC_SENTRY_DSN` | Same as above | Same |
| `SENTRY_ORG` | `liftgo` | Your Sentry org slug |
| `SENTRY_PROJECT` | `liftgo-nextjs` | Your Sentry project slug |
| `NEXT_PUBLIC_POSTHOG_KEY` | `phc_...` | posthog.com → Project settings → Project API Key |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://eu.i.posthog.com` | EU cloud endpoint |
| `NEXT_PUBLIC_GA_ID` | `G-XXXXXXXXXX` | Google Analytics → Admin → Data Streams |

---

## 🟢 TIER 8 — Twilio (SMS/Voice — if enabled)

| Secret Name | Value | Where to find |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | `AC...` | console.twilio.com → Account Info |
| `TWILIO_AUTH_TOKEN` | `...` | console.twilio.com → Account Info → View |
| `TWILIO_CONVERSATIONS_SERVICE_SID` | `IS...` | Twilio → Conversations → Services |

---

## 🟢 TIER 9 — Google APIs (if enabled)

| Secret Name | Value | Where to find |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `...apps.googleusercontent.com` | Google Cloud Console → Credentials → OAuth 2.0 |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-...` | Google Cloud Console → Credentials |
| `GOOGLE_MAPS_API_KEY` | `AIza...` | Google Cloud Console → APIs & Services → Credentials |

---

## GitHub Environment Setup (for Supabase Deploy)

The `supabase-deploy.yml` workflow requires a `production` environment with manual approval.

1. GitHub repo → **Settings → Environments → New environment**
2. Name: `production`
3. Configure protection rules:
   - ✅ Required reviewers: add `@remix01`
   - ✅ Deployment branches: select `main` only
4. Save protection rules

---

## Vercel Environment Variables

Vercel handles deployment separately from GitHub Actions. Mirror these secrets in Vercel:

1. Vercel Dashboard → **v0-liftgo-platform-concept** → Settings → Environment Variables
2. Add all TIER 1–6 secrets as **Production** environment variables
3. For `NEXT_PUBLIC_*` variables — also add to **Preview** environment

---

## Branch Protection Rules (recommended)

GitHub repo → **Settings → Branches → Add rule**

```
Branch name pattern: main

✅ Require a pull request before merging
   ✅ Require approvals: 1
   ✅ Dismiss stale reviews when new commits are pushed

✅ Require status checks to pass before merging
   ✅ Require branches to be up to date
   Required checks:
     - Type Check
     - Tests
     - Build
     - Analyze (javascript-typescript)

✅ Restrict who can push to matching branches
   → Add: remix01

✅ Do not allow bypassing the above settings
```

---

## Quick Checklist

```
TIER 1 — CI Critical
[ ] NEXT_PUBLIC_SUPABASE_URL
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
[ ] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
[ ] SENTRY_AUTH_TOKEN

TIER 2 — Supabase Migrations
[ ] SUPABASE_PROJECT_ID
[ ] SUPABASE_ACCESS_TOKEN
[ ] SUPABASE_DB_URL
[ ] SUPABASE_SERVICE_ROLE_KEY

TIER 3 — Stripe
[ ] STRIPE_SECRET_KEY
[ ] STRIPE_WEBHOOK_SECRET

TIER 4 — AI & Queue
[ ] ANTHROPIC_API_KEY
[ ] QSTASH_TOKEN
[ ] QSTASH_CURRENT_SIGNING_KEY
[ ] QSTASH_NEXT_SIGNING_KEY
[ ] UPSTASH_REDIS_REST_URL
[ ] UPSTASH_REDIS_REST_TOKEN

TIER 5 — Email & Auth
[ ] RESEND_API_KEY
[ ] CRON_SECRET
[ ] NEXTAUTH_SECRET

ENVIRONMENTS
[ ] production environment created with approval gate
[ ] branch protection rules on main
[ ] Vercel env vars mirrored
```

---

*Project ID: `whabaeatixtymbccwigu` | Team: `info-36187542s` | Repo: `remix01/remix01`*
