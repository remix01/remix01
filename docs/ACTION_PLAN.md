# ACTION PLAN: Fix Critical Issues in LiftGO

**Status**: 🔴 CRITICAL - Multiple build errors + RLS policy gaps  
**Date**: 2026-04-03  
**Branch**: `claude/fix-dashboard-issues-esWdN`

---

## COMPLETED FIXES ✅

### 1. Fixed workerBroadcast.ts Schema Mismatch (Commit: 40bcf5e)
**Issue**: Code accessed non-existent `user_id` column on `obrtnik_profiles`  
**Root Cause**: `obrtnik_profiles.id` IS the user_id (FK to profiles.id), no separate column  
**Fix**: Changed all `o.user_id` references to `o.id`  
**Files**: `lib/marketplace/workerBroadcast.ts`  
**Impact**: Resolves TypeScript compilation error

### 2. Added RLS Policy Migration (20260403_add_obrtnik_povprasevanja_policies.sql)
**Issue**: Obrtniki could not read open povprasevanja due to missing SELECT policy  
**Fix**: Created combined policy allowing:
- Naročniki see their own povprasevanja
- Obrtniki see status='odprto' povprasevanja
- Admins see all povprasevanja  
**Status**: Migration created, awaiting Supabase deployment

### 3. Applied Type Assertions for Instant Offers (Commit: 8fd30d0)
**Issue**: Build errors about missing instant_offer_templates column  
**Fix**: Added `as any` type assertions until schema migration is applied  
**Files**: `lib/marketplace/instantOffer.ts`, `lib/marketplace/liquidityEngine.ts`

---

## PENDING FIXES (IN PRIORITY ORDER)

### 🔴 CRITICAL (Blocks Core Functionality)

#### Issue 1: Apply RLS Policy Migration to Supabase
**File**: `supabase/migrations/20260403_add_obrtnik_povprasevanja_policies.sql`  
**Action**: Deploy migration to Supabase database  
**Command**: 
```bash
# Once migration is deployed:
npx supabase db push
```
**Impact**: Enables obrtniki to see open povprasevanja in dashboard  
**Verification**: 
```sql
-- Test as obrtnik user:
SELECT COUNT(*) FROM povprasevanja WHERE status = 'odprto';
-- Should return count > 0, not blocked by RLS
```

#### Issue 2: Fix API Endpoint Column Mapping
**File**: `app/api/povprasevanje/route.ts`  
**Problem**: Uses deprecated column names (storitev, lokacija, opis)  
**Fix Required**: Map request body to correct columns
```typescript
// OLD (BROKEN):
const { storitev, lokacija, opis } = body

// NEW (CORRECT):
const { title, location_city, description } = body
```
**Impact**: Enables form submissions to actually insert data

#### Issue 3: Apply Instant Offers Schema Migration  
**File**: `supabase/migrations/20260403_add_instant_offer_support.sql`  
**Columns Needed**:
- `obrtnik_profiles.enable_instant_offers` (BOOLEAN)
- `obrtnik_profiles.instant_offer_templates` (JSONB)
- `obrtnik_profiles.plan_type` (TEXT)
- `marketplace_events` table
**Action**: Deploy migration to Supabase  
**Impact**: Removes TypeScript type assertion workarounds

### 🟡 HIGH (Improves UX)

#### Issue 4: Regenerate Supabase Types
**Command**:
```bash
npx supabase gen types typescript --project-id whabaeatixtymbccwigu > lib/supabase/database.types.ts
```
**Impact**: Removes `as any` type assertions from code  
**Prerequisite**: Issues 1 & 3 must be deployed to Supabase first

#### Issue 5: Add Realtime Subscriptions to Dashboards
**Files to Update**:
- `app/(narocnik)/povprasevanja/page.tsx`
- `app/(obrtnik)/obrtnik/povprasevanja/page.tsx`
- `app/partner-dashboard/povprasevanja/page.tsx`
**Purpose**: Auto-refresh when new povprasevanja created  
**Pattern**: Use Supabase Realtime channel with `postgres_changes`

---

## IMMEDIATE BUILD STATUS

### Current Build Error (Vercel 15:25:15.908)
```
./lib/marketplace/workerBroadcast.ts:59:20
Type error: Property 'user_id' does not exist...
```
✅ **FIXED** in commit 40bcf5e

### Build Blockers Remaining
1. ❌ **Instant offers schema missing** → Type assertions hide error
2. ⏳ **Can build locally** but Vercel needs Supabase migrations applied

---

## DEPLOYMENT SEQUENCE

```
1. Deploy RLS policy migration to Supabase
   ↓
2. Fix app/api/povprasevanje/route.ts column mapping  
   ↓
3. Deploy instant offers schema migration to Supabase
   ↓
4. Regenerate types: npx supabase gen types...
   ↓
5. Commit regenerated types
   ↓
6. Push to branch
   ↓
7. Verify Vercel build succeeds
   ↓
8. (Optional) Add realtime subscriptions
```

---

## FILES CREATED IN THIS SESSION

| File | Purpose |
|------|---------|
| `supabase/migrations/20260403_add_obrtnik_povprasevanja_policies.sql` | RLS policies for obrtniki |
| `supabase/migrations/20260403_add_instant_offer_support.sql` | Schema for instant offers |
| `ACTION_PLAN.md` | This file |
| `COMPREHENSIVE_DIAGNOSTIC_REPORT.md` | Full diagnostic analysis |
| `MIGRATION_INSTRUCTIONS.md` | Manual migration guide |
| `FIX_SUMMARY.md` | High-level fix summary |

---

## GIT COMMITS IN THIS SESSION

| Commit | Message |
|--------|---------|
| 073b538 | Fixed cookies scope error |
| 866c693 | Fixed public client usage |
| bab39d9 | Fixed TypeScript insertData type |
| 8005d98 | Added draft status to ponudbe |
| 74a03d1 | Fixed PonudbaUpdate type assertion |
| 072300b | Disabled marketplace_events logging |
| 6b6c23b | Disabled saveTemplates |
| a7d7747 | Disabled tryInstantOffer |
| b83301f | Re-enabled features + migration |
| a33a75d | Added migration documentation |
| 8fd30d0 | Added type assertions + CLI setup |
| 40bcf5e | Fixed workerBroadcast schema |

---

## VERIFICATION CHECKLIST

Before merging to main:

- [ ] RLS policy migration deployed to Supabase
- [ ] `app/api/povprasevanje/route.ts` fixed (column mapping)
- [ ] Instant offers schema migration deployed
- [ ] `lib/supabase/database.types.ts` regenerated
- [ ] No `as any` type assertions in production code
- [ ] Local build passes: `pnpm run build`
- [ ] Vercel build succeeds (green checkmark)
- [ ] Test form submission: `POST /api/povprasevanje`
- [ ] Test obrtnik dashboard: Can see open povprasevanja
- [ ] Test realtime (if enabled): New povprasevanja appear instantly

---

## NEXT STEPS

1. **Immediate** (10 min):
   - Commit workerBroadcast fix ✅ DONE
   - Push to branch

2. **Within 1 hour**:
   - Apply RLS policy migration to Supabase
   - Apply instant offers schema migration
   - Regenerate types

3. **Within 2 hours**:
   - Fix API endpoint column mapping
   - Commit and push type regeneration
   - Verify Vercel build succeeds

4. **Follow-up**:
   - Add realtime subscriptions
   - Add structured logging
   - Create RLS policy tests

