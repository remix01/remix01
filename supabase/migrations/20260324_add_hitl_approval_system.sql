-- ============================================================================
-- Migration: 20260324_add_hitl_approval_system
-- LiftGO — Human-in-the-Loop Approval System
-- ============================================================================
-- Creates the hitl_approvals table used by the HITL pattern.
-- Approval requests are created when an AI agent pauses for human review.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Table: hitl_approvals
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.hitl_approvals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Links this approval to a specific AI execution run
  execution_id    TEXT NOT NULL,

  -- The name of the AI agent that triggered this request
  agent_name      TEXT NOT NULL,

  -- Human-readable description of what needs approval
  description     TEXT NOT NULL,

  -- Arbitrary JSON context for the approver (e.g. task details, quote amounts)
  context         JSONB NOT NULL DEFAULT '{}',

  -- Current status of the approval request
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),

  -- The user who approved/rejected (NULL until a decision is made)
  approver_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Optional note from the approver explaining their decision
  approver_note   TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Look up approvals by execution (e.g. realtime filter, polling)
CREATE INDEX IF NOT EXISTS idx_hitl_approvals_execution_id
  ON public.hitl_approvals (execution_id);

-- Fetch all pending approvals quickly (admin inbox)
CREATE INDEX IF NOT EXISTS idx_hitl_approvals_status
  ON public.hitl_approvals (status)
  WHERE status = 'pending';

-- Fetch approvals assigned to a specific approver
CREATE INDEX IF NOT EXISTS idx_hitl_approvals_approver_id
  ON public.hitl_approvals (approver_id)
  WHERE approver_id IS NOT NULL;

-- Chronological listing
CREATE INDEX IF NOT EXISTS idx_hitl_approvals_created_at
  ON public.hitl_approvals (created_at DESC);

-- ---------------------------------------------------------------------------
-- Auto-update updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_hitl_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hitl_approvals_updated_at
  BEFORE UPDATE ON public.hitl_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_hitl_updated_at();

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.hitl_approvals ENABLE ROW LEVEL SECURITY;

-- Policy: Service role (used by server-side code) has full access
-- Note: The service role key bypasses RLS automatically; this policy is
-- here for explicitness and documentation purposes.
CREATE POLICY "service_role_full_access"
  ON public.hitl_approvals
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can view approvals where they are the approver
-- or approvals without a designated approver (open inbox)
CREATE POLICY "approver_can_view"
  ON public.hitl_approvals
  FOR SELECT
  TO authenticated
  USING (
    approver_id = auth.uid()
    OR approver_id IS NULL
  );

-- Policy: Authenticated users can update approval status for records
-- they are allowed to view (status transition: pending → approved/rejected)
CREATE POLICY "approver_can_decide"
  ON public.hitl_approvals
  FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND (approver_id = auth.uid() OR approver_id IS NULL)
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
    AND approver_id = auth.uid()
  );

-- Policy: Admins (profiles.role = 'admin') can see all approvals
CREATE POLICY "admin_full_select"
  ON public.hitl_approvals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Policy: Admins can approve/reject any pending approval
CREATE POLICY "admin_full_update"
  ON public.hitl_approvals
  FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    status IN ('approved', 'rejected')
  );

-- ---------------------------------------------------------------------------
-- Enable Realtime for this table
-- (Allows subscribeToApprovals() to work via Supabase Realtime)
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE public.hitl_approvals;

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------

COMMENT ON TABLE public.hitl_approvals IS
  'Stores AI agent execution approval requests for the Human-in-the-Loop pattern. '
  'Created by lib/ai/patterns/human-in-the-loop.ts.';

COMMENT ON COLUMN public.hitl_approvals.execution_id IS
  'Unique ID for an AI execution run. Used as a realtime filter key.';

COMMENT ON COLUMN public.hitl_approvals.context IS
  'JSON context provided to the approver. May include task details, computed values, etc.';

COMMENT ON COLUMN public.hitl_approvals.status IS
  'pending: awaiting human decision. approved: execution may continue. rejected: execution aborted.';
