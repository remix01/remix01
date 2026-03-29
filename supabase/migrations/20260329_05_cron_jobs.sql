-- =============================================================
-- Migration: Add cron jobs for automation
-- Date: 2026-03-29
-- Description: escrow-auto-release (7 days), refresh-ai-analytics,
--              cleanup-old-notifications
-- =============================================================

-- ESCROW AUTO-RELEASE FUNKCIJA
CREATE OR REPLACE FUNCTION public.escrow_auto_release()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  v_hold  RECORD;
BEGIN
  FOR v_hold IN
    SELECT id, task_id, amount, payment_intent_id
    FROM public.escrow_holds
    WHERE status = 'held'
      AND created_at < now() - INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.escrow_transactions
        WHERE hold_id = escrow_holds.id
          AND type IN ('release', 'refund')
          AND status = 'completed'
      )
  LOOP
    UPDATE public.escrow_holds
    SET status = 'released', released_at = now()
    WHERE id = v_hold.id;

    INSERT INTO public.escrow_transactions(
      hold_id, task_id, amount, type, status, reference
    ) VALUES (
      v_hold.id, v_hold.task_id, v_hold.amount,
      'release', 'completed', 'auto-release-7d'
    );

    PERFORM public.log_escrow_action(
      NULL, v_hold.id, 'auto_released',
      jsonb_build_object('status', 'held'),
      jsonb_build_object('status', 'released', 'reason', 'auto-release after 7 days')
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- CRON: Escrow auto-release (vsak dan ob 2:30)
SELECT cron.schedule(
  'escrow-auto-release',
  '30 2 * * *',
  'SELECT public.escrow_auto_release();'
);

-- CRON: Refresh AI analytics (vsak dan ob 3:30)
SELECT cron.schedule(
  'refresh-ai-analytics',
  '30 3 * * *',
  'SELECT public.refresh_ai_analytics();'
);

-- CRON: Počisti stare prebrane notifikacije (vsak ponedeljek ob 4:00)
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 4 * * 1',
  $$
    DELETE FROM public.notifications
    WHERE created_at < now() - INTERVAL '90 days'
      AND is_read = true;
  $$
);
