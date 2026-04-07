-- Create refund_triggers table for 2H guarantee system
-- Tracks when 2H guarantee is triggered and refund status

CREATE TABLE IF NOT EXISTS public.refund_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.povprasevanja(id) ON DELETE CASCADE,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT NOT NULL CHECK (reason IN (
    '2_hour_guarantee_breach',
    'customer_initiated',
    'admin_initiated',
    'payment_refund_requested',
    'dispute_resolution'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',
    'approved',
    'processing',
    'completed',
    'failed',
    'cancelled'
  )),
  refund_amount_cents INTEGER,
  stripe_refund_id TEXT,
  processed_at TIMESTAMPTZ,
  notes TEXT,
  processed_by_admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refund_triggers ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin can read all refund triggers
CREATE POLICY "Admin can read all refund triggers"
ON public.refund_triggers FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_user_id = auth.uid() AND aktiven = true
  )
);

-- RLS Policy: Admin can update refund triggers
CREATE POLICY "Admin can update refund triggers"
ON public.refund_triggers FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_user_id = auth.uid() AND aktiven = true
  )
);

-- RLS Policy: System can insert refund triggers
CREATE POLICY "System can insert refund triggers"
ON public.refund_triggers FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_refund_triggers_request_id ON public.refund_triggers(request_id);
CREATE INDEX idx_refund_triggers_status ON public.refund_triggers(status);
CREATE INDEX idx_refund_triggers_triggered_at ON public.refund_triggers(triggered_at DESC);
CREATE INDEX idx_refund_triggers_reason ON public.refund_triggers(reason);
CREATE INDEX idx_refund_triggers_created_at ON public.refund_triggers(created_at DESC);

-- Index for finding pending refunds
CREATE INDEX idx_refund_triggers_pending ON public.refund_triggers(status, triggered_at DESC)
WHERE status = 'pending';

-- Trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_refund_triggers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refund_triggers_updated_at
BEFORE UPDATE ON public.refund_triggers
FOR EACH ROW
EXECUTE FUNCTION update_refund_triggers_updated_at();

COMMENT ON TABLE public.refund_triggers IS '2H guarantee system - tracks when guarantees are triggered and refund status';
COMMENT ON COLUMN public.refund_triggers.reason IS 'Reason for refund trigger';
COMMENT ON COLUMN public.refund_triggers.status IS 'Current status of refund: pending, approved, processing, completed, failed, cancelled';
COMMENT ON COLUMN public.refund_triggers.refund_amount_cents IS 'Amount to refund in cents';
COMMENT ON COLUMN public.refund_triggers.stripe_refund_id IS 'Stripe refund ID for tracking';
COMMENT ON COLUMN public.refund_triggers.metadata IS 'Additional metadata for tracking and debugging';
