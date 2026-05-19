-- Ensure DB constraints support new state-machine statuses introduced in app layer.
-- This migration is additive and backwards-compatible with existing legacy statuses.

ALTER TABLE public.povprasevanja
  DROP CONSTRAINT IF EXISTS povprasevanja_status_check;

ALTER TABLE public.povprasevanja
  ADD CONSTRAINT povprasevanja_status_check
  CHECK (status IN (
    'odprto',
    'dodeljeno',
    'v_teku',
    'v_izvedbi',
    'zakljuceno',
    'ocenjeno',
    'sporno',
    'preklicano',
    'arhivirano'
  ));

ALTER TABLE public.ponudbe
  DROP CONSTRAINT IF EXISTS ponudbe_status_check;

ALTER TABLE public.ponudbe
  ADD CONSTRAINT ponudbe_status_check
  CHECK (status IN (
    'draft',
    'poslana',
    'sprejeta',
    'zavrnjena',
    'preklicana',
    'umaknjena'
  ));
