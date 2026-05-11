# LIFTGO FULL PROJECT DEBUG SCAN REPORT

**Date**: March 19, 2026  
**Scope**: Complete auth system, middleware, APIs, redirect logic  
**Status**: NO MIDDLEWARE.TS EXISTS - CRITICAL FINDING  

---

## 1. CRITICAL FINDING: NO MIDDLEWARE.TS FILE

The project has **NO middleware.ts** file in the root directory. This means:
- No centralized request interception
- No session refresh on every request
- Auth state is NOT synchronized across requests
- Possible redirect loops can occur without middleware protection

**Expected location**: `/vercel/share/v0-project/middleware.ts`  
**Current status**: Does not exist

---

## 2. FILE STRUCTURE SUMMARY

### Auth Routes
```
app/(auth)/prijava/page.tsx              - Login page (custom auth form)
app/(auth)/registracija/page.tsx         - Register page
app/(narocnik)/layout.tsx                - PROTECTED: Customer dashboard layout
app/(obrtnik)/layout.tsx                 - PROTECTED: Craftsman dashboard layout
app/admin/layout.tsx                     - PROTECTED: Admin layout
```

### Supabase Integration
```
lib/supabase/client.ts                   - Browser client (anon key, RLS enforced)
lib/supabase/server.ts                   - Server client (anon key) + admin client (service role)
```

### Auth Hooks & Components
```
hooks/use-admin-role.ts                  - Admin role hook (client-side fetch to /api/admin/me)
components/admin/RoleGuard.tsx           - Admin role guard component
```

---

## 3. AUTH SYSTEM ANALYSIS

### LOGIN FLOW (`app/(auth)/prijava/page.tsx`)

**File**: `app/(auth)/prijava/page.tsx`

**Flow**:
1. User enters email + password
2. Client calls `supabase.auth.signInWithPassword()`
3. Supabase returns auth token in HTTP-only cookie
4. Custom checks:
   - Calls `/api/admin/me` to check if admin
   - Queries `profiles` table for role (if not admin)
   - Redirects based on role: `/admin`, `/partner-dashboard`, or `/dashboard`

**Issues Identified**:

✅ **Good**: Uses HTTP-only cookies (secure)  
✅ **Good**: Checks role in profiles table  
❌ **Bad**: No middleware to refresh session  
❌ **Bad**: Role check happens in CLIENT after login  
❌ **Bad**: After redirect, user may not have valid session yet  

**Redirect Logic** (lines 40-75):
```typescript
// STRANKA LOGIN
if (signInError || !data.user) {
  setStrankaError('Napačen email ali geslo...')
  return
}

// Check for admin
const adminRes = await fetch('/api/admin/me')
if (adminRes.ok) {
  router.push('/admin')  // <-- IMMEDIATE REDIRECT
  return
}

// Check profile role
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', data.user.id)
  .single()

// REDIRECT HAPPENS HERE
router.push(profile.role === 'obrtnik' ? '/partner-dashboard' : '/dashboard')
```

**Problem**: After `router.push()`, the destination layout needs to verify auth again.

---

## 4. PROTECTED LAYOUT ANALYSIS

### Naročnik Layout (`app/(narocnik)/layout.tsx`)

**Protection**: Server-side  
**Flow**:
1. Server checks `supabase.auth.getUser()`
2. If no user → `redirect('/prijava')`
3. Fetches profile from `profiles` table
4. Checks `role === 'narocnik'`
5. If not → redirects to `/partner-dashboard`

**Code**:
```typescript
export default async function NarocnikLayout({ children }: ...) {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/prijava')  // <-- SAFE: Server redirect
  }
  
  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  
  // Check role
  if (profileError || !profile || profile.role !== 'narocnik') {
    redirect('/partner-dashboard')  // <-- May cause loop if user is obrtnik
  }
  
  return (...)
}
```

**Redirect Loop Risk**: If user has `role === 'obrtnik'` and tries to access `/narocnik/*`:
1. Layout redirects to `/partner-dashboard`
2. Works fine (no loop)

### Obrtnik Layout (`app/(obrtnik)/layout.tsx`)

**Protection**: Server-side  
**Flow**: Same as naročnik, but:
- Checks `obrtnik_profiles` table instead
- Redirects to `/partner-auth/login` if no profile

