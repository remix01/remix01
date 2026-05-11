# MCP + Sentry monitoring check (2026-04-18)

## Request reviewed
The proposal claims:
1. `@sentry/nextjs` must be at least `9.44.0`.
2. Initialize SDK with `Sentry.init(...)` and tracing enabled.
3. Wrap MCP server using `Sentry.wrapMcpServerWithSentry(new McpServer(...))`.
4. Verify by triggering MCP interactions.
5. Also verify Sentry setup from the Vercel side.

## Repo findings

### 1) Sentry SDK minimum version check
- `@sentry/nextjs` is already installed at `^10.45.0` in `package.json`.
- `pnpm-lock.yaml` resolves it to `10.45.0`.
- Conclusion: ✅ Version requirement `>= 9.44.0` is satisfied.

### 2) SDK initialization check
- Sentry is initialized on server, edge, and client via `Sentry.init(...)` in:
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`
  - `instrumentation-client.ts`
- Tracing is enabled via `tracesSampleRate` (1.0 in dev, 0.05 in production).
- Current implementation uses env DSN and `sendDefaultPii: false` (privacy-safe default).
- Conclusion: ✅ Sentry init + tracing are already configured.

### 3) MCP wrapper integration check
- No usage of `Sentry.wrapMcpServerWithSentry` exists in repo search.
- No runtime usage of `@modelcontextprotocol/sdk`/`McpServer` found in app code.
- MCP content in repo is mostly setup/docs/scripts, not an in-process MCP server instance.
- Conclusion: ❌ MCP server wrapping is **not implemented** in this codebase.

### 4) Verification path check
- Since no in-process MCP server is wrapped, MCP-specific Sentry telemetry cannot be verified here yet.
- Conclusion: ⚠️ Verification step is blocked until MCP wrapper integration exists.

## Vercel-side Sentry check

### What is already configured correctly
- `next.config.ts` wraps Next config with `withSentryConfig(...)`.
- Sentry build plugin options are present (`org`, `project`, source map upload behavior).
- `automaticVercelMonitors: true` is enabled for Vercel Cron monitor instrumentation.
- Runtime release tagging uses Vercel commit SHA fallbacks:
  - server/edge: `SENTRY_RELEASE ?? VERCEL_GIT_COMMIT_SHA`
  - client: `NEXT_PUBLIC_SENTRY_RELEASE ?? NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`
- Conclusion: ✅ Vercel + Sentry integration is wired in code.

### What still depends on Vercel project environment variables
To fully work in Vercel production, these env vars must be set in the Vercel project:
- `SENTRY_AUTH_TOKEN` (for source map upload during build)
- `SENTRY_ORG`
- `SENTRY_PROJECT`
- `SENTRY_DSN` and/or `NEXT_PUBLIC_SENTRY_DSN` (runtime event ingestion)
- Optional release overrides: `SENTRY_RELEASE`, `NEXT_PUBLIC_SENTRY_RELEASE`

Without these env vars in Vercel, builds/events may partially degrade (non-blocking due to custom error handler), but deployment still succeeds.


## Risk-focused follow-up updates (applied)
- DSN remains environment-driven (`SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`) and is not hardcoded in runtime config files.
- Production tracing sample rate was tightened to `0.05` across server/edge/client init paths.
- `sendDefaultPii: false` is explicitly set in the shared `lib/sentry/init.ts` path as well.
- Release health tagging is explicit (`release` option + `Sentry.setTag("release", ...)`).
- Client integrations now include Sentry Feedback integration in addition to Replay.

## Practical recommendations
1. If this app should host an MCP server process, add runtime dependency `@modelcontextprotocol/sdk` and wrap that server instance with `Sentry.wrapMcpServerWithSentry(...)`.
2. Keep DSN in env variables (current approach), avoid hardcoding DSN in code snippets/docs.
3. Keep tracing enabled (already true), with production `tracesSampleRate` set to 0.05 to control cost.
4. Add a runbook/CI smoke test that sends at least one MCP request and confirms spans appear in Sentry.
5. In Vercel dashboard, verify Production + Preview env sets for all `SENTRY_*` variables above.

## Overall result
- The provided snippet is only **partially applicable** to this repository:
  - ✅ Sentry version/init/tracing (with 0.05 prod sampling), release tagging, and Vercel plugin wiring are in place.
  - ❌ MCP wrapper requirement is missing because there is no implemented in-process MCP server integration to wrap.
