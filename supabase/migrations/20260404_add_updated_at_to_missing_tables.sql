-- ============================================================
-- Add updated_at to tables that were missing the column
-- Affected: obrtnik_profiles, sporocila
-- ============================================================

-- Ensure the moddatetime extension is available
-- (safe to run even if already enabled)
CREATE EXTENSION IF NOT EXISTS moddatetime SCHEMA extensions;

-- ── obrtnik_profiles ─────────────────────────────────────────

ALTER TABLE public.obrtnik_profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Back-fill existing rows so the column is never NULL
UPDATE public.obrtnik_profiles
SET updated_at = created_at
WHERE updated_at = now() AND created_at < now();

-- Auto-update trigger
DROP TRIGGER IF EXISTS trg_obrtnik_profiles_updated_at ON public.obrtnik_profiles;
CREATE TRIGGER trg_obrtnik_profiles_updated_at
  BEFORE UPDATE ON public.obrtnik_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── sporocila ────────────────────────────────────────────────

ALTER TABLE public.sporocila
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.sporocila
SET updated_at = created_at
WHERE updated_at = now() AND created_at < now();

DROP TRIGGER IF EXISTS trg_sporocila_updated_at ON public.sporocila;
CREATE TRIGGER trg_sporocila_updated_at
  BEFORE UPDATE ON public.sporocila
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
