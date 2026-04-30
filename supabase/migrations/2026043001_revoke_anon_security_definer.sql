-- Revoke EXECUTE on dangerous SECURITY DEFINER functions from the anon role.
-- These functions bypass RLS and must not be callable by unauthenticated requests.
--
-- HIGH RISK — revoked from both anon and authenticated; only service_role may call:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'github_create_file_direct') THEN
    REVOKE EXECUTE ON FUNCTION public.github_create_file_direct FROM anon, authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'escrow_auto_release') THEN
    REVOKE EXECUTE ON FUNCTION public.escrow_auto_release FROM anon, authenticated;
  END IF;
END $$;

-- HIGH RISK — revoked from anon, kept for authenticated with explicit re-grant:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'accept_task') THEN
    REVOKE EXECUTE ON FUNCTION public.accept_task FROM anon;
    GRANT  EXECUTE ON FUNCTION public.accept_task TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'claim_task') THEN
    REVOKE EXECUTE ON FUNCTION public.claim_task FROM anon;
    GRANT  EXECUTE ON FUNCTION public.claim_task TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'complete_task') THEN
    REVOKE EXECUTE ON FUNCTION public.complete_task FROM anon;
    GRANT  EXECUTE ON FUNCTION public.complete_task TO authenticated;
  END IF;
END $$;

-- MEDIUM RISK — revoked from anon:
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'increment_ai_usage') THEN
    REVOKE EXECUTE ON FUNCTION public.increment_ai_usage FROM anon;
    GRANT  EXECUTE ON FUNCTION public.increment_ai_usage TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'handle_new_partner') THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_partner FROM anon;
    -- handle_new_partner is a trigger function; direct calls should also be restricted
    REVOKE EXECUTE ON FUNCTION public.handle_new_partner FROM authenticated;
  END IF;
END $$;

-- Revoke any remaining SECURITY DEFINER functions in public schema from anon
-- that are not already handled above (catch-all for functions we might have missed).
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = TRUE  -- SECURITY DEFINER
      AND p.proname NOT IN (
        'github_create_file_direct', 'escrow_auto_release',
        'accept_task', 'claim_task', 'complete_task',
        'increment_ai_usage', 'handle_new_partner'
      )
  LOOP
    BEGIN
      EXECUTE format(
        'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon',
        fn.proname, fn.args
      );
    EXCEPTION WHEN OTHERS THEN
      -- Ignore if privilege doesn't exist
      NULL;
    END;
  END LOOP;
END $$;

-- ── Verification query (run after applying) ──────────────────────────────────
-- SELECT routine_name, grantee, privilege_type
-- FROM information_schema.routine_privileges
-- WHERE routine_schema = 'public'
--   AND grantee = 'anon'
-- ORDER BY routine_name;
-- Expected: zero rows for the functions listed above.
