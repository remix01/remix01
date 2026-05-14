-- Production Lead Matching System
-- Adds: contractor availability, service radius, max active leads, lead_assignments table

-- 1. Contractor availability & matching fields on obrtnik_profiles
ALTER TABLE public.obrtnik_profiles
  ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_busy BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS service_radius_km INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS max_active_leads INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS active_lead_count INTEGER NOT NULL DEFAULT 0;

-- PRO/ELITE tier gets higher default max_active_leads (updated via trigger or webhook)
-- Indexes for availability queries
CREATE INDEX IF NOT EXISTS idx_obrtnik_online ON public.obrtnik_profiles(is_online) WHERE is_online = true;
CREATE INDEX IF NOT EXISTS idx_obrtnik_busy ON public.obrtnik_profiles(is_busy);
CREATE INDEX IF NOT EXISTS idx_obrtnik_last_seen ON public.obrtnik_profiles(last_seen_at);

-- 2. Lead assignments: track which contractor received which lead, in what order
CREATE TABLE IF NOT EXISTS public.lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  povprasevanje_id UUID NOT NULL REFERENCES public.povprasevanja(id) ON DELETE CASCADE,
  obrtnik_id UUID NOT NULL REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'responded', 'expired', 'declined', 'skipped')),
  responded_at TIMESTAMPTZ,
  rank INTEGER NOT NULL DEFAULT 1,
  score NUMERIC(5,2),
  notified_email BOOLEAN NOT NULL DEFAULT false,
  notified_push BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(povprasevanje_id, obrtnik_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_assignments_pov ON public.lead_assignments(povprasevanje_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_obrtnik ON public.lead_assignments(obrtnik_id);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_status_expires
  ON public.lead_assignments(status, expires_at)
  WHERE status = 'pending';

-- RLS on lead_assignments
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to lead_assignments"
  ON public.lead_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Obrtnik can view own lead_assignments"
  ON public.lead_assignments FOR SELECT
  TO authenticated
  USING (obrtnik_id = auth.uid());

-- 3. Function: mark lead as responded and decrement active_lead_count
CREATE OR REPLACE FUNCTION public.mark_lead_responded(
  p_povprasevanje_id UUID,
  p_obrtnik_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.lead_assignments
  SET status = 'responded', responded_at = now()
  WHERE povprasevanje_id = p_povprasevanje_id
    AND obrtnik_id = p_obrtnik_id
    AND status = 'pending';

  -- Decrement active lead count (floor at 0)
  UPDATE public.obrtnik_profiles
  SET active_lead_count = GREATEST(0, active_lead_count - 1)
  WHERE id = p_obrtnik_id;
END;
$$;

-- 4. Function: expire a lead assignment and try next ranked contractor
CREATE OR REPLACE FUNCTION public.expire_lead_assignment(
  p_assignment_id UUID
)
RETURNS TABLE(next_obrtnik_id UUID, next_rank INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pov_id UUID;
  v_obrtnik_id UUID;
  v_rank INTEGER;
  v_next RECORD;
BEGIN
  -- Get assignment details
  SELECT povprasevanje_id, obrtnik_id, rank
  INTO v_pov_id, v_obrtnik_id, v_rank
  FROM public.lead_assignments
  WHERE id = p_assignment_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Mark as expired
  UPDATE public.lead_assignments
  SET status = 'expired'
  WHERE id = p_assignment_id;

  -- Decrement active lead count
  UPDATE public.obrtnik_profiles
  SET active_lead_count = GREATEST(0, active_lead_count - 1)
  WHERE id = v_obrtnik_id;

  -- Return next ranked obrtnik who is still pending (if any)
  SELECT la.id, la.obrtnik_id, la.rank
  INTO v_next
  FROM public.lead_assignments la
  WHERE la.povprasevanje_id = v_pov_id
    AND la.rank > v_rank
    AND la.status = 'skipped'
  ORDER BY la.rank ASC
  LIMIT 1;

  IF FOUND THEN
    -- Activate the next one
    UPDATE public.lead_assignments
    SET status = 'pending',
        assigned_at = now(),
        expires_at = now() + INTERVAL '4 hours'
    WHERE id = v_next.id;

    UPDATE public.obrtnik_profiles
    SET active_lead_count = active_lead_count + 1
    WHERE id = v_next.obrtnik_id;

    RETURN QUERY SELECT v_next.obrtnik_id, v_next.rank;
  END IF;
END;
$$;

-- 5. Helper: safely increment active_lead_count
CREATE OR REPLACE FUNCTION public.increment_active_leads(p_obrtnik_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.obrtnik_profiles
  SET active_lead_count = active_lead_count + 1
  WHERE id = p_obrtnik_id;
END;
$$;

-- 6. Trigger: auto-decrement when contractor submits a ponudba
CREATE OR REPLACE FUNCTION public.on_ponudba_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark lead as responded
  PERFORM public.mark_lead_responded(NEW.povprasevanje_id, NEW.obrtnik_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ponudba_mark_lead_responded ON public.ponudbe;
CREATE TRIGGER trg_ponudba_mark_lead_responded
  AFTER INSERT ON public.ponudbe
  FOR EACH ROW
  EXECUTE FUNCTION public.on_ponudba_created();

GRANT EXECUTE ON FUNCTION public.mark_lead_responded TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_lead_assignment TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_active_leads TO service_role;
