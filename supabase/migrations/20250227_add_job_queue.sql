-- Create job_queue table for async job processing
CREATE TABLE IF NOT EXISTS job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for efficient polling of pending jobs
CREATE INDEX IF NOT EXISTS idx_job_queue_pending 
ON job_queue(status, attempts, created_at)
WHERE status = 'pending';

-- Enable RLS for job_queue table
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;

-- Service role has full access (for stripe-worker function)
CREATE POLICY "Service role full access"
ON job_queue FOR ALL
USING (true)
WITH CHECK (true);

-- Grant service_role access (Supabase automatically handles this)
