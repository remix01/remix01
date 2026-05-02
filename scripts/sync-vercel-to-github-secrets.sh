#!/usr/bin/env bash
# sync-vercel-to-github-secrets.sh
# Pulls all env vars from Vercel production and sets them as GitHub Actions secrets.
#
# Requirements (install once):
#   npm i -g vercel           # Vercel CLI
#   gh auth login             # GitHub CLI
#
# Usage:
#   ./scripts/sync-vercel-to-github-secrets.sh
#   ./scripts/sync-vercel-to-github-secrets.sh --dry-run
#   ./scripts/sync-vercel-to-github-secrets.sh --env=preview
#   ./scripts/sync-vercel-to-github-secrets.sh preview --dry-run

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────
REPO="remix01/remix01"
VERCEL_ENV="production"
TEMP_ENV=".env.vercel-sync-tmp"
DRY_RUN=false

# Parse args — initialize defaults first, then parse flags
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --env=*) VERCEL_ENV="${arg#--env=}" ;;
    preview|production|development) VERCEL_ENV="$arg" ;;
  esac
done

# ── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; exit 1; }
dry()     { echo -e "${CYAN}[DRY]${NC} $1"; }

# ── Cleanup on exit ───────────────────────────────────────────────────────────
cleanup() { rm -f "$TEMP_ENV"; }
trap cleanup EXIT

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  LiftGO — Vercel → GitHub Secrets Sync"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Repo:        $REPO"
echo "  Vercel env:  $VERCEL_ENV"
echo "  Dry run:     $DRY_RUN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── Dependency checks ─────────────────────────────────────────────────────────
command -v vercel &>/dev/null || error "Vercel CLI not found. Install: npm i -g vercel"
command -v gh     &>/dev/null || error "GitHub CLI not found. Install: https://cli.github.com"

gh auth status &>/dev/null || error "Not authenticated with GitHub CLI. Run: gh auth login"
vercel whoami  &>/dev/null || error "Not authenticated with Vercel CLI. Run: vercel login"

# ── Pull env vars from Vercel ─────────────────────────────────────────────────
info "Pulling env vars from Vercel ($VERCEL_ENV)..."
vercel env pull "$TEMP_ENV" --environment="$VERCEL_ENV" --yes 2>/dev/null \
  || error "Failed to pull from Vercel. Ensure you're linked: vercel link"

# Count variables
TOTAL=$(grep -c '^[^#]' "$TEMP_ENV" 2>/dev/null || echo 0)
info "Found $TOTAL variables in Vercel $VERCEL_ENV environment"

# ── Secrets to SKIP (never push to GitHub — managed elsewhere or unsafe) ─────
SKIP_VARS=(
  "NODE_ENV"
  "NEXTAUTH_URL"
  "NEXT_PUBLIC_APP_URL"
  "NEXT_PUBLIC_URL"
  "SMTP_HOST"
  "SMTP_PORT"
  "SMTP_USER"
  "SMTP_PASSWORD"
  "SMTP_FROM"
  "STRIPE_PLATFORM_FEE_PERCENT"
  "STRIPE_PRO_FEE_PERCENT"
  "ESCROW_AUTO_RELEASE_DAYS"
  "MIGRATION_BATCH_SIZE"
)

is_skipped() {
  local name="$1"
  for skip in "${SKIP_VARS[@]}"; do
    [[ "$name" == "$skip" ]] && return 0
  done
  return 1
}

# ── Push to GitHub Secrets ────────────────────────────────────────────────────
echo ""
info "Syncing to GitHub Actions secrets for $REPO..."
echo ""

SYNCED=0
SKIPPED=0
EMPTY=0

while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip comments and blank lines
  [[ "$line" =~ ^#.*$ ]] && continue
  [[ -z "$line" ]] && continue

  # Parse NAME=VALUE (handle values with = inside)
  NAME="${line%%=*}"
  VALUE="${line#*=}"

  # Remove surrounding quotes if present
  VALUE="${VALUE%\"}"
  VALUE="${VALUE#\"}"
  VALUE="${VALUE%\'}"
  VALUE="${VALUE#\'}"

  # Skip empty values
  if [[ -z "$VALUE" ]]; then
    warn "  SKIP (empty)    $NAME"
    ((EMPTY++)) || true
    continue
  fi

  # Skip explicitly excluded vars
  if is_skipped "$NAME"; then
    warn "  SKIP (excluded) $NAME"
    ((SKIPPED++)) || true
    continue
  fi

  if $DRY_RUN; then
    dry "  Would set: $NAME (${#VALUE} chars)"
  else
    if gh secret set "$NAME" --body "$VALUE" --repo "$REPO" 2>/dev/null; then
      info "  SET  $NAME"
      ((SYNCED++)) || true
    else
      warn "  FAIL $NAME — skipping"
    fi
  fi

done < "$TEMP_ENV"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if $DRY_RUN; then
  echo -e "  ${CYAN}DRY RUN complete${NC} — no secrets were written"
else
  echo -e "  ${GREEN}Sync complete!${NC}"
  echo "  Secrets set:    $SYNCED"
  echo "  Skipped:        $SKIPPED"
  echo "  Empty (skipped): $EMPTY"
fi
echo ""
echo "  Verify at:"
echo "  https://github.com/$REPO/settings/secrets/actions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
