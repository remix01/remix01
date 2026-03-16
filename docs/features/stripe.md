# Stripe Integration - Naročnine za obrtnike

## Pregled

Integracija vključuje dve naročnini - START (brezplačno) in PRO (€29/mesec) s centraliziranim upravljanjem cen in provizij.

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

Kot rezultat se `obrtnik_profiles` tabela posodobi z:
- `subscription_tier`: 'start' | 'pro'
- `stripe_customer_id`: ID stranke za Stripe

### 6. **components/obrtnik/PlanSelector.tsx** (Nova komponenta)
Ponovno uporabljiva komponenta za izbiro plana z:
- Kartičko za oba plana z vizualno razliko
- Tabela primerjave funkcionalnosti
- Klikljivi gumbi za checkout
- Slovensko besedilo

Uporaba:
```tsx
<PlanSelector 
  selectedPlan="START"
  onPlanChange={(plan) => console.log(plan)}
  showCheckout={true}
/>
```

### 7. **components/pricing-comparison.tsx** (Posodobljena datoteka)
Komponenta za prikaz cenik na `/cenik` strani je posodobljena za:
- Uporabo nove `STRIPE_PRODUCTS` konfiguracije
- Dinamične provizije iz konfiguracije
- Ispravljen API klic za 'PRO' plan

## Denarni Tok

### START Plan (Brezplačno)
1. Obrtnik se registrira
2. Avtomatski dobi paket 'start'
3. Provizija na vsako delo: 10%

### PRO Plan (€29/mesec)
1. Obrtnik izbere PRO na cenik strani
2. Preusmerjamo ga na Stripe checkout
3. Stripe ustvari `customer` in `subscription`
4. Webhook prejme `customer.subscription.created`
5. `obrtnik_profiles` se posodobi s `subscription_tier = 'pro'` in `stripe_customer_id`
6. Provizija na vsako delo: 5%

## Zahteve za Deployment

### Environment Variables (že obstajajo)
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

### Supabase Shema (že obstaja)
```sql
-- obrtnik_profiles tabela mora imeti kolone:
- subscription_tier TEXT ('start' | 'pro')
- stripe_customer_id TEXT (nullable)
```

### Stripe Setup
1. Ustvari Stripe produkte v Stripe Dashboard:
   - LiftGo START (free, no price needed)
   - LiftGo PRO (€29/month)
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

## Testiranje

### Stripe Test Stripe
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

## Namigi za Razvoj

1. **Dodaj nova plana**: Posodobi `lib/stripe/config.ts`
2. **Spremenj provizije**: Enodstavno spremenljiva v `STRIPE_PRODUCTS`
3. **Preveri veljavnost plana**: Vedno uporabi `isValidPlan(plan)`
4. **Sledite metapodatkom**: Naročnina shrani plan v `subscription.metadata.plan`
