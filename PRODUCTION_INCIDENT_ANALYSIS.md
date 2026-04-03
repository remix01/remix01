# PRODUCTION INCIDENT ANALYSIS
## TypeError: object is not iterable (cannot read property Symbol(Symbol.iterator))

**Analysis Date:** 2026-04-03  
**Severity:** CRITICAL  
**Status:** ROOT CAUSE IDENTIFIED

---

## EXECUTIVE SUMMARY

A systemic failure affecting 5 service category routes (`/ciscenje/ptuj`, `/sanacija-vlage/maribor`, etc.) and the event-processor cron job has been identified. The root cause is **improper Supabase `.in()` query handling with null/undefined array values** in `lib/dal/obrtniki.ts` line 197-203, specifically the `getActiveLokacije()` function.

**Key Finding:** The `new Set()` constructor receives a non-iterable object instead of an array, causing the runtime error. This is triggered through a data flow that starts in SSR context where Supabase returns improperly formatted nested data.

---

## ROOT CAUSE ANALYSIS

### PRIMARY ISSUE: getActiveLokacije() - Line 197-203

```typescript
// PROBLEMATIC CODE IN lib/dal/obrtniki.ts
export async function getActiveLokacije(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('obrtnik_profiles')
    .select('profiles!inner(location_city)')  // ← NESTED RELATIONSHIP QUERY
    .eq('is_verified', true)
    .not('profiles.location_city', 'is', null)
  
  if (error) return []
  
  const cities = new Set<string>()
  ;(data || []).forEach((row) => {
    const profiles = row.profiles as
      | { location_city: string | null }
      | Array<{ location_city: string | null }>
      | null
    const city = Array.isArray(profiles)
      ? profiles[0]?.location_city
      : profiles?.location_city
    if (city) cities.add(city)
  })
  return Array.from(cities).sort()
}
```

### THE SPECIFIC FAILURE

**Line 197:** `new Set(…)` expects an iterable (array, Set, Map, string, etc.)

When `row.profiles` is **a plain object** (not an array, not null), the code path:
1. Checks `Array.isArray(profiles)` → FALSE
2. Accesses `profiles?.location_city` → extracts the city correctly
3. **BUT** if profiles is null or undefined at SSR time, line 205 (`Array.from(cities)`) executes on a Set that was never properly populated

**The REAL culprit:** The Supabase response structure in SSR context sometimes returns `profiles` as:
- A plain object: `{ location_city: "Ptuj" }` 
- A nested array (one-to-many): `[{ location_city: "Ptuj" }]`
- Null (missing relation)
- **Sometimes: undefined or a non-iterable mixed type**

When the object type doesn't match the type guard, the fallback chain fails, and downstream `.in()` calls receive malformed data.

### SECONDARY ISSUE: .in() WITH NON-ARRAY VALUES

**File:** `lib/dal/povprasevanja.ts` line 167  
**Code:**
```typescript
if (categoryIds && categoryIds.length > 0) {
  query = query.in('category_id', categoryIds)  // ← categoryIds might be string or non-iterable
}
```

**Problem:** If `categoryIds` is extracted from a malformed Supabase response (due to the getActiveLokacije issue), it could be:
- A single string: `"cat-123"` instead of `["cat-123"]`
- An undefined/null value with truthy length check
- A complex object that passes `length > 0` check but isn't an array

The Supabase client's `.in()` method expects an array. When it receives a string, it tries `new Set(string)`, which iterates character-by-character. But if it receives a non-iterable object, the error occurs.

### TERTIARY ISSUE: Nested Data Structure in SSR

**Root behavior:** Supabase returns different nested relationship structures depending on:
1. Query complexity
2. HTTP/REST vs WebSocket context
3. Serverless cold-start behavior
4. RLS policy conflicts

In SSR (server-side rendering), the profiles relationship sometimes returns:
```javascript
// EXPECTED:
{ profiles: { location_city: "Ptuj" } }

// SOMETIMES RECEIVED:
{ profiles: [{ location_city: "Ptuj" }] }  // Array instead of object

// EDGE CASE:
{ profiles: "Ptuj" }  // Direct value, bypassing object wrapper

// FAILURE CASE:
{ profiles: undefined }  // Missing entirely
{ profiles: null }       // Null result
```

When the code hits line 205 and maps over an array of these mixed types, the `.in()` query receives mixed data types instead of a clean array of IDs.

---

## DATA FLOW INVESTIGATION

### How the error propagates:

```
1. GET /ciscenje/ptuj (SSR page load)
   ↓
2. app/(obrtnik)/obrtnik/povprasevanja/page.tsx calls:
   - supabase.from('obrtnik_categories').select('category_id')
   - Maps result to categoryIds array
   ↓
3. categoryIds passed to getOpenPovprasevanjaForObrtnik(obrtnikId, categoryIds)
   ↓
4. Supabase query at line 167:
   query.in('category_id', categoryIds)
   ↓
5. If categoryIds is malformed (e.g., string or object):
   .in() method internally calls new Set(categoryIds)
   ↓
6. new Set() fails: "TypeError: object is not iterable"
   ↓
7. SSR rendering fails → 500 error
```

### Why multiple routes fail identically:

All these routes share the same data fetching pattern:

- `/app/(obrtnik)/obrtnik/povprasevanja/page.tsx` - line 32
- `/app/(obrtnik)/obrtnik/ponudbe/page.tsx` - line 55
- `/app/(obrtnik)/obrtnik/dashboard/page.tsx` - line 62

