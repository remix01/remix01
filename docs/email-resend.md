# Resend Email Integracija – produkcijski setup

Posodobljeno: 2026-04-25

## Required ENV variables

Obvezno:
- `RESEND_API_KEY`
- `EMAIL_FROM` (npr. `noreply@mojadomena.com`)

Webhook:
- `RESEND_WEBHOOK_SECRET` (iz Resend webhook nastavitev)

Dev/staging zaščita:
- `EMAIL_DEV_REDIRECT_TO` (opcijsko; preusmeri vsa sporočila v non-production)
- `EMAIL_ALLOWED_RECIPIENTS` (opcijsko; CSV allowlist, npr. `dev1@x.com,dev2@y.com`)

Legacy fallbacki (kompatibilnost):
- `DEFAULT_FROM_EMAIL`
- `RESEND_FROM`
- `NEXT_PUBLIC_FROM_EMAIL` (legacy fallback; ni priporočeno kot primarni vir)

## Centralizacija

Resend client + sender standard sta centralizirana v `lib/resend.ts`:
- `getResendClient()`
- `getDefaultFrom(senderName?)`
- `resolveEmailRecipients(to)`

## Dev/staging recipient safety

Pravila v `resolveEmailRecipients`:
1. Produkcija: pošiljanje normalno.
2. Non-production + `EMAIL_ALLOWED_RECIPIENTS`: dovoljeni so samo prejemniki iz allowlist.
3. Non-production + `EMAIL_DEV_REDIRECT_TO`: vsi prejemniki se preusmerijo na ta naslov.
4. Original recipient se zabeleži v warning log (ne v subjectu produkcijskih emailov).

## Webhook endpoint

Endpoint:
- `POST /api/webhooks/resend`

URL za Resend dashboard:
- `https://YOUR_DOMAIN.com/api/webhooks/resend`

### Kateri eventi morajo biti vključeni
- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.complained`
- `email.bounced`
- `email.opened`
- `email.clicked`

### Kaj endpoint dela
- prebere raw body (`request.text()`)
- preveri podpis, če je `RESEND_WEBHOOK_SECRET` nastavljen
- ob napačnem podpisu vrne `401`
- ob veljavnem eventu vrne `200`
- neznane evente varno ignorira (`200`, `ignored: true`)
- logira `eventType` in `resendEmailId`
- upserta `email_logs` po `resend_email_id`

## Kako ustvariti webhook v Resend dashboardu

1. Resend Dashboard → **Webhooks** → **Create Webhook**.
2. Endpoint URL: `https://YOUR_DOMAIN.com/api/webhooks/resend`.
3. Označi evente iz seznama zgoraj.
4. Shrani `signing secret` v `RESEND_WEBHOOK_SECRET`.
5. Deploy in pošlji testni webhook iz dashboarda.

## Kako testirati webhook

1. Lokalno/deploy nastavi `RESEND_WEBHOOK_SECRET`.
2. Iz dashboarda pošlji test event (npr. `email.sent`).
3. Preveri response `200`.
4. Preveri loge aplikacije (`eventType`, `resendEmailId`).
5. Preveri `email_logs` zapis (status + metadata).
6. Pošlji request z napačnim podpisom in preveri `401`.

## Kako debugirati bounce/complaint

1. Preveri webhook event (`email.bounced` ali `email.complained`) v logih.
2. V `email_logs` preveri `status`, `error_message`, `metadata`.
3. Odstrani/blacklistaj problematične prejemnike iz kampanj/flowov.
4. Preveri SPF/DKIM/DMARC in domain reputation.

## Dodajanje novega email template-a

1. Dodaj template v obstoječe `lib/email/*templates.ts`.
2. Uporabi centralni sender (`getDefaultFrom`) in client (`getResendClient`).
3. Dinamične HTML vrednosti escapaj.
4. Vključi `eventType` pri pošiljanju zaradi lažjega sledenja.

## Migration: email_logs

Projekt uporablja `supabase/migrations`, zato je dodana migracija:
- `supabase/migrations/2026042501_create_email_logs.sql`

Tabela `email_logs` vsebuje:
- `id` uuid pk
- `user_id` uuid null
- `email` text not null
- `type` text not null
- `status` text not null
- `resend_email_id` text unique null
- `error_message` text null
- `metadata` jsonb null
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

## Produkcijski checklist

- [ ] `RESEND_API_KEY` nastavljen
- [ ] `EMAIL_FROM` uporablja verificirano domeno
- [ ] `RESEND_WEBHOOK_SECRET` nastavljen
- [ ] Webhook registriran na `/api/webhooks/resend`
- [ ] Vključeni eventi: sent/delivered/delayed/complained/bounced/opened/clicked
- [ ] `email_logs` migracija aplicirana
- [ ] SPF/DKIM/DMARC validni
- [ ] Dev redirect/allowlist preverjen za staging
