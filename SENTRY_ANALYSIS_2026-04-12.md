# Sentry analiza (2026-04-12)

## Povzetek
Ta analiza združuje:
1. **poskus live pregleda Sentry tenant podatkov** prek API,
2. **statični pregled implementacije v repozitoriju**,
3. **prioritiziran plan popravkov**.

## 1) Live Sentry API pregled (z danim tokenom)

### Uporabljeni ukazi
- `curl -sS -H "Authorization: Bearer <TOKEN>" https://sentry.io/api/0/organizations/`
- `curl -I -sS -H "Authorization: Bearer <TOKEN>" https://sentry.io/api/0/`
- `curl -I -sS -H "Authorization: Bearer <TOKEN>" https://us.sentry.io/api/0/`
- `curl -I -sS -H "Authorization: Bearer <TOKEN>" https://de.sentry.io/api/0/`

### Rezultat
- Vsi requesti so padli še pred auth validacijo z napako:
  - `curl: (56) CONNECT tunnel failed, response 403`
- To pomeni, da je v trenutnem okolju blokiran izhod na Sentry (proxy/network policy), zato **ni bilo možno** pridobiti realnih podatkov o issue-jih, eventih, release health ali alertih.

## 2) Statična analiza kode (repo)

### Kritične ugotovitve (P0/P1)

| Prioriteta | Ugotovitev | Vpliv |
|---|---|---|
| P0 | Hardcoded DSN v več runtime datotekah | Secret leakage / težje upravljanje med okolji |
| P0 | Dvojna strategija inicializacije (hardcoded + env-driven) | Nekonsistentno obnašanje telemetrije |
| P1 | `tracesSampleRate: 1` v hardcoded poti | Prevelik volumen/cena v produkciji |
| P1 | `sendDefaultPii: true` brez jasnega env-gatinga | Privacy/compliance tveganje |

### Dokazi v kodi

#### A) Hardcoded DSN (P0)
Hardcoded DSN je neposredno v:
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation-client.ts`

To je varnostno in operativno neidealno; DSN naj bo izključno env-driven.

#### B) Dvojna Sentry init pot (P0)
- **Hardcoded init**: server/edge/client config datoteke.
- **Env-driven init**: `lib/sentry/init.ts` (`process.env.NEXT_PUBLIC_SENTRY_DSN`, `enabled` guard).

Če sta obe poti aktivni ali se uporabljata različno po runtime-u, dobimo težko reproducibilne rezultate (sampling, replay, PII).

#### C) Sampling mismatch (P1)
- Hardcoded init uporablja `tracesSampleRate: 1` (100%).
- Env-driven init uporablja `0.1` v produkciji.

To lahko povzroči razliko v stroških in observability signal/noise.

#### D) PII policy (P1)
V hardcoded konfiguraciji je `sendDefaultPii: true`; brez centralnega env gatinga je to tveganje za skladnost (GDPR/contractual requirements).

#### E) Build plugin metapodatki
V `next.config.ts` je Sentry plugin nastavljen na:
- `org: "liftgo-w5"`
- `project: "javascript-nextjs"`

To je OK, vendar mora biti skladno s tenantom, v katerega dejansko pošilja DSN.

## 3) Priporočena sanacija

### P0 (nujno)
1. Odstrani hardcoded DSN iz:
   - `sentry.server.config.ts`
   - `sentry.edge.config.ts`
   - `instrumentation-client.ts`
2. Uporabi enoten env-driven model v vseh runtime-ih.
3. Dodaj CI check, ki faila build ob regex-u za hardcoded Sentry DSN (`ingest.sentry.io`).

### P1 (visoka)
4. Standardiziraj sampling (npr. prod 5–10%, dev 100%).
5. `sendDefaultPii` naj bo env-gated in dokumentiran po compliance pravilih.

### P2 (srednja)
6. Dodaj runbook: kako potrditi, da client/server/edge pošiljajo v isti projekt + kako meriti event volume.

## 4) Kaj manjka zaradi network omejitve
Ni bilo mogoče izvesti live preverjanja:
- unresolved issue backlog,
- top crash signatures,
- release health (crash-free sessions/users),
- alert noise/rule health,
- regressions po zadnjih releasih.

## 5) Natančen API checklist za naslednji zagon (network-enabled)
- `GET /api/0/organizations/`
- `GET /api/0/organizations/{org_slug}/projects/`
- `GET /api/0/projects/{org_slug}/{project_slug}/issues/?query=is:unresolved`
- `GET /api/0/projects/{org_slug}/{project_slug}/events/`
- `GET /api/0/organizations/{org_slug}/releases/`
- `GET /api/0/projects/{org_slug}/{project_slug}/keys/` (validacija DSN ključev)

## Zaključek
**Trenutno največje realno tveganje ni manjkajoč dashboard vpogled, ampak nekonsistentna in delno hardcoded Sentry konfiguracija v kodi.**
Največji učinek bo imela poenotitev init poti na env-driven model + jasna sampling/PII politika.
