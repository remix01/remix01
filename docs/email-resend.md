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

## Rate limit pravila (email flowi)

`lib/email/security.ts` uvaja dodatni Upstash rate limit sloj po IP/email/user_id:

- `contact_inquiry`
  - **3 / 10 min po IP**
  - **2 / 10 min po email naslovu**
  - **3 / 10 min po user_id** (če je podan)
- `signup_welcome`
  - **5 / 10 min po IP**
  - **5 / 10 min po user_id** (če je podan)
- `admin_test`
  - **3 / 10 min po IP**
  - **3 / 10 min po user_id** (če je podan)

Password reset ostaja pod Supabase Auth rate limitingom.

## Spam zaščite

Za javne inquiry/contact flowe:
- Honeypot polji: `website` ali `company_url`
- Če je honeypot izpolnjen: endpoint vrne success, email pa se ne pošlje
- Disposable email blokada za domene:
  - `mailinator.com`
  - `10minutemail.com`
  - `temp-mail.org`
  - `guerrillamail.com`
  - `yopmail.com`

Osnovna validacija:
- Zod schema validacija request body
- Email format validation
- Max length limiti na stringe
- `trim()` normalizacija
- `escapeHtml()` za interpolacije v HTML template-ih

## Centralizacija

Resend client + sender standard sta centralizirana v `lib/resend.ts`:
- `getResendClient()`
- `getDefaultFrom(senderName?)`
- `resolveEmailRecipients(to)`

Dodatna anti-spam/abuse logika je v:
- `lib/email/security.ts`
- `lib/email/email-logs.ts`

Kompatibilnost endpointi za customer/narocnik flow:
- `POST /api/povprasevanje` (primarni)
- `POST /api/narocnik/povprasevanje` (alias)
- `POST /api/stranka/povprasevanje` (alias)

## Dev/staging recipient safety

Pravila v `resolveEmailRecipients`:
1. Produkcija: pošiljanje normalno.
2. Non-production + `EMAIL_ALLOWED_RECIPIENTS`: dovoljeni so samo prejemniki iz allowlist.
3. Non-production + `EMAIL_DEV_REDIRECT_TO`: vsi prejemniki se preusmerijo na ta naslov.
4. Original recipient se logira samo server-side (`console.warn`).

## Email event logging (`email_logs`)

Flowi zapisujejo statuse:
- `pending`
- `sent`
- `failed`
- `blocked`
- `rate_limited`
- `honeypot`

Webhook `POST /api/webhooks/resend` dodatno upserta delivery evente (`sent`, `delivered`, `bounced`, ...).

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

## Kako testirati

1. Nastavi env (`RESEND_API_KEY`, `EMAIL_FROM`, opcijsko `EMAIL_DEV_REDIRECT_TO`, `EMAIL_ALLOWED_RECIPIENTS`).
2. Testiraj `POST /api/povprasevanje/public` z valid payload.
3. Ponovi isti request večkrat in preveri `429` + `Retry-After`.
4. Testiraj honeypot (`website` ali `company_url`) in preveri success brez pošiljanja.
5. Testiraj disposable email (npr. `user@mailinator.com`) in preveri `400`.
6. Testiraj webhook iz Resend dashboarda.
7. Preveri zapise v `email_logs`.

## Kako debugirati `429`

- Preveri response:
  - `code = EMAIL_RATE_LIMITED`
  - `reason` (`ip`, `email`, `user_id`)
  - `retryAfter`
  - `Retry-After` header
- Preveri Upstash env:
  - `KV_REST_API_URL` / `KV_REST_API_TOKEN` ali
  - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- Če Redis ni dosegljiv, app preklopi na lokalni in-memory fallback (ni distribuiran).

## Kako preveriti spam/honeypot loge

SQL primer:

```sql
select created_at, email, type, status, error_message, metadata
from public.email_logs
where status in ('blocked', 'honeypot', 'rate_limited')
order by created_at desc
limit 200;
```

## Migration: email_logs

V projektu že obstaja migracija:
- `supabase/migrations/2026042501_create_email_logs.sql`

Če tabela ni aplicirana, zaženi migrations (Supabase CLI ali CI pipeline), sicer logging helper varno degradira (warning log + brez crasha).

## Produkcijski checklist

- [ ] `RESEND_API_KEY` nastavljen
- [ ] `EMAIL_FROM` uporablja verificirano domeno
- [ ] `RESEND_WEBHOOK_SECRET` nastavljen
- [ ] Webhook registriran na `/api/webhooks/resend`
- [ ] Vključeni eventi: sent/delivered/delayed/complained/bounced/opened/clicked
- [ ] `email_logs` migracija aplicirana
- [ ] SPF/DKIM/DMARC validni
- [ ] Dev redirect/allowlist preverjen za staging
