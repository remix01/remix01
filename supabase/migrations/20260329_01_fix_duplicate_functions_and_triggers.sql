-- =============================================================
-- Migration: Fix duplicate functions and triggers
-- Date: 2026-03-29
-- Description: Remove text-param duplicate functions (wrong type),
--              upgrade uuid-param functions to SECURITY DEFINER,
--              remove duplicate rating trigger on ocene table
-- =============================================================

-- 1. ODSTRANI NAPAČNE TEXT-PARAM VERZIJE FUNKCIJ
--    (actor_id v task_events je UUID, ne TEXT)
DROP FUNCTION IF EXISTS public.accept_task(uuid, text);
DROP FUNCTION IF EXISTS public.claim_task(uuid, text);
DROP FUNCTION IF EXISTS public.complete_task(uuid, text);
DROP FUNCTION IF EXISTS public.start_task(uuid, text);
DROP FUNCTION IF EXISTS public.publish_task(uuid, text);

-- 2. POSODOBI UUID-PARAM VERZIJE NA SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.accept_task(p_task_id uuid, p_worker_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_lock uuid;
BEGIN
  SELECT worker_id INTO v_lock FROM task_locks WHERE task_id = p_task_id;
  IF v_lock IS NULL OR v_lock <> p_worker_id THEN RETURN false; END IF;
  UPDATE tasks SET status = 'accepted', accepted_at = now()
    WHERE id = p_task_id AND assigned_to = p_worker_id;
  INSERT INTO task_events(task_id, event_type, actor_id)
    VALUES (p_task_id, 'accepted', p_worker_id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_task(p_task_id uuid, p_worker_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_exists int;
BEGIN
  SELECT count(*) INTO v_exists FROM task_locks WHERE task_id = p_task_id;
  IF v_exists > 0 THEN RETURN false; END IF;
  INSERT INTO task_locks(task_id, worker_id) VALUES (p_task_id, p_worker_id);
  UPDATE tasks SET status = 'assigned', assigned_to = p_worker_id
    WHERE id = p_task_id AND status = 'published';
  INSERT INTO task_events(task_id, event_type, actor_id)
    VALUES (p_task_id, 'assigned', p_worker_id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_task(p_task_id uuid, p_worker_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tasks SET status = 'completed', completed_at = now()
    WHERE id = p_task_id AND assigned_to = p_worker_id AND status = 'active';
  DELETE FROM task_locks WHERE task_id = p_task_id;
  INSERT INTO task_events(task_id, event_type, actor_id)
    VALUES (p_task_id, 'completed', p_worker_id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_task(p_task_id uuid, p_worker_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tasks SET status = 'active', started_at = now()
    WHERE id = p_task_id AND assigned_to = p_worker_id AND status = 'accepted';
  INSERT INTO task_events(task_id, event_type, actor_id)
    VALUES (p_task_id, 'started', p_worker_id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_task(p_task_id uuid, p_actor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tasks SET status = 'published', published_at = now()
    WHERE id = p_task_id AND status = 'created';
  INSERT INTO task_events(task_id, event_type, actor_id)
    VALUES (p_task_id, 'published', p_actor_id);
END;
$$;

-- 3. ODSTRANI PODVOJENI RATING TRIGGER NA ocene
--    trg_ocene_recalc_rating ne filtrira is_public=true
--    update_obrtnik_rating_on_* so pravilni (is_public=true filter)
DROP TRIGGER IF EXISTS trg_ocene_recalc_rating ON public.ocene;
