# Analiza ključnih področij (LiftGO)

Datum: 2026-04-17

> Posodobitev: dodana je tudi analiza **Opazovanja napak (Error Observability)** z uporabo **Sentry**.

## 1) API endpoint specifikacije

### Trenutno stanje
- API plast je obsežna (veliko `app/api/**/route.ts` endpointov), kar nakazuje dobro domensko pokritost, vendar brez centralne, strojno berljive specifikacije (OpenAPI/Swagger).
- Del endpointov uporablja shema-validacijo (`zod`) in dosledne helperje za odgovor (`apiSuccess`, `badRequest`, `internalError`), npr. registracija mojstra.
- Del endpointov vrača odgovore ad-hoc preko `NextResponse.json(...)` z različnimi formati (`{ error }`, `{ success, data }`, itd.), kar poveča odvisnost FE od posameznih implementacij.
- Prisoten je tudi “action router” vzorec v enem endpointu (`/api/tasks`), kjer en URL multiplexa več akcij (`create_task`, `accept_offer`, ...), pri čemer je večina akcij še `501 Not implemented`.

### Ocena
- **Močne strani:** hitro dodajanje novih endpointov, prisotna validacija za kritične tokove.
- **Tveganja:** nekonsistentni response contracti, slabša dokumentiranost za integracije in QA avtomatizacijo.

### Priporočila (prioriteta)
1. **P0:** Uvesti enoten API contract (OpenAPI 3.1) in response envelope (`success`, `data`, `error`, `traceId`).
2. **P0:** Standardizirati status kode in napake (npr. RFC7807 ali interna shema napak).
3. **P1:** Endpoint `/api/tasks` razbiti na bolj REST/granularne poti ali jasno formalizirati RPC contract + versioning.
4. **P1:** Dodati contract teste za najpomembnejše endpointe (auth, payments, disputes, reviews).

---

## 2) Database schema design

### Trenutno stanje
- Shema je bogata in vključuje ključne poslovne entitete (uporabniki, profili obrtnikov, job/payment/conversation/message, escrow in audit).
- Indeksi so prisotni za ključne lookup poti (status, FK, časovni stolpci).
- RLS je vklopljen na številnih tabelah.
- Vidna je **evolucija modela** in delna podvojenost poimenovanj/tabel med starimi in novejšimi deli (npr. `user`, `profiles`, `obrtniki`, `partners`, `job/tasks`), kar otežuje dolgoročno konsistenco.

### Ocena
- **Močne strani:** dobra pokritost poslovnih procesov, auditabilnost (escrow audit), osnovna performančna skrb (indeksi).
- **Tveganja:** semantična razdrobljenost modela, možna nekonsistentnost “source-of-truth” med tabelami.

### Priporočila (prioriteta)
1. **P0:** Definirati uradni canonical model (ERD + ownership tabel + mapping legacy↔new).
2. **P0:** Zakleniti naming konvencije (snake_case, singular/plural pravilo) in jih uveljaviti v migracijah.
3. **P1:** Dodati migracijske “guard” teste za referenčno integriteto in RLS politiko po domenah.
4. **P1:** Konsolidirati podvojene entitete prek view-jev ali migracijskega plana (deprecation schedule).

---

## 3) Frontend component architecture

### Trenutno stanje
- App Router postavitev je moderna: root layout vključuje observability/providere, PWA elemente in SEO metadata.
- Komponente so domenično razdeljene (npr. `components/home/*`, `components/dashboard/*`) in tipizirane (`types.ts`), kar pomaga pri maintainability.
- Prisotna je mešanica “client-heavy” in server komponent; za ključne vsebine se uporablja strežniški fetch (`app/page.tsx`).

### Ocena
- **Močne strani:** modularnost, dobra osnova za SEO/PWA, jasna separacija “home” in “dashboard” UI.
- **Tveganja:** pri večanju kodebase lahko pride do podvajanja UI vzorcev in neenotnih design decisionov, če ni centralne FE arhitekture/konvencij.

### Priporočila (prioriteta)
1. **P0:** Uvesti FE arhitekturni guideline (container/presentational, data-fetching boundaries, naming).
2. **P1:** Standardizirati design tokens in ponavljajoče UI pattern-e v shared layer.
3. **P1:** Dodati storybook ali ekvivalent za ključne reusable komponente.
4. **P2:** Definirati pravila za `use client` (minimalen client bundle).

---

## 4) Security audit

### Trenutno stanje
- Obstajajo namenski security testi (SQL/prompt injection, role escalation, unauthorized access) in preverjajo “fail-safe” vedenje (400/401/403, ne 500).
- Stripe webhook preverja podpis (`stripe-signature`) in uporablja idempotency preverjanje (`isStripeEventProcessed`).
- V shemi obstajajo RLS politike, vendar so ponekod permissive (`USING (true)`), kar zahteva strogo aplikacijsko discipliniranost.

### Ocena
- **Močne strani:** dobra testna kultura za varnostne scenarije, ključne kontrole na plačilnih webhookih.
- **Tveganja:** del varnosti je preveč odvisen od app-layer pravil namesto strožjih DB politik.

