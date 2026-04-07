-- Fix marketplace RLS for povprasevanja/ponudbe/obrtniki and enable realtime.
-- Addresses:
-- 1) obrtnik visibility limited to matching categories (+ own offered requests)
-- 2) narocnik visibility for own ponudbe through their povprasevanja
-- 3) explicit USING + WITH CHECK policies, including FOR ALL realtime-friendly policies

BEGIN;

-- ---------------------------------------------------------------------------
-- POVPRASEVANJA
-- ---------------------------------------------------------------------------
ALTER TABLE public.povprasevanja ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see relevant povprasevanja" ON public.povprasevanja;
DROP POLICY IF EXISTS "Narocniki see own povprasevanja" ON public.povprasevanja;
DROP POLICY IF EXISTS "Narocniki can create povprasevanja" ON public.povprasevanja;
DROP POLICY IF EXISTS "Narocniki can update own povprasevanja" ON public.povprasevanja;
DROP POLICY IF EXISTS "Admins can manage all povprasevanja" ON public.povprasevanja;
DROP POLICY IF EXISTS "povprasevanja_realtime_all" ON public.povprasevanja;

CREATE POLICY "povprasevanja_select_relevant"
  ON public.povprasevanja
  FOR SELECT
  TO authenticated
  USING (
    -- Naročnik vidi samo svoja povpraševanja
    narocnik_id = (SELECT auth.uid())
    OR
    -- Obrtnik vidi odprta povpraševanja iz svojih kategorij
    (
      status = 'odprto'
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.obrtnik_categories oc
          ON oc.obrtnik_id = p.id
        WHERE p.id = (SELECT auth.uid())
          AND p.role = 'obrtnik'
          AND oc.category_id = povprasevanja.category_id
      )
    )
    OR
    -- Obrtnik vedno vidi povpraševanja, kjer je že oddal ponudbo
    EXISTS (
      SELECT 1
      FROM public.ponudbe po
      WHERE po.povprasevanje_id = povprasevanja.id
        AND po.obrtnik_id = (SELECT auth.uid())
    )
    OR
    -- Admin
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND au.aktiven = true
    )
  );

CREATE POLICY "povprasevanja_insert_narocnik"
  ON public.povprasevanja
  FOR INSERT
  TO authenticated
  WITH CHECK (
    narocnik_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'narocnik'
    )
  );

CREATE POLICY "povprasevanja_update_owner_or_admin"
  ON public.povprasevanja
  FOR UPDATE
  TO authenticated
  USING (
    narocnik_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND au.aktiven = true
    )
  )
  WITH CHECK (
    narocnik_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND au.aktiven = true
    )
  );

-- Realtime-friendly policy (explicit FOR ALL)
CREATE POLICY "povprasevanja_realtime_all"
  ON public.povprasevanja
  FOR ALL
  TO authenticated
  USING (
    narocnik_id = (SELECT auth.uid())
    OR (
      status = 'odprto'
      AND EXISTS (
        SELECT 1
        FROM public.obrtnik_categories oc
        WHERE oc.obrtnik_id = (SELECT auth.uid())
          AND oc.category_id = povprasevanja.category_id
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.ponudbe po
      WHERE po.povprasevanje_id = povprasevanja.id
        AND po.obrtnik_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND au.aktiven = true
    )
  )
  WITH CHECK (
    narocnik_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND au.aktiven = true
    )
  );

-- ---------------------------------------------------------------------------
-- PONUDBE
-- ---------------------------------------------------------------------------
ALTER TABLE public.ponudbe ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ponudbe_select_combined" ON public.ponudbe;
DROP POLICY IF EXISTS "Obrtniki see own ponudbe" ON public.ponudbe;
DROP POLICY IF EXISTS "Obrtniki can create ponudbe" ON public.ponudbe;
DROP POLICY IF EXISTS "Narocniki can update ponudbe status" ON public.ponudbe;
DROP POLICY IF EXISTS "ponudbe_realtime_all" ON public.ponudbe;

CREATE POLICY "ponudbe_select_relevant"
  ON public.ponudbe
  FOR SELECT
  TO authenticated
  USING (
    -- Obrtnik vidi svoje ponudbe
    obrtnik_id = (SELECT auth.uid())
    OR
    -- Stranka vidi ponudbe za svoja povpraševanja
    EXISTS (
      SELECT 1
      FROM public.povprasevanja pv
      WHERE pv.id = ponudbe.povprasevanje_id
        AND pv.narocnik_id = (SELECT auth.uid())
    )
    OR
    -- Admin
    EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND au.aktiven = true
    )
  );

CREATE POLICY "ponudbe_insert_obrtnik"
  ON public.ponudbe
  FOR INSERT
  TO authenticated
  WITH CHECK (
    obrtnik_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'obrtnik'
    )
    AND EXISTS (
      SELECT 1
      FROM public.povprasevanja pv
      JOIN public.obrtnik_categories oc
        ON oc.obrtnik_id = (SELECT auth.uid())
       AND oc.category_id = pv.category_id
      WHERE pv.id = ponudbe.povprasevanje_id
    )
  );

CREATE POLICY "ponudbe_update_participant_or_admin"
  ON public.ponudbe
  FOR UPDATE
  TO authenticated
  USING (
    obrtnik_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.povprasevanja pv
      WHERE pv.id = ponudbe.povprasevanje_id
        AND pv.narocnik_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND au.aktiven = true
    )
  )
  WITH CHECK (
    obrtnik_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.povprasevanja pv
      WHERE pv.id = ponudbe.povprasevanje_id
        AND pv.narocnik_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND au.aktiven = true
    )
  );

CREATE POLICY "ponudbe_realtime_all"
  ON public.ponudbe
  FOR ALL
  TO authenticated
  USING (
    obrtnik_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.povprasevanja pv
      WHERE pv.id = ponudbe.povprasevanje_id
        AND pv.narocnik_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND au.aktiven = true
    )
  )
  WITH CHECK (
    obrtnik_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.admin_users au
      WHERE au.auth_user_id = (SELECT auth.uid())
        AND au.aktiven = true
    )
  );

-- ---------------------------------------------------------------------------
-- OBRTNIKI (obrtnik_profiles)
-- ---------------------------------------------------------------------------
ALTER TABLE public.obrtnik_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Obrtniki can update own profile" ON public.obrtnik_profiles;
DROP POLICY IF EXISTS "Obrtniki can insert own profile" ON public.obrtnik_profiles;

CREATE POLICY "obrtnik_profiles_insert_own"
  ON public.obrtnik_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role = 'obrtnik'
    )
  );

CREATE POLICY "obrtnik_profiles_update_own"
  ON public.obrtnik_profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- USERS (profiles)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Realtime publication membership
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'povprasevanja'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.povprasevanja;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ponudbe'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ponudbe;
  END IF;
END $$;

COMMIT;
