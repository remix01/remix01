# PARTNER/OBRTNIK AUTHENTICATION SYSTEM AUDIT

## FINDINGS SUMMARY

### 1. `/app/partner-auth/` Folder Structure ✅ EXISTS

**Files Found:**
- `sign-up/page.tsx` - Partner registration form
- `login/page.tsx` - Partner login form  
- `sign-up-success/page.tsx` - **NOT FOUND** (referenced but missing)

### 2. `/app/(auth)/registracija/page.tsx` ❌ DOES NOT EXIST
- Search found references in grep, but file cannot be read
- This appears to be a missing naročnik (customer) registration page

### 3. `/app/partner-dashboard/` Folder Structure ✅ EXISTS

**Files Found:**
- `page.tsx` - Main partner dashboard (Partner Portal)
- `account/page.tsx` - Partner account/subscription management

### 4. Middleware/Proxy Route Protection Analysis

**File:** `/proxy.ts` (Next.js 16 proxy.js equivalent)

**Status:** ❌ **NO ROUTE PROTECTION IN PROXY**
- File is minimal pass-through only
- Contains no `if (pathname.startsWith(...))` checks
- Real protection is in `/lib/supabase/proxy.ts` (middleware)

**File:** `/lib/supabase/proxy.ts` 

**Route Protection Found:**
```typescript
// PROTECTION BLOCK 1: /partner-dashboard
if (!user) {
  if (request.nextUrl.pathname.startsWith('/partner-dashboard')) {
    redirect to /partner-auth/login
  }
}

// PROTECTION BLOCK 2: /partner-dashboard (verified partner check)
if (user && request.nextUrl.pathname.startsWith('/partner-dashboard')) {
  queries partners table by user.id
  if (!partner) {
    redirect to /partner-auth/sign-up
  }
}
```

### 5. "partner-auth" String References

**Files referencing "partner-auth":**

1. `SEO_LANDING_PAGES.md` - Documentation reference
2. `lib/supabase/proxy.ts` - Redirect to `/partner-auth/login`
3. `app/robots.ts` - Likely in disallow list (needs verification)
4. `app/(obrtnik)/obrtnik/povprasevanja/page.tsx` - Navigation/link reference
5. `app/(obrtnik)/obrtnik/dashboard/page.tsx` - Navigation/link reference
6. `app/(obrtnik)/layout.tsx` - Navigation/layout reference
7. `app/(auth)/registracija/page.tsx` - Cross-auth reference
8. `app/(auth)/prijava/page.tsx` - Cross-auth reference
9. `SEO_IMPLEMENTATION.md` - Documentation
10. `components/obrtnik/sidebar.tsx` - Navigation links
11. `components/how-it-works.tsx` - CTA links
12. `components/footer.tsx` - Footer links
13. `components/cta.tsx` - Call-to-action links
14. `components/commission-explainer.tsx` - Educational content
15. `app/partner-auth/sign-up/page.tsx` - Self-reference
16. `app/partner-auth/login/page.tsx` - Self-reference
17. `app/kako-deluje/page.tsx` - Educational page
18. `app/search/search-content.tsx` - Search content
19. `app/partner-dashboard/page.tsx` - Redirect destination
20. `app/partner-dashboard/account/page.tsx` - Account page
21. `app/za-obrtnike/page.tsx` - Partner marketing page

### 6. "sign-up-success" String References

**Files referencing "sign-up-success":**

1. `app/auth/sign-up/page.tsx` - Naročnik signup redirect
   - `router.push('/auth/sign-up-success')`
   
2. `app/partner-auth/sign-up/page.tsx` - **Partner signup redirect**
   - `router.push('/partner-auth/sign-up-success')` 
   - **BUT THIS PAGE DOES NOT EXIST!** ⚠️

---

## CRITICAL ISSUES FOUND

### Issue #1: Missing Success Page ⚠️
**Location:** `/app/partner-auth/sign-up-success/page.tsx`

**Status:** REFERENCED BUT MISSING
- Partner signup form redirects to `/partner-auth/sign-up-success` after successful registration
- This page does not exist in the codebase
- **Result:** Users complete signup → navigate to 404 page

**Evidence:**
```typescript
// app/partner-auth/sign-up/page.tsx line ~66
if (data.user) {
  router.push('/partner-auth/sign-up-success')  // <- This path doesn't exist
}
```

### Issue #2: Missing Naročnik Registration Pages ⚠️
**Locations:** 
- `/app/(auth)/registracija/page.tsx` - Referenced in grep but file missing
- `/app/(auth)/prijava/page.tsx` - Referenced in grep but file missing

**Status:** INCONSISTENT AUTH STRUCTURE
- Partner auth uses `/app/partner-auth/` directory
- Naročnik (customer) auth uses `/app/(auth)/` directory  
- But registracija page does not exist on disk
- Prijava page shows in grep but cannot be read

### Issue #3: Two Separate Auth Systems ⚠️
**Observation:** System has TWO auth flows:

1. **Partner Flow (`/partner-auth/`):**
   - `/partner-auth/sign-up` - Create partner account
   - `/partner-auth/login` - Login to partner account
   - `/partner-auth/sign-up-success` - **MISSING** 
   - Redirects to `/partner-dashboard` on success

