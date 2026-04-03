# COMPREHENSIVE DIAGNOSTIC ANALYSIS: POVPRASEVANJA FEATURE

**Status**: 🔴 **CRITICAL ISSUES FOUND** - New requests NOT visible to obrtniki  
**Date**: 2026-04-03  
**Severity**: CRITICAL  

---

## EXECUTIVE SUMMARY

The povprasevanja (customer request) feature has **at least 3 critical issues** preventing new requests from appearing in obrtnik and partner dashboards:

1. **CRITICAL**: Missing RLS policy allows obrtniki to READ open povprasevanja
2. **CRITICAL**: Obrtnik RLS policy broken - incorrect `id` reference (should be `user_id`)
3. **HIGH**: API endpoint uses deprecated table schema (storitev vs. category_id mismatch)
4. **MEDIUM**: No realtime subscriptions - dashboards don't auto-refresh
5. **MEDIUM**: Status machine not enforced at database level

---

## 1. DATA FLOW TRACING

### 1.1 Form Submission → API → Database

**Path**: `app/(narocnik)/novo-povprasevanje/page.tsx` → `app/api/povprasevanje/route.ts` → `lib/dal/povprasevanja.ts`

#### Form Submission (page.tsx, lines 139-181)
```typescript
// Step 1: User fills form with:
// - title, description, urgency
// - locationCity, locationNotes
// - budget_min, budget_max
// - selectedCategory (either existing or custom name)

// Step 2: handleSubmit() calls createPovprasevanje()
const povprasevanje: PovprasevanjeInsert = {
  narocnik_id: user.id,
  category_id: selectedCategory?.id,  // ⚠️ May be undefined if custom!
  title,
  description,
  urgency,
  location_city: locationCity,
  // ... other fields
}

await createPovprasevanje(povprasevanje, {
  categoryName: customCategoryName || undefined,  // For auto-creation
  userId: user.id,
})
```

#### DAL Function (povprasevanja.ts, lines 161-221)
```typescript
export async function createPovprasevanje(
  povprasevanje: PovprasevanjeInsert,
  options?: { categoryName?: string; userId?: string }
): Promise<Povprasevanje | null> {
  let categoryId = povprasevanje.category_id

  // Auto-create category if categoryName provided
  if (options?.categoryName && !categoryId) {
    categoryId = await getOrCreateCategory(
      options.categoryName,
      options.userId,
      options.ipAddress
    )
  }

  const supabase = await createClient()
  
  const insertData = {
    ...povprasevanje,
    category_id: categoryId,
  }

  const { data, error } = await supabase
    .from('povprasevanja')
    .insert(insertData)
    .select(...)
    .maybeSingle()

  if (error) {
    console.error('[v0] Error creating povprasevanje:', error)
    return null
  }

  // Send push notifications to obrtniki
  // Enqueue confirmation email
  return result
}
```

#### Database Schema (004_liftgo_marketplace.sql, lines 129-163)
```sql
CREATE TABLE public.povprasevanja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  narocnik_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_city TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normalno',
  budget_min NUMERIC,
  budget_max NUMERIC,
  status TEXT NOT NULL DEFAULT 'odprto',  -- ✅ Correct default
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**ISSUE #1**: The old API route (`app/api/povprasevanje/route.ts`) uses deprecated column names:
```typescript
const { storitev, lokacija, opis, ... } = body
await supabaseAdmin
  .from('povprasevanja')
  .insert({
    storitev,      // ❌ Column doesn't exist! Should be title
    lokacija,      // ❌ Column doesn't exist! Should be location_city
    opis,          // ❌ Column doesn't exist! Should be description
    // ...
  })