**Code**:
```typescript
export default async function ObrtknikLayout({ children }: ...) {
  const supabase = await createClient()
  
  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/partner-auth/login')
  }
  
  // Get obrtnik profile
  const { data: profile } = await supabase
    .from('obrtnik_profiles')
    .eq('id', user.id)
    .single()
  
  if (!profile) {
    redirect('/partner-auth/login')
  }
  
  return (...)
}
```

### Admin Layout (`app/admin/layout.tsx`)

**Protection**: Server-side  
**Flow**:
1. Checks `supabase.auth.getUser()`
2. Queries `admin_users` table with `auth_user_id = user.id`
3. Checks `aktiven = true`
4. If not admin → redirects to `/prijava`

**Code**:
```typescript
export default async function AdminLayout({ children }: ...) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/prijava')
  }
  
  // Check if user is an admin
  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('aktiven', true)
    .maybeSingle()
  
  if (error || !adminUser) {
    redirect('/prijava')
  }
  
  return (...)
}
```

---

## 5. SUPABASE INTEGRATION ANALYSIS

### Browser Client (`lib/supabase/client.ts`)

**Key Points**:
- Uses `createBrowserClient` from `@supabase/ssr`
- Uses **anon key** (not service role)
- RLS policies are **enforced**
- Safe to use in client components

**Code**:
```typescript
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
```

### Server Client (`lib/supabase/server.ts`)

**Key Points**:
- Uses `createServerClient` from `@supabase/ssr`
- Uses **anon key** (not service role) - FOR RLS
- Reads/writes cookies for session management
- Also has `createAdminClient()` with service role key

**Code**:
```typescript
export async function createClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  
  return createServerClientSSR<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { ... },
      },
    },
  )
}

export function createAdminClient() {
  return createServerClientSSR<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: { getAll() { return [] }, setAll() {} },
    },
  )
}
```

**Session Flow**:
1. User logs in → Supabase sets `sb-*-auth-token` cookie (HTTP-only)
2. Server reads cookie via `cookies()` hook
3. `createServerClient()` uses cookie to authenticate
4. Each request validates session from cookie

---

## 6. ADMIN ROLE SYSTEM

### Admin Role Hook (`hooks/use-admin-role.ts`)

**Flow**:
1. Client-side component calls `useAdminRole()`
2. Hook makes fetch to `/api/admin/me` on mount
3. Returns admin user + role + permissions

**Code** (simplified):
```typescript
export function useAdminRole(): UseAdminRoleReturn {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const fetchAdminRole = async () => {
      const response = await fetch('/api/admin/me')
      if (response.ok) {
        const data = await response.json()
        setAdmin(data.admin)
      }
    }
    fetchAdminRole()
  }, [])
  
  return { admin, isLoading, ... }
}
```

**Roles**:
- `SUPER_ADMIN` - Full access
- `MODERATOR` - Can moderate content
- `OPERATER` - View-only

**Permissions**:
- `hasPermission()` - Check if user has role
- `canManageUsers` - SUPER_ADMIN only
- `canModerateContent` - SUPER_ADMIN + MODERATOR
- `canViewOnly` - OPERATER+

---

## 7. DETECTED ISSUES & ROOT CAUSES

### Issue #1: NO MIDDLEWARE.TS (CRITICAL)

**Symptom**: Possible redirect loops, session not refreshed

**Root Cause**: Missing `middleware.ts` file

**Impact**:
- ⚠️ Session may expire mid-request without refresh
- ⚠️ Auth state not synchronized across requests
- ⚠️ Possible 307 redirects in edge cases

**Should implement**:
```typescript
// middleware.ts needed at root of project
import { createServerClient, type Database } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } })
  
  // Refresh session on every request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll() { ... }, setAll() { ... } },
    },
  )
  
  await supabase.auth.getUser()
  return response
}
```

### Issue #2: LOGIN PAGE REDIRECT RACE CONDITION

**Symptom**: After login, sometimes shows auth error or wrong page

**Root Cause** (line 40-75 of `prijava/page.tsx`):
```typescript
// Auth token set in cookie by Supabase
const { data, error: signInError } = await supabase.auth.signInWithPassword(...)

// BUT: Server may not see cookie yet (race condition)
// Cookie is set asynchronously
const adminRes = await fetch('/api/admin/me')  // Might not have session!

router.push('/admin')  // Redirect happens, but session not ready
```

