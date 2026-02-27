-- Migration: Merge multiple permissive policies
-- Description: Combine multiple SELECT policies into single policies with OR logic for better performance
-- Date: 2026-02-27
-- Issue: multiple_permissive_policies warnings (18 issues)
-- Reference: PostgreSQL must execute all policies; combining with OR reduces execution overhead

BEGIN;

-- ============================================================================
-- ADMIN_USERS TABLE - Merge 2 SELECT policies into 1
-- ============================================================================
-- Replaces: "Admins can view own record" and "Super admins can view all admin users"

DROP POLICY IF EXISTS "Admins can view own record" ON admin_users;
DROP POLICY IF EXISTS "Super admins can view all admin users" ON admin_users;

CREATE POLICY "admin_users_select_combined" ON admin_users
FOR SELECT USING (
  -- Super admin vidi vse
  (SELECT user_id FROM admin_users WHERE user_id = (SELECT auth.uid()) AND vloga = 'super_admin') IS NOT NULL
  OR
  -- Admin vidi svoj zapis
  (SELECT auth.uid()) = user_id
);

-- ============================================================================
-- INQUIRIES TABLE - Merge 2 SELECT policies into 1
-- ============================================================================
-- Replaces: "Users can read own inquiries" and "Admins can read all inquiries"

DROP POLICY IF EXISTS "Users can read own inquiries" ON inquiries;
DROP POLICY IF EXISTS "Admins can read all inquiries" ON inquiries;

CREATE POLICY "inquiries_select_combined" ON inquiries
FOR SELECT USING (
  -- User vidi svoje inquiries
  (SELECT auth.uid()) = user_id
  OR
  -- Admin vidi vse
  (SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = (SELECT auth.uid())
  ))
);

-- ============================================================================
-- OFFERS TABLE - Merge 2 SELECT policies into 1
-- ============================================================================
-- Replaces: "offers_select_own" and "offers_view_all"
-- Note: Keeping original logic for user-owned or public offers

DROP POLICY IF EXISTS "offers_select_own" ON offers;
DROP POLICY IF EXISTS "offers_view_all" ON offers;

CREATE POLICY "offers_select_combined" ON offers
FOR SELECT USING (
  (SELECT auth.uid()) = user_id 
  OR 
  is_public = true
);

-- ============================================================================
-- PARTNERS TABLE - Merge 2 SELECT policies into 1
-- ============================================================================
-- Replaces: "partners_select_own" and "partners_select_all"
-- Note: Keeping original logic for user-owned or active partners

DROP POLICY IF EXISTS "partners_select_own" ON partners;
DROP POLICY IF EXISTS "partners_select_all" ON partners;

CREATE POLICY "partners_select_combined" ON partners
FOR SELECT USING (
  (SELECT auth.uid()) = user_id 
  OR 
  status = 'active'
);

-- ============================================================================
-- CATEGORIES TABLE - Merge 2 SELECT policies into 1
-- ============================================================================
-- Replaces: "Admin can manage categories" and "Anyone can read active categories"

DROP POLICY IF EXISTS "Admin can manage categories" ON categories;
DROP POLICY IF EXISTS "Anyone can read active categories" ON categories;

CREATE POLICY "categories_select_combined" ON categories
FOR SELECT USING (
  is_active = true
  OR
  (SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = (SELECT auth.uid())
  ))
);

-- ============================================================================
-- OBRTNIK_CATEGORIES TABLE - Merge 2 SELECT policies into 1
-- ============================================================================
-- Replaces: "Anyone can read obrtnik categories" and "Obrtniki can manage own categories"

DROP POLICY IF EXISTS "Anyone can read obrtnik categories" ON obrtnik_categories;
DROP POLICY IF EXISTS "Obrtniki can manage own categories" ON obrtnik_categories;

CREATE POLICY "obrtnik_categories_select_combined" ON obrtnik_categories
FOR SELECT USING (
  true  -- Anyone can read; permission to modify checked by separate policies
);

-- ============================================================================
-- PONUDBE TABLE - Merge multiple SELECT policies if present
-- ============================================================================

DROP POLICY IF EXISTS "Obrtniki see own ponudbe" ON ponudbe;

CREATE POLICY "ponudbe_select_combined" ON ponudbe
FOR SELECT USING (
  -- Obrtnik vidi svoje ponudbe
  (SELECT auth.uid()) = obrtnik_id
  OR
  -- Naročnik vidi ponudbe za svoje povpraševanja
  (SELECT auth.uid()) IN (
    SELECT narocnik_id FROM povprasevanja WHERE id = povprasevanje_id
  )
);

COMMIT;
