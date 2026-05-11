-- Narocnik payment support
-- Fixes:
--   1. profiles is missing stripe_customer_id for narocnik Stripe billing
--   2. escrow_transactions links narocnik only by email, not by profiles.id FK
--   3. narocniki have no RLS policies to see their own transactions
--   4. no consolidated payment history view for narocnik

-- ============================================================
-- 1. Stripe Customer ID on profiles (for narocnik billing)
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer
  ON public.profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ============================================================
-- 2. Add customer_id FK to escrow_transactions
--    (was only customer_email TEXT — no referential integrity)
-- ============================================================
ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_escrow_customer ON public.escrow_transactions(customer_id);

-- ============================================================
-- 3. RLS — narocniki see their own escrow rows
-- ============================================================

-- escrow_transactions: narocnik reads own rows
CREATE POLICY "Narocniki see own transactions"
  ON public.escrow_transactions FOR SELECT
  USING (auth.uid() = customer_id);

-- narocnik can INSERT (create payment intent flow triggers this)
CREATE POLICY "Narocniki insert own transactions"
  ON public.escrow_transactions FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

-- escrow_audit_log: narocnik reads audit trail of own transactions
CREATE POLICY "Narocniki see own audit"
  ON public.escrow_audit_log FOR SELECT
  USING (
    auth.uid() = (
      SELECT customer_id FROM public.escrow_transactions
      WHERE id = transaction_id
    )
  );

-- escrow_disputes: narocnik sees disputes they opened or are party to
CREATE POLICY "Narocniki see own disputes"
  ON public.escrow_disputes FOR SELECT
  USING (
    opened_by_id = auth.uid()::text
    OR auth.uid() = (
      SELECT customer_id FROM public.escrow_transactions
      WHERE id = transaction_id
    )
  );

-- narocnik can open a dispute
CREATE POLICY "Narocniki insert disputes"
  ON public.escrow_disputes FOR INSERT
  WITH CHECK (
    opened_by_id = auth.uid()::text
    AND opened_by = 'customer'
    AND EXISTS (
      SELECT 1 FROM public.escrow_transactions
      WHERE id = transaction_id AND customer_id = auth.uid()
    )
  );

-- ============================================================
-- 4. Narocnik payment history view
-- ============================================================
CREATE OR REPLACE VIEW public.narocnik_placila AS
SELECT
  et.id,
  et.created_at,
  et.customer_id,
  et.partner_id,
  et.inquiry_id,

  -- Zneski pretvorjeni v EUR za prikaz
  (et.amount_total_cents / 100.0)::NUMERIC(10,2)  AS znesek_eur,
  (et.commission_cents   / 100.0)::NUMERIC(10,2)  AS provizija_eur,
  (et.payout_cents       / 100.0)::NUMERIC(10,2)  AS izplacilo_eur,
  et.commission_rate,

  et.status,
  et.stripe_payment_intent_id,
  et.paid_at,
  et.released_at,
  et.refunded_at,
  et.release_due_at,
  et.description,

  -- Podatki o delu
  i.title                  AS povprasevanje_naziv,
  op.business_name         AS obrtnik_naziv,

  -- Ali obstaja odprt spor
  EXISTS (
    SELECT 1 FROM public.escrow_disputes d
    WHERE d.transaction_id = et.id AND d.status NOT IN ('resolved_customer','resolved_partner')
  ) AS ima_aktiven_spor

FROM public.escrow_transactions et
LEFT JOIN public.inquiries         i  ON i.id  = et.inquiry_id
LEFT JOIN public.obrtnik_profiles  op ON op.id = et.partner_id
WHERE et.customer_id IS NOT NULL;

-- RLS on the view is inherited from underlying tables, but grant SELECT to authenticated
GRANT SELECT ON public.narocnik_placila TO authenticated;

-- ============================================================
-- 5. commission_logs: add customer_id for cross-referencing
-- ============================================================
ALTER TABLE public.commission_logs
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commission_customer ON public.commission_logs(customer_id);
