# Diagnostic Report: Missing Povprasevanja in Dashboards

## Executive Summary

I've completed a comprehensive analysis of the LiftGo platform's data flow for povprasevanja (customer requests). The codebase shows **well-structured architecture with no critical bugs**, but there are several potential issues that could prevent new requests from appearing in dashboards.

---

## 1. DATABASE & SCHEMA

### Povprasevanja Table Structure
- **Primary Key**: `id` (UUID)
- **User Association**: `narocnik_id` (foreign key to profiles)
- **Status Field**: `status` (enum: 'odprto', 'v_teku', 'zakljuceno', 'preklicano')
- **Category**: `category_id` (foreign key to categories)
- **Location**: `location_city` (text)

### Key Columns
- `title` - Povprasevanje title
- `description` - Detailed description
- `urgency` - Priority level
- `budget_min` / `budget_max` - Budget range
- `created_at` - Timestamp
- `attachment_urls` - Array of file URLs

---

## 2. DATA FLOW ARCHITECTURE

### Submission Flow
```
Form (novo-povprasevanje/page.tsx)
  ↓
handleSubmit() 
  ↓
createPovprasevanje() [lib/dal/povprasevanja.ts]
  ↓
supabase.from('povprasevanja').insert()
  ↓
Returns: Povprasevanje object with relations
```

### Dashboard Fetch Flow
```
Dashboard Component (SSR or Client)
  ↓
fetch() or supabase.from()
  ↓
Query povprasevanja with filters
  ↓
Apply status/role filtering
  ↓
Render list
```

---

## 3. CRITICAL FINDINGS

### ✅ WORKING CORRECTLY
1. **Form Submission** - `createPovprasevanje()` function properly inserts with:
   - Auto-created categories support
   - Email notifications to admin and obrtnik
   - Push notifications to craftspeople
   - Proper error handling and logging

2. **Data Access Layer** - DAL functions are comprehensive:
   - `getNarocnikPovprasevanja(narocnikId)` - Gets user's own requests
   - `getOpenPovprasevanjaForObrtnik()` - Gets open requests for craftspeople
   - `listPovprasevanja()` - Generic listing with filters

3. **Query Structure** - Queries use proper Supabase joins:
   - Relations: `narocnik:profiles`, `category:categories`
   - Counting: `ponudbe(id, status)` for offer counts

### ⚠️ POTENTIAL ISSUES

#### Issue 1: Status Filter Mismatch
**Location**: Multiple dashboard pages
**Problem**: New requests might be inserted with wrong status

**In `/app/api/povprasevanje/route.ts` (line 23)**:
```typescript
status: obrtnik_id ? 'dodeljeno' : 'odprto'
```

**But**:
- Narocnik dashboard filters: no status filter (gets all)
- Obrtnik dashboard filters: `eq('status', 'odprto')` ONLY
- Admin dashboard may filter by status

**Impact**: If a request is created with status='dodeljeno', it won't appear in the obrtnik's open list.

#### Issue 2: Missing RLS Policy Checks
**Concern**: No visible RLS policy verification
- Narocnik should only see their own requests
- Obrtnik should see requests they can apply to
- Admin should see all requests

**If RLS is restrictive**, newly inserted records might be:
- Not visible due to auth user mismatch
- Blocked by timing issues (insertion before RLS evaluation)

#### Issue 3: Dashboard Fetch Timing
**Location**: Various dashboard pages
**Problem**: Different fetch strategies could miss new data

**Narocnik Dashboard** (`app/(narocnik)/povprasevanja/page.tsx`):
- **Server-side rendering** → fetches at page load
- Query: `getNarocnikPovprasevanja(user.id)` with `order('created_at', desc)`
- **No real-time subscription** - user must refresh page

**Obrtnik Dashboard** (`app/(obrtnik)/obrtnik/povprasevanja/page.tsx`):
- **Server-side rendering** → fetches `getOpenPovprasevanjaForObrtnik()`
- Only gets requests with `status='odprto'`
- **No real-time subscription** - won't auto-update

