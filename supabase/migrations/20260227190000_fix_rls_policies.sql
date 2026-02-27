-- Migration: Fix RLS policies for optimal performance
-- Description: Replace auth.uid() with (SELECT auth.uid()) in all RLS policies to prevent performance degradation
-- Date: 2026-02-27
-- Issue: auth_rls_initplan warnings (37 critical issues)
-- Reference: Using subquery syntax for RLS to enable InitPlan optimization

BEGIN;

-- ============================================================================
-- PROFILES TABLE - Fix 4 policies
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles
FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- DATA_RECORDS TABLE - Fix 4 policies
-- ============================================================================

DROP POLICY IF EXISTS "data_records_select_own" ON data_records;
CREATE POLICY "data_records_select_own" ON data_records
FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "data_records_insert_own" ON data_records;
CREATE POLICY "data_records_insert_own" ON data_records
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "data_records_update_own" ON data_records;
CREATE POLICY "data_records_update_own" ON data_records
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "data_records_delete_own" ON data_records;
CREATE POLICY "data_records_delete_own" ON data_records
FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- PARTNERS TABLE - Fix 3 policies
-- ============================================================================

DROP POLICY IF EXISTS "partners_select_own" ON partners;
CREATE POLICY "partners_select_own" ON partners
FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "partners_insert_own" ON partners;
CREATE POLICY "partners_insert_own" ON partners
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "partners_update_own" ON partners;
CREATE POLICY "partners_update_own" ON partners
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- OFFERS TABLE - Fix 3 policies
-- ============================================================================

DROP POLICY IF EXISTS "offers_select_own" ON offers;
CREATE POLICY "offers_select_own" ON offers
FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "offers_insert_own" ON offers;
CREATE POLICY "offers_insert_own" ON offers
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "offers_update_own" ON offers;
CREATE POLICY "offers_update_own" ON offers
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- PAYOUTS TABLE - Fix 1 policy
-- ============================================================================

DROP POLICY IF EXISTS "payouts_select_own" ON payouts;
CREATE POLICY "payouts_select_own" ON payouts
FOR SELECT USING ((SELECT auth.uid()) IN (
  SELECT user_id FROM offers WHERE id = offer_id
));

-- ============================================================================
-- INQUIRIES TABLE - Fix 2 policies (will be merged in next migration)
-- ============================================================================

DROP POLICY IF EXISTS "Users can read own inquiries" ON inquiries;
CREATE POLICY "Users can read own inquiries" ON inquiries
FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can read all inquiries" ON inquiries;
CREATE POLICY "Admins can read all inquiries" ON inquiries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = (SELECT auth.uid())
  )
);

-- ============================================================================
-- ADMIN_USERS TABLE - Fix 5 policies (will be merged in next migration)
-- ============================================================================

DROP POLICY IF EXISTS "Super admins can view all admin users" ON admin_users;
CREATE POLICY "Super admins can view all admin users" ON admin_users
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = (SELECT auth.uid()) AND vloga = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Super admins can insert admin users" ON admin_users;
CREATE POLICY "Super admins can insert admin users" ON admin_users
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = (SELECT auth.uid()) AND vloga = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Super admins can update admin users" ON admin_users;
CREATE POLICY "Super admins can update admin users" ON admin_users
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = (SELECT auth.uid()) AND vloga = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Super admins can delete admin users" ON admin_users;
CREATE POLICY "Super admins can delete admin users" ON admin_users
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = (SELECT auth.uid()) AND vloga = 'super_admin'
  )
);

DROP POLICY IF EXISTS "Admins can view own record" ON admin_users;
CREATE POLICY "Admins can view own record" ON admin_users
FOR SELECT USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- OBRTNIK_PROFILES TABLE - Fix 2 policies
-- ============================================================================

DROP POLICY IF EXISTS "Obrtniki can insert own profile" ON obrtnik_profiles;
CREATE POLICY "Obrtniki can insert own profile" ON obrtnik_profiles
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Obrtniki can update own profile" ON obrtnik_profiles;
CREATE POLICY "Obrtniki can update own profile" ON obrtnik_profiles
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- CATEGORIES TABLE - Fix 1 policy (will be merged in next migration)
-- ============================================================================

DROP POLICY IF EXISTS "Admin can manage categories" ON categories;
CREATE POLICY "Admin can manage categories" ON categories
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = (SELECT auth.uid())
  )
);

-- ============================================================================
-- OBRTNIK_CATEGORIES TABLE - Fix 1 policy (will be merged in next migration)
-- ============================================================================

DROP POLICY IF EXISTS "Obrtniki can manage own categories" ON obrtnik_categories;
CREATE POLICY "Obrtniki can manage own categories" ON obrtnik_categories
FOR ALL USING ((SELECT auth.uid()) = obrtnik_id);

-- ============================================================================
-- POVPRASEVANJA TABLE - Fix 3 policies
-- ============================================================================

DROP POLICY IF EXISTS "Narocniki see own povprasevanja" ON povprasevanja;
CREATE POLICY "Narocniki see own povprasevanja" ON povprasevanja
FOR SELECT USING ((SELECT auth.uid()) = narocnik_id);

DROP POLICY IF EXISTS "Narocniki can create povprasevanja" ON povprasevanja;
CREATE POLICY "Narocniki can create povprasevanja" ON povprasevanja
FOR INSERT WITH CHECK ((SELECT auth.uid()) = narocnik_id);

DROP POLICY IF EXISTS "Narocniki can update own povprasevanja" ON povprasevanja;
CREATE POLICY "Narocniki can update own povprasevanja" ON povprasevanja
FOR UPDATE USING ((SELECT auth.uid()) = narocnik_id);

-- ============================================================================
-- PONUDBE TABLE - Fix 3 policies
-- ============================================================================

DROP POLICY IF EXISTS "Obrtniki see own ponudbe" ON ponudbe;
CREATE POLICY "Obrtniki see own ponudbe" ON ponudbe
FOR SELECT USING ((SELECT auth.uid()) = obrtnik_id);

DROP POLICY IF EXISTS "Obrtniki can create ponudbe" ON ponudbe;
CREATE POLICY "Obrtniki can create ponudbe" ON ponudbe
FOR INSERT WITH CHECK ((SELECT auth.uid()) = obrtnik_id);

DROP POLICY IF EXISTS "Narocniki can update ponudbe status" ON ponudbe;
CREATE POLICY "Narocniki can update ponudbe status" ON ponudbe
FOR UPDATE USING (
  (SELECT auth.uid()) IN (
    SELECT narocnik_id FROM povprasevanja WHERE id = povprasevanje_id
  )
);

-- ============================================================================
-- OCENE TABLE - Fix 1 policy
-- ============================================================================

DROP POLICY IF EXISTS "Narocniki can create ocene" ON ocene;
CREATE POLICY "Narocniki can create ocene" ON ocene
FOR INSERT WITH CHECK ((SELECT auth.uid()) = narocnik_id);

-- ============================================================================
-- AGENT_USER_MEMORY TABLE - Fix 1 policy
-- ============================================================================

DROP POLICY IF EXISTS "Users can only access own memory" ON agent_user_memory;
CREATE POLICY "Users can only access own memory" ON agent_user_memory
FOR ALL USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- AGENT_LOGS TABLE - Fix 1 policy
-- ============================================================================

DROP POLICY IF EXISTS "Admins see all logs" ON agent_logs;
CREATE POLICY "Admins see all logs" ON agent_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = (SELECT auth.uid())
  )
);

COMMIT;
