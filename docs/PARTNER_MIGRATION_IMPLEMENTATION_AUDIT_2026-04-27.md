# Partner Migration / Refactor Audit (2026-04-27)

## Scope

Audit of implementation status against the provided roadmap:

- Architecture
- Components
- API strategy
- Migration phases A–D
- Risk mitigations

## Legend

- ✅ Implemented
- 🟡 Partially implemented
- ❌ Not implemented / not found

## 1) Architecture

1. **Dedicated partner dashboard layout** — ✅
   - `app/partner-dashboard/layout.tsx` centralizes auth gating and shared shell (sidebar + bottom nav).

2. **Single domain model (`obrtnik_profiles` + typed related tables)** — 🟡
   - Canonical model is actively used in many places (`obrtnik_profiles`, canonical resolver/service).
   - But legacy paths remain active (`partners` table fallback and partner creation endpoint writes to `partners`).

3. **Service layer with normalized DTOs for all partner APIs** — 🟡
   - Exists for part of partner APIs (`lib/partner/service.ts`, `lib/partner/resolver.ts`).
   - Not universal: several partner routes still use direct Supabase queries and route-specific response shapes.

## 2) Components

- **Reuse as-is (bottom nav, sidebar nav logic, message primitives, stats cards)** — ✅
  - Partner shell reuses `PartnerSidebar`, `PartnerBottomNav`, message primitives (`ConversationList`, `ChatPanel`), and stats cards (`PartnerStats`).

- **Refactor offers list/form typing + API adapters** — 🟡
  - Offer UI has typed payloads (`CreateOfferPayload`, `Offer`) and partner-specific CRUD endpoints.
  - But adapters/contracts are not fully normalized across all related endpoints.

- **Refactor payments section** — 🟡
  - `PaymentsSection` exists and uses `/api/craftsman/earnings`, but remains `any`-typed and not integrated into a unified partner service contract.

- **Refactor CRM data adapters** — 🟡
  - `/api/partner/crm` has explicit typed interfaces and a structured response.
  - Still route-local logic; no shared canonical DTO/adapters layer across all partner modules.

- **Build new inquiry filter panel/sheet** — ✅
  - Desktop filter component exists (`PovprasevanjaFilters`) and a mobile filter sheet exists (`MobileInquiryFilters`).

- **Build unified dashboard page header/actions** — ❌
  - No shared page-header/actions component found; pages still define their own local headers.

- **Build shared empty/error states** — ❌
  - Empty/error UI appears duplicated per-page/per-component; no shared partner empty/error primitives found.

## 3) API strategy

1. **Standard response envelope for all partner endpoints** — 🟡
   - There are multiple envelope helpers (`lib/api-response.ts`, `lib/api/response.ts`, `lib/http/response.ts`).
   - Partner endpoints are inconsistent (mixed plain JSON, `{ success, data }`, helper-based, and raw errors).

2. **Shared auth/ownership helper wrappers** — 🟡
   - Implemented for some canonical partner routes (`getAuthenticatedPartner`, canonical resolver).
   - Other routes still use older helper (`getPartner`) with legacy fallback and route-local ownership logic.

3. **Tier/commission/AI limits from one canonical config** — 🟡
   - `lib/plans.ts` centralizes tier config and features and sources price/commission from Stripe config.
   - However, additional scattered tier/quota logic still exists in multiple API routes.

4. **Integration tests for Stripe webhook + subscription synchronization** — 🟡
   - Webhook and subscription handlers are implemented.
   - Existing tests cover escrow/webhook behavior broadly, but dedicated migration-safe subscription synchronization coverage appears incomplete.

## 4) Migration strategy status

### A — Foundation

- 🟡 Define canonical partner data model + ID mapping (partially via resolver + fallbacks).
- ❌ ID Encoding Mapping Document (not found in repo).
- 🟡 Shared API response + error contracts (helpers exist, not consistently adopted).
- 🟡 Shared route guard helpers (partially present via canonical resolver/getPartner).
- ✅ Explicit `partner-dashboard` layout wrapper.

### B — Core Workflow Stabilization

- 🟡 Inquiry browser filter + pagination contract exists, but mostly page/route local and not fully service-normalized.
- 🟡 Offers CRUD exists with typed payloads, but unified service contract is partial.
- 🟡 Messaging appears integrated in shell path, but consistency across all partner surfaces is still uneven.

