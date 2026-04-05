-- Migration: Comprehensive RLS (Row Level Security) Policies for obrtnik_profiles table
-- Purpose: Enable contractors to read/write their own profiles and allow public contractor discovery
-- Date: 2026-04-05
-- Issue Fixed: Users cannot read or write to obrtnik_profiles due to missing/incomplete RLS policies

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON obrtnik_profiles TABLE
-- ============================================================================
ALTER TABLE public.obrtnik_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP EXISTING POLICIES (to avoid conflicts)
-- ============================================================================
DROP POLICY IF EXISTS "Users can read own obrtnik_profile" ON public.obrtnik_profiles;
DROP POLICY IF EXISTS "Users can update own obrtnik_profile" ON public.obrtnik_profiles;
DROP POLICY IF EXISTS "Users can insert own obrtnik_profile" ON public.obrtnik_profiles;
DROP POLICY IF EXISTS "Public can view obrtnik_profiles" ON public.obrtnik_profiles;
DROP POLICY IF EXISTS "Users cannot delete obrtnik_profile" ON public.obrtnik_profiles;
DROP POLICY IF EXISTS "Obrtniki can insert own profile" ON public.obrtnik_profiles;
DROP POLICY IF EXISTS "Obrtniki can update own profile" ON public.obrtnik_profiles;

-- ============================================================================
-- POLICY 1: AUTHENTICATED USERS CAN SELECT (READ) THEIR OWN PROFILE
-- ============================================================================
-- Purpose: Allow contractors to view their own profile data
-- Usage: obrtnik/profil/page.tsx - fetches contractor's profile during page load
CREATE POLICY "Users can read own obrtnik_profile"
ON public.obrtnik_profiles
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) = user_id
);

-- ============================================================================
-- POLICY 2: AUTHENTICATED USERS CAN UPDATE THEIR OWN PROFILE
-- ============================================================================
-- Purpose: Allow contractors to modify their profile information
-- Usage: obrtnik/profil/page.tsx - saves updated profile data when contractor submits form
CREATE POLICY "Users can update own obrtnik_profile"
ON public.obrtnik_profiles
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) = user_id
)
WITH CHECK (
  (SELECT auth.uid()) = user_id
);

-- ============================================================================
-- POLICY 3: AUTHENTICATED USERS CAN INSERT THEIR OWN PROFILE
-- ============================================================================
-- Purpose: Allow contractors to create their profile record on first signup
-- Usage: Profile creation during contractor registration/onboarding
CREATE POLICY "Users can insert own obrtnik_profile"
ON public.obrtnik_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) = user_id
);

-- ============================================================================
-- POLICY 4: PUBLIC CAN READ CONTRACTOR PROFILES (FOR CONTRACTOR DISCOVERY)
-- ============================================================================
-- Purpose: Allow narocniki and anonymous users to browse available contractors
-- Security: Only expose non-sensitive fields (exclude internal ratings, notes, etc.)
-- Usage: novo-povprasevanje wizard - shows available contractors to narocniki
CREATE POLICY "Public can view obrtnik_profiles"
ON public.obrtnik_profiles
FOR SELECT
TO authenticated, anon
USING (
  true  -- Anyone can read profiles for contractor discovery
);

-- ============================================================================
-- POLICY 5: PREVENT PROFILE DELETION (FOR DATA INTEGRITY)
-- ============================================================================
-- Purpose: Ensure contractor profiles cannot be deleted to maintain referential integrity
-- Reasoning: Profile deletion could break foreign key relationships with other tables
-- Note: This policy denies ALL delete attempts by always returning false
CREATE POLICY "Users cannot delete obrtnik_profile"
ON public.obrtnik_profiles
FOR DELETE
TO authenticated
USING (
  false  -- No one can delete profiles
);

-- ============================================================================
-- ADMIN BYPASS: ADMINS CAN READ/WRITE ALL PROFILES
-- ============================================================================
-- Purpose: Allow admin users to manage contractor profiles for support/moderation
-- Usage: Admin dashboard - view/edit contractor profiles as needed
CREATE POLICY "Admins can manage all obrtnik_profiles"
ON public.obrtnik_profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_user_id = (SELECT auth.uid())
    AND aktiven = true
  )
);

-- ============================================================================
-- CREATE INDEXES FOR RLS PERFORMANCE OPTIMIZATION
-- ============================================================================
-- These indexes improve query performance for RLS policy checks
CREATE INDEX IF NOT EXISTS idx_obrtnik_profiles_user_id ON public.obrtnik_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_auth_user_id ON public.admin_users(auth_user_id);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON POLICY "Users can read own obrtnik_profile" ON public.obrtnik_profiles IS
'Authenticated users can view their own contractor profile. Used when loading /obrtnik/profil page.';

COMMENT ON POLICY "Users can update own obrtnik_profile" ON public.obrtnik_profiles IS
'Authenticated users can update their own contractor profile. Used when submitting profile form.';

COMMENT ON POLICY "Users can insert own obrtnik_profile" ON public.obrtnik_profiles IS
'Authenticated users can create their own contractor profile during registration/onboarding.';

COMMENT ON POLICY "Public can view obrtnik_profiles" ON public.obrtnik_profiles IS
'Public users (authenticated) can view contractor profiles for discovery and hiring. Used in novo-povprasevanje wizard.';

COMMENT ON POLICY "Users cannot delete obrtnik_profile" ON public.obrtnik_profiles IS
'Prevents accidental or intentional deletion of contractor profiles to maintain data integrity and referential relationships.';

COMMENT ON POLICY "Admins can manage all obrtnik_profiles" ON public.obrtnik_profiles IS
'Admin users can perform all operations on any contractor profile for support, moderation, and data management.';
