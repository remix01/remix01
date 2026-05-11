-- Narocnik payment support + escrow_disputes
-- Applied directly via Supabase MCP (fix_escrow_disputes_and_narocnik_placila)
--
-- Actual escrow schema in DB:
--   escrow_holds:        id, task_id, amount, status, payment_intent_id, held_at, released_at
--   escrow_transactions: id, hold_id, task_id, user_id, amount, currency, type, status,
--                        stripe_payment_intent_id, stripe_transfer_id, reference, metadata
--   profiles:            stripe_customer_id already present

-- ============================================================
-- 1. Helper function (idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ============================================================
-- 2. escrow_disputes (references escrow_holds, not escrow_transactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.escrow_disputes (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at     TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at     TIMESTAMPTZ DEFAULT now() NOT NULL,

    hold_id        UUID REFERENCES public.escrow_holds(id) ON DELETE CASCADE UNIQUE,

    opened_by      UUID NOT NULL REFERENCES public.profiles(id),
    opened_by_role TEXT NOT NULL CHECK (opened_by_role IN ('narocnik', 'obrtnik')),
    reason         TEXT NOT NULL,
    description    TEXT,

    status TEXT DEFAULT 'open'
        CHECK (status IN ('open','investigating','resolved_narocnik','resolved_obrtnik','escalated')),

    admin_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    resolution  TEXT CHECK (resolution IN ('full_refund','partial_refund','release_to_obrtnik'))
);

ALTER TABLE public.escrow_disputes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_escrow_disputes_hold      ON public.escrow_disputes(hold_id);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_status    ON public.escrow_disputes(status);
CREATE INDEX IF NOT EXISTS idx_escrow_disputes_opened_by ON public.escrow_disputes(opened_by);

DROP TRIGGER IF EXISTS escrow_disputes_updated_at ON public.escrow_disputes;
CREATE TRIGGER escrow_disputes_updated_at
    BEFORE UPDATE ON public.escrow_disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE POLICY "Users see own disputes"
    ON public.escrow_disputes FOR SELECT
    USING (
        opened_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.escrow_holds h
            JOIN public.povprasevanja pov ON pov.id = h.task_id
            WHERE h.id = hold_id
              AND (pov.narocnik_id = auth.uid() OR pov.obrtnik_id = auth.uid())
        )
    );

CREATE POLICY "Users open own disputes"
    ON public.escrow_disputes FOR INSERT
    WITH CHECK (
        opened_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.escrow_holds h
            JOIN public.povprasevanja pov ON pov.id = h.task_id
            WHERE h.id = hold_id
              AND (pov.narocnik_id = auth.uid() OR pov.obrtnik_id = auth.uid())
        )
    );

CREATE POLICY "Service role full access disputes"
    ON public.escrow_disputes FOR ALL
    USING ((SELECT auth.role()) = 'service_role');

-- ============================================================
-- 3. escrow_holds: narocnik vidi lastne zadržke
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'escrow_holds' AND policyname = 'Narocniki see own holds'
  ) THEN
    CREATE POLICY "Narocniki see own holds"
        ON public.escrow_holds FOR SELECT
        USING (
            EXISTS (
                SELECT 1 FROM public.povprasevanja p
                WHERE p.id = task_id AND p.narocnik_id = auth.uid()
            )
        );
  END IF;
END $$;

-- ============================================================
-- 4. narocnik_placila view (dejanska shema escrow_transactions)
-- ============================================================
CREATE OR REPLACE VIEW public.narocnik_placila AS
SELECT
    et.id,
    et.created_at,
    et.task_id,
    et.user_id                  AS narocnik_id,
    et.amount                   AS znesek_eur,
    et.currency,
    et.type,
    et.status,
    et.stripe_payment_intent_id,
    et.processed_at,
    pov.title                   AS povprasevanje_naziv,
    op.business_name            AS obrtnik_naziv,
    h.payment_intent_id         AS hold_payment_intent_id,
    h.status                    AS hold_status,
    h.held_at,
    h.released_at,
    EXISTS (
        SELECT 1 FROM public.escrow_disputes d
        WHERE d.hold_id = et.hold_id
          AND d.status NOT IN ('resolved_narocnik','resolved_obrtnik')
    ) AS ima_aktiven_spor
FROM public.escrow_transactions et
LEFT JOIN public.povprasevanja    pov ON pov.id = et.task_id
LEFT JOIN public.obrtnik_profiles op  ON op.id  = pov.obrtnik_id
LEFT JOIN public.escrow_holds     h   ON h.id   = et.hold_id;

GRANT SELECT ON public.narocnik_placila TO authenticated;
