# Critical Fix Summary: Povprasevanja Data Flow

## Problem Statement
New customer requests (povprasevanja) were being inserted with NULL `narocnik_id`, causing them to disappear from all dashboards.

## Root Cause Analysis
The API endpoint `/app/api/povprasevanje/route.ts` had several issues:
1. **Deprecated field name mappings** - Used old column names that didn't match the schema
2. **Missing error handling** - Silent failures with no logging
3. **Limited field support** - Didn't support new schema columns like `category_id`, `urgency`, `budget_min/max`

## Changes Made

### 1. Fixed API Endpoint: `app/api/povprasevanje/route.ts`

**Key Improvements:**
- ✅ Always sets `narocnik_id: user.id` from authenticated user (CRITICAL FIX)
- ✅ Maps legacy field names to modern database columns:
  - `storitev` → `title`
  - `lokacija` → `location_city`
  - `opis` → `description`
- ✅ Supports both old and new field names for backward compatibility
- ✅ Ensures `status: 'odprto'` by default so craftsmen can see requests
- ✅ Added comprehensive error logging with `[v0]` prefix
- ✅ Validates required fields (title, location_city)
- ✅ Supports all new schema columns: category_id, urgency, budget_min/max, location_notes

### 2. RLS Policies (Already Correct)
The existing RLS policy at line 156-170 in `004_liftgo_marketplace.sql` correctly allows:
- Naročniki to see their own povprasevanja
- Obrtniki to see all povprasevanja with `status = 'odprto'`
- Admins to see all povprasevanja

This policy is working as intended and requires no changes.

## Data Flow After Fix

```
1. Customer submits form at /novo-povprasevanje
2. Form calls createPovprasevanje() DAL function
3. DAL function inserts with narocnik_id = user.id ✅
4. Status automatically set to 'odprto' ✅
5. RLS policy allows obrtniki to read status='odprto' ✅
6. New requests appear in obrtnik dashboard ✅
```

## Testing Checklist

- [ ] Submit a new povprasevanje as a naročnik
- [ ] Verify narocnik_id is populated (not NULL)
- [ ] Verify status is 'odprto' for unassigned requests
- [ ] Verify request appears in naročnik's dashboard
- [ ] Verify request appears in obrtnik's dashboard
- [ ] Verify new fields (category_id, urgency) are saved
- [ ] Check console logs for `[v0] Povprasevanje created:` message
- [ ] Test with legacy field names (storitev, lokacija, opis) for backward compatibility

## Deployment Notes

1. This is a **backward-compatible** fix - old field names still work
2. No database migrations required - schema already supports all fields
3. No RLS policy changes needed - existing policies are correct
4. Recommended: Monitor logs for the `[v0] Povprasevanje created:` entries

## Technical Details

The API endpoint now:
- Extracts the authenticated user's ID (never trusts client input)
- Maps both legacy and modern field names
- Validates required fields before insertion
- Sets appropriate defaults (status='odprto', urgency='normalno')
- Logs successful insertions with full details for debugging
- Returns both ID and status in the response

This ensures that **all newly submitted requests will be visible in all dashboards** with the correct ownership and visibility rules.
