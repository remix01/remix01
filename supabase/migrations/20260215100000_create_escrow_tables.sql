--
-- ESCROW TRANSACTIONS
-- Vsako plačilo gre skozi escrow: stranka plača → sredstva zadržana →
-- po potrditvi sprosti → provizija odšteta → izplačilo obrtniku
--
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
    id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at            TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at            TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Povezave
    inquiry_id            UUID REFERENCES public.inquiries(id) ON DELETE SET NULL,
    partner_id            UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    customer_email        TEXT NOT NULL,

    -- Zneski (v centih, da se izognemo floating point napakam)
    amount_total_cents    INTEGER NOT NULL CHECK (amount_total_cents > 0),
    commission_rate       NUMERIC(5,4) NOT NULL,         -- 0.1000 = 10%, 0.0500 = 5%
    commission_cents      INTEGER NOT NULL,
    payout_cents          INTEGER NOT NULL,              -- amount_total - commission

    -- Stripe
    stripe_payment_intent_id  TEXT UNIQUE,
    stripe_transfer_id        TEXT,
    stripe_refund_id          TEXT,

    -- Stanje escrow
    status  TEXT DEFAULT 'pending'
        CHECK (status IN (
            'pending',        -- stranka še ni plačala
            'paid',           -- plačilo prejeto, sredstva zadržana
            'released',       -- platforma sproščena, izplačilo obrtniku
            'refunded',       -- vrnitev stranki
            'disputed',       -- spor odprt
            'cancelled'       -- preklicano pred plačilom
        )),

    -- Časovnice
    paid_at               TIMESTAMPTZ,
    released_at           TIMESTAMPTZ,
    refunded_at           TIMESTAMPTZ,
    release_due_at        TIMESTAMPTZ,   -- auto-release če ni spora v X dneh

    -- Metadata
    description           TEXT,
    notes                 TEXT
);

ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Partners see own transactions"
    ON public.escrow_transactions FOR SELECT
    USING (auth.uid() = partner_id);

CREATE POLICY IF NOT EXISTS "Service role full access escrow"
    ON public.escrow_transactions FOR ALL
    USING (auth.role() = 'service_role');

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS escrow_updated_at ON public.escrow_transactions;
CREATE TRIGGER escrow_updated_at
    BEFORE UPDATE ON public.escrow_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

--
-- AUDIT LOG — nespremenljiva zgodovina vsakega escrow dogodka
--
CREATE TABLE IF NOT EXISTS public.escrow_audit_log (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,

    transaction_id  UUID REFERENCES public.escrow_transactions(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,   -- 'created','paid','released','refunded',
                                     -- 'dispute_opened','dispute_resolved','cancelled'
    actor           TEXT NOT NULL,   -- 'customer','partner','system','admin'
    actor_id        TEXT,            -- user id ali 'stripe-webhook'

    -- Snapshot stanja pred in po
    status_before   TEXT,
    status_after    TEXT,

    -- Finančni podatki ob dogodku
    amount_cents    INTEGER,
    stripe_event_id TEXT,            -- za idempotentnost

    -- Prosto polje za debug info
    metadata        JSONB DEFAULT '{}'
);

ALTER TABLE public.escrow_audit_log ENABLE ROW LEVEL SECURITY;

-- Audit log je write-once — nihče ne sme brisati ali urejati
CREATE POLICY IF NOT EXISTS "Partners see own audit"
    ON public.escrow_audit_log FOR SELECT
    USING (
        auth.uid() = (
            SELECT partner_id FROM public.escrow_transactions
            WHERE id = transaction_id
        )
    );

CREATE POLICY IF NOT EXISTS "Service role audit full"
    ON public.escrow_audit_log FOR ALL
    USING (auth.role() = 'service_role');

--
-- SPORI (DISPUTES)
--
CREATE TABLE IF NOT EXISTS public.escrow_disputes (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at       TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT now() NOT NULL,

    transaction_id   UUID REFERENCES public.escrow_transactions(id) ON DELETE CASCADE UNIQUE,

    -- Kdo je odprl spor
    opened_by        TEXT NOT NULL CHECK (opened_by IN ('customer','partner')),
    opened_by_id     TEXT NOT NULL,
    reason           TEXT NOT NULL,
    description      TEXT,

    -- Odločitev admina
    status           TEXT DEFAULT 'open'
        CHECK (status IN ('open','investigating','resolved_customer','resolved_partner','escalated')),

    admin_notes      TEXT,
    resolved_by      TEXT,           -- admin user id
    resolved_at      TIMESTAMPTZ,

    -- Rezultat
    resolution       TEXT            -- 'full_refund','partial_refund','release_to_partner'
);

ALTER TABLE public.escrow_disputes ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS disputes_updated_at ON public.escrow_disputes;
CREATE TRIGGER disputes_updated_at
    BEFORE UPDATE ON public.escrow_disputes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE POLICY IF NOT EXISTS "Parties see own disputes"
    ON public.escrow_disputes FOR SELECT
    USING (
        opened_by_id = auth.uid()::text OR
        auth.uid() = (
            SELECT partner_id FROM public.escrow_transactions
            WHERE id = transaction_id
        )
    );

CREATE POLICY IF NOT EXISTS "Service role disputes full"
    ON public.escrow_disputes FOR ALL
    USING (auth.role() = 'service_role');

--
-- INDEKSI za hitro iskanje
--
CREATE INDEX IF NOT EXISTS idx_escrow_partner    ON public.escrow_transactions(partner_id);
CREATE INDEX IF NOT EXISTS idx_escrow_inquiry    ON public.escrow_transactions(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_escrow_status     ON public.escrow_transactions(status);
CREATE INDEX IF NOT EXISTS idx_escrow_stripe_pi  ON public.escrow_transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_audit_transaction ON public.escrow_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_stripe_evt  ON public.escrow_audit_log(stripe_event_id);
