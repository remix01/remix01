# LiftGO — Installation Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22+ | [nodejs.org](https://nodejs.org) |
| pnpm | 9+ | `corepack enable && corepack prepare pnpm@9.15.9 --activate` |
| Git | any | pre-installed |
| GitHub CLI | any | [cli.github.com](https://cli.github.com) |
| Vercel CLI | any | `npm i -g vercel` |

---

## Option A — GitHub Actions Only (5 min)

### 1. Clone and run setup

```bash
git clone https://github.com/remix01/remix01.git
cd remix01
./setup-github-actions.sh
```

### 2. Sync secrets from Vercel

```bash
vercel login          # one-time
vercel link           # link to v0-liftgo-platform-concept
gh auth login         # one-time

./scripts/sync-vercel-to-github-secrets.sh --dry-run   # preview
./scripts/sync-vercel-to-github-secrets.sh             # apply
```

### 3. Create production environment

GitHub → Settings → Environments → New environment
- Name: `production`
- Required reviewers: `@remix01`
- Deployment branches: `main` only

### 4. Enable branch protection

GitHub → Settings → Branches → Add rule for `main`:
- Require PR reviews (1 approval)
- Required status checks: `Type Check`, `Tests`, `Build`, `Analyze`
- Dismiss stale reviews on new commits

### 5. Push and watch

```bash
git add .
git commit -m "ci: setup GitHub Actions CI/CD"
git push
# GitHub → Actions tab — watch all 5 workflows
```

---

## Option B — Claude Code Only (2 min)

### 1. Install Claude Code

```bash
# macOS / Linux
curl -fsSL https://claude.ai/install.sh | sh

# Or via npm
npm install -g @anthropic-ai/claude-code
```

### 2. Configure project

```bash
cd ~/path/to/remix01

# Claude Code picks up CLAUDE.md and .claude/settings.json automatically
claude
```

### 3. Verify MCP servers

```bash
claude mcp list
# Should show: supabase, stripe, upstash, sentry, github, vercel, resend
```

---

## Option C — Complete Setup (10 min)

Both GitHub Actions + Claude Code:

```bash
# Step 1 — GitHub Actions
./setup-github-actions.sh
./scripts/sync-vercel-to-github-secrets.sh

# Step 2 — Claude Code
curl -fsSL https://claude.ai/install.sh | sh

# Step 3 — Verify
claude doctor

# Step 4 — Test full pipeline
git add .
git commit -m "feat: complete DevOps setup"
git push
claude   # start coding
```

---

## Workflows at a Glance

| Workflow | Trigger | Duration |
|----------|---------|---------|
| `ci.yml` | Push / PR | ~5 min |
| `pr-validation.yml` | PR open/edit | ~1 min |
| `claude-code-validation.yml` | PR to main | ~2 min |
| `codeql-analysis.yml` | Push / weekly | ~8 min |
| `supabase-deploy.yml` | Merge to main (migrations) | ~2 min |

---

## Troubleshooting

**Workflow fails: missing secret**
→ Run `./scripts/sync-vercel-to-github-secrets.sh` or add manually via GitHub → Settings → Secrets

**`vercel link` fails**
→ Ensure you're in the project root: `vercel link --project v0-liftgo-platform-concept --team info-36187542s`

**`pnpm install` fails**
→ `corepack enable && corepack prepare pnpm@9.15.9 --activate`

**Claude Code can't find MCP servers**
→ Check `.mcp.json` exists and env vars are set: `cat .mcp.json`

**Supabase migration deploy fails**
→ Verify `SUPABASE_DB_URL` secret is the full PostgreSQL URI from Supabase → Project Settings → Database → Connection string → URI mode

See also: `GITHUB_ACTIONS_README.md` · `SECRETS_SETUP.md` · `CLAUDE_CODE_SETUP.md`
