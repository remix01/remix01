# Old Partner System → New Obrtnik System Integration

## Overview
Integrated the old partner authentication system with the new obrtnik marketplace system. Old partners can now access marketplace requests and transition to the new system.

## Files Created

### 1. `/app/partner-dashboard/povprasevanja/page.tsx` (NEW)
Server component that displays open marketplace requests to old-system partners.

**Features:**
- Fetches open povprasevanja from `povprasevanja` table
- Shows category name, location, budget, and description preview
- Urgency badges (Pospešeno, Novo, Odprto) based on creation time
- "Pošlji ponudbo" button links to `/obrtnik/povprasevanja` (new system)
- Empty state when no requests available
- Responsive card-based layout matching partner-dashboard design

**Data fetched:**
```sql
SELECT *, categories(name, icon_name), profiles(location_city)
FROM povprasevanja
WHERE status = 'odprto'
ORDER BY created_at DESC
LIMIT 20
```

## Files Modified

### 1. `/lib/supabase/proxy.ts` (UPDATED)
**Extended route protection logic for /partner-dashboard:**

Previous logic:
- Check if user exists → redirect to login if not
- Check if partner exists in old system → redirect to signup if not

New logic (extended, not replaced):
- Check if user exists → redirect to login if not
- Check if partner record exists in old `partners` table
  - If YES → allow access (old system partner)
  - If NO → check new system `profiles` table for obrtnik profile
    - If obrtnik profile exists → allow access (new system user)
    - If neither exists → redirect to signup

**Purpose:** Allows both old partners and new obrtnik users to access partner-dashboard while ensuring protection against unauthorized access.

### 2. `/app/partner-dashboard/page.tsx` (UPDATED)
**Added navigation banner to main dashboard:**

- New banner card with blue background (#blue-50)
- Heading: "🆕 Nova povpraševanja dostopna"
- Description: "Preglejte povpraševanja naročnikov in pošljite ponudbo"
- Button: "Poglej povpraševanja →" linking to `/partner-dashboard/povprasevanja`
- Added required imports: `Link`, `Button`

**Location:** Inserted after welcome message, before tabs section

### 3. `/app/za-obrtnike/page.tsx` (UPDATED)
**Added login help text below signup buttons:**

- Added text below signup buttons: "Že imate račun?"
- Link text: "Prijavite se →" 
- Links to `/partner-auth/login`
- Styled as blue link with hover underline

**Purpose:** Reduces friction for existing partners trying to login from marketing page.

## Integration Flow

### User Journey - Old Partner:
1. Partner logs in via `/partner-auth/login`
2. `proxy.ts` checks:
   - User exists in auth ✅
   - Partner record in old `partners` table ✅
   - Access granted to `/partner-dashboard`
3. Dashboard loads with new navigation banner
4. Partner clicks "Poglej povpraševanja" banner
5. Views open marketplace requests in new system
6. Clicks "Pošlji ponudbo" → transitions to `/obrtnik/povprasevanja` (new system)

### User Journey - New System User (Already on Obrtnik):
1. User accesses `/partner-dashboard`
2. `proxy.ts` checks:
   - User exists in auth ✅
   - No partner record in old system ✗
   - Has obrtnik profile in new `profiles` table ✅
   - Access granted to `/partner-dashboard`
3. Same dashboard experience as old partners

### User Journey - Unregistered User:
1. User accesses `/partner-dashboard`
2. `proxy.ts` checks:
   - User exists in auth ✓ (or redirects to login)
   - No partner record in old system ✗
   - No obrtnik profile in new system ✗
   - Redirect to `/partner-auth/sign-up`

## Database Schema Requirements

No schema changes needed. System uses existing tables:
- `auth.users` - Authentication
- `partners` - Old system partner data
- `profiles` - New system obrtnik profiles
- `povprasevanja` - New system marketplace requests
- `categories` - Service categories

## Route Protection Summary

Protected routes now support both systems:
- `/partner-dashboard` - Old partners OR new obrtnik users
- `/partner-dashboard/povprasevanja` - Same protection as parent
- `/partner-auth/*` - Public routes (login, signup, success pages)

## No Breaking Changes
✅ Existing partner login flows unchanged
✅ Existing obrtnik system unaffected
✅ Database queries backward compatible
✅ No user data migration required
✅ Opt-in access to new marketplace features

## Next Steps (Optional)
1. Add email notification when new povprasevanja arrive
2. Update partner dashboard to show stats from both systems
3. Create data migration script for partners transitioning to new system
4. Add onboarding wizard for accessing new marketplace features
