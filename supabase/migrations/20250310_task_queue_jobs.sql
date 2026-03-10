-- Task Queue for Job Orchestration
-- Tracks all orchestrator-generated jobs with status and retry logic

CREATE TABLE IF NOT EXISTS task_queue_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempt_count INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT fk_task_id FOREIGN KEY (task_id) 
    REFERENCES service_requests(id) ON DELETE CASCADE
);

-- Row Level Security — only service role can access
ALTER TABLE task_queue_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON task_queue_jobs
  USING (auth.role() = 'service_role');

-- Indexes for job processing efficiency
CREATE INDEX idx_tqj_status_next ON task_queue_jobs(status, next_attempt_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX idx_tqj_task_id ON task_queue_jobs(task_id);

CREATE INDEX idx_tqj_job_type ON task_queue_jobs(job_type)
  WHERE status IN ('pending', 'failed');

-- Task status enum constraint (enforced in application but documented here)
-- pending → matching → matched → offer_sent → accepted → in_progress → completed
-- Any state can transition to: expired, cancelled

-- Add task_queue_jobs reference to service_requests if not exists
ALTER TABLE service_requests
ADD COLUMN IF NOT EXISTS guarantee_activated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS guarantee_activated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS offer_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS title TEXT;
