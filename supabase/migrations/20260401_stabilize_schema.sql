-- Stabilize Schema Migration — applied 2026-04-01
--
-- Only adds what was genuinely missing from production.
-- Everything else (event_log, marketplace_events, escrow_holds,
-- obrtnik_profiles instant-offer columns, povprasevanja.notified_at)
-- was already present in the database.

-- ============================================================================
-- PONUDBE — columns for instant-offer drafts
-- ============================================================================
ALTER TABLE public.ponudbe
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS template_id UUID;

-- Widen status constraint to include 'draft' and 'preklicana'
-- (was: 'poslana' | 'sprejeta' | 'zavrnjena')
ALTER TABLE public.ponudbe DROP CONSTRAINT IF EXISTS ponudbe_status_check;
ALTER TABLE public.ponudbe ADD CONSTRAINT ponudbe_status_check
  CHECK (status IN ('draft', 'poslana', 'sprejeta', 'zavrnjena', 'preklicana'));
