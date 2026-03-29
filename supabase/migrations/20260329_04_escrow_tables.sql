-- =============================================================
-- Migration: Create escrow_transactions and escrow_audit_log
-- Date: 2026-03-29
-- Description: App code expects these tables for full escrow flow.
--              escrow_holds was the old hold-only table.
--              escrow_transactions tracks all financial movements.
--              escrow_audit_log is immutable (no UPDATE/DELETE).
-- =============================================================

-- ESCROW TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.escrow_transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_id                  UUID REFERENCES public.escrow_holds(id) ON DELETE SET NULL,
  task_id                  UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  user_id                  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount                   NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency                 TEXT NOT NULL DEFAULT 'EUR',
  type                     TEXT NOT NULL CHECK (type IN ('hold','release','refund','dispute','commission')),
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','processing','completed','failed','reversed')),
  stripe_payment_intent_id TEXT,
  stripe_transfer_id       TEXT,
  reference                TEXT,
  metadata                 JSONB,
  created_at               TIMESTAMPTZ DEFAULT now(),
  processed_at             TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_escrow_tx_hold_id   ON public.escrow_transactions (hold_id);
CREATE INDEX IF NOT EXISTS idx_escrow_tx_task_id   ON public.escrow_transactions (task_id);
CREATE INDEX IF NOT EXISTS idx_escrow_tx_user_id   ON public.escrow_transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_escrow_tx_status    ON public.escrow_transactions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_tx_type      ON public.escrow_transactions (type, created_at DESC);

ALTER TABLE public.escrow_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own escrow transactions"
  ON public.escrow_transactions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Admin full access on escrow_transactions"
  ON public.escrow_transactions FOR ALL
  USING (is_admin());

CREATE POLICY "Service role full access on escrow_transactions"
  ON public.escrow_transactions FOR ALL
  USING ((SELECT auth.role()) = 'service_role');

-- ESCROW AUDIT LOG (immutable)
CREATE TABLE IF NOT EXISTS public.escrow_audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES public.escrow_transactions(id) ON DELETE SET NULL,
  hold_id        UUID REFERENCES public.escrow_holds(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  old_state      JSONB,
  new_state      JSONB,
  performed_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ip_address     INET,
  user_agent     TEXT,
  performed_at   TIMESTAMPTZ DEFAULT now()
);

-- Immutable rules
CREATE RULE escrow_audit_no_update AS ON UPDATE TO public.escrow_audit_log DO INSTEAD NOTHING;
CREATE RULE escrow_audit_no_delete AS ON DELETE TO public.escrow_audit_log DO INSTEAD NOTHING;

CREATE INDEX IF NOT EXISTS idx_escrow_audit_tx_id      ON public.escrow_audit_log (transaction_id);
CREATE INDEX IF NOT EXISTS idx_escrow_audit_hold_id    ON public.escrow_audit_log (hold_id);
CREATE INDEX IF NOT EXISTS idx_escrow_audit_performed  ON public.escrow_audit_log (performed_at DESC);

ALTER TABLE public.escrow_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on escrow_audit_log"
  ON public.escrow_audit_log FOR SELECT
  USING (is_admin());

CREATE POLICY "Service role full access on escrow_audit_log"
  ON public.escrow_audit_log FOR ALL
  USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Users see own escrow audit"
  ON public.escrow_audit_log FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM public.escrow_transactions
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- Helper funkcija za audit vnos
CREATE OR REPLACE FUNCTION public.log_escrow_action(
  p_transaction_id UUID,
  p_hold_id        UUID,
  p_action         TEXT,
  p_old_state      JSONB DEFAULT NULL,
  p_new_state      JSONB DEFAULT NULL,
  p_performed_by   UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.escrow_audit_log(
    transaction_id, hold_id, action, old_state, new_state, performed_by
  ) VALUES (
    p_transaction_id, p_hold_id, p_action, p_old_state, p_new_state,
    COALESCE(p_performed_by, auth.uid())
  );
END;
$$;
