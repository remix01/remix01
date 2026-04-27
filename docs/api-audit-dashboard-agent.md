# API Audit: dashboard + agent endpointi (partner/admin/agent/craftsman + customer)

Datum audita: 2026-04-27.
Obseg: `app/api/partner/*`, `app/api/admin/*`, `app/api/agent/*`, `app/api/craftsman/*`, customer related (`/api/povprasevanje*`, `/api/narocnik/povprasevanje`, `/api/stranka/povprasevanje`, `/api/offers`, `/api/ponudbe`, `/api/obrtnik/povprasevanja`) ter response helperji.

## 1) Response helperji (trenutno stanje)

Repo trenutno vsebuje **3 različne helper sloje**:

1. `lib/api/response.ts`:
   - canonical envelope: `ok: true|false`, `data`, `error:{code,message,details?}`.
   - hkrati vsebuje deprecated `success: true|false` helperje za backward compatibility.
2. `lib/api-response.ts`:
   - legacy envelope `success: true|false`, `data`, `error`.
3. `lib/http/response.ts`:
   - mini helper: `success/data` in `success/error`.

### Zaključek
- Canonical helper **že obstaja** v `lib/api/response.ts`, ampak endpointi so mešani (nekateri `ok/fail`, drugi direct `NextResponse.json`, tretji legacy helperji).
- Zato je trenutno tveganje predvsem v **nekonsistentnem response shape-u**, ne v manjkajočem helperju.

## 2) Supabase DB uporaba in identity mapping

## 2.1 Ključni tabelarni vzorci (po domenah)

- Partner/craftsman API pogosto uporablja: `obrtnik_profiles`, `ponudbe`, `povprasevanja`, `payouts`, `escrow_transactions`.
- Agent API pogosto uporablja: `profiles`, `obrtnik_profiles`, `povprasevanja`, `ponudbe`, `agent_conversations`, `ai_agent_conversations`, `ai_usage_logs`, `appointments`, `calendar_connections`.
- Admin API uporablja: `admin_users`, `categories`, `admin_alerts`, `commission_logs`, `payment`, `job`, `violation`, `platform_settings`, `profiles`.

## 2.2 `auth_user_id` / `user_id` / `id` povezave

- **Admin identity**: `admin_users.auth_user_id = auth.uid()` (preverjanje v večini admin endpointov).
- **Canonical partner/craftsman identity**: `obrtnik_profiles.id = auth.uid()`.
- **Legacy/alt mapping**: ponekod še obstaja `obrtnik_profiles.user_id` fallback (explicitno v `/api/partner/generate-offer`).
- **Conversation identity**:
  - `/api/agent/chat` uporablja `agent_conversations.user_id`.
  - `/api/agent/[agentType]` uporablja `ai_agent_conversations.user_id`.
  - To pomeni dva sočasna conversation store-a (legacy + newer multi-agent model).

## 2.3 Legacy fallback poti

Najbolj kritične vidne fallback poti:
- `/api/partner/generate-offer`:
  - najprej bere canonical `obrtnik_profiles.id = user.id`,
  - nato fallback na `obrtnik_profiles.user_id = user.id`,
  - in ob fallbacku logira warning `PARTNER_ID_MAPPING_FALLBACK`.
- `/api/povprasevanje/public`:
  - najprej insert v modern stolpce (`title`, `description`, `location_city`, `narocnik_id`, `category_id`),
  - ob schema napaki fallback na legacy payload (`storitev`, `lokacija`, `opis`, `status='novo'`).
- `/api/povprasevanje`:
  - podpira legacy request field-e (`storitev`, `lokacija`, `opis`) in jih mapira v canonical (`title`, `location_city`, `description`).

## 2.4 RLS / ownership logika (vidna v repo)

- `povprasevanja` in `ponudbe` imata RLS policy-je, kjer:
  - naročnik vidi svoje,
  - obrtnik vidi odprta povpraševanja ali svoja,
  - admin ima global access.
- Za `agent_definitions` in `ai_agent_conversations` je RLS jasno definirana (user own + service role full access).

### Opomba
Veliko API route handlerjev uporablja `supabaseAdmin` (service role), zato se ownership pogosto izvaja v aplikacijski logiki (auth check + `.eq(...user.id...)`) in ne izključno preko RLS.

## 3) Backend route handler audit (auth/ownership/envelope)

## 3.1 Partner + craftsman (stanje: delno migrirano na canonical)

