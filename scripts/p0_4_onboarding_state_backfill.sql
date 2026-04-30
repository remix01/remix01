-- P0-4: onboarding_state backfill (SAFE / READ-ONLY PREVIEW + IDEMPOTENT UPSERT)
--
-- IMPORTANT:
-- - This script does NOT modify production tables other than onboarding_state.
-- - No DELETE/TRUNCATE/DROP statements.
-- - Run inside an explicit transaction and ROLLBACK first for verification.
--
-- Assumed onboarding_state shape (minimum required columns used below):
--   onboarding_state(user_id uuid primary key|unique, state text, blocked_reasons text[]|jsonb, created_at timestamptz, updated_at timestamptz)
--
-- If your blocked_reasons column is jsonb, replace text[] casts with to_jsonb(...).

BEGIN;

-- 1) Build deterministic derived state from existing user/profile data only.
WITH base AS (
  SELECT
    p.id AS user_id,
    p.role,
    p.created_at AS profile_created_at,
    p.email,
    p.full_name,
    p.phone,

    op.id AS obrtnik_profile_id,
    op.business_name,
    op.description,
    op.is_verified,
    op.verification_status,
    op.stripe_account_id,
    COALESCE(op.stripe_onboarded, false) AS stripe_onboarded
  FROM public.profiles p
  LEFT JOIN public.obrtnik_profiles op ON op.id = p.id
), derived AS (
  SELECT
    b.user_id,

    -- Deterministic onboarding state mapping
    CASE
      WHEN b.role IS NULL THEN 'blocked'
      WHEN b.role = 'narocnik' THEN 'completed'

      -- obrtnik without detail profile is incomplete
      WHEN b.role = 'obrtnik' AND b.obrtnik_profile_id IS NULL THEN 'profile_incomplete'

      -- explicit verification rejection is a hard block
      WHEN b.role = 'obrtnik' AND b.verification_status = 'rejected' THEN 'blocked'

      -- verified + stripe connected/onboarded => completed
      WHEN b.role = 'obrtnik'
           AND COALESCE(b.is_verified, false) = true
           AND b.stripe_account_id IS NOT NULL
           AND COALESCE(b.stripe_onboarded, false) = true THEN 'completed'

      -- verified but missing stripe setup => payout_pending
      WHEN b.role = 'obrtnik'
           AND COALESCE(b.is_verified, false) = true
           AND (b.stripe_account_id IS NULL OR COALESCE(b.stripe_onboarded, false) = false)
      THEN 'payout_setup_required'

      -- waiting on verification decision
      WHEN b.role = 'obrtnik'
           AND COALESCE(b.is_verified, false) = false
           AND COALESCE(b.verification_status, 'pending') = 'pending'
      THEN 'verification_pending'

      ELSE 'profile_incomplete'
    END AS derived_state,

    -- blocked_reasons are additive and deterministic
    array_remove(ARRAY[
      CASE WHEN b.role IS NULL THEN 'missing_role' END,
      CASE WHEN b.role = 'obrtnik' AND b.obrtnik_profile_id IS NULL THEN 'missing_obrtnik_profile' END,
      CASE WHEN b.role = 'obrtnik' AND COALESCE(NULLIF(trim(b.business_name), ''), '') = '' THEN 'missing_business_name' END,
      CASE WHEN b.role = 'obrtnik' AND COALESCE(NULLIF(trim(b.description), ''), '') = '' THEN 'missing_description' END,
      CASE WHEN b.role = 'obrtnik' AND b.verification_status = 'rejected' THEN 'verification_rejected' END,
      CASE WHEN b.role = 'obrtnik' AND COALESCE(b.is_verified, false) = false AND COALESCE(b.verification_status, 'pending') = 'pending' THEN 'verification_pending' END,
      CASE WHEN b.role = 'obrtnik' AND b.stripe_account_id IS NULL THEN 'missing_stripe_account' END,
      CASE WHEN b.role = 'obrtnik' AND b.stripe_account_id IS NOT NULL AND COALESCE(b.stripe_onboarded, false) = false THEN 'stripe_onboarding_incomplete' END
    ], NULL)::text[] AS blocked_reasons
  FROM base b
)

-- 2) DRY-RUN PREVIEW (READ-ONLY)
SELECT
  d.derived_state,
  COUNT(*) AS users,
  COUNT(*) FILTER (WHERE cardinality(d.blocked_reasons) > 0) AS with_blockers
FROM derived d
GROUP BY d.derived_state
ORDER BY users DESC;

-- Optional detailed preview (safe):
-- SELECT d.user_id, d.derived_state, d.blocked_reasons
-- FROM derived d
-- ORDER BY d.derived_state, d.user_id
-- LIMIT 200;

-- 3) IDEMPOTENT UPSERT BACKFILL
INSERT INTO public.onboarding_state (
  user_id,
  state,
  blocked_reasons,
  created_at,
  updated_at
)
SELECT
  d.user_id,
  d.derived_state,
  d.blocked_reasons,
  now(),
  now()
FROM derived d
ON CONFLICT (user_id)
DO UPDATE SET
  state = EXCLUDED.state,
  blocked_reasons = EXCLUDED.blocked_reasons,
  updated_at = now();

-- 4) Post-upsert verification
SELECT
  state,
  COUNT(*) AS rows
FROM public.onboarding_state
GROUP BY state
ORDER BY rows DESC;

-- Change to COMMIT only after preview and verification look correct.
ROLLBACK;
-- COMMIT;
