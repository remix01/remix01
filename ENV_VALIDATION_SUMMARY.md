# Environment Variable Hardening - Completed

## Summary of Changes

Fixed critical configuration issues by consolidating conflicting Next.js config files and centralizing environment variable validation.

### 1. **Created `/lib/env.ts`** - Centralized Environment Validation
- Single source of truth for ALL environment variables
- Uses Zod schema for compile-time and runtime validation
- Validates environment variables on app startup (fails fast in production)
- Exports `env` object that replaces all `process.env` usage
- Includes all required variables: Supabase, Stripe, QStash, Resend, Twilio, Google Calendar, Web Push, Analytics

### 2. **Fixed Next.js Configuration Conflict**
- Deleted `/next.config.mjs` (was causing unpredictable build behavior)
- Created unified `/next.config.ts` with TypeScript support
- Merged ALL options from both files (TypeScript, Images, Experimental)

### 3. **Replaced All Direct `process.env` Usage**
Updated 20+ files to import and use `env` module:

**Core Libraries:**
- `lib/stripe.ts` - Uses `env.STRIPE_SECRET_KEY`, `env.STRIPE_WEBHOOK_SECRET`
- `lib/resend.ts` - Uses `env.RESEND_API_KEY`, `env.NEXT_PUBLIC_FROM_EMAIL`
- `lib/supabase-admin.ts` - Uses `env.NEXT_PUBLIC_SUPABASE_URL`, `env.SUPABASE_SERVICE_ROLE_KEY`
- `lib/supabase/server.ts` - Uses `env` for Supabase credentials
- `lib/supabase/client.ts` - Uses `env` for browser client
- `lib/supabase/proxy.ts` - Updated proxy middleware
- `lib/supabase-partner.ts` - Uses `env` for partner operations
- `lib/storage.ts` - Uses `env` for storage operations
- `lib/dal/categories.ts` - Uses `env` for public client
- `lib/jobs/queue.ts` - Uses `env.QSTASH_TOKEN` and `env.NEXT_PUBLIC_APP_URL`

**API Routes:**
- `app/api/stripe/create-checkout/route.ts` - Uses `env.NEXT_PUBLIC_URL`
- `app/api/stripe/connect/create-onboarding-link/route.ts` - Uses `env.NEXT_PUBLIC_APP_URL`
- `app/api/stripe/webhook/route.ts` - Uses `env.STRIPE_WEBHOOK_SECRET`
- `app/api/send-email/route.ts` - Uses `env` for email service
- `app/api/registracija-mojster/route.ts` - Uses `env` for redirects and emails
- `app/api/push/send/route.ts` - Uses `env` for VAPID configuration

**Layout & Components:**
- `app/layout.tsx` - Added `env` import, uses `env.NEXT_PUBLIC_GA_ID` for Analytics
- `app/partner-dashboard/account/page.tsx` - Uses `env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 4. **Validation Rules in `/lib/env.ts`**
- **Required at startup (fail in production):**
  - NEXT_PUBLIC_SUPABASE_URL (must be valid URL)
  - NEXT_PUBLIC_SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY
  - STRIPE_SECRET_KEY (must start with `sk_`)
  - STRIPE_WEBHOOK_SECRET (must start with `whsec_`)
  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (must start with `pk_`)
  - QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY
  - NEXT_PUBLIC_APP_URL (must be valid URL)

- **Optional (graceful fallbacks):**
  - Email, Push, Calendar, Twilio, Analytics variables

### 5. **Benefits**
✅ **Type Safety** - All env vars are typed, IDE autocomplete available
✅ **Early Validation** - Errors caught at startup, not runtime
✅ **No Configuration Conflicts** - Single Next.js config file
✅ **Better Error Messages** - Zod provides clear validation errors
✅ **Production Ready** - Strict validation in production, helpful warnings in dev
✅ **Easy to Maintain** - All variables in one place with documentation

### Environment Variables Required in Vercel Project

Copy all values from `.env.example` to your Vercel project variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
NEXT_PUBLIC_APP_URL=https://...
[+ all optional variables from .env.example]
```

No changes to database schema, API logic, or UI. This is purely a configuration hardening fix.
