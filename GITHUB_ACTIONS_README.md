# GitHub Actions — LiftGO CI/CD

## Workflows

### `ci.yml` — Main CI Pipeline

Triggers: push to `main`, all PRs to `main`

| Job | What it does |
|-----|-------------|
| `type-check` | `pnpm lint` (tsc --noEmit) |
| `test` | `pnpm test:unit` |
| `build` | `pnpm build` (Next.js production build) |
| `openapi` | Checks for OpenAPI spec drift (PRs only) |

Uses pnpm caching and Next.js build caching for speed.

### `pr-validation.yml` — PR Checks

Triggers: PR opened/edited/synced

| Job | What it does |
|-----|-------------|
| `validate-title` | Enforces Conventional Commits format |
| `label-pr` | Auto-labels PRs based on changed files |
| `check-size` | Warns if PR touches 50+ files |
| `validate-migrations` | Checks migration file naming convention |

**PR title format:** `type(optional-scope): description`

Examples:
- `feat: add ponudba comparison UI`
- `fix(auth): handle expired session redirect`
- `chore(deps): update stripe to v21`

### `supabase-deploy.yml` — Database Migrations

Triggers: push to `main` when `supabase/migrations/**` changes, or manual dispatch

Deploys migrations to production Supabase via `supabase db push`.
Requires `production` environment approval.

Required secrets: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_URL`, `SUPABASE_PROJECT_ID`

### `codeql-analysis.yml` — Security Scanning

Triggers: push/PR to `main`, weekly schedule (Monday 6 AM UTC)

- CodeQL static analysis (JavaScript/TypeScript)
- Dependency review on PRs (fails on HIGH severity vulnerabilities)
- Blocks merging of PRs that introduce vulnerable dependencies

## Branch Protection (recommended)

Configure in: GitHub → Settings → Branches → Add rule for `main`

```
✅ Require a pull request before merging
✅ Require approvals: 1
✅ Require status checks to pass:
   - Type Check
   - Tests
   - Build
   - CodeQL
✅ Require branches to be up to date before merging
✅ Do not allow bypassing the above settings
```

## Local Development

```bash
# Run same checks as CI locally
pnpm lint          # Type check
pnpm test:unit     # Unit tests
pnpm build         # Build check
pnpm openapi:check # OpenAPI drift check
```

## Secrets Reference

See `SECRETS_SETUP.md` for the full list of required GitHub secrets.

## Dependabot

Runs every Monday and opens PRs for:
- npm dependency updates (grouped by ecosystem: radix-ui, supabase, stripe, etc.)
- GitHub Actions version updates

Major version bumps for `next`, `react`, and `react-dom` are ignored (manual upgrade required).
