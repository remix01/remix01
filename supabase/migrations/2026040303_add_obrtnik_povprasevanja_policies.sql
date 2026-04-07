-- CRITICAL FIX: Add missing RLS policy for obrtniki to read open povprasevanja
-- Issue: Obrtniki could not see ANY povprasevanja (except their own if they were also narocnik)
-- Reason: Missing SELECT policy with status='odprto' check
-- File: supabase/migrations/20260403_add_obrtnik_povprasevanja_policies.sql

-- 1. Drop the old restrictive policy that only allowed narocniki to see their own
DROP POLICY IF EXISTS "Narocniki see own povprasevanja" ON public.povprasevanja;

-- 2. Create new combined policy allowing:
--    a) Narocniki to see their own povprasevanja (all statuses)
--    b) Obrtniki to see open povprasevanja (status='odprto')
--    c) Admins to see everything
CREATE POLICY "Users can see relevant povprasevanja"
  ON public.povprasevanja
  FOR SELECT
  TO authenticated
  USING (
    -- Narocniki see their own povprasevanja
    (SELECT auth.uid()) = narocnik_id
    OR
    -- Obrtniki see open povprasevanja in their categories
    (
      status = 'odprto'
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND role = 'obrtnik'
      )
    )
    OR
    -- Admins see everything
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = (SELECT auth.uid()) AND aktiven = true
    )
  );

-- 3. Ensure INSERT policy only allows authenticated narocniki
DROP POLICY IF EXISTS "Narocniki can create povprasevanja" ON public.povprasevanja;
CREATE POLICY "Narocniki can create povprasevanja"
  ON public.povprasevanja
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = narocnik_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'narocnik'
    )
  );

-- 4. Ensure UPDATE policy only allows narocniki to update their own
DROP POLICY IF EXISTS "Narocniki can update own povprasevanja" ON public.povprasevanja;
CREATE POLICY "Narocniki can update own povprasevanja"
  ON public.povprasevanja
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = narocnik_id)
  WITH CHECK ((SELECT auth.uid()) = narocnik_id);

-- 5. Add separate admin policy for unrestricted access
CREATE POLICY "Admins can manage all povprasevanja"
  ON public.povprasevanja
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = (SELECT auth.uid()) AND aktiven = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = (SELECT auth.uid()) AND aktiven = true
    )
  );

-- 6. Add COMMENT explaining the policies
COMMENT ON TABLE public.povprasevanja IS 'Service requests from naročniki. RLS ensures: narocniki see their own, obrtniki see open, admins see all.';
