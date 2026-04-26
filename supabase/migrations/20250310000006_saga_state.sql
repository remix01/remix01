-- Saga State Machine — Multi-step transaction tracking
-- Implements the Saga pattern for coordinating steps across multiple services
-- Each saga instance tracks completed steps, status, and compensation log

CREATE TABLE IF NOT EXISTS saga_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_type TEXT NOT NULL,
  -- 'order_fulfillment' | 'payment_saga'
  task_id UUID NOT NULL,
  current_step INTEGER DEFAULT 0,
  status TEXT DEFAULT 'running'
    CHECK (status IN ('running', 'completed', 'compensating', 'failed')),
  completed_steps JSONB DEFAULT '[]',
  -- Array of { step_index, step_name, completedAt }
  compensation_log JSONB DEFAULT '[]',
  -- Array of { step_index, success, error? }
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE saga_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_only_sagas" ON saga_instances
  USING (auth.role() = 'service_role');

-- Unique constraint: only one running saga per task per type
CREATE UNIQUE INDEX idx_saga_task_type_running ON saga_instances(task_id, saga_type)
  WHERE status = 'running';

-- Index for queries by saga type
CREATE INDEX idx_saga_type ON saga_instances(saga_type);

-- Index for task lookups
CREATE INDEX idx_saga_task_id ON saga_instances(task_id);

-- Timestamp index for cleanup
CREATE INDEX idx_saga_updated_at ON saga_instances(updated_at DESC);
