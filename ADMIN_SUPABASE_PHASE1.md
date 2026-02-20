# Admin System - Supabase Integration (Phase 1)

## Overview

Phase 1 successfully migrates the admin system from Prisma/NextAuth to Supabase Auth with role-based access control. The system maintains the three-tier role hierarchy while leveraging Supabase's built-in authentication and Row Level Security (RLS).

## What Was Implemented

### 1. Database Layer
- **Migration**: `supabase/migrations/003_create_admin_users_table.sql`
  - Created `public.admin_users` table
  - Created `admin_role` enum with three roles: `SUPER_ADMIN`, `MODERATOR`, `OPERATER`
  - Implemented RLS policies for role-based data access
  - Added automatic `updated_at` timestamp trigger
  - Links to Supabase Auth via `auth_user_id` foreign key

### 2. Authentication System
- **Auth Context**: `lib/auth/AdminAuthContext.tsx`
  - Client-side context provider for authentication state
  - Provides `useAdminAuth` hook for components
  - Manages user sessions and admin user data
  - Implements role hierarchy checking (`hasRole`, `canAccess`)

### 3. Updated Components
- **Admin Layout**: `app/admin/layout.tsx`
  - Server-side authentication check using Supabase
  - Fetches admin user data from `admin_users` table
  - Wraps children with `AdminAuthProvider`

- **Admin Sidebar**: `components/admin/AdminSidebar.tsx`
  - Role-based navigation filtering
  - Supabase-powered logout
  - Displays user name, email, and role

- **Admin Header**: `components/admin/AdminHeader.tsx`
  - Updated to work with new admin user structure
  - Shows Slovenian name format (ime + priimek)

### 4. Login Flow
- **Login Page**: `app/auth/login/page.tsx`
  - Supabase password authentication
  - Verifies admin status before allowing access
  - Checks if account is active (`aktiven`)
  - Redirects to `/admin` on successful login

### 5. Setup Flow
- **Setup Page**: `app/admin/setup/page.tsx`
  - Public page for creating the first super admin
  - Checks if setup is already complete
  - Creates both Supabase auth user and admin_users record
  - Auto-login after successful setup

### 6. Middleware
- **Updated**: `middleware.ts`
  - Allows unauthenticated access to `/admin/setup`
  - Protects all other admin routes
  - Checks `admin_users` table for authorization
  - Verifies account is active before granting access

## Database Schema

```sql
-- Admin Role Enum
CREATE TYPE public.admin_role AS ENUM (
  'SUPER_ADMIN',  -- Full access + user management
  'MODERATOR',    -- Read/write access, no delete
  'OPERATER'      -- Read-only + basic status changes
);

-- Admin Users Table
CREATE TABLE public.admin_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  ime             TEXT NOT NULL,
  priimek         TEXT NOT NULL,
  vloga           admin_role NOT NULL DEFAULT 'OPERATER',
  aktiven         BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES public.admin_users(id)
);
```

## Row Level Security (RLS) Policies

1. **Super admins can view all admin users**
2. **Super admins can insert admin users**
3. **Super admins can update admin users**
4. **Super admins can delete admin users**
5. **Admins can view their own record**

## Role Hierarchy

```
SUPER_ADMIN (Level 3)
  ↓
MODERATOR (Level 2)
  ↓
OPERATER (Level 1)
```

Higher-level roles inherit permissions from lower levels.

## Getting Started

### Initial Setup

1. **Navigate to setup page**: Visit `/admin/setup`
2. **Create super admin**: Fill in email, password, name (ime), surname (priimek)
3. **Auto-login**: System will automatically log you in and redirect to `/admin`

### Subsequent Logins

1. **Navigate to login**: Visit `/auth/login`
2. **Enter credentials**: Email and password
3. **Access admin panel**: Redirects to `/admin` on success

### Managing Additional Admins

Once logged in as SUPER_ADMIN:
1. Navigate to "Zaposleni" in the sidebar
2. Create new admin users with appropriate roles
3. Manage existing users (edit role, deactivate)

## API Usage Examples

### Check Current Admin User (Client-Side)

```tsx
'use client'

import { useAdminAuth } from '@/lib/auth/AdminAuthContext'

export function MyComponent() {
  const { adminUser, hasRole, canAccess } = useAdminAuth()

  if (hasRole('SUPER_ADMIN')) {
    // Only super admins see this
  }

  if (canAccess('MODERATOR')) {
    // Moderators and super admins see this
  }

  return <div>Welcome, {adminUser?.ime}!</div>
}
```

### Fetch Admin User (Server-Side)

```tsx
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('auth_user_id', user?.id)
    .single()

  return <div>Admin: {adminUser?.email}</div>
}
```

## Security Features

1. **RLS Policies**: Database-level access control
2. **Server-side validation**: Layout checks auth on every request
3. **Middleware protection**: Routes protected before rendering
4. **Active status check**: Deactivated admins cannot access system
5. **Role-based navigation**: UI adapts based on permissions

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

These are automatically added by the Supabase integration in v0.

## Migration from Previous System

### Removed Dependencies
- NextAuth (`next-auth`)
- Prisma `Zaposleni` model
- `/api/auth/[...nextauth]/route.ts`

### Key Changes
1. Auth now handled by Supabase instead of NextAuth
2. Admin users stored in `public.admin_users` instead of Prisma
3. Slovenian field names maintained (`ime`, `priimek`, `vloga`, `aktiven`)
4. Role enum values unchanged (`SUPER_ADMIN`, `MODERATOR`, `OPERATER`)

## Troubleshooting

### Cannot access admin panel
- Ensure your account exists in `admin_users` table
- Check that `aktiven` is `true`
- Verify `auth_user_id` matches your Supabase auth user

### Setup page says "already complete"
- This means at least one admin user exists
- Use `/auth/login` to sign in instead

### Logout not working
- Clear browser cookies
- Check Supabase console for active sessions

## Next Steps (Future Phases)

- Phase 2: Update all admin pages to use Supabase queries
- Phase 3: Implement employee management UI (/admin/zaposleni)
- Phase 4: Add audit logging for admin actions
- Phase 5: Implement fine-grained permissions per resource

## Support

For issues or questions:
1. Check Supabase console for auth errors
2. Review browser console for `[v0]` debug logs
3. Verify RLS policies in Supabase SQL editor
