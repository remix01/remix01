# Agent Runtime Audit (Next.js + Supabase)

Date: 2026-04-28
Scope reviewed:
- `lib/agents/*`
- `lib/agent/*`
- `app/api/agent/*`
- tool router
- registry/message bus
- guardrails
- permissions
- state machine
- usage logging / cost tracking
- conversation persistence
- frontend agent usage

## 1) Canonical runtime candidate

### Recommended canonical runtime (target)
`/api/agent/[agentType]` + `lib/agents/ai-router.ts` + `lib/agents/ai-definitions.ts` is the strongest canonical candidate:
- Centralized agent catalog + tier limits (`AGENT_META`, `AGENT_DAILY_LIMITS`, `isAgentAccessible`, `getAgentDailyLimit`).
- Unified per-agent conversation store (`ai_agent_conversations`).
- Unified usage log insertion with `agent_type` tagging in `ai_usage_logs`.
- Model selection/cost estimation integrated (`selectModel`, `estimateCost`).

### Why not canonical yet
It is not fully canonical today because:
- Multiple parallel endpoints bypass this path (`/api/agent/chat`, `/api/agent/materials`, `/api/agent/job-summary`, `/api/agent/quote-generator`, `/api/agent/scheduling`, `/api/agent/task-description`, `/api/agent/offer-comparison`, `/api/agent/video-diagnosis`, `/api/agent/match`, `/api/agent/verify`).
- Response shapes and auth/guardrail behaviors vary between endpoints.

## 2) Duplicate function clusters (high confidence)

1. **Two runtime stacks in parallel**
   - `lib/agents/*` (message bus + typed agent messages + specialized agents).
   - `lib/agent/*` (orchestrator + tool-router + guardrails + permissions + state machine + memory).

2. **Two orchestrators**
   - `lib/agent/orchestrator.ts` (LLM tool-call planner).
   - `lib/agents/orchestrator-agent/OrchestratorAgent.ts` (message-bus orchestrator).

3. **Two conversation stores**
   - `agent_conversations` used by `/api/agent/chat`.
   - `ai_agent_conversations` used by `/api/agent/[agentType]`.

4. **Two API surface styles**
   - Canonical wrapper style: `{ ok, data, ...payload }` + `canonical_error` helpers.
   - Plain legacy `NextResponse.json({ error })`/custom payload responses.

5. **Tier/auth policy duplicated in multiple routes**
   - Daily reset + limit checking logic repeated with slight variations.

6. **Usage/cost tracking duplicated**
   - Some routes log via `ai_usage_logs` + profile counters directly.
   - Some additionally call `upsert_agent_cost_summary`.
   - Observability path (`agentLogger` -> `agent_logs`) is separate and not consistently connected to API routes.

## 3) Divergence risks

### A) Response shape divergence (high risk)
- Frontend consumers rely on top-level fields (`message`, `messages`, `analysis`, `suggestions`, etc.).
- Some endpoints already dual-shape (`ok/data` plus top-level payload), others return only legacy shape.
- This creates fragile coupling and migration risk for clients.

### B) Auth/tier policy divergence (high risk)
- Auth handling differs (some call shared auth error handler, others inline 401).
- Tier checks differ between routes (`profiles.subscription_tier` vs `obrtnik_profiles.subscription_tier` paths).
- Daily limit reset logic is repeated with different constants/branches.

### C) Guardrails + permissions divergence (critical)
- Guardrails exist (`runGuardrails`) but only selectively used (e.g., match route).
- Permission registry in `lib/agent/permissions` uses namespaced tool names (e.g., `offer.create`), while tool-router uses flat names (e.g., `createInquiry`, `submitOffer`), causing mismatches if unified without mapping.
- Ownership checks reference legacy tables (`inquiries`, `offers`) while production flows use `povprasevanja`, `ponudbe` in multiple endpoints.

### D) State machine ownership/domain divergence (high risk)
- State machines operate on legacy table names for inquiry/offer (`inquiries`, `offers`) but current API flows commonly hit Slovenian domain tables (`povprasevanja`, `ponudbe`).
- This can lead to “guard present but not authoritative” behavior.

### E) Logging/cost tracking divergence (high risk)
- `agentLogger` buffers to `agent_logs`, while API routes mostly write to `ai_usage_logs` and profile counters independently.
- Not all routes include `response_time_ms`, `agent_type`, or consistent `message preview/hash` fields.

