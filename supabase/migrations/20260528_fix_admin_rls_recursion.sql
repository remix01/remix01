-- Fix infinite recursion in admin_users RLS policies.
--
-- The migration 20260526_fix_admin_users_rls_policy.sql created
-- admin_users_select_combined with EXISTS(SELECT 1 FROM admin_users ...)
-- inside the policy for admin_users itself. PostgreSQL evaluates ALL
-- permissive SELECT policies, so this self-referential EXISTS caused:
--   ERROR: 42P17: infinite recursion detected in policy for relation "admin_users"
--
-- This error propagated through is_admin() → profiles_admin_all policy,
-- causing ALL authenticated profile reads via the session client to fail
-- with data=null → redirect to /prijava?error=no-profile.
--
-- Fix:
--   1. Drop the recursive admin_users_select_combined policy.
--      The existing admin_select_own policy already handles self-access.
--   2. Recreate is_super_admin() and is_admin() as SECURITY DEFINER so
--      they bypass RLS when querying admin_users (prevents future recursion
--      if similar policies are added).

BEGIN;

DROP POLICY IF EXISTS "admin_users_select_combined" ON public.admin_users;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_user_id = (SELECT auth.uid())
      AND vloga = 'SUPER_ADMIN'
      AND aktiven = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_user_id = (SELECT auth.uid())
      AND aktiven = true
  );
$$;

COMMIT;
