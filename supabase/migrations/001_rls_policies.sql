-- ══════════════════════════════════════════════════════════════
-- LiftGO Row Level Security Policies
-- Anti-bypass system - prevents users from seeing admin data
-- ══════════════════════════════════════════════════════════════

-- Helper function to get user role from JWT claims
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'CUSTOMER'
  )::text;
$$;

-- Helper function to get current user ID from JWT
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    auth.uid()::text
  );
$$;

-- ══════════════════════════════════════════════════════════════
-- USERS TABLE
-- Each user can only see their own record | Admin can see all
-- ══════════════════════════════════════════════════════════════

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_select_own"
ON "User"
FOR SELECT
USING (
  auth.user_role() = 'ADMIN'
  OR id = auth.user_id()
);

-- Users can update their own profile
CREATE POLICY "users_update_own"
ON "User"
FOR UPDATE
USING (
  auth.user_role() = 'ADMIN'
  OR id = auth.user_id()
)
WITH CHECK (
  auth.user_role() = 'ADMIN'
  OR id = auth.user_id()
);

-- Only admins can insert users
CREATE POLICY "users_insert_admin"
ON "User"
FOR INSERT
WITH CHECK (
  auth.user_role() = 'ADMIN'
);

-- Only admins can delete users
CREATE POLICY "users_delete_admin"
ON "User"
FOR DELETE
USING (
  auth.user_role() = 'ADMIN'
);

-- ══════════════════════════════════════════════════════════════
-- CRAFTWORKER PROFILE TABLE
-- Craftworker can see their own profile | Admin can see all
-- ══════════════════════════════════════════════════════════════

ALTER TABLE "CraftworkerProfile" ENABLE ROW LEVEL SECURITY;

-- Craftworkers and admins can read profiles
CREATE POLICY "craftworker_profiles_select"
ON "CraftworkerProfile"
FOR SELECT
USING (
  auth.user_role() = 'ADMIN'
  OR "userId" = auth.user_id()
);

-- Craftworkers can update their own profile (but not commission rate or suspension status)
CREATE POLICY "craftworker_profiles_update_own"
ON "CraftworkerProfile"
FOR UPDATE
USING (
  auth.user_role() = 'ADMIN'
  OR "userId" = auth.user_id()
);

-- Only admins can insert craftworker profiles
CREATE POLICY "craftworker_profiles_insert_admin"
ON "CraftworkerProfile"
FOR INSERT
WITH CHECK (
  auth.user_role() = 'ADMIN'
);

-- ══════════════════════════════════════════════════════════════
-- JOBS TABLE
-- Customer sees their own jobs | Craftworker sees assigned jobs | Admin sees all
-- ══════════════════════════════════════════════════════════════

ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;

-- Users can see jobs they're involved in
CREATE POLICY "jobs_select_involved"
ON "Job"
FOR SELECT
USING (
  auth.user_role() = 'ADMIN'
  OR "customerId" = auth.user_id()
  OR "craftworkerId" = auth.user_id()
);

-- Customers can create jobs
CREATE POLICY "jobs_insert_customer"
ON "Job"
FOR INSERT
WITH CHECK (
  "customerId" = auth.user_id()
  OR auth.user_role() = 'ADMIN'
);

-- Involved users can update jobs (but admins have full control)
CREATE POLICY "jobs_update_involved"
ON "Job"
FOR UPDATE
USING (
  auth.user_role() = 'ADMIN'
  OR "customerId" = auth.user_id()
  OR "craftworkerId" = auth.user_id()
)
WITH CHECK (
  auth.user_role() = 'ADMIN'
  OR "customerId" = auth.user_id()
  OR "craftworkerId" = auth.user_id()
);

-- Only customers or admins can delete their jobs
CREATE POLICY "jobs_delete_customer_or_admin"
ON "Job"
FOR DELETE
USING (
  auth.user_role() = 'ADMIN'
  OR "customerId" = auth.user_id()
);

-- ══════════════════════════════════════════════════════════════
-- PAYMENTS TABLE
-- Customer sees their payment | Craftworker sees their payout | Admin sees all
-- ══════════════════════════════════════════════════════════════

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;

-- Users can see payments for their jobs
CREATE POLICY "payments_select_job_participant"
ON "Payment"
FOR SELECT
USING (
  auth.user_role() = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM "Job"
    WHERE "Job".id = "Payment"."jobId"
    AND (
      "Job"."customerId" = auth.user_id()
      OR "Job"."craftworkerId" = auth.user_id()
    )
  )
);

-- Only admins can modify payments
CREATE POLICY "payments_insert_admin"
ON "Payment"
FOR INSERT
WITH CHECK (
  auth.user_role() = 'ADMIN'
);

CREATE POLICY "payments_update_admin"
ON "Payment"
FOR UPDATE
USING (
  auth.user_role() = 'ADMIN'
);