**Admin Dashboard** (`app/admin/povprasevanja/page.tsx`):
- **Client-side rendering** → fetches via Supabase client
- Has filtering for status
- **No real-time subscription** - won't auto-update

**Impact**: New requests only appear after manual page refresh.

#### Issue 4: Category Auto-Creation Rate Limiting
**Location**: `lib/dal/categories.ts`
**Code**:
```typescript
export async function getOrCreateCategory(
  name: string,
  userId?: string,
  ipAddress?: string
): Promise<string>
```

**Potential Issue**: Rate limiting checks (`checkUserRateLimit`, `checkIpRateLimit`) might fail if:
- Redis connection is down
- User has already created too many categories
- IP-based limit exceeded

**Impact**: Povprasevanja creation fails with "Rate limit exceeded" error.

#### Issue 5: Missing Status Initialization
**Location**: `lib/dal/povprasevanja.ts` (createPovprasevanje)
**Issue**: Function doesn't explicitly set status if not provided

```typescript
export async function createPovprasevanje(
  povprasevanje: PovprasevanjeInsert,
  ...
): Promise<Povprasevanje | null> {
  ...
  const insertData = {
    ...povprasevanje,
    category_id: categoryId,
  }
```

**Problem**: If `povprasevanje.status` is undefined, it might default to NULL instead of 'odprto'.

**Impact**: Dashboards filtering by `status='odprto'` won't find the request.

#### Issue 6: Supabase Client vs Admin Client
**Location**: Multiple API routes
**Issue**: Inconsistent client usage

- `/api/povprasevanje/route.ts` uses `supabaseAdmin` for insert (correct)
- But initial auth check uses regular client
- This could cause mismatches

#### Issue 7: Column Name Mismatch (Schema vs Code)
**In `/app/api/povprasevanje/route.ts` (line 20)**:
```typescript
const { storitev, lokacija, opis, stranka_ime, ... } = body
```

**But in `createPovprasevanje()` DAL**:
```typescript
export async function createPovprasevanje(
  povprasevanje: PovprasevanjeInsert,
  ...
): Promise<Povprasevanje | null> {
```

**Question**: Are the column names consistent?
- Legacy API uses: `storitev`, `lokacija`, `opis`, `stranka_ime`
- New form uses: `title`, `location_city`, `description`, etc.

**This could cause**: Requests submitted via different paths to have different column values, causing visibility issues.

---

## 4. DASHBOARD COMPARISON

| Dashboard | Location | Fetch Type | Status Filter | Real-time | Auth Check |
|-----------|----------|-----------|---|---|---|
| Narocnik (My Requests) | `(narocnik)/povprasevanja` | SSR | None | No | Yes ✅ |
| Obrtnik (Open Requests) | `(obrtnik)/povprasevanja` | SSR | `status='odprto'` | No | Yes ✅ |
| Partner (Browse Open) | `partner-dashboard/povprasevanja` | SSR | `status='odprto'` | No | Query issue ⚠️ |
| Admin | `admin/povprasevanja` | Client | Configurable | No | Yes ✅ |
| Stranka | `dashboard/stranka/povprasevanja` | SSR | None | No | Yes ✅ |

---

## 5. ROOT CAUSE ANALYSIS

### Most Likely Cause: **Status Field Not Set Correctly**

**Scenario**: 
1. User submits request via new form (`novo-povprasevanje/page.tsx`)
2. `createPovprasevanje()` is called with `povprasevanje` object
3. `povprasevanje.status` is **not set** (undefined)
4. Insert happens without explicit status → defaults to NULL
5. Dashboards filter `WHERE status='odprto'` → **doesn't match NULL**
6. Request doesn't appear in any dashboard

**Evidence**: 
- The new form doesn't show a status selector
- DAL doesn't set default status when not provided
- Old API route sets `status: obrtnik_id ? 'dodeljeno' : 'odprto'`
- But new form path skips this logic

---

