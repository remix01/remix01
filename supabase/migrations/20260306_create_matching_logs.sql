-- Create matching_logs table for tracking smart matching results
-- Purpose: Audit trail for all matching operations with algorithm performance metrics

CREATE TABLE IF NOT EXISTS public.matching_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.povprasevanja(id) ON DELETE CASCADE,
  top_partner_id UUID REFERENCES public.obrtnik_profiles(id) ON DELETE SET NULL,
  top_score NUMERIC(5,2) NOT NULL CHECK (top_score >= 0 AND top_score <= 100),
  all_matches JSONB NOT NULL, -- Array of {partnerId, score, breakdown, distanceKm, estimatedResponseMinutes}
  algorithm_version TEXT NOT NULL DEFAULT '1.0',
  execution_time_ms INTEGER, -- How long matching took
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.matching_logs ENABLE ROW LEVEL SECURITY;

-- Admin can read all logs
CREATE POLICY "Admin can read matching logs"
  ON public.matching_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = auth.uid() AND aktiven = true
    )
  );

-- Naročnik can read their own request logs
CREATE POLICY "Narocnik can read own matching logs"
  ON public.matching_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.povprasevanja p
      WHERE p.id = request_id AND p.narocnik_id = auth.uid()
    )
  );

-- Obrtnik can read matching logs where they appear in results
CREATE POLICY "Obrtnik can read own matching results"
  ON public.matching_logs
  FOR SELECT
  USING (
    top_partner_id = auth.uid() OR
    all_matches @> jsonb_build_array(jsonb_build_object('partnerId', auth.uid()::text))
  );

-- Indexes for performance
CREATE INDEX idx_matching_logs_request ON public.matching_logs(request_id);
CREATE INDEX idx_matching_logs_partner ON public.matching_logs(top_partner_id);
CREATE INDEX idx_matching_logs_created ON public.matching_logs(created_at DESC);
