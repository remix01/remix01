-- ============================================================
-- LiftGO Role System Backup
-- NAJPREJ zaženi PREDEN narediš kakršnekoli popravke!
-- Project: whabaeatixtymbccwigu
-- ============================================================

-- Počisti stare backupe (če obstajajo)
DROP TABLE IF EXISTS public.profiles_backup;
DROP TABLE IF EXISTS public.obrtnik_profiles_backup;
DROP TABLE IF EXISTS public.admin_users_backup;

-- Backup vseh kritičnih tabel
CREATE TABLE public.profiles_backup AS
  SELECT * FROM public.profiles;

CREATE TABLE public.obrtnik_profiles_backup AS
  SELECT * FROM public.obrtnik_profiles;

CREATE TABLE public.admin_users_backup AS
  SELECT * FROM public.admin_users;

-- Verificiraj backup
SELECT 'profiles: original=' || (SELECT COUNT(*) FROM public.profiles)::text
     || ', backup='          || (SELECT COUNT(*) FROM public.profiles_backup)::text AS check_profiles;

SELECT 'obrtnik_profiles: original=' || (SELECT COUNT(*) FROM public.obrtnik_profiles)::text
     || ', backup='                   || (SELECT COUNT(*) FROM public.obrtnik_profiles_backup)::text AS check_obrtnik_profiles;

SELECT 'admin_users: original=' || (SELECT COUNT(*) FROM public.admin_users)::text
     || ', backup='              || (SELECT COUNT(*) FROM public.admin_users_backup)::text AS check_admin_users;

SELECT 'BACKUP USPEŠEN - ' || NOW()::text AS backup_status;

-- ============================================================
-- NAVODILA ZA RESTORE (v sili):
-- UPDATE public.profiles SET role = b.role, ... FROM public.profiles_backup b WHERE profiles.id = b.id;
-- ============================================================
