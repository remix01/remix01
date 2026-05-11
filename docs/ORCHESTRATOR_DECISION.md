# Orchestrator Consolidation Decision: `lib/ai/*` vs `lib/agent/*`

## Comparison

### 1) Production API surface usage
- `lib/ai/*` is directly used by many active AI API routes (`/api/ai/chat`, `/api/ai/concierge`, `/api/ai/analyze-*`, `/api/ai/langchain`, `/api/ai/embed`, etc.), making it the primary runtime orchestrator stack for user-facing AI features.
- `lib/agent/*` is used for operational primitives (guardrails, permissions, state machine, scheduling, pricing/matching helpers), but its **orchestrator** (`lib/agent/orchestrator.ts`) is not the primary path for current `/api/ai/*` endpoints.

### 2) Architectural scope
- `lib/ai/orchestrator.ts` is a modern "execution orchestrator" with:
  - agent tier/quota checks
  - RAG context assembly
  - tool execution loop
  - model routing/cost estimates
  - support for image inputs and typed execution results
- `lib/agent/orchestrator.ts` is a "tool-call planner" focused on returning JSON tool intents and relying on external routing. It is narrower and overlaps conceptually with newer `lib/ai/*` capabilities.

### 3) Coupling and ecosystem fit
- `lib/ai/*` is integrated with newer docs/examples (`docs/ai-patterns/*`, `lib/ai/patterns/*`, `lib/ai/extended-orchestrator.ts`) and the generic AI endpoints.
- `lib/agent/*` remains important for non-LLM policy layers (state transitions, role checks, injection/rate/schema/amount guards, memory used by multi-agent modules).

### 4) Risk if removed blindly
- Removing **all** `lib/agent/*` would break many imports outside orchestration (state-machine, guardrails, permissions, memory, pricing/scheduling).
- Removing **all** `lib/ai/*` would break primary AI product endpoints and concierge/analysis flows.

## Recommendation

**Keep `lib/ai/*` as the single orchestrator layer.**

Rationale:
1. It is the active path for major AI API routes and feature set.
2. It already encapsulates quota/access, RAG, tooling, and provider/model concerns in one runtime model.
3. It aligns with current pattern docs and extension points.

Important nuance: this decision is about **orchestration ownership**, not deleting the entirety of `lib/agent/*`. Keep `lib/agent/*` modules that provide domain controls and business logic primitives.

## Removal plan (for choosing `lib/ai/*` orchestrator)

### Phase 0 — Freeze and inventory
1. Mark `lib/agent/orchestrator.ts` as deprecated in header comments.
2. Inventory live imports of:
   - `lib/agent/orchestrator`
   - `lib/agent/tool-router`
   - `lib/agent/context`
3. Classify each usage as runtime vs docs/tests.

### Phase 1 — Runtime migration
1. Replace runtime consumers of `lib/agent/orchestrator` with `lib/ai/orchestrator.executeAgent` (or `lib/ai/extended-orchestrator` where multi-step patterns are needed).
2. If intent-routing behavior is still needed, implement a thin adapter in `lib/ai/*` that emits compatible tool intents.
3. Keep `lib/agent/guardrails`, `lib/agent/permissions`, `lib/agent/state-machine` as dependencies invoked before/after `executeAgent` where policy gates are required.

### Phase 2 — Compatibility layer
1. Add temporary re-export shim (if needed):
   - `lib/agent/orchestrator.ts` delegates to `lib/ai` adapter.
2. Add deprecation warnings with target removal date.
3. Update internal docs/examples to use `lib/ai/*` imports only.

### Phase 3 — Cleanup
1. Remove dead code after import count reaches zero for:
   - `lib/agent/orchestrator.ts`
   - `lib/agent/tool-router.ts` (if no remaining use)
   - unused context glue around old planner flow
2. Keep `lib/agent/*` policy modules still referenced by `lib/agents/*`, escrow routes, public pages, etc.

### Phase 4 — Verification gates
1. Run API contract tests for `/api/ai/*` endpoints.
2. Run regression for flows that depend on guardrails/permissions/state-machine.
3. Monitor:
   - tool-call success rate
   - quota rejection correctness
   - token/cost tracking
   - error rate by agentType

## Success criteria
- No runtime import of `lib/agent/orchestrator` in app routes.
- All AI orchestration telemetry consolidated under `lib/ai/*` path.
- Existing guardrail/permission/state-machine protections unchanged or improved.
