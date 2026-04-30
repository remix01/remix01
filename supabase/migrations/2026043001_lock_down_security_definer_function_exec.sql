-- Security hardening: remove anon/public execute rights from SECURITY DEFINER functions.
-- This migration is intentionally idempotent.

BEGIN;

-- 1) Revoke anon/public from ALL SECURITY DEFINER functions in public schema.
DO $$
DECLARE
  fn RECORD;
BEGIN
  FOR fn IN
    SELECT n.nspname AS schema_name,
           p.proname AS function_name,
           pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, public;',
      fn.schema_name,
      fn.function_name,
      fn.identity_args
    );
  END LOOP;
END
$$;

-- 2) Explicitly prioritize critical revokes requested in the audit.
DO $$
DECLARE
  sig text;
BEGIN
  FOREACH sig IN ARRAY ARRAY[
    'public.github_create_file_direct',
    'public.escrow_auto_release',
    'public.accept_task',
    'public.claim_task',
    'public.complete_task',
    'public.increment_ai_usage',
    'public.handle_new_partner'
  ]
  LOOP
    EXECUTE format(
      'DO $inner$ DECLARE f RECORD; BEGIN FOR f IN SELECT oid::regprocedure AS regp FROM pg_proc WHERE pronamespace = ''public''::regnamespace AND proname = %L LOOP EXECUTE format(''REVOKE EXECUTE ON FUNCTION %%s FROM anon, public;'', f.regp); END LOOP; END $inner$;',
      split_part(sig, '.', 2)
    );
  END LOOP;
END
$$;

-- 3) Re-grant only where needed for authenticated product flows.
DO $$
BEGIN
  IF to_regprocedure('public.user_role()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.user_id()') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.user_id() TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.accept_task(uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.accept_task(uuid) TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.claim_task(uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.claim_task(uuid) TO authenticated, service_role';
  END IF;

  IF to_regprocedure('public.complete_task(uuid)') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.complete_task(uuid) TO authenticated, service_role';
  END IF;
END
$$;

-- 4) Verification query (run post-migration):
-- SELECT
--   n.nspname                                AS schema_name,
--   p.proname                                AS function_name,
--   pg_get_function_identity_arguments(p.oid) AS identity_args,
--   p.prosecdef                              AS security_definer,
--   has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_can_execute,
--   has_function_privilege('public', p.oid, 'EXECUTE')        AS public_can_execute,
--   has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
--   has_function_privilege('service_role', p.oid, 'EXECUTE')  AS service_role_can_execute
-- FROM pg_proc p
-- JOIN pg_namespace n ON n.oid = p.pronamespace
-- WHERE n.nspname = 'public'
--   AND p.prosecdef = true
-- ORDER BY 1,2,3;

COMMIT;
