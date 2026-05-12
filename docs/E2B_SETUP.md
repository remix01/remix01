# E2B Setup for MAS Agents

This project includes an E2B sandbox execution tool for AI agents: `execute_code_in_sandbox`.

## Required Vercel Environment Variable

In **Vercel Dashboard → Project → Settings → Environment Variables**, add:

- `E2B_API_KEY` (Secret)

Optional override:

- `E2B_BASE_URL` (defaults to `https://api.e2b.dev`)

## Where it is used

- `lib/ai/e2b.ts`: REST integration for code execution against E2B.
- `lib/ai/tools.ts`: registers `execute_code_in_sandbox` for agents.
- `lib/env.ts`: maps `E2B_API_KEY` so runtime can access it server-side.

## Notes

- Keep `E2B_API_KEY` server-only (never `NEXT_PUBLIC_*`).
- Redeploy after adding variables so serverless functions pick up values.
