#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# LiftGO Documentation Reorganization Script
# ═══════════════════════════════════════════════════════════════════════════
set -e

echo "════════════════════════════════════════════════════════════════════"
echo "   LiftGO Documentation Reorganization"
echo "════════════════════════════════════════════════════════════════════"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Unmatched globs return nothing instead of the literal pattern string
shopt -s nullglob

# ───────────────────────────────────────────────────────────────────────────
# STEP 1: Create directory structure
# ───────────────────────────────────────────────────────────────────────────
echo "Creating docs/ directory structure..."
mkdir -p docs/{architecture,features,implementation,operations,guides,archive}
echo -e "${GREEN}✓${NC} Directories created"
echo ""

# ───────────────────────────────────────────────────────────────────────────
# STEP 2: Create docs/README.md index
# ───────────────────────────────────────────────────────────────────────────
echo "Creating docs/README.md index..."
cat > docs/README.md << 'DOCINDEX'
# LiftGO Documentation

Complete documentation for the LiftGO marketplace platform.

## Architecture
- [State Machine & Guards](architecture/state-machine.md)
- [Permission Layer](architecture/permission-layer.md)
- [Guardrails](architecture/guardrails.md)
- [AI Orchestrator](architecture/ai-orchestrator.md)
- [Task Engine](architecture/task-engine.md)

## Features
- [Admin Dashboard](features/admin-dashboard.md)
- [Obrtnik Dashboard](features/obrtnik-dashboard.md)
- [Portfolio Management](features/portfolio.md)
- [File Upload](features/file-upload.md)
- [Realtime System](features/realtime.md)
- [Stripe Integration](features/stripe.md)
- [PRO CRM](features/pro-crm.md)
- [Dispute Flow](features/dispute-flow.md)

## Implementation
- [Backend Setup](implementation/backend-setup.md)
- [Integration Guide](implementation/integration.md)
- [Refactoring](implementation/refactoring.md)
- [SEO](implementation/seo.md)

## Operations
- [Job Queue](operations/job-queue.md)
- [Tracing](operations/tracing.md)
- [Environment Validation](operations/env-validation.md)

## Guides
- [Chatbot Debug](guides/chatbot-debug.md)
- [Partner Migration](guides/partner-migration.md)
- [Mobile Fixes](guides/mobile-fixes.md)
- [Audit Phase 6](guides/audit-phase-6.md)

## Archive
Archived documentation for reference.

---
**Need help?** Check the main [README.md](../README.md).
DOCINDEX
echo -e "${GREEN}✓${NC} Documentation index created"
echo ""

# ───────────────────────────────────────────────────────────────────────────
# STEP 3: Consolidate and move files
# ───────────────────────────────────────────────────────────────────────────
echo "Consolidating and moving documentation files..."
echo ""

# Merge files matching a prefix into a single output file.
# Uses nullglob so unmatched patterns are silently skipped.
consolidate() {
  local pattern="$1"
  local output="$2"
  local title
  title=$(basename "$output" .md | tr '-' ' ' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2); print}')

  echo "  Merging ${pattern}* -> $output"

  {
    echo "# $title"
    echo ""
    echo "<!-- Consolidated from multiple source files -->"
    echo ""

    for file in "${pattern}"*.md "${pattern}"*.txt; do
      [ -f "$file" ] || continue
      echo "---"
      echo ""
      echo "## $(basename "$file")"
      echo ""
      cat "$file"
      echo ""
    done
  } > "$output"
}

# ARCHITECTURE
echo "Architecture documentation..."
consolidate "STATE_MACHINE"   "docs/architecture/state-machine.md"
consolidate "PERMISSION_LAYER" "docs/architecture/permission-layer.md"
consolidate "GUARDRAILS"      "docs/architecture/guardrails.md"
consolidate "AI_ORCHESTRATOR" "docs/architecture/ai-orchestrator.md"
consolidate "TASK_ENGINE"     "docs/architecture/task-engine.md"