### C — Advanced Modules

- 🟡 CRM/insights APIs exist and are tier-gated, but not fully on a normalized shared DTO/service layer.
- 🟡 Tier gates and plan metadata are centralized in `lib/plans.ts`, but legacy/scattered checks still exist.
- 🟡 Stripe/subscription sync logic exists with partial tests; hardening appears incomplete.

### D — Mobile + Quality

- 🟡 Mobile filter sheet exists.
- ❌ Pull-to-refresh gesture behavior not found (button refresh exists).
- ❌ CRM + Offer Generator media capture flow with source tagging (`camera` vs `url`) not found as specified.
- ❌ Performance pass evidence (bundle/API waterfall) not found in code-level implementation artifacts.
- 🟡 Regression/contract suite exists in parts, but explicit expansion for this migration scope appears incomplete.

## 5) Risk assessment alignment

### High risk

1. **Identity mismatch (`id`/`user_id`/`auth_user_id`)** — 🟡 mitigation partially implemented
   - Canonical resolver + fallback warnings exist, but legacy paths are still active.

2. **Business rule divergence (plans/commission/limits)** — 🟡 mitigation partially implemented
   - Canonical plan config exists, yet route-level duplications remain.

3. **Stripe webhook mapping regressions** — 🟡 mitigation partially implemented
   - Webhook handlers update both profile tables and include fallback lookup behavior.
   - Dedicated replay/migration-safe test depth is still limited.

### Medium risk

1. **Authorization drift** — 🟡
   - Shared helpers exist but are not mandatory/universal yet.

2. **Realtime edge-case regressions** — ❌
   - No clear channel-level integration snapshot suite for realtime contracts found.

### Low risk

1. **UI regression from shell consolidation** — 🟡
   - Shell consolidation is present, but no explicit feature-flagged phased rollout evidence found in this audit.

## Executive summary

- **Most advanced:** partner shell consolidation, canonical identity scaffolding, partner inquiry/offer/CRM/insights baseline APIs.
- **Main gaps:** full removal of legacy partner paths, single enforced API envelope, one mandatory auth/ownership wrapper, shared empty/error/header UI primitives, and migration-focused Stripe/subscription replay tests.

## 6) Admin dashboard — detailed audit

### Architecture / shell

- ✅ **Dedicated admin layout shell exists** (`app/admin/layout.tsx`) with server-side auth, `admin_users` role gate, shared sidebar/header shell.
- 🟡 **Centralized guard wrappers are partial**: shell-level auth is centralized, but many admin pages/routes still implement local checks and local query logic.

### Domain model consistency

- 🟡 **Mixed data model naming still present** in admin surfaces (e.g., `craftworker_profile`, `violation`, `message`, plus canonical/newer tables in other places), indicating transitional schema composition rather than a single normalized admin DTO model.

### Components

- ✅ **Reusable admin shell/navigation is mature** (`AdminSidebar`, `AdminHeader`, grouped nav, role-based item visibility).
- 🟡 **Shared empty/error patterns are only partial**: route-level `app/admin/error.tsx` exists, but many pages still define bespoke error/empty UIs.
- 🟡 **Unified page header/actions not fully standardized**: admin pages still define page-local header variants.

### API strategy (admin-specific)

- 🟡 **Response envelope is inconsistent across admin endpoints**: many routes use direct `NextResponse.json` and custom shapes, without one enforced response contract.
- 🟡 **Auth/ownership checks are present but decentralized**: some routes check `admin_users`, others use different local patterns.

### Testing / reliability

- 🟡 There is broad test coverage in repo (security/performance/escrow/etc.), but no obvious dashboard-focused contract suite that enforces admin endpoint response schema consistency.

### Admin dashboard conclusion

- **Strengths:** robust shell gating + role-aware nav + wide operational coverage.
- **Gaps:** inconsistent response contracts, mixed schema vocabulary, and limited standardized page primitives (header/empty/error) across all admin pages.

## 7) Naročnik dashboard — detailed audit

> Opomba: v kodni bazi sta prisotni **dve naročniški dashboard strukturi**:
>
> - `app/(narocnik)/*` (novejši/customer portal flow)
> - `app/dashboard/stranka/*` (legacy/parallel flow)

