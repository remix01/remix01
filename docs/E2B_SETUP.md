# E2B Setup for MAS Agents

This project includes an E2B sandbox execution tool for AI agents: `execute_code_in_sandbox`.

## Required Vercel Environment Variable

In **Vercel Dashboard → Project → Settings → Environment Variables**, add:

- `E2B_API_KEY` (Secret)

## Required dependency

Install the official E2B SDK:

```bash
pnpm add @e2b/code-interpreter
```

## Where it is used

- `lib/ai/e2b.ts`: SDK integration for code execution using `Sandbox.create()` and `sandbox.runCode()`.
- `lib/ai/tools.ts`: registers `execute_code_in_sandbox` for agents.
- `lib/env.ts`: maps `E2B_API_KEY` so runtime can access it server-side.

## Notes

- Keep `E2B_API_KEY` server-only (never `NEXT_PUBLIC_*`).
- Redeploy after adding variables so serverless functions pick up values.
- Current implementation creates a sandbox for each execution and kills it after the run.
