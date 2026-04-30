-- Add job_id column to commission_logs for better job tracking
-- This creates a direct reference to the job/inquiry that generated the commission

DO $$
BEGIN
  IF to_regclass('public.commission_logs') IS NULL THEN
    RAISE NOTICE 'Skipping migration 20250323_add_job_id_column: public.commission_logs does not exist yet';
    RETURN;
  END IF;

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

  ALTER TABLE public.commission_logs ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'commission_logs' AND policyname = 'Service role can read all commission logs'
  ) THEN
    CREATE POLICY "Service role can read all commission logs"
    ON public.commission_logs
    FOR SELECT
    USING (auth.role() = 'service_role');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'commission_logs' AND policyname = 'Partners can read their own commission logs'
  ) THEN
    CREATE POLICY "Partners can read their own commission logs"
    ON public.commission_logs
    FOR SELECT
    USING (auth.uid() = partner_id);
  END IF;
END $$;
