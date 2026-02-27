-- Migration: Remove unused indexes (OPTIONAL - REVIEW BEFORE APPLYING)
-- Description: Drop indexes that have never been used according to pg_stat_user_indexes analysis
-- Date: 2026-02-27
-- Issue: unused_index warnings (75 issues)
-- WARNING: This migration is for reference only. Review each index carefully before uncommenting.
-- 
-- INSTRUCTIONS:
-- 1. Review this file carefully
-- 2. Test in development environment first
-- 3. Monitor query performance after applying
-- 4. Only uncomment DROP statements you're confident about
-- 5. Keep a backup before applying to production

BEGIN;

-- ============================================================================
-- POTENTIALLY UNUSED INDEXES - COMMENTED OUT FOR SAFETY
-- ============================================================================

-- Uncomment ONLY if you verify these indexes are not used:

-- Timestamp indexes (safe to remove if you don't filter by created_at frequently)
-- DROP INDEX IF EXISTS data_records_created_at_idx;
-- DROP INDEX IF EXISTS inquiries_created_at_idx;
-- DROP INDEX IF EXISTS idx_admin_users_created_at;
-- DROP INDEX IF EXISTS Zaposleni_createdAt_idx;

-- Status indexes (safe if you don't query by status often)
-- DROP INDEX IF EXISTS inquiries_status_idx;
-- DROP INDEX IF EXISTS Zaposleni_aktiven_idx;
-- DROP INDEX IF EXISTS idx_admin_users_aktiven;
-- DROP INDEX IF EXISTS idx_ponudbe_status;
-- DROP INDEX IF EXISTS idx_povprasevanja_status;

-- Role/vloga indexes (safe if you don't filter by role frequently)
-- DROP INDEX IF EXISTS Zaposleni_vloga_idx;
-- DROP INDEX IF EXISTS idx_admin_users_vloga;
-- DROP INDEX IF EXISTS idx_profiles_role;

-- Geographic indexes (safe if location-based filtering is minimal)
-- DROP INDEX IF EXISTS idx_profiles_city;
-- DROP INDEX IF EXISTS idx_povprasevanja_city;

-- Verification/Rating indexes (safe if you don't filter by these)
-- DROP INDEX IF EXISTS idx_obrtnik_verified;
-- DROP INDEX IF EXISTS idx_obrtnik_available;
-- DROP INDEX IF EXISTS idx_obrtnik_rating;

-- Category indexes (consider if category filtering is important)
-- DROP INDEX IF EXISTS idx_povprasevanja_category_id;
-- DROP INDEX IF EXISTS idx_obrtnik_categories_category_id;

-- Timestamp creation indexes (if using different filtering strategy)
-- DROP INDEX IF EXISTS idx_ponudbe_created;
-- DROP INDEX IF EXISTS idx_povprasevanja_created;
-- DROP INDEX IF EXISTS idx_ocene_created;

-- Agent system indexes (safe if agent features are not heavily used)
-- DROP INDEX IF EXISTS idx_agent_logs_user;
-- DROP INDEX IF EXISTS idx_agent_logs_event;
-- DROP INDEX IF EXISTS idx_agent_logs_session;

-- Job queue indexes (safe if job processing is not active)
-- DROP INDEX IF EXISTS idx_job_queue_status;

-- ============================================================================
-- STRIPE SCHEMA INDEXES - OPTIONAL CLEANUP
-- ============================================================================
-- Only remove if you're not actively using Stripe integrations

-- DROP INDEX IF EXISTS stripe_managed_webhooks_status_idx;
-- DROP INDEX IF EXISTS stripe_managed_webhooks_enabled_idx;
-- DROP INDEX IF EXISTS idx_stripe_customers_account_email;
-- DROP INDEX IF EXISTS idx_stripe_customers_email;

-- ============================================================================
-- HOW TO SAFELY USE THIS MIGRATION
-- ============================================================================
-- 
-- Step 1: Review pg_stat_user_indexes
-- Run in Supabase SQL Editor:
-- SELECT
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan,
--   idx_tup_read,
--   idx_tup_fetch,
--   pg_size_pretty(pg_relation_size(indexrelid)) as size
-- FROM pg_stat_user_indexes
-- WHERE idx_scan = 0  -- Never used
-- ORDER BY tablename, indexname;
--
-- Step 2: For each index with idx_scan = 0:
--   - Check if the table is actively queried with that column
--   - Verify no slow queries depend on it
--   - Test in development first
--
-- Step 3: Uncomment only the DROP statements you're confident about
--
-- Step 4: Create a backup before applying to production
-- supabase db dump -f backup_$(date +%Y%m%d).sql --project-id whabaeatixtymbccwigu
--
-- Step 5: Apply incrementally - one DROP at a time
--
-- Step 6: Monitor performance for 24-48 hours after each removal

COMMIT;