- `app/api/partner/*` in `app/api/craftsman/earnings` so večinoma migrirani na `ok/fail` (`lib/api/response.ts`).
- Semantično dober pattern:
  - auth check: `supabase.auth.getUser()` ali `getAuthenticatedPartner()`
  - ownership filter: `.eq('obrtnik_id', user.id)` / `.eq('id', user.id)`
  - response: canonical `ok/fail`.
- Contract test že potrjuje ta subset endpointov (`partner-envelope.contract.test.js`).

## 3.2 Agent (stanje: mešano, večinoma plain JSON)

- Večina agent endpointov vrača plain `NextResponse.json` brez canonical envelope-a.
- Shape je funkcionalno stabilen in frontend ga neposredno pričakuje (npr. `message`, `messages[]`, `analysis`, `suggestions`, `diagnosis`, `usage` ...).
- Auth check je skoraj povsod prisoten (`supabase.auth.getUser()`), z nekaj izjemami:
  - `/api/agent/pricing` je anon GET endpoint (namenoma).
- Ownership check je ponekod ekspliciten:
  - npr. `/api/agent/scheduling` preveri `povprasevanje.narocnik_id === user.id`.

## 3.3 Admin (stanje: močno heterogeno)

- Admin endpointi imajo različen auth pristop:
  - `requireAdmin()` helper,
  - ročni `admin_users.auth_user_id` check,
  - v nekaterih endpointih samo prisoten `authorization` header (npr. monetization), brez robustnega admin membership preverjanja.
- Response shape je močno različen:
  - `{ error }`, `{ success, data }`, `{ alerts }`, `{ categories }`, raw analytics objekti, itd.

## 3.4 Customer/naročnik API

- `/api/narocnik/povprasevanje` in `/api/stranka/povprasevanje` sta re-export `/api/povprasevanje` (shared behavior).
- `/api/povprasevanje` in `/api/povprasevanje/public` imata backward-compatible request mapping in fallback insert poti.
- `/api/obrtnik/povprasevanja` je posebej rizičen:
  - uporablja query param `obrtnik_id` namesto auth identity (komentar v kodi priznava, da je to začasno),
  - uporablja anon ključ client side style inicializacijo.

## 4) Frontend consumer expectations (da ne zlomimo shape-a)

## 4.1 Agent frontend (tight coupling na plain JSON)

- `useAgentChat` pričakuje:
  - GET: `{ messages: [] }`
  - POST: `{ message, ... }`, napake v obliki `{ error, requiresLogin? }`.
- `SchedulingAssistant` pričakuje:
  - POST: `{ alreadyScheduled?, suggestions }`
  - PUT: success payload, napake `{ error }`.
- `OfferComparisonAgent` pričakuje `{ analysis }`.
- `TaskDescriptionAssistant` pričakuje generated content field-e (plain object).
- `VideoDiagnosisAssistant` pričakuje `{ diagnosis }`.

**Implication:** agent endpointov ne migrirati “hard cut” na `ok/fail` brez adapterja, ker UI bere neposredne top-level ključe.

## 4.2 Admin frontend

- `/api/admin/me` uporabljata `AuthContext` in `use-admin-role` ter pričakujeta `{ admin: {...} }` ali `{ error }`.
- Admin dashboard strani (`/admin/dashboard`, `/admin/analytics`, `/admin/monetization`, `/admin/categories`, `/admin/nastavitve`) večinoma pričakujejo **raw domain shape**, ne envelope `data` wrapper.

## 4.3 Partner frontend

- Partner dashboard moduli (`/partner-dashboard/crm`, `/partner-dashboard/insights`, offer generation) so že skladni z `ok/fail` (frontend pogosto preverja `result.ok` + `result.data`).

## 5) Canonical envelope predlog (ciljni standard)

Predlagan canonical standard (obstoječ v `lib/api/response.ts`):

- success:
```json
{ "ok": true, "data": { ... }, "meta": { ...optional } }
```
- error:
```json
{ "ok": false, "error": { "code": "SOME_CODE", "message": "Human readable", "details": {} } }
```

## 5.1 Kompatibilnostni adapter za prehod

Pri endpointih, kjer frontend danes pričakuje raw objekt, predlagam 2-fazni pristop:
1. **Phase A (non-breaking):** vrni oboje
   - npr. `{ ok: true, data: raw, ...raw }` ali query/header feature flag.
