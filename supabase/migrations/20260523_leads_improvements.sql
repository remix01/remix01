-- Lead System Improvements
-- Rec 1: fallback transparency, Rec 2: DB optimization + locking,
-- Rec 4: round-robin, Rec 5: agent flags, Rec 6: retry queue,
-- Rec 7: vacation mode + daily limits, Rec 9: assigned_by

-- ── obrtnik_profiles: new columns ───────────────────────────────────────

ALTER TABLE public.obrtnik_profiles
  ADD COLUMN IF NOT EXISTS vacation_mode        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS daily_lead_limit     INTEGER NOT NULL DEFAULT 0,   -- 0 = no cap
  ADD COLUMN IF NOT EXISTS daily_leads_today    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_leads_reset_at DATE,
  ADD COLUMN IF NOT EXISTS last_lead_assigned_at TIMESTAMPTZ;                 -- for round-robin

CREATE INDEX IF NOT EXISTS idx_obrtnik_vacation
  ON public.obrtnik_profiles(vacation_mode) WHERE vacation_mode = false;

CREATE INDEX IF NOT EXISTS idx_obrtnik_last_lead
  ON public.obrtnik_profiles(last_lead_assigned_at NULLS FIRST);

-- ── lead_assignments: new columns ────────────────────────────────────────

ALTER TABLE public.lead_assignments
  ADD COLUMN IF NOT EXISTS assigned_by   TEXT NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS fallback_flags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_lead_assignments_assigned_by
  ON public.lead_assignments(assigned_by);

-- ── lead_retry_queue (Rec 6) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lead_retry_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  povprasevanje_id  UUID NOT NULL REFERENCES public.povprasevanja(id) ON DELETE CASCADE,
  lat               FLOAT NOT NULL,
  lng               FLOAT NOT NULL,
  category_id       UUID NOT NULL,
  user_id           UUID NOT NULL,
  retry_count       INTEGER NOT NULL DEFAULT 0,
  next_retry_at     TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '1 hour',
  last_error        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  admin_alerted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_lead_retry_next
  ON public.lead_retry_queue(next_retry_at)
  WHERE retry_count < 5;

ALTER TABLE public.lead_retry_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to lead_retry_queue"
  ON public.lead_retry_queue FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ── agent_flags (Rec 5) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.agent_flags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_name   TEXT NOT NULL UNIQUE,   -- e.g. 'matching.enabled', 'cron.leads_auto_process'
  enabled     BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);

INSERT INTO public.agent_flags (flag_name, enabled, description) VALUES
  ('matching.enabled',            true,  'Enable smart matching on new requests'),
  ('cron.leads_auto_process',     true,  'Enable AI auto-processing cron'),
  ('cron.lead_response_sla',      true,  'Enable SLA escalation cron'),
  ('cron.leads_retry',            true,  'Enable failed-match retry cron'),
  ('instant_offer.enabled',       true,  'Enable instant offer for PRO partners'),
  ('fallback.allow_lead_cap_skip',true,  'Allow fallback step 3 (skip lead cap for PRO+)')
ON CONFLICT (flag_name) DO NOTHING;

ALTER TABLE public.agent_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to agent_flags"
  ON public.agent_flags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access to agent_flags"
  ON public.agent_flags FOR ALL TO service_role USING (true);

-- ── Updated: expire_lead_assignment — use row-level lock (Rec 2) ─────────

CREATE OR REPLACE FUNCTION public.expire_lead_assignment(
  p_assignment_id UUID
)
RETURNS TABLE(next_obrtnik_id UUID, next_rank INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pov_id    UUID;
  v_obrtnik_id UUID;
  v_rank      INTEGER;
  v_next      RECORD;
BEGIN
  -- Row-level lock prevents concurrent expiry of the same assignment
  SELECT povprasevanje_id, obrtnik_id, rank
  INTO v_pov_id, v_obrtnik_id, v_rank
  FROM public.lead_assignments
  WHERE id = p_assignment_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.lead_assignments SET status = 'expired' WHERE id = p_assignment_id;

  UPDATE public.obrtnik_profiles
  SET active_lead_count = GREATEST(0, active_lead_count - 1)
  WHERE id = v_obrtnik_id;

  -- Activate next ranked, skipped contractor
  SELECT la.id, la.obrtnik_id, la.rank
  INTO v_next
  FROM public.lead_assignments la
  WHERE la.povprasevanje_id = v_pov_id
    AND la.rank > v_rank
    AND la.status = 'skipped'
  ORDER BY la.rank ASC
  LIMIT 1;

  IF FOUND THEN
    UPDATE public.lead_assignments
    SET status = 'pending',
        assigned_at = now(),
        expires_at  = now() + INTERVAL '4 hours'
    WHERE id = v_next.id;

    UPDATE public.obrtnik_profiles
    SET active_lead_count      = active_lead_count + 1,
        last_lead_assigned_at  = now()
    WHERE id = v_next.obrtnik_id;

    RETURN QUERY SELECT v_next.obrtnik_id, v_next.rank;
  END IF;
END;
$$;

-- ── Updated: mark_lead_responded — use row-level lock (Rec 2) ────────────

CREATE OR REPLACE FUNCTION public.mark_lead_responded(
  p_povprasevanje_id UUID,
  p_obrtnik_id       UUID
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
    AND obrtnik_id       = p_obrtnik_id
    AND status           = 'pending';

  IF FOUND THEN
    -- Atomic decrement with floor at 0
    UPDATE public.obrtnik_profiles
    SET active_lead_count = GREATEST(0, active_lead_count - 1)
    WHERE id = p_obrtnik_id;
  END IF;
END;
$$;

-- ── Updated: increment_active_leads — also sets last_lead_assigned_at ────

CREATE OR REPLACE FUNCTION public.increment_active_leads(p_obrtnik_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.obrtnik_profiles
  SET active_lead_count     = active_lead_count + 1,
      last_lead_assigned_at = now()
  WHERE id = p_obrtnik_id;
END;
$$;

-- ── Daily lead counter management (Rec 7) ───────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_daily_leads(p_obrtnik_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.obrtnik_profiles
  SET
    daily_leads_today    = CASE
                             WHEN daily_leads_reset_at IS NULL OR daily_leads_reset_at < CURRENT_DATE
                             THEN 1
                             ELSE daily_leads_today + 1
                           END,
    daily_leads_reset_at = CURRENT_DATE
  WHERE id = p_obrtnik_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_daily_lead_limit(p_obrtnik_id UUID)
RETURNS BOOLEAN   -- true = under limit (or no limit), false = over limit
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_today INTEGER;
  v_reset DATE;
BEGIN
  SELECT daily_lead_limit, daily_leads_today, daily_leads_reset_at
  INTO v_limit, v_today, v_reset
  FROM public.obrtnik_profiles
  WHERE id = p_obrtnik_id;

  IF NOT FOUND THEN RETURN true; END IF;
  IF v_limit = 0 THEN RETURN true; END IF;

  -- Reset counter if stale
  IF v_reset IS NULL OR v_reset < CURRENT_DATE THEN
    RETURN true;
  END IF;

  RETURN v_today < v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_daily_leads    TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_daily_lead_limit   TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_lead_assignment   TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_lead_responded      TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_active_leads   TO service_role;