## 6. RECOMMENDED DIAGNOSTIC STEPS

### Step 1: Check Database Directly
```sql
SELECT id, title, status, narocnik_id, created_at 
FROM povprasevanja 
ORDER BY created_at DESC 
LIMIT 10;
```

**Look for**: 
- Null status values
- Mismatched narocnik_id
- Unexpected created_at timestamps

### Step 2: Add Console Logging
Add to `lib/dal/povprasevanja.ts` createPovprasevanje():
```typescript
console.log('[v0] Creating povprasevanje:', { 
  narocnik_id: insertData.narocnik_id,
  status: insertData.status,
  category_id: insertData.category_id,
  title: insertData.title
})
console.log('[v0] Insert result:', data)
```

### Step 3: Check RLS Policies
Query Supabase dashboard:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'povprasevanja';
```

Ensure:
- SELECT allows user to see own requests
- Obrtnik RLS doesn't block seeing public requests

### Step 4: Check Category Creation
If using custom categories, verify `checkUserRateLimit()` and `checkIpRateLimit()` aren't failing.

### Step 5: Verify Column Consistency
Check if requests from `/api/povprasevanje` route use legacy columns:
- `storitev` vs `title`
- `lokacija` vs `location_city`
- `opis` vs `description`

---

## 7. CODE FIXES NEEDED

### Fix 1: Ensure Default Status in createPovprasevanje()
```typescript
export async function createPovprasevanje(
  povprasevanje: PovprasevanjeInsert,
  ...
): Promise<Povprasevanje | null> {
  ...
  const insertData = {
    ...povprasevanje,
    category_id: categoryId,
    status: povprasevanje.status || 'odprto',  // ← ADD THIS
  }
  ...
}
```

### Fix 2: Add Real-time Subscriptions
Each dashboard should subscribe to changes:
```typescript
supabase
  .channel(`povprasevanja_changes_${user.id}`)
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'povprasevanja' },
    (payload) => {
      console.log('[v0] New povprasevanje:', payload)
      fetchData() // Re-fetch
    }
  )
  .subscribe()
```

### Fix 3: Add Rate Limit Error Handling
```typescript
try {
  categoryId = await getOrCreateCategory(...)
} catch (error) {
  if (error.message.includes('Rate limit')) {
    throw new Error('Prekoračili ste limit ustvarjanja kategorij')
  }
  throw error
}
```

### Fix 4: Unify API Column Names
Ensure both `/api/povprasevanje` and `createPovprasevanje()` use same column names.

---

## 8. SUMMARY TABLE

| Component | Status | Issue | Severity | Fix |
|-----------|--------|-------|----------|-----|
| Database Schema | ✅ OK | None identified | - | - |
| Form Submission | ⚠️ Partial | Missing status default | High | Add `status: povprasevanje.status \|\| 'odprto'` |
| DAL Layer | ✅ OK | No bugs found | - | - |
| Dashboard Fetch | ⚠️ Works | No real-time updates | Medium | Add Supabase subscriptions |
| Category Auto-creation | ⚠️ Risky | Rate limiting could block | Medium | Better error handling |
| RLS Policies | ❓ Unknown | Not verified in code | Unknown | Check Supabase dashboard |
| Column Consistency | ❓ Unknown | Legacy vs new names | Medium | Verify mapping |

---

## Conclusion

The LiftGo platform has a **well-designed architecture**, but new povprasevanja aren't appearing in dashboards likely due to:

1. **Missing status default** (HIGH priority) - Requests inserted with NULL status won't match `status='odprto'` filters
2. **No real-time updates** (MEDIUM priority) - Users must refresh pages manually
3. **Potential RLS restrictions** (MEDIUM priority) - Needs database verification
4. **Rate limiting failures** (LOW priority) - Category creation could fail silently

**Immediate Actions**:
- Set default status to 'odprto' in `createPovprasevanje()`
- Add console logging to trace submission flow
- Query database to verify insertion
- Check Supabase RLS policies
- Add real-time subscriptions to dashboards
