# Stripe Pricing Audit & Configuration

**Date:** April 9, 2026  
**Status:** ⚠️ **INCOMPLETE** - Missing ELITE tier in Stripe

---

## Current State

### ✅ Configured in Stripe
| Tier | Product ID | Price ID | Price | Commission | Features |
|------|-----------|----------|-------|-----------|----------|
| START | `prod_U7z9Ymkbh2zRAW` | `price_1T9jBPKWYyYULHZkR4J6NyK1` | €0 | 10% (cap €500) | Free tier |
| PRO | `prod_SpS7ixowByASns` | `price_1RuAtoKWYyYULHZkiI9eg1Eq` | €29/mo | 5% (cap €500) | Advanced features |

### ❌ Missing from Stripe (but referenced in code)
| Tier | Expected Price | Commission | Boost | Status |
|------|----------------|-----------|-------|--------|
| ELITE | €79/month | 0% (no cap) | 1.4x | **MISSING** |
| ENTERPRISE | Custom | 0% | 1.5x | For admins |

---

## Code References to Missing Tiers

### 1. Commission Calculator (`lib/commission/calculator.ts`)
```typescript
const DEFAULT_TIER_CONFIG: Record<CommissionTier, TierConfig> = {
  start: { commission_rate: 0.1, max_commission_eur: 500 },
  pro: { commission_rate: 0.05, max_commission_eur: 500 },
  elite: { commission_rate: 0, max_commission_eur: null },  // ← ELITE exists here!
}
```

**What it does:** ELITE tier has 0% commission with no cap.

### 2. Smart Matching Agent (`lib/agents/matching/smartMatchingAgent.ts`)
```typescript
/**
 * Subscription tier boost (multiplier: 1.0 START, 1.2 PRO, 1.4 ELITE)
 * - START (free): 1.0x (no boost)
 * - PRO (€29/mo): 1.2x (+20%)
 * - ELITE (€79/mo): 1.4x (+40%)  ← ELITE defined with €79 price!
 * - enterprise: 1.5x (+50%)
 */
```

**What it does:** ELITE craftsmen get 1.4x higher matching score (visibility boost).

### 3. AI Router (`lib/agents/ai-router.ts`)
```typescript
elite: {
  general_chat: 300,
  work_description: 100,
  offer_comparison: 50,
  scheduling_assistant: 100,
  video_diagnosis: 50,
  quote_generator: 100,
  materials_agent: 50,
  job_summary: 100,
  offer_writing: 100,
  profile_optimization: 50,
}
```

**What it does:** ELITE tier has monthly AI request limits (100-300 per agent).

### 4. Admin Monetization Page (`app/admin/monetization/page.tsx`)
```typescript
tier: 'start' | 'pro' | 'elite' | 'enterprise'
<SelectItem value="elite">ELITE</SelectItem>
```

**What it does:** Admin can assign ELITE tier to users.

---

## What Needs to Be Created in Stripe

### 1. ELITE Product & Price
```json
{
  "product": {
    "name": "LiftGo ELITE",
    "description": "Premium tier for professional craftsmen",
    "type": "service",
    "metadata": {
      "tier": "elite",
      "commission_rate": "0",
      "boost_multiplier": "1.4"
    }
  },
  "price": {
    "currency": "eur",
    "unit_amount": 7900,  // €79.00
    "recurring": {
      "interval": "month",
      "interval_count": 1
    },
    "metadata": {
      "tier": "elite"
    }
  }
}
```

### 2. ENTERPRISE Product & Price (Optional - for admins)
```json
{
  "product": {
    "name": "LiftGo ENTERPRISE",
    "description": "Custom enterprise plan",
    "type": "service"
  },
  "price": {
    "currency": "eur",
    "unit_amount": 0,  // Custom billing
    "recurring": {
      "interval": "month"
    }
  }
}
```

---

## Customer (Naročnik) Pricing

### Current Status
❌ **No subscription tiers for customers** - All customers are free.

### Options

#### Option A: Keep Customers Free (Current)
- Customers never pay
- Platform revenue from craftsman fees only
- Simplest model

#### Option B: Add Premium Customer Tiers
```
CUSTOMER_BASIC (Free):
  - Unlimited task postings
  - 5 AI agent uses/day
  - Standard support

CUSTOMER_PREMIUM (€4.99/month):
  - Unlimited task postings
  - 20 AI agent uses/day
  - Priority support
  - Advanced analytics
```

---

## Action Items

