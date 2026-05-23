CREATE TABLE IF NOT EXISTS public.sandbox_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sandbox_id text NOT NULL UNIQUE,
  template text NOT NULL,
  language text NOT NULL,
  tier text NOT NULL,
  status text NOT NULL CHECK (status IN ('active','expired','terminated','blocked')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  ended_at timestamptz,
  runtime_total_ms integer NOT NULL DEFAULT 0,
  execution_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sandbox_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sandbox_sessions(id) ON DELETE CASCADE,
  execution_id text NOT NULL,
  sandbox_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL,
  runtime_ms integer NOT NULL,
  stdout_size integer NOT NULL DEFAULT 0,
  stderr_size integer NOT NULL DEFAULT 0,
  exit_code integer,
  blocked_reason text,
  timed_out boolean NOT NULL DEFAULT false,
  estimated_cost_usd numeric(10,6),
  prompt_hash text,
  code_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, execution_id)
);

CREATE TABLE IF NOT EXISTS public.sandbox_abuse_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sandbox_sessions(id) ON DELETE SET NULL,
  sandbox_id text,
  event_type text NOT NULL CHECK (event_type IN ('repeated_abuse_attempt','dangerous_command_blocked','quota_violation','excessive_concurrency','disabled_feature_access')),
  reason text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_user_id ON public.sandbox_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_created_at ON public.sandbox_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_sandbox_id ON public.sandbox_sessions(sandbox_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_sessions_status ON public.sandbox_sessions(status);

CREATE INDEX IF NOT EXISTS idx_sandbox_executions_user_id ON public.sandbox_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_executions_created_at ON public.sandbox_executions(created_at);
CREATE INDEX IF NOT EXISTS idx_sandbox_executions_sandbox_id ON public.sandbox_executions(sandbox_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_executions_status ON public.sandbox_executions(status);

CREATE INDEX IF NOT EXISTS idx_sandbox_abuse_events_user_id ON public.sandbox_abuse_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_abuse_events_created_at ON public.sandbox_abuse_events(created_at);
CREATE INDEX IF NOT EXISTS idx_sandbox_abuse_events_sandbox_id ON public.sandbox_abuse_events(sandbox_id);
CREATE INDEX IF NOT EXISTS idx_sandbox_abuse_events_reason ON public.sandbox_abuse_events(reason);
