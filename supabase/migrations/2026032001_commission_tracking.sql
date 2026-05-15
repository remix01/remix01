-- Commission Tracking Table
-- Tracks all platform commissions earned from completed jobs
-- Single source of truth for revenue analytics and partner payouts

CREATE TABLE IF NOT EXISTS public.commission_logs (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at          TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Link to escrow transaction (immutable)
    escrow_id           UUID REFERENCES public.escrow_transactions(id) ON DELETE RESTRICT,
    
    -- Partner info (denormalized for analytics)
    partner_id          UUID REFERENCES public.obrtnik_profiles(id) ON DELETE SET NULL,
    
    -- Inquiry/job reference
    inquiry_id          UUID REFERENCES public.inquiries(id) ON DELETE SET NULL,

    -- Financial breakdown (in cents to avoid float errors)
    gross_amount_cents  INTEGER NOT NULL CHECK (gross_amount_cents > 0),
    commission_rate     NUMERIC(5,4) NOT NULL,         -- 0.1000 = 10%, 0.0500 = 5%
    commission_cents    INTEGER NOT NULL CHECK (commission_cents > 0),
    partner_payout_cents INTEGER NOT NULL CHECK (partner_payout_cents > 0),

    -- Stripe integration
    stripe_transfer_id  TEXT UNIQUE,
    stripe_account_id   TEXT,  -- Connected account ID
    
    -- Status tracking
    status              TEXT DEFAULT 'pending'
        CHECK (status IN (
            'pending',          -- Escrow held, awaiting job completion
            'earned',           -- Job completed, commission captured
            'transferred',      -- Commission transferred to Stripe Connect
            'failed',           -- Transfer failed, needs retry
            'refunded'          -- Job disputed/refunded, commission reversed
        )),

    -- Transaction dates
    completed_at        TIMESTAMPTZ,           -- When job was marked complete
    captured_at         TIMESTAMPTZ,           -- When commission was earned
    transferred_at      TIMESTAMPTZ,           -- When transferred to partner
    failed_at           TIMESTAMPTZ,
    refunded_at         TIMESTAMPTZ,

    -- Retry logic
    transfer_attempts   INTEGER DEFAULT 0,
    last_error          TEXT,
    last_attempted_at   TIMESTAMPTZ,

    -- Metadata for debugging
    notes               TEXT
);

-- Enable RLS
ALTER TABLE public.commission_logs ENABLE ROW LEVEL SECURITY;

-- Partners can see own commission logs
DROP POLICY IF EXISTS "Partners view own commissions" ON public.commission_logs;
CREATE POLICY "Partners view own commissions"
    ON public.commission_logs FOR SELECT
    USING (auth.uid() = partner_id);

-- Service role full access
DROP POLICY IF EXISTS "Service role commission full access" ON public.commission_logs;
CREATE POLICY "Service role commission full access"
    ON public.commission_logs FOR ALL
    USING (auth.role() = 'service_role');

-- Auto-update updated_at
DROP TRIGGER IF EXISTS commission_logs_updated_at ON public.commission_logs;
CREATE TRIGGER commission_logs_updated_at
    BEFORE UPDATE ON public.commission_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_commission_partner_id 
    ON public.commission_logs(partner_id);

CREATE INDEX IF NOT EXISTS idx_commission_escrow_id 
    ON public.commission_logs(escrow_id);

CREATE INDEX IF NOT EXISTS idx_commission_status 
    ON public.commission_logs(status);

CREATE INDEX IF NOT EXISTS idx_commission_created_at 
    ON public.commission_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_commission_partner_status 
    ON public.commission_logs(partner_id, status);

-- Monthly revenue summary index
CREATE INDEX IF NOT EXISTS idx_commission_monthly
    ON public.commission_logs(DATE_TRUNC('month', created_at), status);

-- Unique constraint: one commission log per escrow (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_escrow_unique 
    ON public.commission_logs(escrow_id) 
    WHERE status IN ('earned', 'transferred', 'refunded');
