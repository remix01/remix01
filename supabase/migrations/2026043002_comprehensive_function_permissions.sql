-- ════════════════════════════════════════════════════════════════════════════
-- Migration: comprehensive_function_permissions
-- Supersedes:  2026043001_revoke_anon_security_definer.sql
--
-- Problem: pg_catalog shows anon/public can EXECUTE on functions that:
--   • mutate data (accept_task, claim_task, publish_task, …)
--   • run as trigger callbacks (tr_broadcast_*, handle_new_*, update_*_updated_at)
--   • perform privileged admin/cron/escrow operations
--   • touch GitHub, AI quotas, escrow ledger
--
-- Strategy
-- ─────────
-- 1. REVOKE EXECUTE … FROM PUBLIC  ← removes the default public grant
-- 2. REVOKE EXECUTE … FROM anon    ← removes any explicit grant to anon
-- 3. REVOKE EXECUTE … FROM authenticated  ← for service-role-only operations
-- 4. GRANT EXECUTE … TO authenticated    ← for RLS helpers + search helpers
-- 5. GRANT EXECUTE … TO anon            ← ONLY for functions called by RLS
--                                           policies that run for anonymous users
--
-- Trigger functions do NOT need execute grants — the DB fires them directly
-- without performing a privilege check on the caller role.
--
-- RLS helper functions (is_admin, is_obrtnik, …) MUST remain executable by anon
-- because Supabase evaluates RLS policies in the context of the calling role.
-- Without EXECUTE, any anonymous SELECT against a table that references these
-- helpers in a policy will raise "permission denied for function …".
-- ════════════════════════════════════════════════════════════════════════════

-- ── PHASE 1 ──────────────────────────────────────────────────────────────────
-- REVOKE FROM PUBLIC + anon for all mutation / trigger / admin / cron / escrow
-- / GitHub / quota-mutation functions.
-- Looping over pg_proc guarantees we use the exact signature and handles
-- overloaded names (e.g. hybrid_search_tasks appears twice).
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn RECORD;
  revoke_targets TEXT[] := ARRAY[
    -- ── Admin / internal ──────────────────────────────────────────────────
    'refresh_ai_analytics',
    'link_admin_user_on_signup',
    'rls_auto_enable',
    'cleanup_old_alerts',
    'update_admin_users_updated_at',
    -- ── Trigger callbacks (fired by DB — no role needs EXECUTE) ──────────
    'update_obrtnik_profiles_updated_at',
    'set_updated_at_metadata',
    'tr_broadcast_sporocila',
    'tr_broadcast_povprasevanje',
    'tr_broadcast_ponudba',
    'tr_broadcast_notification',
    'update_obrtnik_avg_rating',
    'update_obrtnik_rating',
    'handle_new_partner',
    'handle_new_user',
    'update_profiles_updated_at',
    'prevent_double_claim',
    'update_sla_on_claim',
    'set_updated_at',
    'set_hitl_updated_at',
    'update_updated_at_column',
    'update_updated_at',
    -- ── AI / agent analytics mutations ───────────────────────────────────
    'upsert_agent_cost_summary',
    'update_agent_conversation_timestamp',
    'recalc_obrtnik_rating',
    'increment_ai_usage',
    'reset_daily_ai_quota',
    'archive_ai_usage_logs',
    -- ── Escrow / task lifecycle mutations ────────────────────────────────
    'log_escrow_action',
    'complete_task',
    'start_task',
    'accept_task',
    'claim_task',
    'publish_task',
    'expire_tasks',
    'check_expired_povprasevanja',
    'escrow_auto_release',
    -- ── GitHub integration (service_role only) ───────────────────────────
    'github_create_file_direct',
    'github_create_file',
    'github_encode_path'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc        p
    JOIN   pg_namespace   n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.proname = ANY(revoke_targets)
  LOOP
    BEGIN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
        fn.proname, fn.args
      );
    EXCEPTION WHEN OTHERS THEN
      -- Privilege did not exist — safe to ignore
      RAISE NOTICE 'Skipped revoke on %.%(%) — %', 'public', fn.proname, fn.args, SQLERRM;
    END;
  END LOOP;
END $$;


