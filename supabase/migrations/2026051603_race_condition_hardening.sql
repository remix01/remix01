-- Race-condition hardening for LiftGO
-- IMPORTANT: This migration is defensive and avoids immediate failures on dirty data.

-- 1) DIAGNOSTIC QUERIES (run manually before enforcing stricter constraints in prod)
-- Duplicate event processing claims
-- SELECT idempotency_key, consumer, COUNT(*) FROM public.event_processing_log GROUP BY 1,2 HAVING COUNT(*) > 1;

-- Duplicate event source IDs (only if columns exist)
-- SELECT source, source_event_id, COUNT(*) FROM public.event_log GROUP BY 1,2 HAVING COUNT(*) > 1;

-- Duplicate active offers per (povprasevanje_id, obrtnik_id)
-- SELECT povprasevanje_id, obrtnik_id, COUNT(*)
-- FROM public.ponudbe
-- WHERE status IN ('draft','poslana','sprejeta')
-- GROUP BY 1,2 HAVING COUNT(*) > 1;

-- Duplicate task dedupe keys on active jobs
-- SELECT dedupe_key, COUNT(*) FROM public.task_queue_jobs
-- WHERE status IN ('pending','queued','processing','retry')
--   AND dedupe_key IS NOT NULL
-- GROUP BY 1 HAVING COUNT(*) > 1;

-- Duplicate conversation thread keys
-- SELECT obrtnik_id, narocnik_id, povprasevanje_id, COUNT(*)
-- FROM public.conversations
-- GROUP BY 1,2,3 HAVING COUNT(*) > 1;

-- 2) UNIQUE CONSTRAINTS / INDEXES (only when safe)
DO $$
BEGIN
  IF to_regclass('public.event_processing_log') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'event_processing_log_event_id_consumer_key'
    ) THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='event_processing_log' AND column_name='event_id'
      ) THEN
        ALTER TABLE public.event_processing_log
          ADD CONSTRAINT event_processing_log_event_id_consumer_key UNIQUE (event_id, consumer);
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='event_processing_log' AND column_name='idempotency_key'
      ) THEN
        ALTER TABLE public.event_processing_log
          ADD CONSTRAINT event_processing_log_idempotency_consumer_key UNIQUE (idempotency_key, consumer);
      END IF;
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.event_log') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='event_log' AND column_name='source')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='event_log' AND column_name='source_event_id')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'event_log_source_source_event_id_key')
  THEN
    ALTER TABLE public.event_log
      ADD CONSTRAINT event_log_source_source_event_id_key UNIQUE (source, source_event_id);
  END IF;
END $$;

-- one active offer per craftsman per inquiry
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ponudbe_active_per_obrtnik
ON public.ponudbe (povprasevanje_id, obrtnik_id)
WHERE status IN ('draft','poslana','sprejeta');

-- one active queued job per dedupe_key
CREATE UNIQUE INDEX IF NOT EXISTS uniq_task_queue_jobs_active_dedupe
ON public.task_queue_jobs (dedupe_key)
WHERE dedupe_key IS NOT NULL AND status IN ('pending','queued','processing','retry');

-- canonical messaging key uniqueness (legacy conversations table)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_conversations_thread
ON public.conversations (obrtnik_id, narocnik_id, COALESCE(povprasevanje_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 3) OPTIMISTIC LOCK COLUMNS
ALTER TABLE public.povprasevanja
  ADD COLUMN IF NOT EXISTS lock_version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.ponudbe
  ADD COLUMN IF NOT EXISTS lock_version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.escrow_transactions
  ADD COLUMN IF NOT EXISTS lock_version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.service_requests
  ADD COLUMN IF NOT EXISTS lock_version BIGINT NOT NULL DEFAULT 0;

-- REMEDIATION TEMPLATE (run manually, never auto-delete in migration)
-- Example: keep newest active offer and archive others
-- WITH d AS (
--   SELECT id, ROW_NUMBER() OVER (PARTITION BY povprasevanje_id, obrtnik_id ORDER BY created_at DESC) rn
--   FROM public.ponudbe
--   WHERE status IN ('draft','poslana','sprejeta')
-- )
-- UPDATE public.ponudbe p
-- SET status = 'preklicana'
-- FROM d
-- WHERE p.id = d.id AND d.rn > 1;
