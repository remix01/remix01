-- Deprecated legacy RLS migration.
--
-- Original version targeted old Prisma-era tables with PascalCase names
-- ("User", "CraftworkerProfile", "Job", ...). In the current schema baseline
-- these relations may not exist, causing bootstrap failures like:
--   ERROR: relation "User" does not exist (SQLSTATE 42P01)
--
-- This migration is intentionally a no-op so fresh environments can continue
-- applying the active snake_case migrations safely.

DO $$
BEGIN
  RAISE NOTICE 'Skipping deprecated migration 001_rls_policies.sql (legacy PascalCase schema not present).';
END $$;