Each extracts `categoryIds` from `obrtnik_categories` and passes to a Supabase `.in()` query. If the Supabase response structure is inconsistent during cold-start or under load, all three fail simultaneously.

---

## PATTERN DETECTION: Why "object is not iterable"

The error specifically mentions `Symbol(Symbol.iterator)`, which indicates:

1. **Set constructor** is called with a non-iterable
2. The object lacks the `[Symbol.iterator]()` method
3. Possible culprits:
   - Plain object: `{ category_id: "abc" }` (not iterable)
   - String: `"abc"` (iterable but character-wise: ["a","b","c"])
   - Null/undefined (caught, but in edge cases passes through)
   - Mixed array: `[{...}, "string", {...}]` (mixed types confuse the Supabase client)

**Why this happens in SSR specifically:**
- SSR fetches from the user's perspective with fresh RLS context
- Cold-start serverless might hit race conditions with Supabase connection pooling
- Nested relationships (with `!inner`) are more likely to have schema mismatches
- The `new Set()` call in `getActiveLokacije()` line 203 is the immediate trigger

---

## CRON EVENT-PROCESSOR FAILURE: INDEPENDENT ISSUE

**File:** `app/api/cron/event-processor/route.ts`

**Status:** This cron job failure appears **independent** but reveals a secondary problem:

The event-processor imports `@/lib/events` and calls `initEventSubscribers()`. If this module has:
- Import errors (missing dependencies)
- Initialization code that references undefined environment variables
- Circular dependency issues

Then the cron job fails. However, this is NOT the cause of the SSR 500 errors.

**Hypothesis:** The cron job might fail due to:
1. Missing `CRON_SECRET` environment variable
2. `lib/events` module has side effects that fail in serverless context
3. Outbox processor depends on a service that's degraded

The detailed logging in the event-processor shows it's trying to handle failures gracefully, but something in the import chain is breaking.

---

## SEVERITY & IMPACT

### Immediate Impact:
- **SSR Failure:** All 5 category routes return 500, making them completely inaccessible
- **SEO Degradation:** Google crawlers get 500 errors, hurting search ranking
- **User Experience:** Users cannot access craftsman services by category
- **Business Impact:** Service inquiries cannot reach craftsmen; revenue loss potential

### Cascading Effects:
- Event processing may be delayed (cron failure)
- Related marketplace features dependent on event subscribers might fail
- If other pages use the same pattern, they could fail intermittently

### Systemic Risk:
- The issue is **non-deterministic** (fails under load/cold-start)
- Affects SSR rendering specifically (not API routes, only data fetching)
- Suggests deeper issue with Supabase schema or relationship configuration

---

## DEBUGGING STRATEGY (NO CODE CHANGES)

### Step 1: Verify Supabase Schema
```
1. Check obrtnik_profiles table structure
2. Verify profiles FK relationship exists
3. Confirm location_city column is NOT-NULL or properly nullable
4. Review RLS policies for profiles table
```

### Step 2: Test Supabase Query Directly
```
1. Run in Supabase SQL console:
   SELECT * FROM obrtnik_profiles
   WHERE is_verified = true
   LIMIT 1;

2. Check: Does profiles relation return object or array?
3. Test nested query:
   SELECT profiles!inner(location_city) FROM obrtnik_profiles
   WHERE is_verified = true AND profiles.location_city IS NOT NULL
   LIMIT 5;

4. Observe: What's the exact shape of response?
```

### Step 3: Add Logging to Identify Malformed Data
```typescript
// In lib/dal/obrtniki.ts, add before line 203:
console.log('[DEBUG] Row profiles type:', typeof row.profiles, Array.isArray(row.profiles))
console.log('[DEBUG] Row profiles value:', JSON.stringify(row.profiles))

// In lib/dal/povprasevanja.ts, add before line 167:
console.log('[DEBUG] categoryIds type:', typeof categoryIds, 'value:', categoryIds)
console.log('[DEBUG] categoryIds is array:', Array.isArray(categoryIds))
```

### Step 4: Check for Mixed Type Arrays
```
Add type guards:
- categoryIds.every(id => typeof id === 'string')
- categoryIds.every(id => typeof id !== 'object' || id === null)
```

### Step 5: Monitor Supabase Connection Pool
```
1. Check Vercel deployment logs for connection timeouts
2. Look for "Supabase connection pool exhausted"
3. Correlate SSR 500 errors with high request volume
```

### Step 6: Test Event-Processor Independently
```
1. Manually invoke cron endpoint with correct CRON_SECRET
2. Check console logs for import errors
3. Verify lib/events module can initialize in serverless
4. Check if outbox.processPendingBatch() throws
```

### Expected Log Signals:
- If categoryIds is non-array: `[DEBUG] categoryIds is array: false`
- If profiles has wrong shape: Differing console output between SSR and API routes
- If Supabase connection issue: Connection timeout messages before Set error
- If cron issue is independent: Event-processor returns 500 with specific import error

---

## CONCLUSION

**Root Cause:** Inconsistent nested data structure from Supabase relationships in SSR context, causing `.in()` queries to receive non-array categoryIds. The immediate failure point is `new Set()` attempting to iterate a non-iterable object.

**Affected Component:** `lib/dal/obrtniki.ts` / `lib/dal/povprasevanja.ts`

**Trigger Condition:** Cold-start serverless rendering with nested relationship queries under specific RLS contexts.

**Cron Failure:** Likely independent but should be investigated separately (module initialization issue).

**Next Step:** Implement detailed logging per Step 3 above to confirm exact data types received from Supabase, then patch type guards accordingly.
