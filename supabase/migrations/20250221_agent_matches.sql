-- Create agent_matches table for storing AI matchmaking results
CREATE TABLE IF NOT EXISTS public.agent_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  povprasevanje_id uuid NOT NULL REFERENCES public.povprasevanja(id) ON DELETE CASCADE,
  matches jsonb NOT NULL DEFAULT '[]',
  reasoning text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(povprasevanje_id, created_at)
);

-- Enable Row Level Security
ALTER TABLE public.agent_matches ENABLE ROW LEVEL SECURITY;

-- Policy: Naročnik can read own matches
CREATE POLICY "Narocnik can read own matches"
ON public.agent_matches FOR SELECT
USING (
  povprasevanje_id IN (
    SELECT id FROM public.povprasevanja 
    WHERE narocnik_id = auth.uid()
  )
);

-- Policy: System can insert matches (via service role)
CREATE POLICY "System can insert matches"
ON public.agent_matches FOR INSERT
WITH CHECK (true);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_matches_povprasevanje_id 
ON public.agent_matches(povprasevanje_id);

CREATE INDEX IF NOT EXISTS idx_agent_matches_created_at 
ON public.agent_matches(created_at DESC);
