# ELITE Tier Setup Guide

**Status:** ⚠️ In Progress  
**Date:** April 9, 2026  
**Branch:** `claude/setup-liftgo-n8n-automation-N0dI0`

---

## What's Done ✅

1. **Database Migration Created**
   - File: `supabase/migrations/2026040901_add_elite_tier_support.sql`
   - Updates `subscription_tier` and `plan_type` constraints to include `'elite'`
   - Ready to apply to Supabase

2. **Stripe Config Updated**
   - File: `lib/stripe/config.ts`
   - ELITE tier definition added with placeholder IDs
   - TypeScript types updated
   - `isValidPlan()` function supports ELITE

## What's Needed ⏳

### Step 1: Create ELITE Product in Stripe

Go to **Stripe Dashboard** (Test Mode):
- URL: https://dashboard.stripe.com/test/products
- Click **"Create product"**
- Fill in:
  - **Name:** `LiftGo ELITE`
  - **Description:** `Premium tier for professional craftsmen with unlimited features`
  - **Type:** `Service` (or use what START/PRO use)
  - **Metadata** (optional, but recommended):
    - `tier: elite`
    - `commission_rate: 0`
    - `boost_multiplier: 1.4`
- Click **Create product**
- Copy the **Product ID** (format: `prod_XXXXX`)

### Step 2: Create ELITE Price in Stripe

From the product page you just created:
- Click **"Add pricing"** button
- Fill in:
  - **Billing model:** `Recurring`
  - **Price:** `€79.00` (or `7900` in cents)
  - **Billing period:** `Monthly`
  - **Currency:** `EUR`
  - **Metadata** (optional):
    - `tier: elite`
- Click **Create price**
- Copy the **Price ID** (format: `price_XXXXX`)

### Step 3: Update lib/stripe/config.ts

Replace the placeholders with actual IDs:

```typescript
ELITE: {
  productId: 'prod_XXXXX',  // ← Paste actual ID here
  priceId: 'price_XXXXX',    // ← Paste actual ID here
  // ... rest stays the same
}
```

Example after update:
```typescript
ELITE: {
  productId: 'prod_U7z9Ymkbh2z1234',
  priceId: 'price_1RuAtoKWYyYULHZkELITE',
  name: 'LiftGo ELITE',
  // ...
}
```

### Step 4: Test Before Committing

```bash
# Build to verify TypeScript types are correct
npm run build

# Check that config loads without errors
node -e "require('./lib/stripe/config.ts')" 2>&1 | head -20
```

### Step 5: Commit & Push

```bash
git add supabase/migrations/2026040901_add_elite_tier_support.sql
git add lib/stripe/config.ts
git commit -m "Add ELITE tier support (€79/month, 0% commission, 1.4x boost)"
git push -u origin claude/setup-liftgo-n8n-automation-N0dI0
```

### Step 6: Apply Database Migration

Once the code is committed, run the migration:

```bash
# Option A: Via Supabase CLI
supabase db push

# Option B: Via Supabase Dashboard
# 1. Go to https://app.supabase.com/project/whabaeatixtymbccwigu/sql
# 2. Paste contents of: supabase/migrations/2026040901_add_elite_tier_support.sql
# 3. Run the query
```

---

## Testing Checklist ✓

After setup is complete:

- [ ] ELITE appears in `/admin/monetization` tier dropdown
- [ ] Can create subscription to ELITE in Stripe test mode
- [ ] Commission calculator returns 0% for ELITE (via `lib/commission/calculator.ts`)
- [ ] Matching algorithm applies 1.4x boost for ELITE
- [ ] AI limits apply correctly for ELITE (100-300/mo per agent)
- [ ] Invoice shows €79 for ELITE subscription
- [ ] Database constraint allows 'elite' in tier field

### Test Commands

```bash
# Verify ELITE product exists in Stripe
curl https://api.stripe.com/v1/products/prod_XXXXX \
  -H "Authorization: Bearer sk_test_..."

# Verify ELITE price exists
curl https://api.stripe.com/v1/prices/price_XXXXX \
  -H "Authorization: Bearer sk_test_..."

# Test subscription creation
curl https://api.stripe.com/v1/subscriptions \
  -d customer=cus_XXXXX \
  -d "items[0][price]=price_XXXXX" \
  -H "Authorization: Bearer sk_test_..."
```

---

## Files Changed

```
supabase/migrations/
  └── 2026040901_add_elite_tier_support.sql    [NEW]

lib/
  └── stripe/
      └── config.ts                             [UPDATED]

docs/
  └── ELITE_TIER_SETUP.md                      [This file, NEW]
```

---

## Related Documentation

- [STRIPE_PRICING_AUDIT.md](./STRIPE_PRICING_AUDIT.md) - Full audit and specs
- [N8N_DELIVERY_SUMMARY.md](./N8N_DELIVERY_SUMMARY.md) - N8N automation setup
- [CLAUDE.md](../CLAUDE.md) - Stripe IDs and project overview

---

## Common Issues

**"Product ID not found" when testing?**
- Verify you're using the correct Stripe API key for test mode
- Check that the ID is copied exactly (no spaces)

**Type error: "ELITE is not assignable to type PlanType"?**
- Ensure lib/stripe/config.ts has ELITE in STRIPE_PRODUCTS
- Run `npm run build` to catch type errors early

**Database constraint violation?**
- Apply migration: `supabase db push` or manually run the SQL
- Verify migration 2026040901 is applied in Supabase dashboard

---

**Next Steps:**
1. Create ELITE product & price in Stripe (5 minutes)
2. Update config.ts with actual IDs (2 minutes)
3. Test and verify (5 minutes)
4. Commit and push (2 minutes)
5. Apply database migration (1 minute)

**Total Time:** ~15 minutes

---

**Status:** Ready for implementation  
**Created by:** Claude Code AI  
**Date:** April 9, 2026
