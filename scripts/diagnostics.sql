-- ============================================================
-- LiftGO Role System Diagnostics
-- Zaženi v Supabase SQL Editor: https://supabase.com/dashboard
-- Project: whabaeatixtymbccwigu
-- ============================================================

-- ============================================================
-- SEKCIJA 1: Uporabniki brez role (Problem 1)
-- ============================================================
SELECT
  '=== PROBLEM 1: Uporabniki brez role ===' AS section;

SELECT
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles
WHERE role IS NULL
ORDER BY created_at DESC;

SELECT
  'Skupaj brez role: ' || COUNT(*)::text AS summary
FROM public.profiles
WHERE role IS NULL;

-- ============================================================
-- SEKCIJA 2: Obrtniki brez obrtnik_profiles (Problem 2)
-- ============================================================
SELECT
  '=== PROBLEM 2: Obrtniki brez obrtnik_profiles ===' AS section;

SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.created_at,
  op.id AS obrtnik_profile_id
FROM public.profiles p
LEFT JOIN public.obrtnik_profiles op ON op.id = p.id
WHERE p.role = 'obrtnik'
  AND op.id IS NULL
ORDER BY p.created_at DESC;

SELECT
  'Skupaj obrtnikov brez profila: ' || COUNT(*)::text AS summary
FROM public.profiles p
LEFT JOIN public.obrtnik_profiles op ON op.id = p.id
WHERE p.role = 'obrtnik'
  AND op.id IS NULL;

-- Pregled vseh obrtnikov (za primerjavo)
SELECT
  '--- Vsi obrtniki (profiles + obrtnik_profiles status) ---' AS section;

SELECT
  p.id,
  p.email,
  p.full_name,
  CASE WHEN op.id IS NOT NULL THEN 'IMA profil' ELSE 'BREZ profila' END AS profile_status,
  op.business_name,
  op.is_verified,
  op.verification_status
FROM public.profiles p
LEFT JOIN public.obrtnik_profiles op ON op.id = p.id
WHERE p.role = 'obrtnik'
ORDER BY profile_status, p.created_at DESC;

-- ============================================================
-- SEKCIJA 3: Konsistentnost admin vlog (Problem 3)
-- ============================================================
SELECT
  '=== PROBLEM 3: Admin konsistentnost ===' AS section;

-- Preveri katere stolpce ima admin_users (auth_user_id ali user_id)
SELECT
  '--- Stolpci v admin_users tabeli ---' AS section;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admin_users'
ORDER BY ordinal_position;

-- Admini v admin_users tabeli (nova shema z auth_user_id)
SELECT
  '--- Admini v admin_users (auth_user_id) ---' AS section;

SELECT
  au.id,
  au.email,
  au.ime,
  au.priimek,
  au.vloga,
  au.aktiven,
  au.auth_user_id,
  p.role AS profiles_role
FROM public.admin_users au
LEFT JOIN public.profiles p ON p.id = au.auth_user_id
ORDER BY au.created_at DESC;

-- Admini v admin_users (legacy shema z user_id, če obstaja)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'admin_users'
      AND column_name = 'user_id'
  ) THEN
    RAISE NOTICE 'Stolpec user_id OBSTAJA v admin_users (legacy shema)';
  ELSE
    RAISE NOTICE 'Stolpec user_id NE OBSTAJA v admin_users (nova shema OK)';
  END IF;
END $$;

-- Preveri ali imajo admini v admin_users tudi vnos v profiles
SELECT
  '--- Admini brez vnosa v profiles ---' AS section;

SELECT
  au.email,
  au.ime,
  au.vloga,
  au.auth_user_id,
  CASE WHEN p.id IS NOT NULL THEN 'IMA profil' ELSE 'BREZ profila' END AS profile_status
FROM public.admin_users au
LEFT JOIN public.profiles p ON p.id = au.auth_user_id
WHERE p.id IS NULL
  AND au.auth_user_id IS NOT NULL;

-- Profili z role='admin' (ne bi smeli obstajati, ker profiles omejuje na narocnik/obrtnik)
SELECT
  '--- Profili z role=admin (napaka v constraints) ---' AS section;

SELECT COUNT(*) AS profili_z_admin_role
FROM public.profiles
WHERE role = 'admin';

-- ============================================================
-- SEKCIJA 4: Splošni pregled (statistika)
-- ============================================================
SELECT
  '=== PREGLED: Splošna statistika ===' AS section;

SELECT
  role,
  COUNT(*) AS stevilo
FROM public.profiles
GROUP BY role
ORDER BY stevilo DESC;

SELECT
  'Skupaj v profiles: ' || COUNT(*)::text AS summary
FROM public.profiles;

SELECT
  'Skupaj v obrtnik_profiles: ' || COUNT(*)::text AS summary
FROM public.obrtnik_profiles;

SELECT
  'Skupaj v admin_users: ' || COUNT(*)::text AS summary
FROM public.admin_users;

-- ============================================================
-- SEKCIJA 5: RLS politike za profiles in obrtnik_profiles
-- ============================================================
SELECT
  '=== RLS POLITIKE ===' AS section;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'obrtnik_profiles', 'admin_users')
ORDER BY tablename, policyname;

-- ============================================================
-- KONEC DIAGNOSTIKE
-- ============================================================
SELECT '=== DIAGNOSTIKA ZAKLJUČENA ===' AS section;
