-- Migration: Add AI categorization fields to povprasevanja
--
-- keywords      — extracted terms for better obrtnik matching
-- ai_urgency_detected — urgency Claude detected from description text
--   (may differ from user-selected urgency; useful for analytics and future auto-upgrade)

ALTER TABLE public.povprasevanja
  ADD COLUMN IF NOT EXISTS keywords           TEXT[],
  ADD COLUMN IF NOT EXISTS ai_urgency_detected TEXT
    CHECK (ai_urgency_detected IN ('normalno', 'kmalu', 'nujno'));

-- GIN index enables fast @> and && array searches on keywords
CREATE INDEX IF NOT EXISTS idx_povprasevanja_keywords
  ON public.povprasevanja USING GIN(keywords)
  WHERE keywords IS NOT NULL;
