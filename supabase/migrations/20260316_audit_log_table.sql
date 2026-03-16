-- Migration: Create audit_log table
-- Used by lib/audit.ts for payment/job/dispute audit trail and Stripe idempotency checks

CREATE TABLE IF NOT EXISTS public.audit_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type       TEXT        NOT NULL,
  actor            TEXT        NOT NULL,
  job_id           UUID,
  payment_id       UUID,
  stripe_event_id  TEXT        UNIQUE,           -- idempotency key
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency lookup (used on every webhook event)
CREATE INDEX IF NOT EXISTS idx_audit_log_stripe_event_id
  ON public.audit_log(stripe_event_id)
  WHERE stripe_event_id IS NOT NULL;

-- Per-job audit trail
CREATE INDEX IF NOT EXISTS idx_audit_log_job_id
  ON public.audit_log(job_id)
  WHERE job_id IS NOT NULL;

-- Per-payment audit trail
CREATE INDEX IF NOT EXISTS idx_audit_log_payment_id
  ON public.audit_log(payment_id)
  WHERE payment_id IS NOT NULL;

-- Time-based queries for admin dashboard
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admin can read everything; nobody can insert via client (service role only)
CREATE POLICY "Admin read audit_log"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = auth.uid() AND aktiven = true
    )
  );