### Architecture / shell

- ✅ **Naročnik shell obstaja** (`app/(narocnik)/layout.tsx`) z auth checkom, sidebar + mobile nav + notification bell.
- 🟡 **Podvojena arhitektura**: hkrati obstaja še `app/dashboard/stranka/layout.tsx` z drugim shellom in lastnim role fallback (`id`/`auth_user_id`).

### Domain model consistency

- 🟡 **Identity mapping je še prehoden**: v stranka layoutu je prisoten dual lookup (`profiles.id` in `profiles.auth_user_id`), kar kaže na prehodno fazo identitetnega modela.

### Components

- ✅ **Sidebar + bottom nav + osnovne dashboard kartice/sections obstajajo** za naročnika.
- 🟡 **Header/empty state standardizacija je parcialna**: veliko empty/header blokov je page-local in podvojenih med `/(narocnik)` in `/dashboard/stranka`.
- ❌ **Enotna konsolidacija na eno dashboard drevo** še ni zaključena (parallel routes še aktivne).

### API strategy (naročnik-specific)

- 🟡 **Ownership checks so večinoma prisotni** (npr. authenticated inserts za povpraševanje, role checks), ampak response shape med API-ji ni enoten.
- 🟡 **Service/DTO normalizacija je delna**: nekaj DAL/helperjev obstaja (`getNarocnikPovprasevanja`), vendar še ni enotnega customer API service sloja za vse dashboard endpointe.

### Mobile + quality

- 🟡 **Mobile nav/UX je prisoten**, vendar ni jasnega enotnega pull-to-refresh vzorca niti enotnih contract testov za customer dashboard API-je.

### Naročnik dashboard conclusion

- **Strengths:** funkcionalen shell, ključni tokovi (povpraševanja, profil, sporočila) in role zaščita.
- **Gaps:** podvojena struktura (`/(narocnik)` vs `/dashboard/stranka`), neenotni odzivi API, ter manjkajoče shared UI primitives.

## 8) Generalna analiza (partner + admin + naročnik)

### Kaj je že dobro

1. **Shell consolidation je najbolj napredovala na partner/admin strani** (dedicated layout + nav + auth gating).
2. **Canonical smer je jasno vidna** (`obrtnik_profiles`, resolver/service, tier config v `lib/plans.ts`).
3. **Funkcionalni moduli obstajajo** (offers/CRM/insights, admin operativa/analitika, customer povpraševanja flow).

### Sistemski vzorci, ki zavirajo migracijo

1. **Parallel legacy paths**
   - partner: canonical + legacy `partners` fallback,
   - customer: `/(narocnik)` + `/dashboard/stranka`.
2. **API contract fragmentation**
   - več response helperjev in veliko route-local `NextResponse.json` shape-ov.
3. **Decentralized guard logic**
   - auth/ownership checks so prisotni, a ne povsod preko enega obveznega wrapperja.
4. **UI primitive fragmentation**
   - page-level header/empty/error patterns brez enotne shared knjižnice komponent.

### Predlagana prioritetna zaporedja (pragmatično)

- **P0 (stabilnost/varnost):**
  1. Enforce en response envelope za vse dashboard API-je.
  2. Enforce shared auth+ownership wrappers na admin/partner/customer endpointih.
  3. Freeze identity contract in odstraniti legacy fallback write paths.
- **P1 (konsolidacija):**
  1. Consolidate customer dashboard na eno route drevo.
  2. Uvesti shared dashboard page header/actions + shared empty/error components.
  3. Normalize DTO/service layer per domain (partner/admin/customer).
- **P2 (quality/perf):**
  1. Dodati contract/integration teste za dashboard API response sheme.
  2. Dodati migration-safe Stripe subscription replay test matriko.
  3. Narediti performance pass (bundle + API waterfall) po konsolidaciji.

## 9) Backend delovanje — podrobna ocena

### Trenutna slika

- ✅ **Backend je funkcionalno bogat**: veliko domen je pokritih z API endpointi (`partner`, `admin`, `agent`, `escrow`, `stripe`, `povprasevanje`).
- 🟡 **Arhitekturna plast je mešana**:
  - del endpointov uporablja service/DAL sloj,
  - del endpointov vsebuje “fat route handlers” z veliko logike direktno v route datotekah.

