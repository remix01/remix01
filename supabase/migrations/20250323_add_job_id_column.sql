-- Add job_id column to commission_logs for better job tracking
-- This creates a direct reference to the job/inquiry that generated the commission

ALTER TABLE public.commission_logs
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.inquiries(id) ON DELETE SET NULL;

-- Copy existing inquiry_id values to job_id to maintain data consistency
UPDATE public.commission_logs
SET job_id = inquiry_id
WHERE job_id IS NULL AND inquiry_id IS NOT NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_commission_logs_job_id 
ON public.commission_logs(job_id);

CREATE INDEX IF NOT EXISTS idx_commission_logs_partner_job 
ON public.commission_logs(partner_id, job_id);

CREATE INDEX IF NOT EXISTS idx_commission_logs_status_created 
ON public.commission_logs(status, created_at DESC);

-- Add RLS policy if not exists
ALTER TABLE public.commission_logs ENABLE ROW LEVEL SECURITY;

-- Allow service role (admin) to read all commission logs
CREATE POLICY IF NOT EXISTS "Service role can read all commission logs"
ON public.commission_logs
FOR SELECT
USING (auth.role() = 'service_role');

-- Allow partners to read their own commission logs
CREATE POLICY IF NOT EXISTS "Partners can read their own commission logs"
ON public.commission_logs
FOR SELECT
USING (auth.uid() = partner_id);
