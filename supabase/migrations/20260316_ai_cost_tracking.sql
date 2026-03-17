-- AI Cost Tracking Migration
-- Adds tier-based daily limits, token tracking, and usage logging

-- ============================================================================
-- EXTEND PROFILES TABLE
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_messages_used_today INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_messages_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_total_tokens_used BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_total_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0;

-- Index for daily reset queries
CREATE INDEX IF NOT EXISTS idx_profiles_ai_reset ON public.profiles(ai_messages_reset_at);

-- ============================================================================
-- AI USAGE LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  model_used TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  response_cached BOOLEAN NOT NULL DEFAULT false,
  cache_key TEXT,
  message_preview TEXT,
  complexity_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON public.ai_usage_logs(model_used);

-- RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage logs"
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert usage logs"
  ON public.ai_usage_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read all usage logs"
  ON public.ai_usage_logs FOR SELECT
  TO service_role
  USING (true);

-- ============================================================================
-- ANALYTICS MATERIALIZED VIEW
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS public.ai_analytics_daily AS
SELECT
  DATE(created_at) AS date,
  model_used,
  COUNT(*) AS message_count,
  COUNT(DISTINCT user_id) AS unique_users,
  SUM(input_tokens + output_tokens) AS total_tokens,
  SUM(cost_usd) AS total_cost_usd,
  COUNT(*) FILTER (WHERE response_cached = true) AS cached_count,
  ROUND(
    COUNT(*) FILTER (WHERE response_cached = true) * 100.0 / NULLIF(COUNT(*), 0),
    2
  ) AS cache_hit_rate
FROM public.ai_usage_logs
GROUP BY DATE(created_at), model_used;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_analytics_daily_unique
  ON public.ai_analytics_daily(date, model_used);

-- Function to refresh analytics
CREATE OR REPLACE FUNCTION public.refresh_ai_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.ai_analytics_daily;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DAILY RESET FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_ai_daily_limits()
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET
    ai_messages_used_today = 0,
    ai_messages_reset_at = NOW()
  WHERE ai_messages_reset_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
