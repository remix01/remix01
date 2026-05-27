-- Extend notifications.type CHECK constraint to include profil_verificiran.
-- Uses DROP/ADD pattern consistent with other migrations in this repo.
-- Safe to run multiple times: DROP IF EXISTS prevents errors on re-run.
--
-- Preserves every value ever allowed by prior migrations:
--   add_notifications_table.sql  — NEW_INQUIRY, OFFER_RECEIVED, OFFER_ACCEPTED,
--                                   STATUS_CHANGED, PAYMENT_RECEIVED, NEW_MESSAGE,
--                                   REVIEW_RECEIVED, SYSTEM, offer_received,
--                                   escrow_captured, escrow_released,
--                                   dispute_opened, message_received
--   2025022202_notifications.sql — Slovenian operational types

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    -- Slovenian operational types (2025022202_notifications.sql)
    'nova_ponudba',
    'ponudba_sprejeta',
    'ponudba_zavrnjena',
    'nova_ocena',
    'termin_potrjen',
    'termin_opomnik',
    'placilo_prejeto',
    'placilo_zahtevano',
    'povprasevanje_oddano',
    'ponudba_umaknjena',
    'izbira_ponudbe_reminder',
    'novo_sporocilo',
    'novo_povprasevanje',
    'rok_izteka',
    'lead_escalation',
    'lead_no_match',
    'lead_unassigned',
    'NEW_REQUEST_MATCHED',
    'RESPONSE_DEADLINE_90MIN',
    'RESPONSE_DEADLINE_BREACH',
    'OFFER_ACCEPTED',
    'NEW_REVIEW_RECEIVED',
    'SUBSCRIPTION_EXPIRING_7D',
    -- Legacy English types (add_notifications_table.sql) preserved for existing rows
    'NEW_INQUIRY',
    'OFFER_RECEIVED',
    'STATUS_CHANGED',
    'PAYMENT_RECEIVED',
    'NEW_MESSAGE',
    'REVIEW_RECEIVED',
    'SYSTEM',
    'offer_received',
    'escrow_captured',
    'escrow_released',
    'dispute_opened',
    'message_received',
    -- New type added by this migration
    'profil_verificiran'
  ));
