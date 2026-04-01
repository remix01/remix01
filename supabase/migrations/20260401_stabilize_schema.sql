-- Stabilize Schema Migration
-- Adds missing columns to ponudbe for instant-offer drafts
-- and ensures obrtnik_profiles has plan_type + instant offer fields

-- ============================================================================
-- PONUDBE — extend for instant offer drafts
-- ============================================================================
-- status already altered by 20250310_marketplace_events.sql, but ensure
-- the full set of values is present (idempotent via CHECK constraint replacement)
ALTER TABLE public.ponudbe
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS estimated_duration INTEGER,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_id UUID;

-- Widen status to include 'draft' and 'preklicana'
-- Drop old constraint first (ignore error if it doesn't exist)
ALTER TABLE public.ponudbe DROP CONSTRAINT IF EXISTS ponudbe_status_check;
ALTER TABLE public.ponudbe ADD CONSTRAINT ponudbe_status_check
  CHECK (status IN ('draft', 'poslana', 'sprejeta', 'zavrnjena', 'preklicana'));

-- ============================================================================
-- OBRTNIK_PROFILES — ensure instant-offer columns exist
-- (20250310_marketplace_events.sql adds these, but run IF NOT EXISTS for safety)
-- ============================================================================
ALTER TABLE public.obrtnik_profiles
  ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'START'
    CHECK (plan_type IN ('START', 'PRO')),
  ADD COLUMN IF NOT EXISTS enable_instant_offers BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instant_offer_templates JSONB NOT NULL DEFAULT '[]';

-- ============================================================================
-- EVENT_LOG — ensure table exists (created by 20250310_event_log.sql)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  emitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "admin_read_event_log" ON public.event_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE INDEX IF NOT EXISTS idx_event_log_name_ts
  ON public.event_log(event_name, emitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_log_payload_gin
  ON public.event_log USING GIN (payload jsonb_path_ops);

-- ============================================================================
-- MARKETPLACE_EVENTS — ensure table exists
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.marketplace_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  request_id UUID NOT NULL,
  partner_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- POVPRASEVANJA — add notified_at for SLA tracking
-- ============================================================================
ALTER TABLE public.povprasevanja
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

-- ============================================================================
-- ESCROW_HOLDS — frozen payment tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.escrow_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'released', 'refunded')),
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at TIMESTAMPTZ
);

ALTER TABLE public.escrow_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escrow_holds_service_only" ON public.escrow_holds
  USING (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_escrow_holds_status ON public.escrow_holds(status, created_at)
  WHERE status = 'held';
