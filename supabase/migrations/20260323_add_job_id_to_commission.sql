-- Add job_id column to commission_logs for direct job tracking
-- This allows easier querying of commissions by job reference

ALTER TABLE public.commission_logs
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.povprasevanja(id) ON DELETE SET NULL;

-- Create index for faster job-based lookups
CREATE INDEX IF NOT EXISTS idx_commission_job_id 
    ON public.commission_logs(job_id);

-- Add convenience columns for analytics (amounts in normal currency format)
ALTER TABLE public.commission_logs
ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10,2) GENERATED ALWAYS AS (gross_amount_cents::numeric / 100) STORED,
ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) GENERATED ALWAYS AS (commission_cents::numeric / 100) STORED,
ADD COLUMN IF NOT EXISTS payout_amount NUMERIC(10,2) GENERATED ALWAYS AS (partner_payout_cents::numeric / 100) STORED;

-- Verify RLS is still enabled
ALTER TABLE public.commission_logs ENABLE ROW LEVEL SECURITY;
