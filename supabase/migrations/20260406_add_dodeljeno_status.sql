-- Add 'dodeljeno' status to povprasevanja table
-- This status is used when a task is directly assigned to a specific obrtnik

ALTER TABLE public.povprasevanja
  DROP CONSTRAINT IF EXISTS povprasevanja_status_check,
  ADD CONSTRAINT povprasevanja_status_check
    CHECK (status IN ('odprto', 'dodeljeno', 'v_teku', 'zakljuceno', 'preklicano'));