-- ── PHASE 2 ──────────────────────────────────────────────────────────────────
-- Search / match / AI-read functions: revoke from anon, keep for authenticated.
-- These are called by logged-in users via Route Handlers (server-side) or
-- directly from the Supabase JS client. anon has no legitimate use case.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn RECORD;
  auth_only TEXT[] := ARRAY[
    'hybrid_search_tasks',   -- overloaded — loop handles both signatures
    'match_ponudbe',
    'match_tasks',
    'match_obrtniki',
    'match_sporocila',
    'get_obrtnik_with_categories',
    'check_ai_quota',
    'get_ai_daily_limit'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc        p
    JOIN   pg_namespace   n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.proname = ANY(auth_only)
  LOOP
    BEGIN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
        fn.proname, fn.args
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped revoke (auth_only) on %.%(%) — %',
        'public', fn.proname, fn.args, SQLERRM;
    END;

    BEGIN
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
        fn.proname, fn.args
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped grant (auth_only) on %.%(%) — %',
        'public', fn.proname, fn.args, SQLERRM;
    END;
  END LOOP;
END $$;


-- ── PHASE 3 ──────────────────────────────────────────────────────────────────
-- RLS helper functions: grant to BOTH anon AND authenticated.
--
-- WHY anon needs these:
--   Supabase evaluates RLS policies in the context of the calling role.
--   Anonymous users (anon key, unauthenticated browser requests) hit tables
--   that have policies like:
--     USING ( is_obrtnik() )   — returns false for anon, blocks the row
--     USING ( can_access_povprasevanje(id) )
--   Without EXECUTE on the helper, PostgreSQL raises:
--     "permission denied for function is_obrtnik"
--   and the entire query fails instead of returning an empty result set.
--
--   These helpers are SECURITY DEFINER so they safely inspect auth.uid()
--   and return false/null for anon — they do NOT leak private data.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn RECORD;
  rls_helpers TEXT[] := ARRAY[
    'is_super_admin',
    'is_admin',
    'is_own_profile',
    'get_user_role',
    'is_obrtnik',
    'is_narocnik',
    'get_subscription_tier',
    'can_access_povprasevanje'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc        p
    JOIN   pg_namespace   n ON n.oid = p.pronamespace
    WHERE  n.nspname = 'public'
      AND  p.proname = ANY(rls_helpers)
  LOOP
    BEGIN
      -- Revoke the blanket PUBLIC grant first to get a clean slate
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC',
        fn.proname, fn.args
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    BEGIN
      -- Re-grant explicitly to anon (needed by RLS policy evaluation)
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon, authenticated',
        fn.proname, fn.args
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipped grant (rls_helpers) on %.%(%) — %',
        'public', fn.proname, fn.args, SQLERRM;
    END;
  END LOOP;
END $$;


-- ── PHASE 4 ──────────────────────────────────────────────────────────────────
-- Catch-all: revoke anon from any remaining SECURITY DEFINER public functions
-- that were not already handled above.  This future-proofs against new
-- SECURITY DEFINER functions added without explicit permission setup.
-- Excludes trigger functions (prorettype = 2279 = trigger).
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  fn RECORD;
  already_handled TEXT[] := ARRAY[
    -- Phase 1 (full revoke)
    'refresh_ai_analytics','link_admin_user_on_signup','rls_auto_enable',
    'cleanup_old_alerts','update_admin_users_updated_at',
    'update_obrtnik_profiles_updated_at','set_updated_at_metadata',
    'tr_broadcast_sporocila','tr_broadcast_povprasevanje',
    'tr_broadcast_ponudba','tr_broadcast_notification',
    'update_obrtnik_avg_rating','update_obrtnik_rating',
    'handle_new_partner','handle_new_user','update_profiles_updated_at',
    'prevent_double_claim','update_sla_on_claim','set_updated_at',
    'set_hitl_updated_at','update_updated_at_column','update_updated_at',
    'upsert_agent_cost_summary','update_agent_conversation_timestamp',
    'recalc_obrtnik_rating','increment_ai_usage','reset_daily_ai_quota',
    'archive_ai_usage_logs','log_escrow_action','complete_task','start_task',
    'accept_task','claim_task','publish_task','expire_tasks',
    'check_expired_povprasevanja','escrow_auto_release',
    'github_create_file_direct','github_create_file','github_encode_path',
    -- Phase 2 (auth-only)
    'hybrid_search_tasks','match_ponudbe','match_tasks','match_obrtniki',
    'match_sporocila','get_obrtnik_with_categories','check_ai_quota',
    'get_ai_daily_limit',
    -- Phase 3 (rls helpers — intentionally kept for anon)
    'is_super_admin','is_admin','is_own_profile','get_user_role',
    'is_obrtnik','is_narocnik','get_subscription_tier',
    'can_access_povprasevanje'
  ];
BEGIN
  FOR fn IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM   pg_proc        p
    JOIN   pg_namespace   n ON n.oid = p.pronamespace
    WHERE  n.nspname   = 'public'
      AND  p.prosecdef = TRUE               -- SECURITY DEFINER only
      AND  p.prorettype <> 2279            -- exclude trigger functions
      AND  p.proname  <> ALL(already_handled)
  LOOP
    BEGIN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
        fn.proname, fn.args
      );
      RAISE NOTICE 'catch-all revoke: public.%(%)  FROM PUBLIC, anon',
        fn.proname, fn.args;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- Run after applying. Expected results are noted inline.
-- ════════════════════════════════════════════════════════════════════════════

/*
-- 1. Full permission matrix for public-schema functions
-- -------------------------------------------------------
SELECT
  n.nspname                                            AS schema,
  p.proname                                            AS routine_name,
  pg_get_function_identity_arguments(p.oid)            AS args,
  r.rolname                                            AS grantee
FROM pg_proc       p
JOIN pg_namespace  n ON n.oid = p.pronamespace
JOIN pg_roles      r ON has_function_privilege(r.oid, p.oid, 'EXECUTE')
WHERE n.nspname = 'public'
  AND r.rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY p.proname, r.rolname;

-- Expected:
-- • Mutation / trigger / admin / cron / escrow / GitHub functions:
--     NO rows for anon, NO rows for authenticated
--     (service_role bypasses privilege checks entirely)
-- • Search / match / AI-read functions (hybrid_search_tasks, match_*…):
--     authenticated only
-- • RLS helpers (is_admin, is_obrtnik, can_access_povprasevanje…):
--     anon + authenticated

-- 2. Quick check — anon must NOT appear for any risky function
-- -------------------------------------------------------------
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles     r ON r.rolname = 'anon'
WHERE n.nspname = 'public'
  AND p.proname IN (
    'accept_task','claim_task','complete_task','start_task','publish_task',
    'expire_tasks','escrow_auto_release','log_escrow_action',
    'increment_ai_usage','reset_daily_ai_quota','archive_ai_usage_logs',
    'github_create_file_direct','github_create_file',
    'handle_new_user','handle_new_partner',
    'refresh_ai_analytics','rls_auto_enable','link_admin_user_on_signup'
  )
  AND has_function_privilege(r.oid, p.oid, 'EXECUTE');
-- Expected: 0 rows

-- 3. RLS helpers must remain accessible to anon
-- -----------------------------------------------
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles     r ON r.rolname = 'anon'
WHERE n.nspname = 'public'
  AND p.proname IN (
    'is_admin','is_super_admin','is_obrtnik','is_narocnik',
    'is_own_profile','get_user_role','get_subscription_tier',
    'can_access_povprasevanje'
  )
  AND has_function_privilege(r.oid, p.oid, 'EXECUTE');
-- Expected: 1 row per function (anon can execute for RLS evaluation)

-- 4. Post-migration app smoke tests
-- -----------------------------------
-- a) Anonymous povpraševanje submit:
--    POST /api/povprasevanje/public  →  200 {ok:true, data:{id:"…"}}
--    (uses supabaseAdmin / service_role, bypasses all RLS — not affected)
--
-- b) Obrtnik dashboard:
--    GET /partner-dashboard  →  renders without "permission denied" errors
--    (authenticated role; search/match functions now gated to authenticated)
--
-- c) Ponudba creation:
--    POST /api/ponudbe  →  200 {success:true}
--    (authenticated; offerService uses authenticated client)
--
-- d) Notification creation:
--    sendNotification(…)  →  inserts row in notifications via supabaseAdmin
--    (service_role; unaffected by this migration)
*/
