CREATE TABLE IF NOT EXISTS public.provider_approval_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  from_state TEXT,
  to_state TEXT NOT NULL,
  actor UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_approval_transitions_provider_id
  ON public.provider_approval_transitions(provider_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_approval_transitions_actor
  ON public.provider_approval_transitions(actor, created_at DESC);