### F) Conversation persistence divergence (high risk)
- `/api/agent/chat` reads/writes `agent_conversations` (single thread per user).
- `/api/agent/[agentType]` reads/writes `ai_agent_conversations` (thread per user+agent_type+status).
- Frontend has at least two chat UIs targeting different endpoints and assumptions.

### G) Message bus runtime adoption risk (medium)
- `lib/agents/base/*` and specialized agents are implemented, but there is no clear active app/API entrypoint that routes user traffic through `messageBus.send` orchestrator path.
- This increases risk of dead code and untested behavior drift.

## 4) Special checks

### Response shape
Current state: mixed dual-shape and legacy-only. Contract tests explicitly document top-level dependencies.

### Auth/tier policy
Current state: inconsistent enforcement location and duplicated limit reset code.

### Guardrails
Current state: robust module exists but is not globally enforced at API boundary.

### Ownership
Current state: ownership checks and table schemas appear partly aligned to older naming.

### Logging/cost tracking
Current state: split between observability log stream and cost/accounting stream, with per-route variance.

### Conversation store
Current state: split between `agent_conversations` and `ai_agent_conversations`; no canonical read model for all clients.

## 5) Migration plan (without deleting working code)

## Phase 0 — Freeze contract + observability (no behavior changes)
1. Keep all existing endpoints alive.
2. Require dual-shape helper (`success/fail`) for every `/api/agent/*` endpoint:
   - Success: `{ ok: true, data: payload, ...payload }`
   - Error: `{ ok: false, error, canonical_error }`
3. Add endpoint-level metric tags (`route`, `agent_type`, `model`, `cached`) to unify analysis.

## Phase 1 — Canonical policy modules behind adapters
1. Create shared helpers used by all routes:
   - `resolveUserTier(userId)`
   - `enforceDailyLimit({ userId, agentType, tier })`
   - `logAiUsage(...)`
2. Wrap existing route logic without changing route paths or payload fields.
3. Ensure all routes write `agent_type` and `response_time_ms` consistently.

## Phase 2 — Guardrails and ownership normalization
1. Add API middleware wrapper for all mutable `/api/agent/*` routes:
   - schema
   - injection
   - amount (where relevant)
   - permission + ownership
2. Introduce tool-name mapping table so namespaced permission keys and flat tool names both work during migration.
3. Add dual-table ownership adapter (legacy + current table names) and log which backend path was used.

## Phase 3 — Conversation store convergence
1. Treat `ai_agent_conversations` as canonical long-term target.
2. Add transparent bridge:
   - `/api/agent/chat` reads/writes canonical store with `agent_type='general_chat'`.
   - Backward compatibility adapter mirrors writes to `agent_conversations` for a deprecation window.
3. Add consistency job to compare row counts/message tails between both stores during migration.

## Phase 4 — Runtime convergence (orchestrator choice)
1. Keep dynamic route runtime (`/api/agent/[agentType]`) as API canonical entrypoint.
2. Choose execution backend per endpoint via feature flag:
   - `legacy-direct` (today’s behavior)
   - `message-bus` (lib/agents runtime)
3. Route a small traffic percentage to message-bus backend, compare:
   - latency
   - error rate
   - cost/token usage
   - response contract validity

## Phase 5 — Frontend convergence
1. Standardize client parsing to canonical envelope first (`data`) with fallback to legacy top-level fields.
2. Migrate all agent UIs to one typed API client module.
3. Keep old components operational; gradually swap implementation under same UX.

## 6) Immediate prioritized actions (next sprint)
1. Build and apply shared `success/fail` + shared limit/auth helper across all `/api/agent/*` routes.
2. Normalize logging insert helper for `ai_usage_logs` + profile counters + response time.
3. Add compatibility adapter so `/api/agent/chat` persists to `ai_agent_conversations` (`general_chat`) while still supporting current consumers.
4. Add a route-level guardrail wrapper for `POST/PUT/DELETE` agent routes (starting with scheduling, match, offer-comparison).
5. Add integration test matrix validating response envelope + top-level backward fields for every agent route.

## 7) Bottom line
- **Canonical runtime candidate**: dynamic multi-agent API path (`/api/agent/[agentType]`) with `ai-router` + `ai-definitions` + `ai_agent_conversations` + unified usage logging.
- **Main risk today**: parallel runtimes and duplicated policy/logging logic causing drift.
- **Safe path forward**: adapter-first migration with feature flags and dual-write/dual-shape compatibility; no code deletion required in early phases.
