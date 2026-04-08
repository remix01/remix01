-- Add ELITE subscription tier support across pricing-related schema

DO $block$
DECLARE
  r RECORD;
BEGIN
  -- profiles.subscription_tier: allow start/pro/elite
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'subscription_tier'
  ) THEN
    FOR r IN (
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'profiles'
        AND pg_get_constraintdef(con.oid) ILIKE '%subscription_tier%'
    ) LOOP
      EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    EXECUTE 'ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_tier_check CHECK (subscription_tier IN (''start'', ''pro'', ''elite''))';
  END IF;

  -- obrtnik_profiles.subscription_tier (lowercase tiers)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'obrtnik_profiles'
      AND column_name = 'subscription_tier'
  ) THEN
    FOR r IN (
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'obrtnik_profiles'
        AND pg_get_constraintdef(con.oid) ILIKE '%subscription_tier%'
    ) LOOP
      EXECUTE format('ALTER TABLE public.obrtnik_profiles DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    EXECUTE 'ALTER TABLE public.obrtnik_profiles ADD CONSTRAINT obrtnik_profiles_subscription_tier_check CHECK (subscription_tier IN (''start'', ''pro'', ''elite''))';
  END IF;

  -- obrtnik_profiles.plan_type (uppercase tiers)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'obrtnik_profiles'
      AND column_name = 'plan_type'
  ) THEN
    FOR r IN (
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE nsp.nspname = 'public'
        AND rel.relname = 'obrtnik_profiles'
        AND pg_get_constraintdef(con.oid) ILIKE '%plan_type%'
    ) LOOP
      EXECUTE format('ALTER TABLE public.obrtnik_profiles DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;

    EXECUTE 'ALTER TABLE public.obrtnik_profiles ADD CONSTRAINT obrtnik_profiles_plan_type_check CHECK (plan_type IN (''START'', ''PRO'', ''ELITE''))';
  END IF;
END
$block$;
