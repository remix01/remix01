-- Risk scores table for tracking risk assessment results per povpraševanje
CREATE TABLE IF NOT EXISTS public.risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  povprasevanje_id uuid NOT NULL REFERENCES public.povprasevanja(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  flags text[] DEFAULT '{}',
  triggered_alert boolean DEFAULT false,
  alert_level text DEFAULT 'none',
  checked_at timestamptz DEFAULT now(),
  UNIQUE(povprasevanje_id)
);

ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on risk_scores"
  ON public.risk_scores
  USING (true)
  WITH CHECK (true);