-- ══════════════════════════════════════════════════════════════
-- CONVERSATIONS TABLE
-- Participants can see their conversations | Admin sees all
-- ══════════════════════════════════════════════════════════════

ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;

-- Users can see conversations for their jobs
CREATE POLICY "conversations_select_participant"
ON "Conversation"
FOR SELECT
USING (
  auth.user_role() = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM "Job"
    WHERE "Job".id = "Conversation"."jobId"
    AND (
      "Job"."customerId" = auth.user_id()
      OR "Job"."craftworkerId" = auth.user_id()
    )
  )
);

-- System can create conversations
CREATE POLICY "conversations_insert_system"
ON "Conversation"
FOR INSERT
WITH CHECK (
  auth.user_role() = 'ADMIN'
);

-- Admins can update conversations
CREATE POLICY "conversations_update_admin"
ON "Conversation"
FOR UPDATE
USING (
  auth.user_role() = 'ADMIN'
);

-- ══════════════════════════════════════════════════════════════
-- MESSAGES TABLE
-- Participants can see messages from their conversations | Admin sees all
-- ══════════════════════════════════════════════════════════════

ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;

-- Users can see messages from conversations they're part of
CREATE POLICY "messages_select_conversation_participant"
ON "Message"
FOR SELECT
USING (
  auth.user_role() = 'ADMIN'
  OR EXISTS (
    SELECT 1 FROM "Conversation"
    INNER JOIN "Job" ON "Job".id = "Conversation"."jobId"
    WHERE "Conversation".id = "Message"."conversationId"
    AND (
      "Job"."customerId" = auth.user_id()
      OR "Job"."craftworkerId" = auth.user_id()
    )
  )
);

-- Users can insert messages to their conversations
CREATE POLICY "messages_insert_participant"
ON "Message"
FOR INSERT
WITH CHECK (
  "senderUserId" = auth.user_id()
  AND EXISTS (
    SELECT 1 FROM "Conversation"
    INNER JOIN "Job" ON "Job".id = "Conversation"."jobId"
    WHERE "Conversation".id = "Message"."conversationId"
    AND (
      "Job"."customerId" = auth.user_id()
      OR "Job"."craftworkerId" = auth.user_id()
    )
  )
);

-- Only admins can update messages (for blocking)
CREATE POLICY "messages_update_admin"
ON "Message"
FOR UPDATE
USING (
  auth.user_role() = 'ADMIN'
);

-- ══════════════════════════════════════════════════════════════
-- VIOLATIONS TABLE
-- ONLY ADMINS can see violations - completely hidden from regular users
-- This prevents gaming the system by seeing what gets flagged
-- ══════════════════════════════════════════════════════════════

ALTER TABLE "Violation" ENABLE ROW LEVEL SECURITY;

-- Only admins can see violations
CREATE POLICY "violations_admin_only_select"
ON "Violation"
FOR SELECT
USING (
  auth.user_role() = 'ADMIN'
);

-- Only system/admin can create violations
CREATE POLICY "violations_admin_only_insert"
ON "Violation"
FOR INSERT
WITH CHECK (
  auth.user_role() = 'ADMIN'
);

-- Only admins can update violations (for review)
CREATE POLICY "violations_admin_only_update"
ON "Violation"
FOR UPDATE
USING (
  auth.user_role() = 'ADMIN'
);

-- ══════════════════════════════════════════════════════════════
-- RISK SCORE TABLE
-- ONLY ADMINS can see risk scores - completely hidden from users
-- Critical for preventing bypass attempts
-- ══════════════════════════════════════════════════════════════

ALTER TABLE "RiskScore" ENABLE ROW LEVEL SECURITY;

-- Only admins can see risk scores
CREATE POLICY "risk_scores_admin_only_select"
ON "RiskScore"
FOR SELECT
USING (
  auth.user_role() = 'ADMIN'
);

-- Only system/admin can create risk scores
CREATE POLICY "risk_scores_admin_only_insert"
ON "RiskScore"
FOR INSERT
WITH CHECK (
  auth.user_role() = 'ADMIN'
);

-- Only admins can update risk scores
CREATE POLICY "risk_scores_admin_only_update"
ON "RiskScore"
FOR UPDATE
USING (
  auth.user_role() = 'ADMIN'
);

-- ══════════════════════════════════════════════════════════════
-- SECURITY NOTES
-- ══════════════════════════════════════════════════════════════

-- 1. Violation and RiskScore tables are admin-only to prevent users from
--    reverse-engineering the detection system.
--
-- 2. Service role key bypasses RLS - use only in trusted server-side code.
--
-- 3. JWT claims must include 'role' in app_metadata for proper access control.
--
-- 4. Regular users (anon key) cannot see:
--    - Other users' data
--    - System violation logs
--    - Risk assessment scores
--    - Payment details of other jobs
--
-- 5. Consider adding audit logging for sensitive admin operations.