### Priporočila (prioriteta)
1. **P0:** Pregled in zaostritev vseh `USING (true)`/service-role-only poti; minimizacija blast radius-a.
2. **P0:** Dodati centralni authz middleware/util za API skupine (admin/partner/customer).
3. **P1:** Uvesti security regression matriko v CI (kritični endpointi + RLS policy assertions).
4. **P1:** Dodati threat model dokument (assets, trust boundaries, attack paths, mitigations).

---

## 5) Performance profiling

### Trenutno stanje
- Obstajajo performance testi, vendar večinoma z mocki in sintetičnimi časovnimi mejami.
- V migracijah so vključeni indeksi za ključne poizvedbe; performance testi omenjajo preverjanje “Index Scan” namesto “Seq Scan”.
- Aplikacija uporablja inkrementalno osveževanje na home strani (`revalidate = 180`), kar pomaga za read-heavy vsebine.

### Ocena
- **Močne strani:** awareness o latencah in throughputu je prisoten.
- **Tveganja:** brez realnih benchmarkov na produkciji podobni infrastrukturi je težko napovedati bottlenecke.

### Priporočila (prioriteta)
1. **P0:** Uvesti realne load teste za top 10 endpointov (k6/Locust) z representative data volume.
2. **P1:** Dodati dashboard za p95/p99 (API, DB query, queue processing, webhook handling).
3. **P1:** Redno preverjanje EXPLAIN ANALYZE za najdražje query-je in drift indeksov.
4. **P2:** Performance budgeti v CI za kritične poti (npr. homepage SSR, create inquiry, payment webhook).

---

## 6) CI/CD pipeline setup

### Trenutno stanje
- V repo sta workflow datoteki za SLSA provenance in Vercel status notification.
- Ne vidi se standardne CI verige za `install -> lint/typecheck -> test -> build -> deploy` kot obvezen gate na PR.
- Deployment checklist in operativna navodila obstajajo, a delujejo bolj kot manual runbook.

### Ocena
- **Močne strani:** začetek supply-chain hardening (SLSA), osnovna povezava z Vercel.
- **Tveganja:** brez obveznih PR gate-ov lahko regressions zdrsnejo v main/release.

### Priporočila (prioriteta)
1. **P0:** Dodati obvezni CI workflow za PR-je (pnpm install, tsc/lint, unit/integration, build).
2. **P0:** Uvesti branch protection + required checks.
3. **P1:** Dodati preview deployment + smoke test (health, auth, ključni API).
4. **P1:** Dodati migration safety step (dry-run, backward-compat checks).

---

## 7) Opazovanje napak (Error Observability) — Sentry

### Trenutno stanje
- Sentry je inicializiran za **server**, **edge** in **client** runtime, kar je dobra osnova za celovit signal napak.
- Vključeni so tracing, log capture in session replay (client), ter hook za zajem request-level napak (`onRequestError`).
- Global error page (`app/global-error.tsx`) pravilno poroča exceptione v Sentry.
- Vzporedno obstaja še prilagojen `GlobalErrorHandler`, ki prestreza globalne browser napake in `console.error`, vendar trenutno bolj cilja na lokalni UI prikaz kot na strukturirano observability korelacijo.

### Ocena
- **Močne strani:** dobra pokritost runtime okolij (browser/server/edge), prisoten replay in centralni exception capture.
- **Tveganja:** previsok sampling (`tracesSampleRate: 1` povsod), hardkodiran DSN v kodi, potencialno preveč PII (`sendDefaultPii: true`) brez jasne politike redakcije.

### Priporočila (prioriteta)
1. **P0:** Premakniti Sentry DSN in sampling v env konfiguracijo po okoljih (dev/staging/prod), brez hardkodiranih vrednosti.
2. **P0:** Uvesti event sanitization (`beforeSend`, `beforeBreadcrumb`) za odstranjevanje občutljivih podatkov (email, telefon, tokeni, payment metadata).
3. **P1:** Uvesti enoten error taxonomy (`error_code`, `domain`, `severity`, `user_role`, `request_id`) za hitrejšo trižo in dashboarde.
4. **P1:** Povezati Sentry issue alerting z operativnim kanalom (Slack/PagerDuty) + definirati SLO (npr. crash-free sessions, p95 error response rate).

---

## Predlagan 30-dnevni plan

### Teden 1
- API contract standard in error model.
- CI baseline (typecheck, test, build) kot required status check.

### Teden 2
- DB canonical model (ERD, ownership, deprecation map).
- Security policy review (`USING true` audit + prioritizacija).
- Sentry hardening (env konfiguracija, sampling strategija, PII redaction policy).

### Teden 3
- Load test baseline (p95/p99) za top kritične poti.
- FE arhitekturni guideline + shared component policy.

### Teden 4
- Zaprtje high-risk točk iz security/performance reporta.
- Uvedba tedenskega architecture review rituala (API, DB, CI health).
- Uvedba error observability review rituala (top Sentry issue-i, MTTR, regressions).

---

## Zaključek
Projekt ima močno funkcionalno osnovo in dober napredek na področjih security/performance awareness, vendar potrebuje standardizacijo API contractov, konsolidacijo podatkovnega modela, zanesljive CI gate-e ter strožje voden Error Observability (Sentry governance), da bo rast ekipe in kodebase stabilna in varna.
