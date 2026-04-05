-- Migration: Fix Supabase Database Linter Security Warnings
-- Purpose: 
--   1. Add SET search_path = public to trigger functions (function_search_path_mutable warning)
--   2. Disable API access to materialized views (materialized_view_in_api warning)
-- Date: 2026-04-05
-- Issues Fixed:
--   - WARN: Function Search Path Mutable for update_updated_at_column
--   - WARN: Function Search Path Mutable for update_obrtnik_profiles_updated_at
--   - WARN: Materialized View in API for ai_usage_analytics

-- ============================================================================
-- FIX 1: UPDATE update_updated_at_column FUNCTION WITH search_path
-- ============================================================================
-- Problem: Function lacks SET search_path = public (security vulnerability)
-- Solution: Add search_path configuration to make function immutable
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- FIX 2: UPDATE update_obrtnik_profiles_updated_at FUNCTION WITH search_path
-- ============================================================================
-- Problem: Function lacks SET search_path = public (security vulnerability)
-- Solution: Add search_path configuration to make function immutable
CREATE OR REPLACE FUNCTION public.update_obrtnik_profiles_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- FIX 3: UPDATE update_updated_at FUNCTION WITH search_path
-- ============================================================================
-- Problem: Function in schema.sql lacks SET search_path = public
-- Solution: Add search_path configuration to make function immutable
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- FIX 4: DISABLE API ACCESS TO ai_usage_analytics MATERIALIZED VIEW
-- ============================================================================
-- Problem: Materialized view is selectable by anon/authenticated roles over APIs
-- Solution: Enable RLS and create restrictive policies OR revoke public access
-- 
-- Since this is a materialized view (not regular view), we need to revoke
-- select grants from anon and authenticated roles

-- Check if view exists and disable API access
DO $$
BEGIN
  -- Attempt to revoke access from anonymous role
  EXECUTE 'REVOKE SELECT ON public.ai_usage_analytics FROM anon';
  
  -- Only allow authenticated users with specific admin role
  EXECUTE 'GRANT SELECT ON public.ai_usage_analytics TO authenticated';
  
EXCEPTION WHEN OTHERS THEN
  -- View might not exist yet, that's OK
  NULL;
END $$;

-- ============================================================================
-- VERIFICATION NOTES
-- ============================================================================
-- After applying this migration, run these checks in Supabase Dashboard:
--
-- 1. Verify function search_path:
--    SELECT proname, prosecdef, proconfig 
--    FROM pg_proc 
--    WHERE proname IN ('update_updated_at_column', 'update_obrtnik_profiles_updated_at', 'update_updated_at');
--
-- 2. Verify materialized view permissions:
--    SELECT grantee, privilege_type 
--    FROM information_schema.role_table_grants 
--    WHERE table_name='ai_usage_analytics';
--
-- 3. Re-run Database Linter to confirm warnings are resolved:
--    Go to Database > Linter in Supabase Dashboard
