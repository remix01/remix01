# Sentry Analysis Report (2026-04-12)

## Scope
- Attempted live Sentry API inventory (organizations/projects/issues/releases) using provided auth token.
- Performed local repository audit of Sentry SDK setup and potential risk areas.

## Live API Check Result
I attempted to query Sentry API endpoints (`sentry.io`, `us.sentry.io`, `de.sentry.io`) with the provided token.

### Commands used
- `curl -sS -H "Authorization: Bearer <TOKEN>" https://sentry.io/api/0/organizations/`
- `curl -I -sS -H "Authorization: Bearer <TOKEN>" https://sentry.io/api/0/`
- `curl -I -sS -H "Authorization: Bearer <TOKEN>" https://us.sentry.io/api/0/`
- `curl -I -sS -H "Authorization: Bearer <TOKEN>" https://de.sentry.io/api/0/`

### Outcome
- All attempts failed before authentication/authorization evaluation with:
  - `curl: (56) CONNECT tunnel failed, response 403`
- This indicates an outbound network/proxy restriction in the current execution environment, so no live tenant data (issues/events/projects) could be retrieved.

## Repository-Level Findings

### 1) DSN is hardcoded in multiple runtime configs (high risk)
Hardcoded DSN exists in:
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `instrumentation-client.ts`

This is brittle and can leak infrastructure details into repository history.

### 2) Parallel config path exists (hardcoded + env-driven)
There is also a cleaner env-driven initializer in:
- `lib/sentry/init.ts`

Current state suggests two competing configuration strategies.

### 3) Sampling/profile posture
From hardcoded config files:
- `tracesSampleRate: 1` (100%) for server/edge/client baseline.

From env-driven initializer (`lib/sentry/init.ts`):
- Production traces are sampled at `0.1`.
- Replays sampled at 10%, error replays at 100%.

This mismatch can produce inconsistent telemetry volume/cost depending on which init path is active.

### 4) PII defaults
Hardcoded configs set `sendDefaultPii: true`, which can be acceptable but should be a deliberate policy decision and generally environment-gated.

### 5) Existing internal audit corroboration
`LIFTGO_AUDIT_2026-04-08.md` already flagged the same core concern: unify Sentry configuration and remove hardcoded DSN.

## Recommended Remediation Plan
1. **Unify to env-driven Sentry setup only**
   - Remove hardcoded DSNs from server/edge/client config files.
   - Read DSN from env vars in every runtime.
2. **Standardize sampling policy**
   - Keep production traces at 5–10% unless a troubleshooting burst is needed.
3. **Gate PII by environment/compliance policy**
   - Enable only where contractually/compliantly acceptable.
4. **Add config sanity checks in CI**
   - Fail builds on hardcoded DSN patterns.
5. **Re-run live Sentry API scan from network-enabled environment**
   - Pull issue counts, top regressions, unresolved-by-age, release health, and alert volume.

## Data Missing Due to Network Restriction
The following could not be fetched in this run:
- Organization/project list
- Open issue inventory
- Issue trend by 7/30 days
- Top crash signatures
- Release health (adoption/crash-free sessions)
- Active alert rules and incidents

## Next Execution Checklist (when network is available)
- `GET /api/0/organizations/`
- `GET /api/0/organizations/{org_slug}/projects/`
- `GET /api/0/projects/{org_slug}/{project_slug}/issues/?query=is:unresolved`
- `GET /api/0/projects/{org_slug}/{project_slug}/events/`
- `GET /api/0/organizations/{org_slug}/releases/`