2. **Phase B:** frontend preklopi na `ok/data`.
3. **Phase C:** odstrani legacy raw top-level polja.

Za error-e podobno:
- ohrani `{ error: '...' }` v prehodu,
- dodaj `ok:false` + `error:{code,message}`.

## 6) Minimalen migracijski plan (ne "big bang")

## Faza 0 – priprava (brez lomljenja)
- Ne odstranjuj helperjev (`lib/api-response.ts`, `lib/http/response.ts`) – ostaneta kot compatibility layer.
- Dodaj en “response-shape inventory” test per critical domain (agent/admin/customer), ki snapshota trenutne shape-e.
- Označi legacy endpointe in fallbacke z `@deprecated` komentarji + TODO migracija datuma.

## Faza 1 – admin auth hardening + low-risk envelope normalizacija
- Najprej poenoti admin auth check (uporabi en helper povsod).
- Prioriteta: endpointi z write operacijami (`monetization/*`, `migrate-*`, `settings`, `categories`).
- Obdrži obstoječe response ključne top-level shape-e, dodaj `ok/error.code` kot kompat dodatek.

## Faza 2 – agent endpoint adapter migration
- Ne spreminjaj frontend hookov naenkrat.
- Najprej dodaj kompat response (dual shape), nato frontend preklopi endpoint po endpoint.
- Za chat/scheduling/comparison uvedi pogodbeni contract test (`__tests__/contract/agent-envelope.contract.*`) pred rezom legacy shape-a.

## Faza 3 – customer inquiry family
- `/api/povprasevanje` + `/api/povprasevanje/public` ohrani legacy request mapping.
- Response normalize šele po frontend spremembi obrazcev in PWA persistence code.

## 7) Prioritetni seznam endpointov za migracijo

## P0 (varnost + ownership)
1. `POST /api/admin/monetization/upgrade-user`
2. `POST /api/admin/monetization/reset-ai-usage`
3. `POST /api/admin/monetization/flag-user`
4. `GET /api/admin/monetization`
5. `GET /api/obrtnik/povprasevanja`

Razlog: pomanjkljiv ali neenoten auth/ownership pattern; write operacije.

## P1 (high-traffic dashboard/API consistency)
6. `GET /api/admin/analytics`
7. `GET /api/admin/analytics/summary`
8. `GET /api/admin/payments`
9. `GET /api/admin/disputes`
10. `GET /api/admin/me`

Razlog: ključni admin dashboard consumerji, visoko tveganje pri shape driftu.

## P2 (agent UX + contract stabilization)
11. `GET/POST/DELETE /api/agent/chat`
12. `POST/PUT /api/agent/scheduling`
13. `POST /api/agent/offer-comparison`
14. `POST /api/agent/task-description`
15. `POST /api/agent/video-diagnosis`
16. `POST /api/agent/materials`
17. `POST /api/agent/job-summary`
18. `POST /api/agent/quote-generator`
19. `POST/GET/DELETE /api/agent/[agentType]`

Razlog: veliko frontend couplinga na raw shape; potreben adapter-first pristop.

## P3 (customer inquiry response unification)
20. `POST/GET /api/povprasevanje`
21. `POST /api/povprasevanje/public`
22. `GET/PATCH /api/povprasevanje/[id]`
23. `GET/POST /api/offers`
24. `POST /api/ponudbe`

Razlog: legacy compatibility in external/public form tokovi.

## 8) Testi (obstoječi in predlog razširitev)

- Obstoječi contract test pokriva partner/craftsman canonical envelope (`__tests__/contract/partner-envelope.contract.test.js`).
- Predlog minimalnih dodatkov (brez brisanja obstoječih testov):
  1. `admin-auth.contract.test` – preveri da write admin endpointi zavrnejo ne-admin uporabnika.
  2. `agent-shape.contract.test` – snapshot glavnih agent response shape-ov.
  3. `customer-inquiry-compat.contract.test` – preveri legacy request field mapping (`storitev/lokacija/opis`) in modern (`title/location_city/description`).

## 9) Kaj se namenoma NI spreminjalo v tej fazi

- Noben API endpoint ni bil funkcionalno prepisan.
- Noben helper ni bil odstranjen.
- Noben frontend consumer ni bil preklopljen na nov response shape.
- Nobena DB migracija ni bila spreminjana.

To je namenoma “audit-only” korak za varno planiranje naslednjih iteracij.