# FEATURES (single files — use mv)
echo "Features documentation..."
mv ADMIN_DASHBOARD_COMPLETE.md          docs/features/admin-dashboard.md   2>/dev/null || true
mv ADMIN_RBAC_GUIDE.md                  docs/features/admin-rbac.md        2>/dev/null || true
mv ADMIN_SUPABASE_PHASE1.md             docs/features/admin-supabase.md    2>/dev/null || true
mv OBRTNIK_DASHBOARD_COMPLETE.md        docs/features/obrtnik-dashboard.md 2>/dev/null || true
mv PORTFOLIO_MANAGEMENT_COMPLETE.md     docs/features/portfolio.md         2>/dev/null || true
mv FILE_UPLOAD_INTEGRATION_GUIDE.md     docs/features/file-upload.md       2>/dev/null || true
mv STRIPE_INTEGRATION.md               docs/features/stripe.md            2>/dev/null || true
mv PRO_CRM_OFFER_GENERATOR_IMPLEMENTATION.md docs/features/pro-crm.md     2>/dev/null || true
mv DISPUTE_FLOW_IMPLEMENTATION.md       docs/features/dispute-flow.md      2>/dev/null || true

# Merge realtime files
cat REALTIME_NOTIFICATIONS.md REALTIME_SYSTEM_COMPLETE.md \
  > docs/features/realtime.md 2>/dev/null || true

# IMPLEMENTATION
echo "Implementation documentation..."
# Merge backend files; MARKETPLACE_BACKEND.md is included here and removed below
cat BACKEND_SETUP.md BACKEND_COMPLETE_SUMMARY.md MARKETPLACE_BACKEND.md \
  > docs/implementation/backend-setup.md 2>/dev/null || true

mv IMPLEMENTATION_SUMMARY.md  docs/implementation/overview.md     2>/dev/null || true
mv INTEGRATION_SUMMARY.md     docs/implementation/integration.md  2>/dev/null || true
mv REFACTOR_SUMMARY.md        docs/implementation/refactoring.md  2>/dev/null || true

# Merge SEO files; STRUCTURED_DATA_IMPLEMENTATION.md included here and removed below
cat SEO_IMPLEMENTATION.md SEO_LANDING_PAGES.md STRUCTURED_DATA_IMPLEMENTATION.md \
  > docs/implementation/seo.md 2>/dev/null || true

# OPERATIONS
echo "Operations documentation..."
consolidate "JOB_QUEUE" "docs/operations/job-queue.md"
mv TRACING_INTEGRATION_GUIDE.md docs/operations/tracing.md      2>/dev/null || true
mv ENV_VALIDATION_SUMMARY.md    docs/operations/env-validation.md 2>/dev/null || true

# GUIDES
echo "Guides documentation..."
mv CHATBOT_DEBUG.md      docs/guides/chatbot-debug.md   2>/dev/null || true
mv MOBILE_FIX_REPORT.md  docs/guides/mobile-fixes.md    2>/dev/null || true
mv PHASE_6_AUDIT_REPORT.md docs/guides/audit-phase-6.md 2>/dev/null || true

cat PARTNER_AUTH_AUDIT.md PARTNER_MIGRATION_SETUP.md \
  > docs/guides/partner-migration.md 2>/dev/null || true

# ARCHIVE — move pre-existing docs/ loose files
echo "Archiving pre-existing docs/ files..."
for f in docs/BEFORE_AFTER_LIQUIDITY_ENGINE.md docs/IMPLEMENTATION_CHECKLIST.md \
          docs/QUICK_REFERENCE.md docs/STEP_2_SUMMARY.md docs/STEP_3_LIQUIDITY_ENGINE.md \
          docs/STEP_5_OUTBOX_DLQ.md docs/TASK_ORCHESTRATOR.md docs/ORCHESTRATOR_EXAMPLES.ts; do
  [ -f "$f" ] && mv "$f" docs/archive/ 2>/dev/null || true
done

echo -e "${GREEN}✓${NC} Files consolidated and moved"
echo ""