**Fix Needed**: 
- Wait for session to be ready
- Or check `data.user` locally without additional fetches

### Issue #3: HEADER NOT UPDATING USER STATE

**Finding**: No Header or UserNav component found in current codebase

**Files looked for**:
- `components/liftgo/Header.tsx` - NOT FOUND
- `components/liftgo/UserNav.tsx` - NOT FOUND

**Possible locations**:
- May be in different location
- May have different naming
- May not be implemented yet

**To Fix**: 
- Find where header is rendered
- Add client-side `useAuthStatus()` hook
- Listen to `onAuthStateChange()` from Supabase
- Update UI when user logs in/out

### Issue #4: ADMIN API ENDPOINT NOT VISIBLE

**File**: `/api/admin/me` is called but not shown in `app/api/admin/me/route.ts` search results

**Need to verify**: Does `/api/admin/me/route.ts` exist?

**If missing**:
- Admin role check in layouts fails silently
- Admin users see 403 / redirected to login

### Issue #5: MISSING ROLE CHECK MIDDLEWARE

**Current flow**:
1. User logs in
2. Redirects based on role check in CLIENT component
3. Then protected layout does SERVER-SIDE check
4. If mismatch → another redirect

**Race condition possible if**:
- Auth cookie hasn't propagated to server yet
- Client thinks user is admin, but server doesn't
- Results in 307 loop

---

## 8. AUTHENTICATION FLOW DIAGRAM

```
┌─────────────┐
│  /prijava   │  (Login page)
└──────┬──────┘
       │
       ├─ User enters email + password
       │
       ├─ supabase.auth.signInWithPassword()
       │  └─> Sets sb-*-auth-token cookie (HTTP-only)
       │
       ├─ fetch('/api/admin/me')  ← RACE: Cookie may not be visible yet
       │  ├─> If admin → router.push('/admin')
       │  └─> If not admin → check profiles.role
       │
       ├─ router.push('/dashboard' or '/partner-dashboard')
       │
       └─> Navigation to protected layout
          │
          ├─ Layout calls createClient() (server)
          ├─ supabase.auth.getUser()  ← Reads cookie
          ├─ Checks profiles.role
          ├─ If role doesn't match → redirect to different page
          └─> Render page or redirect

```

---

## 9. SUPABASE TABLES REFERENCED

From code analysis, these tables are queried:

| Table | Purpose | Queries |
|-------|---------|---------|
| `profiles` | User profile data | `select('role')`, `select('role, full_name')` |
| `obrtnik_profiles` | Craftsman profile | `select('*')`, role 'obrtnik' |
| `admin_users` | Admin users | `select('*')`, check `aktiven = true` |

---

## 10. KEY FILES TO REVIEW / CREATE

### Critical Missing Files:
1. ❌ `middleware.ts` - **MUST CREATE** for session refresh
2. ❓ `app/api/admin/me/route.ts` - Verify exists
3. ❓ `components/liftgo/Header.tsx` - Find or create user state

### Files Verified:
- ✅ `lib/supabase/client.ts` - OK
- ✅ `lib/supabase/server.ts` - OK
- ✅ `app/(narocnik)/layout.tsx` - OK (but depends on middleware)
- ✅ `app/(obrtnik)/layout.tsx` - OK (but depends on middleware)
- ✅ `app/admin/layout.tsx` - OK (but depends on middleware)
- ✅ `app/(auth)/prijava/page.tsx` - OK (but has race condition)

---

## 11. NEXT STEPS TO FIX

**Priority 1 (Critical)**:
1. Create `middleware.ts` with session refresh logic
2. Verify `/api/admin/me` endpoint exists
3. Review `/api/admin/me` implementation

**Priority 2 (High)**:
1. Fix race condition in login (wait for session ready)
2. Add header component with user state updates
3. Implement `useAuthStatus()` hook for UI updates

**Priority 3 (Medium)**:
1. Add error boundaries for auth failures
2. Add loading states during redirects
3. Log auth flow for debugging

---

**END OF DEBUG REPORT**
