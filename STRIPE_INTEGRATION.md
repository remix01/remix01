# Stripe Integration - Naročnine za obrtnike

## Pregled

Integracija vključuje tri naročnini - START (brezplačno), PRO (€29/mesec) in ELITE (€79/mesec) s centraliziranim upravljanjem cen in provizij ter tier-based AI limitami.

## Struktura Datotek

### 1. **lib/stripe/config.ts** (Nova datoteka)
Centralna konfiguracija Stripe produktov in cen:
- `STRIPE_PRODUCTS` konstanta z podrobnostmi planov
- Funkcije za dostop do product ID, price ID in podrobnosti plana
- Tip `PlanType` za type-safe delo s plani

```typescript
STRIPE_PRODUCTS.START:
  - productId: 'prod_U7z9Ymkbh2zRAW'
  - priceId: 'price_1T9jBPKWYyYULHZkR4J6NyK1'
  - price: 0 EUR
  - commission: 10%

STRIPE_PRODUCTS.PRO:
  - productId: 'prod_SpS7ixowByASns'
  - priceId: 'price_1RuAtoKWYyYULHZkiI9eg1Eq'
  - price: 29 EUR
  - commission: 5%

STRIPE_PRODUCTS.ELITE:
  - productId: 'prod_EliteXxxx'
  - priceId: 'price_1RuAtoKWYyYULHZkiI9eg2Xx'
  - price: 79 EUR
  - commission: ~10% (brez sistema, neposredni contact)
```

### 2. **lib/stripe/helpers.ts** (Nova datoteka)
Utility funkcije za delo s provizijami in plani:

```typescript
getCommissionRate(planType)       // Vrne provizijo v % (10, 5)
getCommissionRateDecimal(planType) // Vrne 0.10, 0.05
calculateCommission(amountCents, planType) // Izračuna provizijo
calculatePayout(amountCents, planType)     // Izračuna izplačilo (znesek - provizija)
getPlanPrice(planType)            // Vrne ceno v EUR
formatPrice(euros)                // Formatira ceno za prikaz
getPlanFromMetadata(metadata)     // Pridobi plan iz Stripe metapodatkov
```

### 3. **lib/stripe.ts** (Posodobljena datoteka)
Posodobljen `PLATFORM_FEE_PERCENT` da se sklicuje na novo konfiguracijsko datoteko.

### 4. **app/api/stripe/create-checkout/route.ts** (Posodobljena datoteka)
Chevronski endpoint za ustvarjanje Stripe checkout:
- Validirani plan s `isValidPlan()`
- Dinamično pridobivanje price ID iz konfiguracije
- START paket se ne usmeri na Stripe (brezplačan)
- Metapodatki za naročnino vsebujejo plan

### 5. **app/api/webhooks/stripe/route.ts** (Posodobljena datoteka)
Dodani event handleri za naročnine:

```typescript
case 'customer.subscription.created':    // Naročnina ustvarjena
case 'customer.subscription.updated':    // Naročnina posodobljena
case 'customer.subscription.deleted':    // Naročnina preklicana/izbrisana
```

Kot rezultat se `profiles` tabela posodobi z:
- `subscription_tier`: 'start' | 'pro' | 'elite' | 'enterprise'
- `stripe_customer_id`: ID stranke za Stripe

### 6. **lib/agents/ai-router.ts** (Posodobljena datoteka)
Tier-based AI limitacije:
- `AGENT_DAILY_LIMITS` konfiguracija za vsak agent in tier
- `isAgentAccessible()` funkcija za preverjanje dostopa
- `getAgentDailyLimit()` funkcija za pridobitev limitov

```typescript
// START: 5 general_chat/dan
// PRO: 100 general_chat/dan
// ELITE: 300 general_chat/dan
// ENTERPRISE: Unlimited
```

### 7. **components/pricing-comparison.tsx** (Posodobljena datoteka)
Komponenta za prikaz cenik na `/cenik` strani:
- Tri naročnine za obrtnike (START, PRO, ELITE)
- Dve naročnini za naročnike (FREE, PREMIUM €9/mesec)
- Primerjalna tabela za desktop
- Kartice za mobilne naprave
- Soft-limitna opozorila pri 80% limitov

## Denarni Tok

### START Plan (Brezplačno)
1. Obrtnik se registrira
2. Avtomatski dobi paket 'start'
3. Provizija na vsako delo: 10%
4. AI limit: 5 sporočil/dan za general_chat

### PRO Plan (€29/mesec)
1. Obrtnik izbere PRO na cenik strani
2. Preusmerjamo ga na Stripe checkout
3. Stripe ustvari `customer` in `subscription`
4. Webhook prejme `customer.subscription.created`
5. `profiles` se posodobi s `subscription_tier = 'pro'` in `stripe_customer_id`
6. Provizija na vsako delo: 5%
7. AI limit: 100 sporočil/dan za general_chat

### ELITE Plan (€79/mesec)
1. Obrtnik nas kontaktira za ELITE paket
2. Ročna konfiguracija ali direktni Stripe setup
3. `profiles` se postavi na `subscription_tier = 'elite'`
4. Provizija: ~10% (ali po dogovoru)
5. AI limit: 300 sporočil/dan za general_chat + ekskluzivni lead-i

## AI Limitacije po Tier-u

