-- Admin workflow columns
--
-- povprasevanja: assigned_to (which obrtnik admin assigned), admin_opomba (admin note)
-- ponudbe: narocnik_id (denormalized from povprasevanja for efficient admin queries)

ALTER TABLE public.povprasevanja
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.obrtnik_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS admin_opomba TEXT;

ALTER TABLE public.ponudbe
  ADD COLUMN IF NOT EXISTS narocnik_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Backfill narocnik_id from the parent povprasevanja
UPDATE public.ponudbe p
SET narocnik_id = pov.narocnik_id
FROM public.povprasevanja pov
WHERE p.povprasevanje_id = pov.id
  AND p.narocnik_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_povprasevanja_assigned_to
  ON public.povprasevanja(assigned_to);

CREATE INDEX IF NOT EXISTS idx_ponudbe_narocnik_id
  ON public.ponudbe(narocnik_id);