### Kaj deluje dobro

1. **Varnostni gradniki obstajajo** (auth checks, ownership checks, rate limits, guardrails v agent stacku).
2. **Specializirani business moduli so prisotni** (commission/payment/subscription/orchestrator).
3. **Webhook in billing infrastruktura je prisotna** in povezana s subscription handlingom.

### Glavne backend vrzeli

1. **Neenoten API contract/envelope** (več helperjev + route-local JSON odzivi).
2. **Preveč decentralizirane validacije/guard logike** (ponovitev med endpointi).
3. **Delna konsolidacija service sloja** (nekateri endpointi še vedno neposredno query-ajo DB brez enotnih DTO adapterjev).

### Backend zaključek

- Platforma je produkcijsko uporabna, vendar je za migracijsko stabilnost ključno zmanjšati razpršenost logike in poenotiti response/auth contracts.

## 10) Frontend delovanje — podrobna ocena

### Trenutna slika

- ✅ **Frontend je feature-complete na ključnih tokovih** (partner/admin/naročnik dashboardi, agent chat, mobilna navigacija, PWA elementi).
- ✅ **Globalni app shell in observability elementi so vključeni** (analytics/speed insights/offline/PWA/error boundary).
- 🟡 **UX struktura je delno podvojena** (npr. customer dashboard poti in page-level ponovitve komponentnih vzorcev).

### Kaj deluje dobro

1. **Responsive shelli** za partner/admin/naročnik so implementirani.
2. **Agent chat UX** (history, retry, unread, loading states) je izdelan in povezan z backend endpointi.
3. **PWA/offline gradniki** so prisotni, kar izboljša stabilnost uporabe na mobilnih napravah.

### Glavne frontend vrzeli

1. **Shared primitives niso dovolj standardizirani** (header/actions, empty/error states) med dashboard področji.
2. **Route konsolidacija ni zaključena** (legacy + nove poti vzporedno).
3. **Contract coupling z backendom je neenoten** zaradi različnih response shape-ov API-jev.

### Frontend zaključek

- UI je bogat in uporaben, a naslednja stopnja kvalitete zahteva poenotenje dashboard primitivov + konsolidacijo poti + bolj stroge API contracts.

## 11) Vsi agenti — inventar in stanje

### A) Agent ekosistem v repoju

V kodi sta prisotna **dva sorodna agent stacka**:

1. `lib/agents/*` (registry/message-bus več-agentni sistem),
2. `lib/agent/*` (tool router + guardrails + permissions + state machine).

To pomeni, da je agentni sistem funkcionalno močan, vendar arhitekturno delno podvojen.

### B) Agent capabilities (API nivo)

Implementirani so agent endpointi za:

- splošni chat,
- dinamični agent tip (`/api/agent/[agentType]`),
- match/matching,
- quote generator,
- materials,
- offer comparison,
- scheduling (+ confirm),
- video diagnosis,
- task description / pricing / verify / job summary.

### C) Kaj je dobro implementirano

1. **Tier gating + daily limits** za agente so implementirani.
2. **Conversation persistence + usage logging + cost tracking** so implementirani (več endpointov).
3. **Security mehanizmi** (guardrails, permissions, ownership, state-transition checks) so prisotni in dokumentirani v kodi.

### D) Ključna tveganja v agent stacku

1. **Dvojni agent arhitekturni sloj** (`lib/agents` vs `lib/agent`) povečuje kompleksnost in možnost divergence.
2. **Neenotna API response shema** tudi pri agent endpointih (različni odzivi med route-i).
3. **Delno podvojena business pravila** (tier/quota/access) med različnimi agent route implementacijami.

### E) Predlog za agente (pragmatično)

- **P0:** izbrati en canonical agent execution path (ali `lib/agent` ali `lib/agents` kot primarni runtime).
- **P1:** poenotiti response schema in error codes za vse `/api/agent/*` endpoint-e.
- **P1:** centralizirati tier/quota/access policy v en shared modul brez podvajanja.
- **P2:** dodati contract teste za vsak agent endpoint (input/output schema + auth/tier matrix).
