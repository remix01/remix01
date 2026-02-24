-- ============================================================
-- Migration: Fix Database Performance and Security Issues
-- Date: 2025-02-25
-- Purpose: Add indexes, fix RLS policies, and implement atomic states
-- ============================================================

-- ============================================================
-- 1. ADD MISSING COMPOSITE INDEX for cron auto-release query
-- Query: WHERE status='paid' AND release_due_at < now()
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_escrow_status_release_due
  ON escrow_transactions(status, release_due_at)
  WHERE status IN ('paid', 'releasing');

-- ============================================================
-- 2. ADD INDEX for time-based queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_escrow_created_at
  ON escrow_transactions(created_at DESC);

-- ============================================================
-- 3. ADD UNIQUE CONSTRAINT on stripe_event_id for idempotency
-- This prevents duplicate webhook processing at DB level
-- ============================================================
ALTER TABLE escrow_audit_log
  ADD CONSTRAINT uq_audit_stripe_event_id
  UNIQUE (stripe_event_id)
  DEFERRABLE INITIALLY DEFERRED;

-- ============================================================
-- 4. ADD composite index for dispute queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_disputes_transaction_status
  ON escrow_disputes(transaction_id, status);

-- ============================================================
-- 5. FIX RLS TYPE MISMATCH in escrow_disputes
-- Problem: opened_by_id stored as TEXT, auth.uid() is UUID
-- Solution: Cast opened_by_id to UUID instead of casting auth.uid() to TEXT
-- ============================================================

-- Drop old policy
DROP POLICY IF EXISTS "Parties see own disputes" ON escrow_disputes;

-- Recreate with correct type handling
CREATE POLICY "Parties see own disputes"
  ON escrow_disputes
  FOR ALL
  USING (
    opened_by_id::uuid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM escrow_transactions et
      WHERE et.id = escrow_disputes.transaction_id
        AND (et.partner_id = auth.uid() OR et.customer_email = (SELECT email FROM auth.users WHERE id = auth.uid()))
    )
  );

-- ============================================================
-- 6. FIX customer RLS in escrow_transactions
-- Problem: Policy referenced non-existent customer_id UUID column
-- Actual column: customer_email (TEXT)
-- Solution: Match customer_email against current user's email from auth.users
-- ============================================================
DROP POLICY IF EXISTS "Customers see own transactions" ON escrow_transactions;

CREATE POLICY "Customers see own transactions"
  ON escrow_transactions
  FOR SELECT
  USING (
    customer_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- ============================================================
-- 7. ADD new statuses to CHECK constraint (for race condition fixes)
-- ============================================================
ALTER TABLE escrow_transactions
  DROP CONSTRAINT IF EXISTS escrow_transactions_status_check;

ALTER TABLE escrow_transactions
  ADD CONSTRAINT escrow_transactions_status_check
  CHECK (status IN (
    'pending',
    'paid',
    'releasing',   -- NEW: atomic claim during auto-release/manual release
    'resolving',   -- NEW: atomic claim during admin dispute resolution
    'released',
    'disputed',
    'refunded',
    'cancelled'
  ));

-- ============================================================
-- 8. ADD index for partner_id + status (common dashboard query)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_escrow_partner_status
  ON escrow_transactions(partner_id, status);
