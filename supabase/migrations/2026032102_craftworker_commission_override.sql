-- commission_override column is included in 20260321_create_core_tables.sql
-- This migration is kept as a no-op for idempotency.
ALTER TABLE IF EXISTS public.craftworker_profile
  ADD COLUMN IF NOT EXISTS commission_override NUMERIC(5,2) DEFAULT NULL;
