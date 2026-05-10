# LiftGO audit: how **stranke** search vs how **obrtniki/partnerji/mojstri** discover work

Date: 2026-05-05

## 1) Who searches whom today?

### Stranka -> obrtnik search exists (direct catalog search)
- There is a public/searchable craftsmen catalog endpoint at `GET /api/catalog/craftsmen`.
- It accepts search/filter parameters like:
  - `search`
  - `category_id`
  - `location_city`
  - `min_rating`
  - `is_available`
  - `limit`, `offset`
- The route calls `listVerifiedObrtnikiWithFilters(...)`, which queries `obrtnik_profiles` and returns verified craftsmen ordered by rating.
- Text search is done over `business_name` and `description`.

### Obrtnik/partner -> stranka search is not modeled as a public free-text customer search
- I did **not** find a symmetric endpoint where craftsmen freely search customers by keyword.
- The dominant model is: customers submit an inquiry (`povprasevanje`) and the platform assigns/broadcasts it to relevant craftsmen.

## 2) How do obrtniki get customer opportunities?

### Inquiry creation
- Customer inquiry submission is handled in `POST /api/povprasevanje`.
- The server sets `narocnik_id` from authenticated user (does not trust client for this).
- Inserted inquiry status is:
  - `dodeljeno` when a specific `obrtnik_id` is provided.
  - `odprto` otherwise.

### Platform broadcast/matching
- Cron endpoint `GET /api/cron/notification-sweep` scans open inquiries (`status='odprto'`).
- Matching logic:
  1. Match inquiry `category_id` to `obrtnik_categories`.
  2. Filter matched craftsmen to `is_verified=true` and `is_available=true` in `obrtnik_profiles`.
  3. Insert notifications for each matched craftsman.
- So discovery is **supply push** (platform pushes relevant stranke jobs to obrtniki), not craftsmen keyword-searching random customers.

## 3) Do obrtniki receive information about what customers need?

### Yes — through inquiry payload and partner inquiry APIs
- Inquiry records contain customer-demand context (title/service, location, description, urgency, budgets, preferred dates, attachments).
- Partner-facing inquiry endpoints exist and return assigned/owned inquiries:
  - `GET /api/partner/povprasevanja` (canonical partner service path)
  - `GET /api/obrtnik/povprasevanja` (legacy/compat path)
- Legacy craftsman endpoint response includes fields such as:
  - `storitev`, `lokacija`, `opis`
  - `termin_datum`, `termin_ura`
  - `status`, `email`, `telefon`, `created_at`
- This means craftsmen do get concrete customer need details, but through assigned/matched leads rather than an open customer directory search.

## 4) AI agents — what exists and how it relates

### Customer-side AI assistants
- New inquiry flow (`/(narocnik)/novo-povprasevanje`) integrates:
  - `TaskDescriptionAssistant`
  - `VideoDiagnosisAssistant`
  - `AgentDialog`
- It also calls `GET /api/agent/pricing` for price estimate assistance.

### Concierge / orchestration endpoint
- `POST /api/ai/concierge` detects user role (`narocnik` vs `obrtnik` vs `guest`), tier, language, and routes to allowed agents.
- For guests, it suggests next steps including inquiry submission and browsing professionals (`/mojstri`).
- For authenticated users, it composes multi-agent responses and can personalize with recent user inquiries.

## 5) Deeper validation requested

### 5.1 Which frontend consumes `GET /api/catalog/craftsmen`? Is `/mojstri` active?
- `/mojstri` is active and implemented as `app/(public)/mojstri/page.tsx`.
- The main `/mojstri` page currently fetches data via DAL (`listVerifiedObrtniki(...)` from `lib/dal/obrtniki`), **not** through `GET /api/catalog/craftsmen`.
- There is also `app/masters/page.tsx` that redirects to `/mojstri`, indicating `/mojstri` is canonical for the public catalog path.

### 5.2 Is partner inquiry visibility assigned-only or open-marketplace in every dashboard variant?
- There are two active patterns:
  1. **Assigned-only API path:** `GET /api/partner/povprasevanja` returns partner's assigned/owned inquiries via canonical partner service.
  2. **Open marketplace browse path:** `/obrtnik/povprasevanja` page uses `getOpenPovprasevanjaForObrtnik(...)`, which fetches `status='odprto'` inquiries (optionally filtered by partner categories), then removes inquiries where that obrtnik already submitted an offer.
- Conclusion: current behavior is **hybrid** (both assigned-only and open-lead browsing paths exist).

### 5.3 Telemetry names around core funnel steps
- Added funnel telemetry event names and instrumentation for:
  - `catalog_search_performed` (catalog API search)
  - `inquiry_broadcasted` (cron broadcast to matched craftsmen)
  - `partner_inquiry_opened` (partner opened inquiry list view)
  - `offer_submitted` (offer submission)
- Existing event `ponudba_sent` is preserved for backward compatibility.

## 6) Practical conclusion

Current LiftGO behavior is:
1. **Stranke can search/browse obrtniki** via catalog and filters.
2. **Obrtniki do not only work assigned leads**; they also have an open inquiry browse path in at least one dashboard variant.
3. **Obrtniki receive customer-need details** in inquiry objects and notifications (service/problem/location/time/contact context).
4. **AI agents are present** both in customer intake and in a role-aware concierge that can guide both sides.