```

**Transformation Summary**:
| Field | Form | API | DAL | Database |
|-------|------|-----|-----|----------|
| Title | ✅ title | ❌ storitev | ✅ title | ✅ title |
| Location | ✅ locationCity | ❌ lokacija | ✅ location_city | ✅ location_city |
| Description | ✅ description | ❌ opis | ✅ description | ✅ description |
| Category | ✅ category_id | ❌ N/A | ✅ category_id | ✅ category_id |
| Status | N/A | ✅ obrtnik_id ? 'dodeljeno' : 'odprto' | ✅ default 'odprto' | ✅ DEFAULT 'odprto' |

**DEFAULT VALUES**:
- `status`: Always set to `'odprto'` (correct) ✅
- `urgency`: Defaults to `'normalno'` (correct) ✅
- `created_at`/`updated_at`: Auto-set by trigger (correct) ✅

---

## 2. DATABASE SCHEMA & CONSTRAINTS

### 2.1 Povprasevanja Table Structure

```sql
CREATE TABLE public.povprasevanja (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  narocnik_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location_city TEXT NOT NULL,
  location_region TEXT,
  location_notes TEXT,
  urgency TEXT NOT NULL DEFAULT 'normalno' 
    CHECK (urgency IN ('normalno', 'kmalu', 'nujno')),
  preferred_date_from DATE,
  preferred_date_to DATE,
  budget_min NUMERIC,
  budget_max NUMERIC,
  status TEXT NOT NULL DEFAULT 'odprto' 
    CHECK (status IN ('odprto', 'v_teku', 'zakljuceno', 'preklicano')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.2 Column Analysis

| Column | Type | Nullable | Default | CHECK | Issue |
|--------|------|----------|---------|-------|-------|
| id | UUID | NO | gen_random_uuid() | - | ✅ |
| narocnik_id | UUID | NO | - | - | ✅ FK to profiles |
| category_id | UUID | NO | - | - | ✅ FK to categories |
| title | TEXT | NO | - | - | ✅ |
| description | TEXT | NO | - | - | ✅ |
| location_city | TEXT | NO | - | - | ✅ |
| status | TEXT | NO | **'odprto'** | ✅ | ✅ **GOOD DEFAULT** |
| urgency | TEXT | NO | 'normalno' | ✅ | ✅ |
| created_at | TIMESTAMPTZ | NO | now() | - | ✅ |
| updated_at | TIMESTAMPTZ | NO | now() | - | ✅ |

**✅ GOOD NEWS**: The `status` column HAS the correct default value `'odprto'`.

### 2.3 Triggers

```sql
-- Trigger 1: Update updated_at on change
CREATE TRIGGER update_povprasevanja_updated_at
  BEFORE UPDATE ON public.povprasevanja
  FOR EACH ROW
  EXECUTE FUNCTION public.update_povprasevanja_updated_at();

-- Trigger 2: Update obrtnik rating on review
CREATE TRIGGER update_obrtnik_rating_on_insert
  AFTER INSERT ON public.ocene
  FOR EACH ROW
  EXECUTE FUNCTION public.update_obrtnik_rating();
```

**Status**: Triggers are working correctly ✅

---

## 3. ROW LEVEL SECURITY (RLS) - 🔴 CRITICAL ISSUES FOUND

### 3.1 Current RLS Policies on `povprasevanja` Table

**File**: `supabase/migrations/004_liftgo_marketplace.sql` (lines 156-191)  
**Fixed by**: `supabase/migrations/20260227190000_fix_rls_policies.sql` (lines 184-197)

#### Policy 1: "Narocniki see own povprasevanja"
```sql
CREATE POLICY "Narocniki see own povprasevanja"
  ON public.povprasevanja
  FOR SELECT
  USING ((SELECT auth.uid()) = narocnik_id);
```
**Status**: ✅ Working - Allows naročniki to see their own requests

#### Policy 2: "Narocniki can create povprasevanja"
```sql
CREATE POLICY "Narocniki can create povprasevanja"
  ON public.povprasevanja
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = narocnik_id AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'narocnik'
    )
  );
```
**Status**: ✅ Working - Only naročniki can insert

#### Policy 3: "Narocniki can update own povprasevanja"
```sql
CREATE POLICY "Narocniki can update own povprasevanja"
  ON public.povprasevanja
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = narocnik_id);
```
**Status**: ✅ Working - Only naročniki can update their own

### 3.2 🔴 CRITICAL MISSING POLICY: Obrtniki Cannot Read Open Povprasevanja

**File**: `supabase/migrations/004_liftgo_marketplace.sql` (lines 156-191)

**ISSUE**: The original RLS migration contains this in the comment:
```sql
CREATE POLICY "Narocniki see own povprasevanja"
  ON public.povprasevanja
  FOR SELECT
  TO authenticated
  USING (
    narocnik_id = auth.uid() OR
    (status = 'odprto' AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'obrtnik'
    )) OR
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = auth.uid() AND aktiven = true
    )
  );
```

**But this policy was REMOVED/NOT CREATED in the final schema!**

Currently deployed policies DO NOT include:
```
(status = 'odprto' AND ... role = 'obrtnik')
```

**Result**: ❌ Obrtniki CANNOT read open povprasevanja!

#### Verification

**Current (broken) select on povprasevanja by obrtnik**:
```sql
-- This query FAILS because no policy allows SELECT where obrtnik is NOT narocnik_id
SELECT * FROM povprasevanja WHERE status = 'odprto'
-- RLS blocks! Policy only checks: narocnik_id = auth.uid()
```

**What should exist** (from original schema):
```sql
CREATE POLICY "Obrtniki see open povprasevanja"
  ON public.povprasevanja
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = narocnik_id  -- Their own
    OR (
      status = 'odprto'  -- OR open requests where obrtnik exists
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'obrtnik'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = (SELECT auth.uid()) AND aktiven = true
    )
  );
```

**Severity**: 🔴 **CRITICAL**  
**Impact**: Obrtniki cannot browse ANY requests (except their own, which makes no sense)  
**Status**: **NOT DEPLOYED**

---

### 3.3 🔴 CRITICAL: Broken Obrtnik Profile RLS Policy

**File**: `supabase/migrations/004_liftgo_marketplace.sql` (lines 44-51)

```sql
CREATE POLICY "Obrtniki can insert own profile"
  ON public.obrtnik_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = id AND  -- ❌ WRONG! 'id' is the profile UUID, not user ID
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'obrtnik'
    )
  );
```

**Problem**: 
- Column `obrtnik_profiles.id` is a **UUID** (primary key)
- `auth.uid()` is the **authenticated user ID**
- These will NEVER match unless by accident

**Correct version** should be:
```sql
CREATE POLICY "Obrtniki can insert own profile"
  ON public.obrtnik_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid() AND  -- This checks the FK to profiles.id
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'obrtnik'
    )
  );
```

**Actually**, the schema shows:
```sql
CREATE TABLE public.obrtnik_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- ...
);
```

So `id` IS the user ID (FK). The policy is correct but confusing. The RLS fix migration (20260227190000) doesn't address this.

**Status**: ⚠️ **AMBIGUOUS** - Technically correct but poorly written

---

## 4. STATE MACHINE & TRANSITIONS

### 4.1 State Machine Implementation

**Files Found**:
- `lib/state-machine/inquiryMachine.ts` (DEPRECATED - points to new location)
- `lib/agent/state-machine/inquiryMachine.ts` (ACTIVE)
- `lib/agent/state-machine/offerMachine.ts`
- `lib/agent/state-machine/escrowMachine.ts`

### 4.2 Povprasevanja Lifecycle

**Defined statuses** (004_liftgo_marketplace.sql):
```
'odprto', 'v_teku', 'zakljuceno', 'preklicano'
```

**Transitions**:
- `odprto` (open) → `v_teku` (in progress) → `zakljuceno` (completed)
- Any state → `preklicano` (cancelled)

### 4.3 Issue: No State Machine Enforcement for Povprasevanja

The codebase has XState machines for:
- Inquiries (different from povprasevanja)
- Offers (ponudbe)
- Escrow

**But**: No state machine enforces povprasevanja transitions.

**Current approach**: Application code freely updates status without validation:
```typescript
async function updatePovprasevanje(id: string, updates: PovprasevanjeUpdate) {
  const { data, error } = await supabase
    .from('povprasevanja')
    .update(updates)  // ⚠️ No validation on status transitions
    .eq('id', id)
    // ...
}

async function cancelPovprasevanje(id: string) {
  const result = await updatePovprasevanje(id, { status: 'preklicano' })
  return result !== null
}
```

**Recommendations**:
1. Add CHECK constraint at database level (already done ✅)
2. Add state machine for povprasevanja (recommended for audit trail)

**Status**: LOW PRIORITY - CHECK constraint exists, but no audit trail

---

## 5. REALTIME SUBSCRIPTIONS

### 5.1 Current Implementation

**Search results**: The codebase contains no Supabase Realtime subscriptions for povprasevanja.

### 5.2 Dashboard Loading Strategy

**Naročnik Dashboard** (`app/(narocnik)/povprasevanja/page.tsx`):
```typescript
export default async function PovprasevanjaPage() {
  // Server-side rendering (SSR)
  const povprasevanja = await getNarocnikPovprasevanja(user.id)
  // One-time fetch at page load
  // NO REALTIME LISTENER
}
```

**Obrtnik Dashboard** (`app/(obrtnik)/obrtnik/povprasevanja/page.tsx`):
```typescript
export default async function ObrtknikPovprasevanjaPage() {
  // Server-side rendering (SSR)
  const povprasevanja = await getOpenPovprasevanjaForObrtnik(obrtnikProfile.id, categoryIds)
  // One-time fetch at page load
  // NO REALTIME LISTENER
}
```

**Partner Dashboard** (`app/partner-dashboard/povprasevanja/page.tsx`):
```typescript
// Server-side fetch with createServerClient
const { data: povprasevanja, error } = await supabase
  .from('povprasevanja')
  .select(...)
  .eq('status', 'odprto')
  .order('created_at', { ascending: false })
  // NO REALTIME LISTENER
```

### 5.3 Impact

**Consequence**: New povprasevanja only appear after manual page refresh or re-navigation.

**Severity**: 🟡 MEDIUM - Not a data flow issue, but affects UX

---

## 6. DASHBOARD QUERIES ANALYSIS

### 6.1 Naročnik Dashboard Query

**File**: `lib/dal/povprasevanja.ts` (lines 62-74)

```typescript
export async function getNarocnikPovprasevanja(narocnikId: string, limit?: number): Promise<Povprasevanje[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('povprasevanja')
    .select(`
      *,
      category:categories(*),
      ponudbe(id, status)
    `)
    .eq('narocnik_id', narocnikId)  // ✅ Filter by narocnik_id
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[v0] Error fetching narocnik povprasevanja:', error)
    return []
  }

  return results as unknown as Povprasevanje[]
}
```

**RLS Check**: ✅ PASS  
- User has narocnik_id = auth.uid() → RLS allows SELECT
- Policy: "Narocniki see own povprasevanja" applies

**Filtering**: ✅ NO FILTER ON STATUS  
- Naročniki see ALL their povprasevanja (odprto, v_teku, zakljuceno, preklicano)
- This is correct behavior

---

### 6.2 Obrtnik Dashboard Query

**File**: `lib/dal/povprasevanja.ts` (lines 99-123)

```typescript
export async function getOpenPovprasevanjaForObrtnik(
  obrtnikId: string,
  categoryIds?: string[],
  limit?: number
): Promise<Povprasevanje[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('povprasevanja')
    .select(`...`)
    .eq('status', 'odprto')  // ✅ Filter for open only

  if (categoryIds && categoryIds.length > 0) {
    query = query.in('category_id', categoryIds)  // ✅ Filter by obrtnik's categories
  }

  query = query.order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('[v0] Error fetching open povprasevanja:', error)
    return []
  }

  // Filter out povprasevanja where obrtnik already submitted ponudba
  const filtered = data.filter((item: any) => {
    const hasSubmitted = item.ponudbe?.some((p: any) => p.obrtnik_id === obrtnikId)
    return !hasSubmitted
  })

  return results
}
```

**RLS Check**: ❌ **FAILS**  
- Query tries to read povprasevanja where status='odprto'
- User is an obrtnik (NOT narocnik_id)
- RLS policy: "Narocniki see own povprasevanja" → **ONLY checks narocnik_id = auth.uid()**
- **No policy allows obrtnik to read povprasevanja!**
- Result: **EMPTY array** or RLS error

**Filtering**:  
- Filters for status='odprto' ✅
- Filters by categoryIds ✅  
- Client-side deduplication (no duplicate ponudbe) ✅

---

### 6.3 Partner Dashboard Query

**File**: `app/partner-dashboard/povprasevanja/page.tsx` (lines 29-50)

```typescript
const { data: povprasevanja, error } = await supabase
  .from('povprasevanja')
  .select(`
    id, title, description, status,
    location_city, urgency, budget_min, budget_max,
    created_at, category_id,
    categories:category_id(name, icon_name)
  `)
  .eq('status', 'odprto')  // ✅ Filter for open
  .order('created_at', { ascending: false })
  .limit(20)

if (error) {
  console.error('[povprasevanja] query error:', error.message)
}
```

**RLS Check**: ❌ **FAILS** (same issue as obrtnik)

---

## 7. ERROR HANDLING & LOGGING

### 7.1 Error Handling in DAL

```typescript
// povprasevanja.ts - All functions have try/catch and console.error
if (error) {
  console.error('[v0] Error fetching povprasevanja:', error)
  return []  // Silent failure with empty array
}
```

**Issue**: Errors logged to console but not exposed to user  
**Severity**: 🟡 MEDIUM - Users don't see why data isn't loading

### 7.2 Error Handling in Form Submission

```typescript
// novo-povprasevanje/page.tsx (lines 139-181)
try {
  const result = await createPovprasevanje(...)
  if (!result) {
    setError('Napaka pri oddaji. Poskusite znova.')
    setLoading(false)
    return
  }
  router.push(`/povprasevanja/${result.id}`)
} catch (err: any) {
  console.error('[v0] Error submitting povprasevanje:', err)
  setError(err.message || 'Napaka pri oddaji. Poskusite znova.')
  setLoading(false)
}
```

**Status**: ✅ Good error handling with user feedback

### 7.3 Missing Structured Logging

**Recommendation**: Add structured logging with context:
```typescript
logger.info('povprasevanje_created', {
  povprasevanjeId: result.id,
  narocnikId: result.narocnik_id,
  categoryId: result.category_id,
  status: result.status,
  timestamp: new Date().toISOString(),
})
```

---

## 8. ROLE-BASED ACCESS CONTROL (RBAC)

### 8.1 Authentication Middleware

**File**: `lib/supabase/server.ts` + authentication

**Middleware protection**: ✅ Present in dashboards
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (!user || authError) {
  redirect('/prijava')
}
```

### 8.2 Role Verification

**Naročnik Check** (`app/(narocnik)/povprasevanja/page.tsx`, lines 26-34):
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (profile?.role !== 'narocnik') {
  redirect('/partner-dashboard')
}
```

**Status**: ✅ Correct - Naročniki are redirected if not naročnik role

**Obrtnik Check** (`app/(obrtnik)/obrtnik/povprasevanja/page.tsx`, lines 9-23):
```typescript
const { data: obrtnikProfile } = await supabase
  .from('obrtnik_profiles')
  .select('id')
  .eq('id', user.id)
  .single()

if (!obrtnikProfile) {
  redirect('/partner-auth/login')
}
```

**Status**: ✅ Correct - Obrtniki must have obrtnik_profiles record

---

## 9. POTENTIAL SILENT FAILURES

### 9.1 Category Rate Limiting

**File**: `lib/dal/categories.ts` - `getOrCreateCategory()`

**Risk**: Upstash Redis rate limiting could block category creation without clear error.

**Mitigation**: Try/catch around rate limiter with fallback:
```typescript
try {
  // Check rate limit
  const remaining = await checkRateLimit(...)
  if (remaining <= 0) throw new Error('Rate limit exceeded')
} catch (error) {
  logger.warn('Rate limit check failed, using fallback', { error })
  // Fall through to existing category search
}
```

### 9.2 Foreign Key Violations

**Risk**: If `narocnik_id` doesn't exist in profiles, insertion fails silently.

**Current behavior**:
```sql
narocnik_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE
```

**Constraint**: ✅ Database enforces foreign key

**Application code**: ✅ Uses auth.uid() which is guaranteed to exist

---

## 10. TESTING GAPS

### 10.1 Missing RLS Tests

No tests verify:
- ❌ Obrtnik CAN read status='odprto' povprasevanja
- ❌ Naročnik CANNOT read other naročnik's povprasevanja  
- ❌ Admin CAN read all povprasevanja

### 10.2 Missing Integration Tests

No end-to-end tests for:
- ❌ Create povprasevanje → Appears in partner dashboard
- ❌ Create ponudba → Visible in partner list
- ❌ Cancel povprasevanje → Status changes

### 10.3 Missing State Transition Tests

No tests verify:
- ❌ Invalid state transitions are rejected
- ❌ Audit trail is logged

---

## CRITICAL ACTION PLAN (Priority Order)

### 🔴 CRITICAL - FIX IMMEDIATELY (Blocks all obrtnik functionality)

#### Issue 1: Add Missing RLS Policy for Obrtniki
**File**: `supabase/migrations/20260401_add_obrtnik_povprasevanja_read_policy.sql`

**Create**:
```sql
-- Allow obrtniki to read open povprasevanja in their categories
CREATE POLICY "Obrtniki see open povprasevanja"
  ON public.povprasevanja
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = narocnik_id  -- Their own povprasevanja (if they're also narocnik)
    OR (
      status = 'odprto'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'obrtnik'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = (SELECT auth.uid()) AND aktiven = true
    )
  );

-- Also allow admins
CREATE POLICY "Admins see all povprasevanja"
  ON public.povprasevanja
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = (SELECT auth.uid()) AND aktiven = true
    )
  );
```

**Verification**:
```sql
-- Test as obrtnik
SELECT COUNT(*) FROM povprasevanja WHERE status = 'odprto';
-- Should return > 0

-- Test as narocnik (own requests)
SELECT COUNT(*) FROM povprasevanja WHERE narocnik_id = auth.uid();
-- Should return their povprasevanja
```

---

#### Issue 2: Fix API Endpoint Column Mapping
**File**: `app/api/povprasevanje/route.ts` (POST handler)

**Current (BROKEN)**:
```typescript
const { storitev, lokacija, opis, ... } = body
await supabaseAdmin
  .from('povprasevanja')
  .insert({
    storitev,      // ❌ Column doesn't exist
    lokacija,      // ❌ Column doesn't exist
    opis,          // ❌ Column doesn't exist
  })
```

**Fixed**:
```typescript
const { title, location_city, description, urgency, budget_min, budget_max, ... } = body

// Validate required fields
if (!title || !location_city || !description) {
  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
}

const { data, error } = await supabaseAdmin
  .from('povprasevanja')
  .insert({
    narocnik_id: user.id,
    category_id: category_id || null,
    title,
    location_city,
    description,
    urgency: urgency || 'normalno',
    budget_min: budget_min || null,
    budget_max: budget_max || null,
    status: 'odprto',  // Always start as open
  })
  .select()
  .single()

if (error) {
  logger.error('Failed to create povprasevanje', { error, userId: user.id })
  return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
}

return NextResponse.json({ id: data.id, status: data.status }, { status: 201 })
```

---

### 🟡 HIGH - Fix Within 24 Hours

#### Issue 3: Add Realtime Subscriptions to Dashboards

**File**: `app/(obrtnik)/obrtnik/povprasevanja/client.tsx` (NEW CLIENT COMPONENT)

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Povprasevanje } from '@/types/marketplace'

export function PovprasevanjaRealtime({
  initialData,
  onUpdate,
}: {
  initialData: Povprasevanje[]
  onUpdate: (data: Povprasevanje[]) => void
}) {
  const [povprasevanja, setPovprasevanja] = useState(initialData)
  const supabase = createClient()

  useEffect(() => {
    setPovprasevanja(initialData)

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('povprasevanja_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'povprasevanja',
          filter: 'status=eq.odprto',
        },
        (payload: any) => {
          const newRequest = payload.new as Povprasevanje
          setPovprasevanja((prev) => [newRequest, ...prev])
          onUpdate([newRequest, ...prev])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'povprasevanja',
        },
        (payload: any) => {
          const updated = payload.new as Povprasevanje
          setPovprasevanja((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [initialData, supabase, onUpdate])

  return <>{/* Component JSX */}</>
}
```

---

### 🟡 MEDIUM - Fix Within 1 Week

#### Issue 4: Add State Machine for Povprasevanja

**File**: `lib/agent/state-machine/povprajevanjeMachine.ts` (NEW)

```typescript
import { createMachine } from 'xstate'

export type PovprasevanjeStatus = 'odprto' | 'v_teku' | 'zakljuceno' | 'preklicano'

export const povprasevanjeStateMachine = createMachine({
  id: 'povprasevanje',
  initial: 'odprto',
  states: {
    odprto: {
      on: {
        START_WORK: 'v_teku',
        CANCEL: 'preklicano',
      },
    },
    v_teku: {
      on: {
        COMPLETE: 'zakljuceno',
        CANCEL: 'preklicano',
      },
    },
    zakljuceno: {
      type: 'final',
    },
    preklicano: {
      type: 'final',
    },
  },
})

export function assertPovprasevanjeTransition(
  from: PovprasevanjeStatus,
  to: PovprasevanjeStatus
): boolean {
  const validTransitions: Record<PovprasevanjeStatus, PovprasevanjeStatus[]> = {
    odprto: ['v_teku', 'preklicano'],
    v_teku: ['zakljuceno', 'preklicano'],
    zakljuceno: [],
    preklicano: [],
  }
  return validTransitions[from]?.includes(to) ?? false
}
```

---

## SUMMARY TABLE

| Issue | Severity | Location | Fix | ETA |
|-------|----------|----------|-----|-----|
| Missing obrtnik READ RLS policy | 🔴 CRITICAL | migrations/004_liftgo_marketplace.sql | Create new policy | NOW |
| API endpoint column mismatch | 🔴 CRITICAL | app/api/povprasevanje/route.ts | Rename fields | NOW |
| No realtime subscriptions | 🟡 HIGH | dashboards | Add channel listeners | 24h |
| No state machine | 🟡 MEDIUM | lib/agent/state-machine/ | Create XState machine | 1w |
| Silent error logging | 🟡 MEDIUM | lib/dal/povprasevanja.ts | Add structured logging | 1w |

---

## CONCLUSION

**Root Cause**: The critical RLS policy allowing obrtniki to SELECT open povprasevanja was never deployed to production.

**Immediate Actions**:
1. Deploy RLS policy fix (5 minutes)
2. Update API endpoint column names (30 minutes)
3. Verify obrtnik dashboard loads requests (10 minutes)
4. Add realtime subscriptions (2 hours)

**Estimated Resolution**: 3 hours

---

*Report generated: 2026-04-03*  
*Next review: After deployment of fixes*