### general_chat
- START: 5 sporočil/dan
- PRO: 100 sporočil/dan
- ELITE: 300 sporočil/dan
- ENTERPRISE: Unlimited

### other agents (quote_generator, materials_agent, itd.)
- START: 3-5 sporočil/dan (odvisno od agenta)
- PRO: 10-30 sporočil/dan (odvisno od agenta)
- ELITE: 50-100 sporočil/dan (odvisno od agenta)
- ENTERPRISE: Unlimited

### Omejevani agenti (samo PRO+)
- `video_diagnosis` - START: 0, PRO+: 10-50
- `materials_agent` - START: 0, PRO+: 15-50
- `offer_writing` - START: 0, PRO+: 30-100
- `profile_optimization` - START: 0, PRO+: 10-50

## Reset Logika

1. Vsak API klic preverka `ai_messages_used_today` in `ai_messages_reset_at` v `profiles` tabeli
2. Če je preteklo > 24h od `reset_at`, se counter resetira na 0
3. Nasploh se `ai_messages_used_today` inkrementira za vsak klic
4. Soft limit opozorilo pri 80% limit-a

## Zahteve za Deployment

### Environment Variables (že obstajajo)
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### Supabase Shema (že obstaja)
```sql
-- profiles tabela mora imeti kolone:
- subscription_tier TEXT ('start' | 'pro' | 'elite' | 'enterprise')
- stripe_customer_id TEXT (nullable)
- stripe_subscription_id TEXT (nullable)
- ai_messages_used_today INTEGER DEFAULT 0
- ai_messages_reset_at TIMESTAMPTZ DEFAULT NOW()
- ai_total_tokens_used BIGINT DEFAULT 0
- ai_total_cost_usd NUMERIC(10, 6) DEFAULT 0
```

### Stripe Setup
1. Ustvari Stripe produkte v Stripe Dashboard:
   - LiftGo START (free, no price needed)
   - LiftGo PRO (€29/month)
   - LiftGo ELITE (€79/month - optional, can be manual)
2. Pridobi Product ID in Price ID
3. Posodobi vrednosti v `lib/stripe/config.ts`
4. Nastavi Webhook na `{domain}/api/webhooks/stripe`
5. Vključi evente: `customer.subscription.*`, `payment_intent.*`, `charge.refunded`, `transfer.created`

## Uporaba v Kodi

### Dostop do konfiguracije
```typescript
import { STRIPE_PRODUCTS, getStripePriceId } from '@/lib/stripe/config'

const priceId = getStripePriceId('PRO') // 'price_1RuAtoKWYyYULHZkiI9eg1Eq'
const commission = STRIPE_PRODUCTS.START.commission // 10
```

### Izračun provizije
```typescript
import { calculateCommission, calculatePayout } from '@/lib/stripe/helpers'

const workAmountCents = 10000 // €100
const commissionCents = calculateCommission(workAmountCents, 'START') // 1000
const payoutCents = calculatePayout(workAmountCents, 'START') // 9000
```

### Prikaz cennika
```typescript
import { formatPrice, getPlanFeatures } from '@/lib/stripe/helpers'

const price = formatPrice(29) // "€29,00"
const features = getPlanFeatures('PRO')
```

### AI Limitna Preverjanja
```typescript
import { getAgentDailyLimit, isAgentAccessible } from '@/lib/agents/ai-router'

const limit = getAgentDailyLimit('quote_generator', 'pro') // 30
const hasAccess = isAgentAccessible('materials_agent', 'pro') // true
```

## Testiranje

### Stripe Test Kartični podatki
```
Testni kartični podatki:
- Carta: 4242 4242 4242 4242
- Expiry: 12/34
- CVC: 123

Webhook podpis se preizkuša z curl:
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type": "customer.subscription.created", "data": {"object": {"status": "active", "customer": "cus_123", "metadata": {"plan": "PRO"}}}}'
```

## Napake in Odpravljanje

### Napaka: "STRIPE_PRO_PRICE_ID ni nastavljen"
**Vzrok**: Stari .env varijable se uporabljajo
**Rešitev**: Posodobi `.env.local` in `.env.production`

### Napaka: "Neveljaven paket"
**Vzrok**: API se klicuje s `plan: 'pro'` namesto `'PRO'`
**Rešitev**: Uporabi velike črke `PRO` in `START`

### Napaka: Naročnina se ne posodabi v bazi
**Vzrok**: Webhook ni pravilno nastavljen
**Rešitev**: Preverka Stripe Dashboard → Webhooks je aktivna in ima pravo URL

### Napaka: "Dnevni limit dosežen (5)"
**Vzrok**: Uporabnik je dosegel svoj dnevni limit za AI
**Rešitev**: Preverka `profiles.ai_messages_reset_at` in prikaži ponudbo za nadgradnjo

## Namigi za Razvoj

1. **Dodaj nova plana**: Posodobi `lib/stripe/config.ts` in `lib/agents/ai-router.ts`
2. **Spremenj provizije**: Enodstavno spremenljiva v `STRIPE_PRODUCTS`
3. **Preveri veljavnost plana**: Vedno uporabi `isValidPlan(plan)`
4. **Sledite metapodatkom**: Naročnina shrani plan v `subscription.metadata.plan`
5. **Testiraj limitne**: Simuliraj 5+ AI klice z START tierom da vidiš error
