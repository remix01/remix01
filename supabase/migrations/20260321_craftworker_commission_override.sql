-- Add commissionOverride column to CraftworkerProfile
-- Allows admins to manually override the calculated commission rate for a craftworker.
-- When set, the value takes precedence over all tier/loyalty calculations.
-- Unit: percentage points (e.g. 7.5 = 7.5%). NULL means no override (use calculated rate).

ALTER TABLE "CraftworkerProfile"
  ADD COLUMN IF NOT EXISTS "commissionOverride" NUMERIC(5,2) DEFAULT NULL;

COMMENT ON COLUMN "CraftworkerProfile"."commissionOverride"
  IS 'Admin-set commission rate override in percentage points (e.g. 7.5 = 7.5%). NULL = use calculated tier rate.';
