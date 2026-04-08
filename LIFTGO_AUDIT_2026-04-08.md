# LiftGO tehnična revizija (2026-04-08)

## Obseg
- Build/test diagnostika (Next.js build + lokalni runtime smoke test).
- Preverjanje strani/podstrani in internih povezav (404/500).
- Pregled TODO/FIXME/BUG markerjev v `app/`, `components/`, `lib/`.
- Pregled Sentry integracije.
- Pregled MCP virov v trenutnem okolju.

## MCP status
- `list_mcp_resources` vrne prazen seznam (`[]`).
- `list_mcp_resource_templates` vrne prazen seznam (`[]`).
- Posledično ni bilo mogoče uporabiti dodatnih MCP konektorjev (npr. Sentry API, task tracker) in je analiza izvedena lokalno nad repo + runtime smoke testi.

## Ključne ugotovitve

### 1) Pokvarjeni gumbi/povezave (odpravljeno v tem popravku)
Najdeni sta bili 2 povezavi, ki sta vračali 500 ob crawler smoke testu:
- `/narocnik/novo-povprasevanje` (stara/neenotna pot)
- `/narocnanja` (tipkarska napaka v poti)

Popravljeno:
- vse povezave na `/narocnik/novo-povprasevanje` -> `/novo-povprasevanje`.
- povezava `/narocnanja` -> `/povprasevanja`.

Po popravku lokalni crawl vrne `BAD []` (brez 404/500 za obiskane interne poti).

### 1.1) Vercel runtime logi (2026-04-08 09:46–10:16 UTC)
- Ključna produkcijska napaka:
  - `POST /api/povprasevanje` -> **500** z `PGRST204`: manjka kolona `attachment_urls` v `povprasevanja` schema cache.
- Uveden je bil fallback v API:
  - ob `PGRST204` za `attachment_urls` endpoint ponovno poskusi insert brez tega polja (backward compatibility za okolja brez migracije).
- Dodana je tudi DB migracija:
  - `ALTER TABLE public.povprasevanja ADD COLUMN IF NOT EXISTS attachment_urls text[]`,
  - da se produkcijski 500 odpravi tudi na nivoju sheme (ne le z runtime fallbackom).
- Dodatno opažanje:
  - več `POST /api/agent/work_description` -> **429** (rate limiting), kar je pričakovano varovalo, ne nujno bug.

### 2) Build in runtime zdravje
- `pnpm build` uspešno zaključi (kompilacija + generiranje strani).
- Med build/start se pojavljajo opozorila o manjkajoči Upstash Redis konfiguraciji (`url`/`token`), kar lahko vpliva na funkcionalnosti, ki uporabljajo Redis.
- Med prejšnjim runtime testiranjem so se v logih pojavili `DYNAMIC_SERVER_USAGE` errorji ob zahtevkih na problematične poti (pred popravkom linkov).

### 3) TODO/BUG tehnični dolg
V kodi je 50 markerjev (`TODO|FIXME|BUG|HACK|XXX`). Največ koncentracije:
- `lib/events/sagas/paymentSaga.ts` (7)
- `lib/events/subscribers/aiInsightSubscriber.ts` (5)
- `app/api/tasks/route.ts` (5)
- `lib/events/sagas/orderFulfillmentSaga.ts` (4)
- `lib/email.ts` (4)

To so najbolj kritične točke za backlog (plačilni in task orchestrator tokovi).

### 4) Sentry pregled
Opazna sta dva vzporedna vzorca konfiguracije:
- Hardcoded DSN v `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`.
- Env-driven DSN v `lib/sentry/init.ts` (`NEXT_PUBLIC_SENTRY_DSN`) z varnim `enabled` guardom.

Priporočilo: poenotiti na env-driven pristop in odstraniti hardcoded DSN iz repozitorija.

### 5) Cenik/Stripe poti (dodatni pregled)
- Preverjeno, da vsi glavni CTA na ceniku uporabljajo `POST /api/stripe/create-checkout`.
- Dodana podpora za varne, kontekstne povratne poti (`successPath`, `cancelPath`) v checkout API:
  - registracija lahko ostane na privzeti poti,
  - dashboard/naročnina strani pa se po plačilu vrnejo na svoje naravne URL-je.
- Dodan manjkajoči endpoint `POST /api/stripe/portal` za upravljanje obstoječih naročnin (Stripe Billing Portal), ki je bil prej v UI klican, a ni obstajal.
- Posodobljeni so bili gumbi na naročnina/cenik straneh, da uporabljajo pravilne Stripe poti in return URL-je.
- Dodane so legacy redirect poti v `next.config.ts` za stare URL-je (npr. `/narocnik/*`, `/narocnanja`) na pravilne nove poti.

## Priporočen prioritetni TODO plan
1. **P0:** Enotna Sentry konfiguracija prek env + odstranitev hardcoded DSN.
2. **P0:** Nastaviti Redis env (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) za stabilen runtime.
3. **P1:** Zaključiti `app/api/tasks/route.ts` TODO tokove (`accept/start/complete/get/list task`).
4. **P1:** Zaključiti `paymentSaga` / `orderFulfillmentSaga` integracije s `paymentService`.
5. **P2:** Zaključiti placeholder implementacije za `lib/email.ts` in worker email webhook varnost (HMAC).

## Datoteke spremenjene v tem patchu
- `components/pricing-comparison.tsx`
- `app/(public)/blog/page.tsx`
- `app/(public)/blog/[slug]/page.tsx`
- `app/(public)/[category]/page.tsx`
- `app/(public)/[category]/[city]/page.tsx`
- `app/(narocnik)/povprasevanja/page.tsx`
- `app/(narocnik)/dashboard/page.tsx`
- `app/api/povprasevanje/route.ts`
- `app/api/stripe/create-checkout/route.ts`
- `app/api/stripe/portal/route.ts`
- `next.config.ts`
- `supabase/migrations/20260408113000_add_attachment_urls_to_povprasevanja.sql`
- `LIFTGO_AUDIT_2026-04-08.md`