# ───────────────────────────────────────────────────────────────────────────
# STEP 4: Clean up source files (only those merged with cat — mv already removes)
# ───────────────────────────────────────────────────────────────────────────
echo "Removing source files used in merges..."

# consolidate() sources (STATE_MACHINE*, PERMISSION_LAYER*, etc.)
rm -f STATE_MACHINE*.md STATE_MACHINE*.txt
rm -f PERMISSION_LAYER*.md
rm -f GUARDRAILS*.md
rm -f AI_ORCHESTRATOR*.md
rm -f TASK_ENGINE*.md
rm -f JOB_QUEUE*.md

# cat-merged sources
rm -f REALTIME_NOTIFICATIONS.md REALTIME_SYSTEM_COMPLETE.md
rm -f BACKEND_SETUP.md BACKEND_COMPLETE_SUMMARY.md MARKETPLACE_BACKEND.md
rm -f SEO_IMPLEMENTATION.md SEO_LANDING_PAGES.md STRUCTURED_DATA_IMPLEMENTATION.md
rm -f PARTNER_AUTH_AUDIT.md PARTNER_MIGRATION_SETUP.md

# Truly stale files
rm -f FILES_CREATED.md FILES_CREATED.txt

# Archive changelog material
mv FIXES_COMPLETED.md docs/archive/ 2>/dev/null || true

echo -e "${GREEN}✓${NC} Cleanup complete"
echo ""

# ───────────────────────────────────────────────────────────────────────────
# STEP 5: Create CHANGELOG.md
# ───────────────────────────────────────────────────────────────────────────
echo "Creating CHANGELOG.md..."
cat > CHANGELOG.md << 'CHANGELOG'
# Changelog

All notable changes to the LiftGO project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [Unreleased]

### Added
- Multi-agent AI system with cost management
- Tier-based AI usage limits (START: 5/day, PRO: 100/day)
- Redis caching for AI responses (30% cost savings)
- Intelligent model routing (Haiku vs Sonnet)
- Admin analytics dashboard for AI usage
- File upload integration across platform
- Work Description Agent for customers
- Offer Comparison Agent with AI recommendations
- Offer Writing Agent for craftsmen (PRO)

### Changed
- Documentation reorganized into structured docs/ folders
- Root directory cleaned (60+ files → README.md + CHANGELOG.md)

### Fixed
- Anthropic API model ID updated to claude-sonnet-4-20250514
- Build errors from v0.dev demo pages

## [1.0.0] - 2026-03-16

### Added
- State machine with permission guards
- Permission layer with RBAC
- Guardrails system for input validation
- Task engine with Upstash QStash
- Real-time notifications system
- Stripe subscription integration
- Admin dashboard with analytics
- Portfolio management for craftsmen
- File upload with Supabase Storage

### Infrastructure
- Next.js 14 App Router
- Supabase (PostgreSQL + Storage + Auth)
- Upstash (Redis + QStash)
- Stripe payments
- Vercel deployment
CHANGELOG
echo -e "${GREEN}✓${NC} CHANGELOG.md created"
echo ""

# ───────────────────────────────────────────────────────────────────────────
# STEP 6: Summary
# ───────────────────────────────────────────────────────────────────────────
echo "════════════════════════════════════════════════════════════════════"
echo -e "${GREEN}✓ Documentation reorganization complete!${NC}"
echo "════════════════════════════════════════════════════════════════════"
echo ""
echo "New structure:"
echo "  /"
echo "  ├── README.md"
echo "  ├── CHANGELOG.md"
echo "  └── docs/"
echo "      ├── README.md        (index)"
echo "      ├── architecture/    (5 files)"
echo "      ├── features/        (8+ files)"
echo "      ├── implementation/  (4 files)"
echo "      ├── operations/      (3 files)"
echo "      ├── guides/          (4 files)"
echo "      └── archive/         (old docs)"
echo ""
echo "Next steps:"
echo "  1. Review: ls -la docs/"
echo "  2. Commit: git add docs/ CHANGELOG.md && git add -u && git commit -m 'docs: reorganize into structured folders'"
echo ""
