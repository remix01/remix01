-- Migration: Add sub-ratings and craftsman reply to ocene table

ALTER TABLE public.ocene
  ADD COLUMN IF NOT EXISTS quality_rating     INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS punctuality_rating INTEGER CHECK (punctuality_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS price_rating       INTEGER CHECK (price_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS obrtnik_reply      TEXT,
  ADD COLUMN IF NOT EXISTS replied_at         TIMESTAMPTZ;

-- Allow craftsman to update their own review reply
CREATE POLICY IF NOT EXISTS "Obrtnik can reply to own ocene"
  ON public.ocene FOR UPDATE
  USING (obrtnik_id = auth.uid())
  WITH CHECK (obrtnik_id = auth.uid());
