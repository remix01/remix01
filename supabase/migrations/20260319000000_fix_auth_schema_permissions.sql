-- Migration: Fix auth schema permission error
-- Description: Move helper functions from auth schema to public schema.
--              Supabase owns the auth schema; creating functions there requires
--              superuser privileges that are not available in hosted Supabase projects.
-- Fixes: ERROR: permission denied for schema auth (SQLSTATE 42501)

BEGIN;

-- Drop functions that were incorrectly placed in the auth schema (if they exist)
DROP FUNCTION IF EXISTS auth.user_role();
DROP FUNCTION IF EXISTS auth.user_id();

-- ══════════════════════════════════════════════════════════════
-- Helper functions re-created in the public schema
-- ══════════════════════════════════════════════════════════════

-- Returns the role stored in the JWT app_metadata claim, defaulting to 'CUSTOMER'
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

-- Returns the current authenticated user's ID as text (from JWT sub or auth.uid())
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

-- Grant execute to authenticated and anon roles so RLS policies can call them
GRANT EXECUTE ON FUNCTION public.user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.user_id()   TO authenticated, anon;

-- ══════════════════════════════════════════════════════════════
-- Re-create RLS policies that referenced auth.user_role() / auth.user_id()
-- ══════════════════════════════════════════════════════════════

-- USERS TABLE
DROP POLICY IF EXISTS "users_select_own"         ON "User";
DROP POLICY IF EXISTS "users_update_own"         ON "User";
DROP POLICY IF EXISTS "users_insert_admin"       ON "User";
DROP POLICY IF EXISTS "users_delete_admin"       ON "User";

CREATE POLICY "users_select_own" ON "User"
FOR SELECT USING (
  public.user_role() = 'ADMIN' OR id = public.user_id()
);

CREATE POLICY "users_update_own" ON "User"
FOR UPDATE
USING     (public.user_role() = 'ADMIN' OR id = public.user_id())
WITH CHECK (public.user_role() = 'ADMIN' OR id = public.user_id());

CREATE POLICY "users_insert_admin" ON "User"
FOR INSERT WITH CHECK (public.user_role() = 'ADMIN');

CREATE POLICY "users_delete_admin" ON "User"
FOR DELETE USING (public.user_role() = 'ADMIN');

-- CRAFTWORKER PROFILE TABLE
DROP POLICY IF EXISTS "craftworker_profiles_select"       ON "CraftworkerProfile";
DROP POLICY IF EXISTS "craftworker_profiles_update_own"   ON "CraftworkerProfile";
DROP POLICY IF EXISTS "craftworker_profiles_insert_admin" ON "CraftworkerProfile";

CREATE POLICY "craftworker_profiles_select" ON "CraftworkerProfile"
FOR SELECT USING (
  public.user_role() = 'ADMIN' OR "userId" = public.user_id()
);

CREATE POLICY "craftworker_profiles_update_own" ON "CraftworkerProfile"
FOR UPDATE USING (
  public.user_role() = 'ADMIN' OR "userId" = public.user_id()
);

CREATE POLICY "craftworker_profiles_insert_admin" ON "CraftworkerProfile"
FOR INSERT WITH CHECK (public.user_role() = 'ADMIN');

-- JOBS TABLE
DROP POLICY IF EXISTS "jobs_select_involved"           ON "Job";
DROP POLICY IF EXISTS "jobs_insert_customer"           ON "Job";
DROP POLICY IF EXISTS "jobs_update_involved"           ON "Job";
DROP POLICY IF EXISTS "jobs_delete_customer_or_admin"  ON "Job";

CREATE POLICY "jobs_select_involved" ON "Job"
FOR SELECT USING (
  public.user_role() = 'ADMIN'
  OR "customerId"    = public.user_id()
  OR "craftworkerId" = public.user_id()
);

CREATE POLICY "jobs_insert_customer" ON "Job"
FOR INSERT WITH CHECK (
  "customerId" = public.user_id() OR public.user_role() = 'ADMIN'
);

CREATE POLICY "jobs_update_involved" ON "Job"
FOR UPDATE
USING (
  public.user_role() = 'ADMIN'
  OR "customerId"    = public.user_id()
  OR "craftworkerId" = public.user_id()
)
WITH CHECK (
  public.user_role() = 'ADMIN'
  OR "customerId"    = public.user_id()
  OR "craftworkerId" = public.user_id()
);

CREATE POLICY "jobs_delete_customer_or_admin" ON "Job"
FOR DELETE USING (
  public.user_role() = 'ADMIN' OR "customerId" = public.user_id()
);

