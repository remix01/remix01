-- Migration: Add indexes, fix opened_by_id type, and improve RLS policies

-- 1. Add composite index for escrow cron queries
CREATE INDEX IF NOT EXISTS idx_escrow_paid_due
ON public.escrow_transactions(status, release_due_at)
WHERE status = 'paid';

-- 2. Fix opened_by_id type from TEXT to UUID in escrow_disputes table
-- First, add a new UUID column
ALTER TABLE public.escrow_disputes 
ADD COLUMN opened_by_id_uuid UUID;

-- Copy and convert data from TEXT to UUID
UPDATE public.escrow_disputes
SET opened_by_id_uuid = opened_by_id::UUID
WHERE opened_by_id IS NOT NULL AND opened_by_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Drop the old policy that depends on opened_by_id
DROP POLICY IF EXISTS "Parties see own disputes" ON public.escrow_disputes;

-- Drop the old TEXT column
ALTER TABLE public.escrow_disputes DROP COLUMN opened_by_id;

-- Rename the UUID column to opened_by_id
ALTER TABLE public.escrow_disputes 
RENAME COLUMN opened_by_id_uuid TO opened_by_id;

-- Add NOT NULL constraint
ALTER TABLE public.escrow_disputes
ALTER COLUMN opened_by_id SET NOT NULL;

-- Add foreign key constraint to auth.users
ALTER TABLE public.escrow_disputes
ADD CONSTRAINT fk_opened_by_id_users FOREIGN KEY (opened_by_id)
REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Improve RLS policies

-- Escrow transactions: Allow customers to see own transactions, partners to see own, admins to see all
DROP POLICY IF EXISTS "Partners see own transactions" ON public.escrow_transactions;
DROP POLICY IF EXISTS "Customers see own transactions" ON public.escrow_transactions;

CREATE POLICY "Users see own or admin see all escrow"
    ON public.escrow_transactions FOR SELECT
    USING (
        auth.uid() = partner_id OR
        auth.jwt() ->> 'role' = 'admin' OR
        customer_email = auth.jwt() ->> 'email'
    );

-- Inquiries: Only creator or admin can see
DROP POLICY IF EXISTS "Users see own inquiries" ON public.inquiries;

CREATE POLICY "Users see own or admin see all inquiries"
    ON public.inquiries FOR SELECT
    USING (
        email = auth.jwt() ->> 'email' OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- Offers: Partners see own, customers see own inquiry's offers, admins see all
DROP POLICY IF EXISTS "Partners see own offers" ON public.offers;

CREATE POLICY "Users see own or admin see all offers"
    ON public.offers FOR SELECT
    USING (
        auth.uid() = partner_id OR
        auth.jwt() ->> 'role' = 'admin' OR
        -- Customer sees offers for their own inquiries
        EXISTS (
            SELECT 1 FROM public.inquiries
            WHERE id = offers.inquiry_id
            AND email = auth.jwt() ->> 'email'
        )
    );

-- Escrow disputes: Parties and admin see own
DROP POLICY IF EXISTS "Parties see own disputes" ON public.escrow_disputes;

CREATE POLICY "Parties see own or admin see all disputes"
    ON public.escrow_disputes FOR SELECT
    USING (
        auth.uid() = opened_by_id OR
        auth.uid() = (
            SELECT partner_id FROM public.escrow_transactions
            WHERE id = transaction_id
        ) OR
        auth.jwt() ->> 'role' = 'admin'
    );

-- Audit log: Parties and admin see
DROP POLICY IF EXISTS "Partners see own audit" ON public.escrow_audit_log;

CREATE POLICY "Parties see own or admin see all audit"
    ON public.escrow_audit_log FOR SELECT
    USING (
        auth.uid() = (
            SELECT partner_id FROM public.escrow_transactions
            WHERE id = transaction_id
        ) OR
        auth.jwt() ->> 'role' = 'admin'
    );