### ✅ Immediate (Required)
- [ ] Create ELITE product in Stripe (€79/month)
- [ ] Create ELITE price in Stripe
- [ ] Update `lib/stripe/config.ts` to add ELITE:
  ```typescript
  ELITE: {
    productId: 'prod_XXXXX',          // From Stripe
    priceId: 'price_XXXXX',          // From Stripe
    name: 'LiftGo ELITE',
    price: 79,
    commission: 0,  // 0% commission
    features: [
      'Neomejene ponudbe',
      '0% provizija',
      'Prednostna vidnost (1.4x boost)',
      'Analitika in statistika',
      'CRM orodje',
      'Generator ponudb',
      'Video analiza (200/mo)',
      'Prioritetna podpora'
    ]
  }
  ```
- [ ] Run database migration to update obrtnik_profiles tier options
- [ ] Test subscription flow for ELITE tier

### 📋 Future (Optional)
- [ ] Decide on customer pricing strategy
- [ ] Create customer subscription tiers if needed
- [ ] Add ENTERPRISE tier with custom pricing
- [ ] Implement tier upgrade flow UI

---

## Database Changes Needed

### obrtnik_profiles table
Current tier constraint: `'start'` | `'pro'`  
**Must update to:** `'start'` | `'pro'` | `'elite'` | `'enterprise'`

```sql
-- Add ELITE tier support
ALTER TABLE obrtnik_profiles 
ADD CONSTRAINT valid_tier 
CHECK (tier IN ('start', 'pro', 'elite'));

-- Or update existing constraint
ALTER TABLE obrtnik_profiles 
DROP CONSTRAINT valid_tier;

ALTER TABLE obrtnik_profiles 
ADD CONSTRAINT valid_tier 
CHECK (tier IN ('start', 'pro', 'elite', 'enterprise'));
```

---

## Testing Checklist

### Before Going Live
- [ ] ELITE tier appears in dropdown in admin UI
- [ ] Can create subscription to ELITE in test mode
- [ ] Stripe webhook handles ELITE subscription.created
- [ ] Commission calculator returns 0% for ELITE
- [ ] Matching algorithm applies 1.4x boost for ELITE
- [ ] AI limits apply correctly for ELITE (100-300/mo)
- [ ] Billing portal shows ELITE subscription
- [ ] Invoice shows €79 for ELITE

### After Stripe Update
```bash
# Verify ELITE product exists
stripe products list --limit 10

# Verify ELITE price exists  
stripe prices list --product "prod_XXXXX"

# Test subscription creation
stripe subscriptions create \
  --customer cus_XXXXX \
  --items "price_XXXXX"
```

---

## Related Files to Update

1. **lib/stripe/config.ts** - Add ELITE product config ✅ Priority
2. **lib/commission/calculator.ts** - Already supports ELITE ✓
3. **lib/agents/ai-router.ts** - Already supports ELITE ✓
4. **lib/agents/matching/smartMatchingAgent.ts** - Already supports ELITE ✓
5. **Database migrations** - Add ELITE to constraint ✅ Priority
6. **API routes** - Subscription creation endpoints ✓
7. **Admin UI** - Already supports ELITE ✓

---

## Cost Impact

### Current Revenue (Estimate)
```
Assumption: 100 active craftsmen
- 80 on START (€0): €0/month
- 20 on PRO (€29): €580/month

Commission per €100 job:
- START: €10 (10%)
- PRO: €5 (5%)
```

### With ELITE
```
Assumption: 100 active craftsmen
- 70 on START (€0): €0/month
- 25 on PRO (€29): €725/month
- 5 on ELITE (€79): €395/month

TOTAL TIER REVENUE: €1,120/month

+ Commission income (no change, ELITE pays 0%)
```

---

## Stripe Dashboard Quick Links

**Test Mode:**
- Products: https://dashboard.stripe.com/test/products
- Prices: https://dashboard.stripe.com/test/prices
- Subscriptions: https://dashboard.stripe.com/test/subscriptions

**Production:**
- Products: https://dashboard.stripe.com/products
- Prices: https://dashboard.stripe.com/prices

---

## Next Steps

1. **Create ELITE in Stripe** (5 minutes)
   - Go to Products → Create
   - Name: "LiftGo ELITE"
   - Price: €79/month
   - Copy Product ID and Price ID

2. **Update lib/stripe/config.ts** (2 minutes)
   - Add ELITE to STRIPE_PRODUCTS
   - Paste IDs from Stripe

3. **Test** (10 minutes)
   - Create test subscription
   - Verify webhook processing
   - Check admin UI

4. **Deploy** (CI/CD handles it)
   - Push to main
   - Verify in production

---

**Estimated time to complete:** 20-30 minutes

**Critical:** ELITE is referenced in production code but NOT in Stripe. This will cause errors if users try to access ELITE features.