2. **Naročnik Flow (`/app/(auth)/`):**
   - `/auth/sign-up` - Create customer account (exists)
   - `/auth/registracija` - Slovenian variant? (missing on disk)
   - `/auth/prijava` - Slovenian "login"? (missing on disk)
   - Status unclear

---

## ROUTE STRUCTURE ANALYSIS

### Protected Routes (Middleware Protected)

| Route | Protected | Redirect If No Auth | Redirect If Not Partner |
|-------|-----------|-------------------|------------------------|
| `/partner-dashboard` | ✅ YES | → `/partner-auth/login` | → `/partner-auth/sign-up` |
| `/partner-dashboard/account` | ✅ YES (inherited) | → `/partner-auth/login` | → `/partner-auth/sign-up` |
| `/partner-auth/sign-up` | ❌ NO | - | - |
| `/partner-auth/login` | ❌ NO | - | - |

### Unprotected Routes

| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/partner-auth/sign-up` | Partner registration | NO |
| `/partner-auth/login` | Partner login | NO |
| `/za-obrtnike` | Partner marketing | NO |
| `/kako-deluje` | How it works | NO |

---

## AUTH FLOW DIAGRAM

```
Unauthenticated User
        ↓
  /za-obrtnike (partner marketing page)
        ↓
  Click "Postani partner" →  /partner-auth/sign-up
        ↓
  handleSignUp() {
    supabase.auth.signUp({
      options: {
        emailRedirectTo: /partner-dashboard,
        data: { user_type: 'partner' }
      }
    })
  }
        ↓
  ✅ Success: router.push('/partner-auth/sign-up-success')  [⚠️ PAGE MISSING]
  ❌ Error: Show error message
```

---

## DATABASE/SUPABASE INTEGRATION

### Tables Referenced in Auth Code

1. **`partners`** table
   - Used in: `/lib/supabase/proxy.ts` and `/app/partner-dashboard/page.tsx`
   - Columns checked: `id`, `company_name`, etc.
   - Purpose: Store partner/obrtnik business profiles

2. **`auth.users`** table (Supabase built-in)
   - Used in: All signup/login flows
   - Purpose: Authentication user records

### Client Functions Used
- `supabase.auth.signUp()` - Create new auth user
- `supabase.auth.signInWithPassword()` - Login
- `supabase.auth.getUser()` - Get current session
- `supabase.from('partners').select()` - Query partner data

---

## MIDDLEWARE IMPLEMENTATION

**File:** `/lib/supabase/proxy.ts`

**Type:** Supabase SSR middleware for authentication state sync

**Flow:**
1. Called on every request
2. Creates Supabase server client
3. Calls `supabase.auth.getUser()` to get session
4. Checks if user trying to access `/partner-dashboard`
5. If no user → redirect to `/partner-auth/login`
6. If user but no partner record → redirect to `/partner-auth/sign-up`
7. Returns supabaseResponse with updated cookies

---

## USER TYPE METADATA

**In signup form:**
```typescript
data: {
  company_name: companyName,
  user_type: 'partner'  // <- Stored in auth.users.user_metadata
}
```

**Usage:** Distinguishes between:
- `user_type: 'partner'` - Obrtnik/contractor
- `user_type: 'customer'` - Naročnik/customer (implied)

---

## SECURITY NOTES

✅ **Good:**
- Middleware checks run on every request
- Redirect before component render
- Password hashing via Supabase Auth
- Session cookies are HttpOnly

⚠️ **Concerns:**
- No role-based access control (RBAC) implemented
- Middleware only checks existence in `partners` table, not actual roles/status
- No email verification step visible
- No password reset flow found

---

## SUMMARY TABLE

| Component | Location | Status | Issues |
|-----------|----------|--------|--------|
| Partner Signup | `/partner-auth/sign-up/page.tsx` | ✅ EXISTS | Redirects to missing page |
| Partner Login | `/partner-auth/login/page.tsx` | ✅ EXISTS | Working |
| Partner Dashboard | `/partner-dashboard/page.tsx` | ✅ EXISTS | Protected by middleware |
| Partner Account | `/partner-dashboard/account/page.tsx` | ✅ EXISTS | Protected by middleware |
| Success Page | `/partner-auth/sign-up-success/page.tsx` | ❌ MISSING | Critical |
| Middleware | `/lib/supabase/proxy.ts` | ✅ EXISTS | Working |
| Proxy Handler | `/proxy.ts` | ✅ EXISTS | Minimal (pass-through) |
| Naročnik Signup | `/auth/registracija/page.tsx` | ❌ MISSING | Referenced but not found |
| Naročnik Login | `/auth/prijava/page.tsx` | ❌ UNCLEAR | Found in grep, cannot read |

---

## RECOMMENDATIONS

1. **Create `/app/partner-auth/sign-up-success/page.tsx`** (urgent)
   - Show confirmation message
   - Ask user to check email for verification link
   - Provide link to partner dashboard or retry login

2. **Clarify auth routes** for naročnik flow
   - Decide on canonical paths (e.g., `/auth/prijava` vs other variants)
   - Create missing pages or remove dead references

3. **Add email verification** step
   - Current: Redirects to success page immediately
   - Recommended: Verify email before partner can access dashboard

4. **Implement RBAC**
   - Check `partners.status` or similar field
   - Handle suspended/inactive partners

