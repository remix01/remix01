-- ══════════════════════════════════════════════════════════════
-- LiftGO Row Level Security Policies
-- Anti-bypass system - prevents users from seeing admin data
-- ══════════════════════════════════════════════════════════════

-- Helper function to get user role from JWT claims
-- NOTE: Created in public schema - Supabase does not allow creating functions
--       in the auth schema (permission denied for schema auth).
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'CUSTOMER'
  )::text;
$$;

-- Helper function to get current user ID from JWT
CREATE OR REPLACE FUNCTION public.user_id()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    auth.uid()::text
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_id()   TO authenticated, anon;

-- ══════════════════════════════════════════════════════════════
-- NOTE: The table-level RLS policies below (for "User",
-- "CraftworkerProfile", "Job", etc.) reference a legacy Prisma
-- schema that is no longer used. This project uses the tables
-- profiles, obrtnik_profiles, tasks, ponudbe, sporocila, etc.
-- Those tables have RLS configured in later migrations.
-- The legacy blocks are skipped safely here.
-- ══════════════════════════════════════════════════════════════
DO $$
BEGIN
  -- Skip all legacy Prisma-schema RLS statements if the tables don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'User'
  ) THEN
    RETURN;
  END IF;

  -- ══════════════════════════════════════════════════════════════
  -- USERS TABLE
  -- Each user can only see their own record | Admin can see all
  -- ══════════════════════════════════════════════════════════════

  EXECUTE 'ALTER TABLE "User" ENABLE ROW LEVEL SECURITY';

  EXECUTE $policy$
    CREATE POLICY "users_select_own" ON "User" FOR SELECT
    USING (public.user_role() = ''ADMIN'' OR id = public.user_id())
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "users_update_own" ON "User" FOR UPDATE
    USING (public.user_role() = ''ADMIN'' OR id = public.user_id())
    WITH CHECK (public.user_role() = ''ADMIN'' OR id = public.user_id())
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "users_insert_admin" ON "User" FOR INSERT
    WITH CHECK (public.user_role() = ''ADMIN'')
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "users_delete_admin" ON "User" FOR DELETE
    USING (public.user_role() = ''ADMIN'')
  $policy$;

  -- ══════════════════════════════════════════════════════════════
  -- CRAFTWORKER PROFILE TABLE
  -- ══════════════════════════════════════════════════════════════

  EXECUTE 'ALTER TABLE "CraftworkerProfile" ENABLE ROW LEVEL SECURITY';

  EXECUTE $policy$
    CREATE POLICY "craftworker_profiles_select" ON "CraftworkerProfile" FOR SELECT
    USING (public.user_role() = ''ADMIN'' OR "userId" = public.user_id())
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "craftworker_profiles_update_own" ON "CraftworkerProfile" FOR UPDATE
    USING (public.user_role() = ''ADMIN'' OR "userId" = public.user_id())
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "craftworker_profiles_insert_admin" ON "CraftworkerProfile" FOR INSERT
    WITH CHECK (public.user_role() = ''ADMIN'')
  $policy$;

  -- ══════════════════════════════════════════════════════════════
  -- JOBS TABLE
  -- ══════════════════════════════════════════════════════════════

  EXECUTE 'ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY';

  EXECUTE $policy$
    CREATE POLICY "jobs_select_involved" ON "Job" FOR SELECT
    USING (
      public.user_role() = ''ADMIN''
      OR "customerId" = public.user_id()
      OR "craftworkerId" = public.user_id()
    )
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "jobs_insert_customer" ON "Job" FOR INSERT
    WITH CHECK ("customerId" = public.user_id() OR public.user_role() = ''ADMIN'')
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "jobs_update_involved" ON "Job" FOR UPDATE
    USING (
      public.user_role() = ''ADMIN''
      OR "customerId" = public.user_id()
      OR "craftworkerId" = public.user_id()
    )
    WITH CHECK (
      public.user_role() = ''ADMIN''
      OR "customerId" = public.user_id()
      OR "craftworkerId" = public.user_id()
    )
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "jobs_delete_customer_or_admin" ON "Job" FOR DELETE
    USING (public.user_role() = ''ADMIN'' OR "customerId" = public.user_id())
  $policy$;

  -- ══════════════════════════════════════════════════════════════
  -- PAYMENTS TABLE
  -- ══════════════════════════════════════════════════════════════

  EXECUTE 'ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY';

  EXECUTE $policy$
    CREATE POLICY "payments_select_job_participant" ON "Payment" FOR SELECT
    USING (
      public.user_role() = ''ADMIN''
      OR EXISTS (
        SELECT 1 FROM "Job"
        WHERE "Job".id = "Payment"."jobId"
        AND ("Job"."customerId" = public.user_id() OR "Job"."craftworkerId" = public.user_id())
      )
    )
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "payments_insert_admin" ON "Payment" FOR INSERT
    WITH CHECK (public.user_role() = ''ADMIN'')
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "payments_update_admin" ON "Payment" FOR UPDATE
    USING (public.user_role() = ''ADMIN'')
  $policy$;

  -- ══════════════════════════════════════════════════════════════
  -- CONVERSATIONS TABLE
  -- ══════════════════════════════════════════════════════════════

  EXECUTE 'ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY';

  EXECUTE $policy$
    CREATE POLICY "conversations_select_participant" ON "Conversation" FOR SELECT
    USING (
      public.user_role() = ''ADMIN''
      OR EXISTS (
        SELECT 1 FROM "Job"
        WHERE "Job".id = "Conversation"."jobId"
        AND ("Job"."customerId" = public.user_id() OR "Job"."craftworkerId" = public.user_id())
      )
    )
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "conversations_insert_system" ON "Conversation" FOR INSERT
    WITH CHECK (public.user_role() = ''ADMIN'')
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "conversations_update_admin" ON "Conversation" FOR UPDATE
    USING (public.user_role() = ''ADMIN'')
  $policy$;

  -- ══════════════════════════════════════════════════════════════
  -- MESSAGES TABLE
  -- ══════════════════════════════════════════════════════════════

  EXECUTE 'ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY';

  EXECUTE $policy$
    CREATE POLICY "messages_select_conversation_participant" ON "Message" FOR SELECT
    USING (
      public.user_role() = ''ADMIN''
      OR EXISTS (
        SELECT 1 FROM "Conversation"
        INNER JOIN "Job" ON "Job".id = "Conversation"."jobId"
        WHERE "Conversation".id = "Message"."conversationId"
        AND ("Job"."customerId" = public.user_id() OR "Job"."craftworkerId" = public.user_id())
      )
    )
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "messages_insert_participant" ON "Message" FOR INSERT
    WITH CHECK (
      "senderUserId" = public.user_id()
      AND EXISTS (
        SELECT 1 FROM "Conversation"
        INNER JOIN "Job" ON "Job".id = "Conversation"."jobId"
        WHERE "Conversation".id = "Message"."conversationId"
        AND ("Job"."customerId" = public.user_id() OR "Job"."craftworkerId" = public.user_id())
      )
    )
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "messages_update_admin" ON "Message" FOR UPDATE
    USING (public.user_role() = ''ADMIN'')
  $policy$;

  -- ══════════════════════════════════════════════════════════════
  -- VIOLATIONS TABLE
  -- ══════════════════════════════════════════════════════════════

  EXECUTE 'ALTER TABLE "Violation" ENABLE ROW LEVEL SECURITY';

  EXECUTE $policy$
    CREATE POLICY "violations_admin_only_select" ON "Violation" FOR SELECT
    USING (public.user_role() = ''ADMIN'')
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "violations_admin_only_insert" ON "Violation" FOR INSERT
    WITH CHECK (public.user_role() = ''ADMIN'')
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "violations_admin_only_update" ON "Violation" FOR UPDATE
    USING (public.user_role() = ''ADMIN'')
  $policy$;

  -- ══════════════════════════════════════════════════════════════
  -- RISK SCORE TABLE
  -- ══════════════════════════════════════════════════════════════

  EXECUTE 'ALTER TABLE "RiskScore" ENABLE ROW LEVEL SECURITY';

  EXECUTE $policy$
    CREATE POLICY "risk_scores_admin_only_select" ON "RiskScore" FOR SELECT
    USING (public.user_role() = ''ADMIN'')
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "risk_scores_admin_only_insert" ON "RiskScore" FOR INSERT
    WITH CHECK (public.user_role() = ''ADMIN'')
  $policy$;

  EXECUTE $policy$
    CREATE POLICY "risk_scores_admin_only_update" ON "RiskScore" FOR UPDATE
    USING (public.user_role() = ''ADMIN'')
  $policy$;

END $$;
