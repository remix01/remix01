-- Core platform tables that were previously managed by Prisma.
-- Creates all tables with snake_case column names as used in the application code.

-- ============================================================================
-- USER TABLE
-- Public profile linked to auth.users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  phone               TEXT,
  role                TEXT NOT NULL DEFAULT 'CUSTOMER'
                        CHECK (role IN ('CUSTOMER', 'CRAFTWORKER', 'ADMIN')),
  stripe_customer_id  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_email ON public.user(email);
CREATE INDEX IF NOT EXISTS idx_user_role  ON public.user(role);

ALTER TABLE public.user ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_or_admin" ON public.user FOR SELECT
  USING (auth.uid() = id OR (SELECT role FROM public.user WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "user_update_own" ON public.user FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "user_insert_service" ON public.user FOR INSERT
  WITH CHECK (true); -- controlled by service role only

-- ============================================================================
-- CRAFTWORKER_PROFILE TABLE
-- Extended profile for users with role = 'CRAFTWORKER'
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.craftworker_profile (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL UNIQUE REFERENCES public.user(id) ON DELETE CASCADE,
  package_type                TEXT NOT NULL DEFAULT 'START'
                                CHECK (package_type IN ('START', 'PRO')),
  commission_rate             NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  commission_override         NUMERIC(5,2),          -- admin-set override, NULL = use calculated rate
  stripe_account_id           TEXT,
  stripe_onboarding_complete  BOOLEAN NOT NULL DEFAULT false,
  total_jobs_completed        INTEGER NOT NULL DEFAULT 0,
  avg_rating                  NUMERIC(3,2) NOT NULL DEFAULT 0,
  is_verified                 BOOLEAN NOT NULL DEFAULT false,
  verified_at                 TIMESTAMPTZ,
  loyalty_points              INTEGER NOT NULL DEFAULT 0,
  bypass_warnings             INTEGER NOT NULL DEFAULT 0,
  is_suspended                BOOLEAN NOT NULL DEFAULT false,
  suspended_at                TIMESTAMPTZ,
  suspended_reason            TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_craftworker_profile_user_id     ON public.craftworker_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_craftworker_profile_suspended   ON public.craftworker_profile(is_suspended);
CREATE INDEX IF NOT EXISTS idx_craftworker_profile_verified    ON public.craftworker_profile(is_verified);

ALTER TABLE public.craftworker_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "craftworker_profile_select" ON public.craftworker_profile FOR SELECT
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.user WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE POLICY "craftworker_profile_update_own" ON public.craftworker_profile FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (SELECT role FROM public.user WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE POLICY "craftworker_profile_insert_admin" ON public.craftworker_profile FOR INSERT
  WITH CHECK ((SELECT role FROM public.user WHERE id = auth.uid()) = 'ADMIN');

-- ============================================================================
-- PAYMENT TABLE
-- Created before job because job holds payment_id FK
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.payment (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount                    NUMERIC(10,2) NOT NULL,
  platform_fee              NUMERIC(10,2) NOT NULL,
  craftworker_payout        NUMERIC(10,2) NOT NULL,
  status                    TEXT NOT NULL DEFAULT 'UNPAID'
                              CHECK (status IN ('UNPAID','HELD','RELEASED','REFUNDED','DISPUTED')),
  stripe_payment_intent_id  TEXT UNIQUE,
  stripe_transfer_id        TEXT,
  held_at                   TIMESTAMPTZ,
  released_at               TIMESTAMPTZ,
  refunded_at               TIMESTAMPTZ,
  dispute_reason            TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_status                   ON public.payment(status);
CREATE INDEX IF NOT EXISTS idx_payment_stripe_payment_intent    ON public.payment(stripe_payment_intent_id);

ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_select_admin" ON public.payment FOR SELECT
  USING ((SELECT role FROM public.user WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "payment_insert_service" ON public.payment FOR INSERT
  WITH CHECK (true);

CREATE POLICY "payment_update_service" ON public.payment FOR UPDATE
  USING (true);

-- ============================================================================
-- CONVERSATION TABLE
-- Twilio conversation proxy record
-- Created before job because job holds conversation_id FK
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversation (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twilio_conversation_sid      TEXT NOT NULL UNIQUE,
  status                       TEXT NOT NULL DEFAULT 'ACTIVE'
                                 CHECK (status IN ('ACTIVE','CLOSED','SUSPENDED')),
  participant_customer_sid     TEXT,
  participant_craftworker_sid  TEXT,
  contact_revealed_at          TIMESTAMPTZ,
  last_message_at              TIMESTAMPTZ,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at                    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_conversation_twilio_sid  ON public.conversation(twilio_conversation_sid);
CREATE INDEX IF NOT EXISTS idx_conversation_status      ON public.conversation(status);

ALTER TABLE public.conversation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversation_select_involved_or_admin" ON public.conversation FOR SELECT
  USING (true); -- row-level checked via job relationship in application code

CREATE POLICY "conversation_insert_service" ON public.conversation FOR INSERT
  WITH CHECK (true);

CREATE POLICY "conversation_update_service" ON public.conversation FOR UPDATE
  USING (true);

-- ============================================================================
-- JOB TABLE
-- Core marketplace entity
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   TEXT NOT NULL,
  description             TEXT NOT NULL,
  category                TEXT NOT NULL,
  city                    TEXT NOT NULL,
  estimated_value         NUMERIC(10,2),
  status                  TEXT NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN (
                              'PENDING','MATCHED','IN_PROGRESS',
                              'AWAITING_CONFIRMATION','COMPLETED','DISPUTED','CANCELLED'
                            )),
  customer_id             UUID NOT NULL REFERENCES public.user(id) ON DELETE RESTRICT,
  craftworker_id          UUID REFERENCES public.user(id) ON DELETE SET NULL,
  payment_id              UUID REFERENCES public.payment(id) ON DELETE SET NULL,
  conversation_id         UUID REFERENCES public.conversation(id) ON DELETE SET NULL,
  twilio_conversation_sid TEXT,
  risk_score              NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_job_customer_id    ON public.job(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_craftworker_id ON public.job(craftworker_id);
CREATE INDEX IF NOT EXISTS idx_job_status         ON public.job(status);
CREATE INDEX IF NOT EXISTS idx_job_created_at     ON public.job(created_at DESC);

ALTER TABLE public.job ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_select_involved_or_admin" ON public.job FOR SELECT
  USING (
    customer_id = auth.uid()
    OR craftworker_id = auth.uid()
    OR (SELECT role FROM public.user WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE POLICY "job_insert_customer" ON public.job FOR INSERT
  WITH CHECK (
    customer_id = auth.uid()
    OR (SELECT role FROM public.user WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE POLICY "job_update_involved_or_admin" ON public.job FOR UPDATE
  USING (
    customer_id = auth.uid()
    OR craftworker_id = auth.uid()
    OR (SELECT role FROM public.user WHERE id = auth.uid()) = 'ADMIN'
  );

-- ============================================================================
-- MESSAGE TABLE
-- Messages within a conversation
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.message (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES public.conversation(id) ON DELETE CASCADE,
  sender_user_id      UUID NOT NULL REFERENCES public.user(id) ON DELETE RESTRICT,
  body                TEXT NOT NULL,
  is_blocked          BOOLEAN NOT NULL DEFAULT false,
  blocked_reason      TEXT,
  twilio_message_sid  TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_conversation_id  ON public.message(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_sender_user_id   ON public.message(sender_user_id);
CREATE INDEX IF NOT EXISTS idx_message_created_at       ON public.message(created_at);

ALTER TABLE public.message ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_select_service" ON public.message FOR SELECT USING (true);
CREATE POLICY "message_insert_service" ON public.message FOR INSERT WITH CHECK (true);

-- ============================================================================
-- VIOLATION TABLE
-- Anti-bypass contact detection log
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.violation (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id            UUID REFERENCES public.job(id) ON DELETE SET NULL,
  user_id           UUID NOT NULL REFERENCES public.user(id) ON DELETE RESTRICT,
  type              TEXT NOT NULL
                      CHECK (type IN (
                        'PHONE_DETECTED','EMAIL_DETECTED',
                        'BYPASS_ATTEMPT','SUSPICIOUS_PATTERN'
                      )),
  severity          TEXT NOT NULL
                      CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  detected_content  TEXT NOT NULL,
  message_id        UUID REFERENCES public.message(id) ON DELETE SET NULL,
  is_reviewed       BOOLEAN NOT NULL DEFAULT false,
  reviewed_by       TEXT,
  reviewed_at       TIMESTAMPTZ,
  action_taken      TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_violation_job_id     ON public.violation(job_id);
CREATE INDEX IF NOT EXISTS idx_violation_user_id    ON public.violation(user_id);
CREATE INDEX IF NOT EXISTS idx_violation_severity   ON public.violation(severity);
CREATE INDEX IF NOT EXISTS idx_violation_created_at ON public.violation(created_at DESC);

ALTER TABLE public.violation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "violation_select_admin" ON public.violation FOR SELECT
  USING ((SELECT role FROM public.user WHERE id = auth.uid()) = 'ADMIN');

CREATE POLICY "violation_insert_service" ON public.violation FOR INSERT WITH CHECK (true);

-- ============================================================================
-- UPDATED_AT triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['user','craftworker_profile','payment','job']
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I;
       CREATE TRIGGER trg_%s_updated_at
         BEFORE UPDATE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t, t, t
    );
  END LOOP;
END $$;
