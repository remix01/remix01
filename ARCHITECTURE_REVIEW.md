# LiftGO — Architecture, Revenue & Growth Review
**Author:** System Architecture Review
**Project:** LiftGO Marketplace
**Date:** 2026
**Status:** Living document — updated with implementation state

---

## TABLE OF CONTENTS
1. [Project Overview](#1-project-overview)
2. [Critical Fixes](#2-critical-fixes)
3. [Database Architecture](#3-database-architecture)
4. [Marketplace Features](#4-marketplace-features)
5. [AI System Improvements](#5-ai-system-improvements)
6. [Monetization Strategy](#6-monetization-strategy)
7. [Growth Strategy](#7-growth-strategy)
8. [Security](#8-security)
9. [Monitoring & Logging](#9-monitoring--logging)
10. [Performance](#10-performance)
11. [Infrastructure Roadmap](#11-infrastructure-roadmap)
12. [Success Metrics](#12-success-metrics)

---

## 1. PROJECT OVERVIEW

LiftGO je marketplace platforma za povezovanje **naročnikov** (customers) in **obrtnikov** (partners).

### Glavni flow
```
1. Naročnik odda povpraševanje
2. Mojstri pošljejo ponudbe
3. Naročnik izbere ponudbo
4. Izvede se delo (Escrow sistem zadrži sredstva)
5. Sistem sprosti plačilo + zahteva review
```

### Tech stack
| Komponenta   | Tehnologija              |
|-------------|--------------------------|
| Frontend    | Next.js (App Router)     |
| Backend     | Next.js API Routes       |
| Baza        | Supabase (PostgreSQL)    |
| Plačila     | Stripe (Escrow + Webhooks) |
| AI          | Claude / AI Orchestrator |
| Real-time   | Supabase Realtime        |
| Hosting     | Vercel / Cloudflare      |

---

## 2. CRITICAL FIXES

### 2.1 Stripe Webhook — Table Mismatch ⚠️ NEEDS FIX

**Problem:**
Webhook (`app/api/webhooks/stripe/route.ts`) posodablja `obrtnik_profiles`, vendar AI sistem bere subscription tier iz `profiles`. To pomeni:
- Obrtnik kupi PRO
- AI sistem še vedno vidi START plan

**Trenutna koda (webhook):**
```typescript
.from('obrtnik_profiles')
.update({ subscription_tier: 'pro' })
```

**Rešitev — Single Source of Truth:**
Webhook mora posodabljati OBE tabeli, ali pa mora biti definirana ena master tabela.

```typescript
// Možnost A: posodobi obe tabeli atomarno
await supabaseAdmin.from('obrtnik_profiles').update({ subscription_tier: tier }).eq(...)
await supabaseAdmin.from('profiles').update({ subscription_tier: tier }).eq(...)

// Možnost B: profiles je master, obrtnik_profiles bere iz profiles (JOIN / view)
```

**Priporočena rešitev:** `profiles` je master tabela. `obrtnik_profiles` shranjuje le obrtnik-specifične podatke (portfolio, kategorije, lokacija). Subscription podatki so samo v `profiles`.

---

### 2.2 Stripe Price ID Validation ⚠️ NEEDS FIX

**Problem:**
Webhook uporablja `subscription.metadata?.plan` za določanje tipa plana. Metadata se lahko pokvari ali manjka.

**Trenutna koda:**
```typescript
const plan = subscription.metadata?.plan || 'START'
subscription_tier: plan === 'PRO' ? 'pro' : 'start'
```

**Boljša rešitev — Price ID kot source of truth:**
```typescript
import { STRIPE_PRODUCTS } from '@/lib/stripe/config'

const priceId = subscription.items.data[0]?.price.id
let subscription_tier: 'start' | 'plus' | 'pro' = 'start'

if (priceId === STRIPE_PRODUCTS.PRO.priceId) {
  subscription_tier = 'pro'
} else if (priceId === STRIPE_PRODUCTS.PLUS?.priceId) {
  subscription_tier = 'plus'
}
```

---

### 2.3 Add Client Reference ID ⚠️ NEEDS FIX

Checkout session mora vključevati `client_reference_id`, da webhook enostavno najde uporabnika brez lookup po `stripe_customer_id`.

**V `app/api/stripe/create-checkout/route.ts`:**
```typescript
const session = await stripe.checkout.sessions.create({
  client_reference_id: user.id,   // ← DODATI
  customer_email: user.email,
  // ...
})
```

**V webhookov:**
```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session
  const userId = session.client_reference_id  // direkten lookup
  // posodobi profiles kjer id = userId
}
```

---

## 3. DATABASE ARCHITECTURE

### 3.1 Profiles Table (master)

```sql
CREATE TABLE profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users,
  email                 TEXT UNIQUE NOT NULL,
  full_name             TEXT,
  subscription_tier     TEXT DEFAULT 'start' CHECK (subscription_tier IN ('start', 'plus', 'pro')),
  stripe_customer_id    TEXT UNIQUE,
  stripe_subscription_id TEXT,
  ai_messages_used_today INTEGER DEFAULT 0,
  ai_total_cost_usd     DECIMAL(10,4) DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 Marketplace Tables

```sql
-- Povpraševanja naročnikov
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES profiles(id),
  category    TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','completed','cancelled')),
  location    TEXT,
  budget_min  INTEGER,   -- v centih
  budget_max  INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Ponudbe obrtnikov
CREATE TABLE offers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID REFERENCES tasks(id),
  partner_id UUID REFERENCES profiles(id),
  price      INTEGER NOT NULL,  -- v centih
  message    TEXT,
  status     TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID REFERENCES tasks(id) UNIQUE,
  reviewer_id UUID REFERENCES profiles(id),
  partner_id  UUID REFERENCES profiles(id),
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio slike
CREATE TABLE portfolio_images (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID REFERENCES profiles(id),
  url         TEXT NOT NULL,
  caption     TEXT,
  category    TEXT,
  is_before   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Indeksi (Performance)

```sql
CREATE INDEX idx_tasks_customer_id ON tasks(customer_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_offers_task_id ON offers(task_id);
CREATE INDEX idx_offers_partner_id ON offers(partner_id);
CREATE INDEX idx_reviews_partner_id ON reviews(partner_id);
```

---

## 4. MARKETPLACE FEATURES

### 4.1 Mojstri Katalog `/mojstri` — 🟡 PARTIAL

Obstoječa stran `/mojstri/[id]` prikazuje posameznega mojstra.
**Manjka:** seznam z filtri.

**Dodati filtre:**
- Kategorija (vodovodar, elektrikar, pleskár...)
- Lokacija (Ljubljana, Maribor, ...)
- Min. rating (4+, 4.5+)
- Cena (razpon)
- Razpoložljivost

**URL primer:** `/mojstri?kategorija=vodovodar&lokacija=Ljubljana&rating=4`

---

### 4.2 Portfolio za Obrtnike — 🟢 IMPLEMENTED

Dokument `PORTFOLIO_MANAGEMENT_COMPLETE.md` kaže, da je portfolio implementiran.
Vključuje: slike projektov, before/after galerija, opisi.

---

### 4.3 Job Timeline / Lifecycle — 🟡 PARTIAL

State machine je implementiran (`lib/agent/state-machine/`).
**Manjka:** vizualni UI prikaz lifecycle za naročnika.

```
[Povpraševanje] → [Ponudbe] → [Izbrana ponudba] → [Delo v teku] → [Zaključeno] → [Review]
```

---

### 4.4 Chat Sistem — 🟢 IMPLEMENTED

Real-time sistem implementiran (`REALTIME_SYSTEM_COMPLETE.md`).
Supabase Realtime za komunikacijo customer ↔ partner.

---

### 4.5 Instant Match Suggestions — 🔴 TODO

Ko naročnik odda povpraševanje, AI predlaga top 5 partnerjev.

**Algoritem:**
```
score = (rating × 0.4) + (distance_score × 0.3) + (availability × 0.2) + (category_match × 0.1)
```

---

## 5. AI SYSTEM IMPROVEMENTS

Trenutni AI sistem deluje kot chat assistant.

### 5.1 AI Job Categorization — 🔴 TODO

```typescript
// Input: "Pušča voda v kopalnici"
// Output: { category: "vodovodar", urgency: "high", estimatedBudget: "80-200€" }

async function categorizeJob(description: string) {
  const response = await ai.complete({
    prompt: `Kategoriziraj povpraševanje: "${description}"
             Vrni JSON: { category, urgency, keywords }
             Kategorije: vodovodar, elektrikar, pleskár, zidar, mizar, kleparji`
  })
  return JSON.parse(response)
}
```

### 5.2 AI Price Estimation — 🔴 TODO

```typescript
// Input: "Pleskanje stanovanja 70m2, Ljubljana"
// Output: { min: 600, max: 1200, currency: "EUR", confidence: "medium" }
```

**Cenovni referenčni podatki (Slovenija 2026):**

| Storitev                | Min  | Max   |
|------------------------|------|-------|
| Pleskanje (m²)         | 8€   | 18€   |
| Vodovod (ura)          | 50€  | 90€   |
| Elektrika (ura)        | 45€  | 80€   |
| Tlakovanje (m²)        | 30€  | 80€   |
| Ogrevanje (servis)     | 80€  | 200€  |

### 5.3 AI Partner Matching — 🔴 TODO

```typescript
async function matchPartners(task: Task): Promise<Partner[]> {
  const partners = await getActivePartners(task.category, task.location)
  // AI rangira po: rating, odzivnem času, reviews, distance
  return partners.sort(byAIScore).slice(0, 5)
}
```

---

## 6. MONETIZATION STRATEGY

### 6.1 Subscription Plani

| Plan  | Cena      | Provizija | Status         |
|-------|-----------|-----------|----------------|
| START | 0€/mesec  | 10%       | 🟢 Implemented |
| PLUS  | 19€/mesec | 7%        | 🔴 TODO        |
| PRO   | 29€/mesec | 5%        | 🟢 Implemented |

**Dodati PLUS plan** v `lib/stripe/config.ts`:
```typescript
PLUS: {
  productId: 'prod_XXXXX',       // ustvariti v Stripe Dashboard
  priceId: 'price_XXXXX',
  price: 19,
  commission: 7,
  label: 'PLUS',
  features: ['7% provizija', 'Portfolio', 'Priority support', 'Analytics basic']
}
```

### 6.2 Featured Listings — 🔴 TODO

Top pozicija v iskanju / katalogu mojstrov.

- **Cena:** 49€/mesec
- **Implementacija:** `featured_until TIMESTAMPTZ` kolona v `obrtnik_profiles`
- **UI:** Badge "Priporočeno" + višja pozicija v rezultatih

### 6.3 Premium Profile Badge — 🔴 TODO

- **Cena:** 15€/mesec
- **Vsebuje:** Video uvod, več slik (20 vs 10), highlight badge, verificiran žig

---

### Projekcija prihodkov

| Scenarij  | Aktivni partnerji | Avg. mesečni promet | Prihodek          |
|-----------|-------------------|---------------------|-------------------|
| Seed      | 50                | 2.000€              | ~2.000€/mes       |
| Growth    | 200               | 2.500€              | ~10.000€/mes      |
| Scale     | 500               | 3.000€              | ~30.000€/mes      |

*(provizija 7% povprečno + subscriptions)*

---

## 7. GROWTH STRATEGY

**Največji izziv marketplace platform:** supply (pridobiti obrtnike).

### 7.1 Partner Acquisition

#### Faza 1 — Direct Outreach (0–3 meseci)
- [ ] Zbrati seznam 500 obrtnikov iz AJPES / PRS registra
- [ ] Email kampanja: "3 mesece PRO brezplačno"
- [ ] Telefonski klic top 50 obrtnikov v Ljubljana

#### Faza 2 — Community (1–6 mesecev)
**Facebook skupine za ciljanje:**
- Gradnja Slovenija (15k+ članov)
- Obrtniki Slovenija
- Prenova stanovanja
- DIY Slovenija

#### Faza 3 — Programmatic (3–12 mesecev)
- Google Maps API: iskanje "vodovodar Ljubljana", scrape kontaktov
- Avtomatizirani email follow-up sekvenca (3 emaili v 2 tednih)
- SEO content: "/vodovodar-ljubljana", "/elektrikar-maribor"

### 7.2 Customer Acquisition

- Google Ads: "poiščem mojstra", "popravilo kopalnice cena"
- SEO landing pages — **🟢 implementirano** (`SEO_LANDING_PAGES.md`)
- Referral program: 20€ kredit za vsakega pripeljanega naročnika

---

## 8. SECURITY

### 8.1 Webhook Signature Validation — 🟢 IMPLEMENTED

```typescript
event = constructStripeEvent(rawBody, sig)  // ✓ že implementirano
```

### 8.2 Rate Limiting — 🔴 TODO

```typescript
// app/api/middleware.ts
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
})
```

Prioriteta endpoint-ov za rate limiting:
1. `/api/ai/*` — 10 req/min na uporabnika
2. `/api/stripe/*` — 5 req/min
3. `/api/auth/*` — 20 req/min

### 8.3 Input Validation — 🟡 PARTIAL

Dodati Zod sheme za vse API route-e.

```typescript
import { z } from 'zod'

const TaskSchema = z.object({
  category: z.enum(['vodovodar', 'elektrikar', 'pleskár', 'zidar']),
  description: z.string().min(20).max(2000),
  location: z.string().min(3).max(100),
  budget_max: z.number().int().positive().optional(),
})
```

---

## 9. MONITORING & LOGGING

### 9.1 Structured Logging — 🔴 TODO

```typescript
// lib/logger.ts
type LogEvent =
  | { type: 'STRIPE'; event: string; userId: string; amount?: number }
  | { type: 'AI'; event: string; userId: string; tokens?: number; cost?: number }
  | { type: 'TASK'; event: string; taskId: string; userId: string }

function log(entry: LogEvent) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...entry }))
  // + shrani v supabase audit_logs tabelo
}

// Primeri:
log({ type: 'STRIPE', event: 'subscription_created', userId: 'usr_123', amount: 2900 })
log({ type: 'AI', event: 'daily_limit_reached', userId: 'usr_456', tokens: 50000 })
```

### 9.2 Audit Logs Tabela

```sql
CREATE TABLE audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type       TEXT NOT NULL,  -- 'STRIPE' | 'AI' | 'TASK' | 'AUTH'
  event      TEXT NOT NULL,
  user_id    UUID REFERENCES profiles(id),
  metadata   JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_type ON audit_logs(type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

---

## 10. PERFORMANCE

### 10.1 Database
- [ ] Dodati indekse (glejte sekcijo 3.3)
- [ ] Enable `pg_stat_statements` za počasne poizvedbe
- [ ] Connection pooling via Supabase Pooler (že vključeno)

### 10.2 API Caching
```typescript
// app/api/mojstri/route.ts
export const revalidate = 60  // ISR — osveži vsakih 60 sekund

// ali za dinamične strani:
import { unstable_cache } from 'next/cache'
const getCachedPartners = unstable_cache(getPartners, ['partners-list'], { revalidate: 30 })
```

### 10.3 Images
- Uporabi Supabase Storage transformations za resize
- `<Image>` komponenta z `priority` za LCP elemente
- WebP format z fallback

### 10.4 SSR/ISR Strategija
| Stran          | Strategija | Razlog                        |
|---------------|------------|-------------------------------|
| `/mojstri`    | ISR 60s    | Catalog se redko spreminja    |
| `/mojstri/[id]` | ISR 30s  | Profile updates               |
| `/dashboard`  | Dynamic    | Personalizirana vsebina       |
| `/`           | Static     | Landing page                  |

---

## 11. INFRASTRUCTURE ROADMAP

### Faza 1 — Marketplace Completion (Q1 2026)
- [ ] Fix Stripe webhook table mismatch (sekcija 2.1)
- [ ] Fix Price ID validation (sekcija 2.2)
- [ ] Add client_reference_id (sekcija 2.3)
- [ ] Mojstri katalog z filtri (sekcija 4.1)
- [ ] PLUS subscription plan (sekcija 6.1)
- [ ] Rate limiting (sekcija 8.2)

### Faza 2 — AI & Automation (Q2 2026)
- [ ] AI job categorization (sekcija 5.1)
- [ ] AI price estimation (sekcija 5.2)
- [ ] AI partner matching (sekcija 5.3)
- [ ] Structured logging / audit trail (sekcija 9)
- [ ] Featured listings (sekcija 6.2)

### Faza 3 — Scale (Q3–Q4 2026)
- [ ] Material marketplace (obrtniki naročajo material)
- [ ] Supplier integrations (Merkur, Bauhaus API)
- [ ] Mobile app (React Native / PWA enhancement)
- [ ] Multi-region (Hrvaška, Avstrija)

---

## 12. SUCCESS METRICS

### KPI Dashboard (meriti tedensko)

| Metrika                    | Cilj Seed | Cilj Growth |
|---------------------------|-----------|-------------|
| Aktivni partnerji         | 50        | 200         |
| Povpraševanja / mesec     | 100       | 1.000       |
| Konverzija (offer → deal) | 20%       | 35%         |
| Povprečna vrednost dela   | 300€      | 500€        |
| Mesečni prihodek          | 2.000€    | 15.000€     |
| NPS (Net Promoter Score)  | 40+       | 60+         |
| Čas do prve ponudbe       | < 4 ure   | < 2 uri     |

### Funnel Metrike
```
Obisk strani → Registracija → 1. povpraševanje → Sprejet deal → Review
    100%             15%              40%                25%          70%
```

---

## QUICK WIN CHECKLIST

Naslednji 3 popravki, ki vzamejo < 1 dan in imajo največji impact:

1. **[2h] Fix webhook** — posodabljaj `profiles.subscription_tier` poleg `obrtnik_profiles`
2. **[1h] Add client_reference_id** — checkout session in webhook lookup
3. **[2h] Price ID validation** — zamenjaj `metadata.plan` s price ID lookup

---

*Zadnja posodobitev: 2026-03-16*
