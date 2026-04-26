-- Add job_id column to commission_logs for better job tracking
-- This creates a direct reference to the job/inquiry that generated the commission
-- NOTE: Guarded — commission_logs is created in a later migration (20260320000002).
--       All statements are skipped if the table does not yet exist.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'commission_logs'
  ) THEN
    RETURN;
  END IF;

  EXECUTE $q$
    ALTER TABLE public.commission_logs
    ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.inquiries(id) ON DELETE SET NULL
  $q$;

  EXECUTE $q$
    UPDATE public.commission_logs
    SET job_id = inquiry_id
    WHERE job_id IS NULL AND inquiry_id IS NOT NULL
  $q$;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_commission_logs_job_id') THEN
    CREATE INDEX idx_commission_logs_job_id ON public.commission_logs(job_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_commission_logs_partner_job') THEN
    CREATE INDEX idx_commission_logs_partner_job ON public.commission_logs(partner_id, job_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_commission_logs_status_created') THEN
    CREATE INDEX idx_commission_logs_status_created ON public.commission_logs(status, created_at DESC);
  END IF;

  ALTER TABLE public.commission_logs ENABLE ROW LEVEL SECURITY;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'commission_logs'
      AND policyname = 'Service role can read all commission logs'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Service role can read all commission logs"
      ON public.commission_logs FOR SELECT
      USING (auth.role() = 'service_role')
    $q$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'commission_logs'
      AND policyname = 'Partners can read their own commission logs'
  ) THEN
    EXECUTE $q$
      CREATE POLICY "Partners can read their own commission logs"
      ON public.commission_logs FOR SELECT
      USING (auth.uid() = partner_id)
    $q$;
  END IF;
END $$;