-- PAYMENTS TABLE
DROP POLICY IF EXISTS "payments_select_job_participant" ON "Payment";
DROP POLICY IF EXISTS "payments_insert_admin"           ON "Payment";
DROP POLICY IF EXISTS "payments_update_admin"           ON "Payment";

CREATE POLICY "payments_select_job_participant" ON "Payment"
FOR SELECT USING (
  public.user_role() = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM "Job"
    WHERE "Job".id = "Payment"."jobId"
    AND (
      "Job"."customerId"    = public.user_id()
      OR "Job"."craftworkerId" = public.user_id()
    )
  )
);

CREATE POLICY "payments_insert_admin" ON "Payment"
FOR INSERT WITH CHECK (public.user_role() = 'ADMIN');

CREATE POLICY "payments_update_admin" ON "Payment"
FOR UPDATE USING (public.user_role() = 'ADMIN');

-- CONVERSATIONS TABLE
DROP POLICY IF EXISTS "conversations_select_participant" ON "Conversation";
DROP POLICY IF EXISTS "conversations_insert_system"      ON "Conversation";
DROP POLICY IF EXISTS "conversations_update_admin"       ON "Conversation";

CREATE POLICY "conversations_select_participant" ON "Conversation"
FOR SELECT USING (
  public.user_role() = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM "Job"
    WHERE "Job".id = "Conversation"."jobId"
    AND (
      "Job"."customerId"    = public.user_id()
      OR "Job"."craftworkerId" = public.user_id()
    )
  )
);

CREATE POLICY "conversations_insert_system" ON "Conversation"
FOR INSERT WITH CHECK (public.user_role() = 'ADMIN');

CREATE POLICY "conversations_update_admin" ON "Conversation"
FOR UPDATE USING (public.user_role() = 'ADMIN');

-- MESSAGES TABLE
DROP POLICY IF EXISTS "messages_select_conversation_participant" ON "Message";
DROP POLICY IF EXISTS "messages_insert_participant"              ON "Message";
DROP POLICY IF EXISTS "messages_update_admin"                    ON "Message";

CREATE POLICY "messages_select_conversation_participant" ON "Message"
FOR SELECT USING (
  public.user_role() = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM "Conversation"
    INNER JOIN "Job" ON "Job".id = "Conversation"."jobId"
    WHERE "Conversation".id = "Message"."conversationId"
    AND (
      "Job"."customerId"    = public.user_id()
      OR "Job"."craftworkerId" = public.user_id()
    )
  )
);

CREATE POLICY "messages_insert_participant" ON "Message"
FOR INSERT WITH CHECK (
  "senderUserId" = public.user_id()
  AND EXISTS (
    SELECT 1 FROM "Conversation"
    INNER JOIN "Job" ON "Job".id = "Conversation"."jobId"
    WHERE "Conversation".id = "Message"."conversationId"
    AND (
      "Job"."customerId"    = public.user_id()
      OR "Job"."craftworkerId" = public.user_id()
    )
  )
);

CREATE POLICY "messages_update_admin" ON "Message"
FOR UPDATE USING (public.user_role() = 'ADMIN');

-- VIOLATIONS TABLE
DROP POLICY IF EXISTS "violations_admin_only_select" ON "Violation";
DROP POLICY IF EXISTS "violations_admin_only_insert" ON "Violation";
DROP POLICY IF EXISTS "violations_admin_only_update" ON "Violation";

CREATE POLICY "violations_admin_only_select" ON "Violation"
FOR SELECT USING (public.user_role() = 'ADMIN');

CREATE POLICY "violations_admin_only_insert" ON "Violation"
FOR INSERT WITH CHECK (public.user_role() = 'ADMIN');

CREATE POLICY "violations_admin_only_update" ON "Violation"
FOR UPDATE USING (public.user_role() = 'ADMIN');

-- RISK SCORES TABLE
DROP POLICY IF EXISTS "risk_scores_admin_only_select" ON "RiskScore";
DROP POLICY IF EXISTS "risk_scores_admin_only_insert" ON "RiskScore";
DROP POLICY IF EXISTS "risk_scores_admin_only_update" ON "RiskScore";

CREATE POLICY "risk_scores_admin_only_select" ON "RiskScore"
FOR SELECT USING (public.user_role() = 'ADMIN');

CREATE POLICY "risk_scores_admin_only_insert" ON "RiskScore"
FOR INSERT WITH CHECK (public.user_role() = 'ADMIN');

CREATE POLICY "risk_scores_admin_only_update" ON "RiskScore"
FOR UPDATE USING (public.user_role() = 'ADMIN');

COMMIT;
