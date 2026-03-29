-- =============================================================
-- Migration: Alert log cleanup + risk_scores RLS
-- Date: 2026-03-29
-- Description: Clean up 3141 old alerts, add resolved_at column,
--              add RLS policies for risk_scores table,
--              update cleanup_old_alerts function
-- =============================================================

-- 1. DODAJ resolved_at KOLONO V alert_log ČE NE OBSTAJA
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alert_log' AND column_name = 'resolved_at'
  ) THEN
    ALTER TABLE public.alert_log ADD COLUMN resolved_at TIMESTAMPTZ;
  END IF;
END $$;

-- 2. POČISTI STARE ALERTE (ohrani zadnjih 7 dni)
DELETE FROM public.alert_log
WHERE created_at < now() - INTERVAL '7 days'
  AND resolved = true;

-- Avtomatsko reši stare nerešene alerte (debug mode artefakti)
UPDATE public.alert_log
SET resolved = true,
    resolved_at = now()
WHERE resolved = false
  AND created_at < now() - INTERVAL '24 hours';

-- 3. RLS ZA risk_scores
--    (join preko povprasevanja.narocnik_id ker ni user_id kolone)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'risk_scores' AND policyname = 'Narocnik sees own risk scores'
  ) THEN
    CREATE POLICY "Narocnik sees own risk scores"
      ON public.risk_scores FOR SELECT
      USING (
        povprasevanje_id IN (
          SELECT id FROM public.povprasevanja
          WHERE narocnik_id = (SELECT auth.uid())
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'risk_scores' AND policyname = 'Admin full access on risk_scores'
  ) THEN
    CREATE POLICY "Admin full access on risk_scores"
      ON public.risk_scores FOR ALL
      USING (is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'risk_scores' AND policyname = 'Service role full access on risk_scores'
  ) THEN
    CREATE POLICY "Service role full access on risk_scores"
      ON public.risk_scores FOR ALL
      USING ((SELECT auth.role()) = 'service_role');
  END IF;
END $$;

-- 4. POSODOBI cleanup_old_alerts FUNKCIJO
CREATE OR REPLACE FUNCTION public.cleanup_old_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Pobriši rešene alerte starejše od 30 dni
  DELETE FROM public.alert_log
  WHERE resolved = true
    AND created_at < now() - INTERVAL '30 days';

  -- Avtomatsko reši alerte starejše od 48h (razen critical/high)
  UPDATE public.alert_log
  SET resolved = true,
      resolved_at = now()
  WHERE resolved = false
    AND created_at < now() - INTERVAL '48 hours'
    AND severity NOT IN ('critical', 'high');
END;
$$;
