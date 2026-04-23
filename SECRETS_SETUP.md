# GitHub Secrets Setup — LiftGO

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

## Required Secrets

### Supabase
| Secret | Where to find |
|--------|--------------|
| `SUPABASE_PROJECT_ID` | Supabase dashboard → Project Settings → General → Reference ID |
| `SUPABASE_ACCESS_TOKEN` | supabase.com → Account → Access Tokens |
| `SUPABASE_DB_URL` | Supabase → Project Settings → Database → Connection string (URI) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key |

### Stripe
| Secret | Where to find |
|--------|--------------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys → Publishable key |

### Anthropic
| Secret | Where to find |
|--------|--------------|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

### Upstash
| Secret | Where to find |
|--------|--------------|
| `UPSTASH_REDIS_REST_URL` | Upstash Console → Redis → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → Redis → REST API |
| `QSTASH_TOKEN` | Upstash Console → QStash |

### Sentry (optional)
| Secret | Where to find |
|--------|--------------|
| `SENTRY_AUTH_TOKEN` | sentry.io → Settings → Auth Tokens |
| `SENTRY_DSN` | sentry.io → Project → Settings → SDK Setup |

## GitHub Environments

For the `supabase-deploy.yml` workflow, create a **production** environment:

1. GitHub repo → Settings → Environments → New environment
2. Name: `production`
3. Add protection rules:
   - Required reviewers: `@remix01`
   - Deployment branches: `main` only

## Vercel Integration

The Vercel GitHub App handles deployment automatically. Ensure:
- Vercel project connected to this GitHub repo
- Environment variables set in Vercel dashboard (mirror the secrets above)
