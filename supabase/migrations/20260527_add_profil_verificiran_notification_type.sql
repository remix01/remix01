-- Extend notifications.type CHECK constraint to include profil_verificiran.
-- Uses DROP/ADD pattern consistent with other migrations in this repo.
-- Safe to run multiple times: DROP IF EXISTS prevents errors on re-run.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
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
    'profil_verificiran'
  ));
