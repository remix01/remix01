-- Migration: create_or_find_category RPC + tighten categories RLS + realtime
--
-- Changes:
-- 1. SECURITY DEFINER function `create_or_find_category` – handles find-or-create
--    atomically, bypasses RLS, validates input and slug uniqueness.
-- 2. Drop the permissive INSERT policy added in 2026041201 so regular authenticated
--    users can no longer INSERT directly into categories.  Admin-manage policy
--    already covers admin inserts from migration 004.
-- 3. Add categories table to supabase_realtime publication so portals pick up
--    insert/update/delete events automatically.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. SECURITY DEFINER function: create_or_find_category
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_or_find_category(
  p_name    TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized TEXT;
  v_existing_id UUID;
  v_base_slug TEXT;
  v_slug TEXT;
  v_counter INT := 1;
  v_new_id UUID;
BEGIN
  -- Normalise: collapse internal whitespace, strip leading/trailing
  v_normalized := btrim(regexp_replace(p_name, '\s+', ' ', 'g'));

  -- Length guard
  IF char_length(v_normalized) < 2 THEN
    RAISE EXCEPTION 'Kategorija mora imeti najmanj 2 znaka'
      USING ERRCODE = 'check_violation';
  END IF;

  IF char_length(v_normalized) > 100 THEN
    RAISE EXCEPTION 'Kategorija ne sme biti daljša od 100 znakov'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Character whitelist: letters (incl. Slovenian/accented), digits, space, hyphen, &
  IF v_normalized !~ '^[a-zA-ZčšžČŠŽćśźÀ-ÖØ-öø-ÿ0-9 &\-]+$' THEN
    RAISE EXCEPTION 'Kategorija sme vsebovati samo črke, številke, presledke in vezaje'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Try to find an existing active category (case-insensitive)
  SELECT id
    INTO v_existing_id
    FROM public.categories
   WHERE lower(name) = lower(v_normalized)
     AND is_active = true
   LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  -- Build slug: replicate slugify() logic from lib/utils/slugify.ts
  v_base_slug := lower(v_normalized);
  v_base_slug := replace(v_base_slug, 'č', 'c');
  v_base_slug := replace(v_base_slug, 'ć', 'c');
  v_base_slug := replace(v_base_slug, 'š', 's');
  v_base_slug := replace(v_base_slug, 'ž', 'z');
  v_base_slug := replace(v_base_slug, 'ś', 's');
  v_base_slug := replace(v_base_slug, 'ź', 'z');
  v_base_slug := regexp_replace(v_base_slug, '[^a-z0-9]+', '-', 'g');
  v_base_slug := trim(both '-' from v_base_slug);
  v_base_slug := regexp_replace(v_base_slug, '-+', '-', 'g');

  v_slug := v_base_slug;

  -- Resolve slug uniqueness
  WHILE EXISTS (SELECT 1 FROM public.categories WHERE slug = v_slug) LOOP
    v_slug := v_base_slug || '-' || v_counter;
    v_counter := v_counter + 1;
  END LOOP;

  -- Insert new auto-created category
  INSERT INTO public.categories (
    name,
    slug,
    is_active,
    is_auto_created,
    icon_name,
    description,
    sort_order,
    created_at
  )
  VALUES (
    v_normalized,
    v_slug,
    true,
    true,
    'folder',
    'Uporabnik definirano - ' || to_char(now(), 'DD.MM.YYYY'),
    999,
    now()
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;

EXCEPTION
  WHEN unique_violation THEN
    -- Race condition: another session inserted the same name between our check and INSERT.
    SELECT id
      INTO v_new_id
      FROM public.categories
     WHERE lower(name) = lower(v_normalized)
       AND is_active = true
     LIMIT 1;

    IF v_new_id IS NOT NULL THEN
      RETURN v_new_id;
    END IF;

    RAISE EXCEPTION 'Napaka pri ustvarjanju kategorije (conflict)'
      USING ERRCODE = 'unique_violation';
END;
$$;

-- Grant EXECUTE to authenticated users; the function runs as its owner (postgres)
-- so it bypasses RLS even though callers are regular authenticated users.
GRANT EXECUTE ON FUNCTION public.create_or_find_category(TEXT, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Tighten RLS: drop the permissive INSERT policy from migration 2026041201.
--    Regular authenticated users must now go through the RPC – they cannot
--    INSERT directly.  Admin management policy (from 004) is left intact.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "categories_insert_authenticated_autocreate" ON public.categories;

-- Confirm RLS is enabled (idempotent)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Add categories to supabase_realtime publication
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname    = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename  = 'categories'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  END IF;
END $$;

COMMIT;
