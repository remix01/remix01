-- Create verifications table (was defined in 2025022205 but never applied to production)
CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obrtnik_id uuid REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  ajpes_id text,
  ajpes_response jsonb,
  status text DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES public.admin_users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,

  UNIQUE(obrtnik_id, created_at)
);

ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view and manage verifications"
ON public.verifications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.id = auth.uid() AND admin_users.aktiven = true
  )
);

CREATE INDEX IF NOT EXISTS idx_verifications_status ON public.verifications(status);
CREATE INDEX IF NOT EXISTS idx_verifications_obrtnik_id ON public.verifications(obrtnik_id);
CREATE INDEX IF NOT EXISTS idx_verifications_created_at ON public.verifications(created_at DESC);
