-- Expand-phase canonical domain foundation for LiftGO
-- Non-destructive: introduces canonical enums and legacy mapping tables only.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status_canon') THEN
    CREATE TYPE public.lead_status_canon AS ENUM (
      'new',
      'qualified',
      'matched',
      'quoted',
      'accepted',
      'in_progress',
      'completed',
      'cancelled',
      'rejected'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_canon') THEN
    CREATE TYPE public.payment_status_canon AS ENUM (
      'pending',
      'captured',
      'released',
      'refunded',
      'disputed',
      'failed',
      'cancelled'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'actor_role_canon') THEN
    CREATE TYPE public.actor_role_canon AS ENUM (
      'customer',
      'provider',
      'admin',
      'system'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.legacy_role_map (
  legacy_value text PRIMARY KEY,
  canonical_value public.actor_role_canon NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legacy_lead_status_map (
  legacy_value text PRIMARY KEY,
  canonical_value public.lead_status_canon NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legacy_payment_status_map (
  legacy_value text PRIMARY KEY,
  canonical_value public.payment_status_canon NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.legacy_role_map (legacy_value, canonical_value, notes)
VALUES
  ('CUSTOMER', 'customer', 'legacy uppercase role'),
  ('CRAFTWORKER', 'provider', 'legacy uppercase role'),
  ('ADMIN', 'admin', 'legacy uppercase role')
ON CONFLICT (legacy_value) DO UPDATE
SET canonical_value = EXCLUDED.canonical_value,
    notes = EXCLUDED.notes;

INSERT INTO public.legacy_lead_status_map (legacy_value, canonical_value, notes)
VALUES
  ('novo', 'new', 'legacy sl status'),
  ('odprto', 'new', 'legacy sl status'),
  ('dodeljeno', 'matched', 'legacy sl status'),
  ('v_teku', 'in_progress', 'legacy sl status'),
  ('zaključeno', 'completed', 'legacy sl status')
ON CONFLICT (legacy_value) DO UPDATE
SET canonical_value = EXCLUDED.canonical_value,
    notes = EXCLUDED.notes;

INSERT INTO public.legacy_payment_status_map (legacy_value, canonical_value, notes)
VALUES
  ('UNPAID', 'pending', 'legacy uppercase payment status'),
  ('HELD', 'captured', 'legacy uppercase payment status'),
  ('RELEASED', 'released', 'legacy uppercase payment status'),
  ('REFUNDED', 'refunded', 'legacy uppercase payment status'),
  ('DISPUTED', 'disputed', 'legacy uppercase payment status')
ON CONFLICT (legacy_value) DO UPDATE
SET canonical_value = EXCLUDED.canonical_value,
    notes = EXCLUDED.notes;
