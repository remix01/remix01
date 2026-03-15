# Environment Variable Configuration

## Centralizirana konfiguracija: `/lib/env.ts`

Vse okoljske spremenljivke so mapirane v `/lib/env.ts`. Ta datoteka je **edini vir resnice** za env spremenljivke.

> **Opomba:** `lib/env.ts` uporablja enostavno mapiranje z `?? ''` privzetimi vrednostmi (brez Zod validacije).
> Aplikacija se ne sesuje ob manjkajočih spremenljivkah — namesto tega funkcije, ki potrebujejo neobstoječe vrednosti, vrnejo graceful fallback ali napako.

```typescript
import { env } from '@/lib/env'

// Pravilno:
const key = env.STRIPE_SECRET_KEY

// Narobe (direktna raba process.env — izogibaj se):
const key = process.env.STRIPE_SECRET_KEY
```

---

## Dostopne spremenljivke

| Spremenljivka | Namen | Obvezna |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase projekt URL | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon ključ | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (samo server) | ✅ |
| `STRIPE_SECRET_KEY` | Stripe secret (`sk_...`) | ✅ |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook podpis (`whsec_...`) | ✅ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public ključ (`pk_...`) | ✅ |
| `ANTHROPIC_API_KEY` | Claude AI API ključ | ✅ (chatbot) |
| `NEXT_PUBLIC_APP_URL` | Aplikacijski URL | ✅ |
| `QSTASH_TOKEN` | Upstash QStash token | Opcijsko |
| `QSTASH_CURRENT_SIGNING_KEY` | QStash podpisni ključ | Opcijsko |
| `QSTASH_NEXT_SIGNING_KEY` | QStash rotacijski ključ | Opcijsko |
| `RESEND_API_KEY` | Resend e-pošta API | Opcijsko |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | Opcijsko |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push obvestila (VAPID) | Opcijsko |
| `VAPID_PRIVATE_KEY` | Push obvestila (VAPID) | Opcijsko |
| `VAPID_SUBJECT` | Push obvestila kontakt | Opcijsko |
| `LANGFUSE_PUBLIC_KEY` | AI tracing | Opcijsko |
| `LANGFUSE_SECRET_KEY` | AI tracing | Opcijsko |
| `LANGFUSE_HOST` | Langfuse strežnik | Opcijsko |
| `ADMIN_ALERT_EMAIL` | Admin obvestila | Opcijsko |

---

## Helper funkcije

```typescript
import { hasStripe, hasQStash, hasLangfuse, hasAdminEmail } from '@/lib/env'

if (hasStripe()) {
  // Stripe je konfiguriran
}
```

---

## Znana odstopanja

Naslednje datoteke še direktno kličejo `process.env` (postopna migracija):
- `lib/agent/liftgo-agent.ts` — `process.env.ANTHROPIC_API_KEY`
- `lib/agent/orchestrator.ts` — `process.env.ANTHROPIC_API_KEY`
- `lib/email/sender.ts` — `process.env.RESEND_API_KEY`
- `lib/mcp/payments.ts` — `process.env.STRIPE_SECRET_KEY`
- Nekatere API route datoteke — `process.env.RESEND_API_KEY`

Ker `lib/env.ts` mapira iste vrednosti, je funkcionalna razlika **minimalna** — obe poti berejo iz `process.env`. Priporočena migracija za konsistentnost.
