# Claude Code Setup — LiftGO

## Installation

```bash
# macOS / Linux
curl -fsSL https://claude.ai/install.sh | sh

# Verify
claude --version
claude doctor
```

## Authentication

```bash
# Login with Anthropic account
claude auth login

# Or set API key directly
export ANTHROPIC_API_KEY=sk-ant-...
```

## Project Configuration

Claude Code automatically reads two files on startup:

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project context, codebase conventions, Slovenian terminology |
| `.claude/settings.json` | Tool permissions, model, ignored paths |
| `.claudeignore` | Files excluded from Claude's context |

Both are committed to the repo — no extra setup needed.

## MCP Servers

The project ships `.mcp.json` with 12 pre-configured MCP servers.
Claude Code loads them automatically.

```bash
claude mcp list           # list configured servers
claude mcp status         # check connection status
```

| Server | What you can ask Claude |
|--------|------------------------|
| `supabase` | "Show me the ponudbe table schema" |
| `stripe` | "List active subscriptions" |
| `upstash` | "Check Redis queue depth" |
| `sentry` | "Show latest errors in production" |
| `vercel` | "What's the latest deployment status?" |
| `resend` | "List recent email sends" |
| `github` | "Show open PRs" |

## Key Commands

```bash
claude                    # start interactive session
claude "fix the bug in lib/agents/ai-router.ts"   # one-shot
claude --continue         # resume last session
claude mcp list           # check MCP servers
claude doctor             # diagnose issues
```

## LiftGO-Specific Prompts

### Database
```
"Show all RLS policies on the tasks table"
"Write a migration to add expires_at to ponudbe"
"Check if there are any tables without RLS enabled"
```

### AI Agents
```
"Explain how lib/agents/ai-router.ts routes requests"
"Add error handling to the quote_generator agent"
"Show the AI usage logs for the last 24 hours via Supabase MCP"
```

### Debugging
```
"Show production errors from Sentry for the last hour"
"Check Redis queue depth in Upstash"
"What's the current Vercel deployment status?"
```

### Code Generation
```
"Create a new API route at /api/v1/ratings following the existing pattern in /api/v1/analytics"
"Add a ponudba status badge component following the design in components/ui/"
"Write a test for lib/stripe/webhooks.ts"
```

## Model

Default model configured in `.claude/settings.json`:
```json
{ "model": "claude-opus-4-5" }
```

Change per-session: `claude --model claude-sonnet-4-5`

## Slash Commands

| Command | What it does |
|---------|-------------|
| `/init` | Initialize or update CLAUDE.md |
| `/review` | Review current branch changes |
| `/security-review` | Full security review of pending changes |
| `/simplify` | Review changed code for quality and simplify |
| `/<Tab>` | List all available commands |

## Git Workflow with Claude Code

```bash
# Feature development
claude "implement the narocnik review flow per the spec in CLAUDE.md"

# Review before commit
/review

# Security check before PR
/security-review

# Claude auto-formats commit messages with session URL for traceability
git log --oneline -5
```

## Troubleshooting

**`claude doctor` shows MCP server disconnected**
→ Check env vars referenced in `.mcp.json` are set in your shell

**Context seems stale / Claude doesn't know about recent changes**
→ `/init` to refresh CLAUDE.md, or start a new session

**Rate limited**
→ Claude Max plan removes limits; or switch to `claude-sonnet-4-5` for lighter requests

**MCP Supabase returns empty results**
→ Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are exported in your shell
