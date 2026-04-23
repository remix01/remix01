#!/bin/bash
# LiftGO GitHub Actions Setup Script
# Author: remix01
# Version: 1.0.0

set -e

echo "🚀 LiftGO GitHub Actions Setup"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── Git check ─────────────────────────────────────────────────────────────────
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: Not a git repository${NC}"
  echo "Run this script from your project root"
  exit 1
fi
echo -e "${GREEN}✓${NC} Git repository detected"
echo ""

# ── Node.js version ───────────────────────────────────────────────────────────
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo -e "${RED}❌ Node.js version 20+ required${NC}"
  echo "Current version: $(node -v)"
  exit 1
fi
echo -e "${GREEN}✓${NC} Node.js version OK: $(node -v)"

# ── pnpm check ────────────────────────────────────────────────────────────────
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm via corepack..."
  corepack enable
  corepack prepare pnpm@9.15.9 --activate
fi
echo -e "${GREEN}✓${NC} pnpm version OK: $(pnpm -v)"

# ── Directory structure ───────────────────────────────────────────────────────
echo ""
echo "📁 Creating directory structure..."

mkdir -p .github/workflows
mkdir -p .github/ISSUE_TEMPLATE

echo -e "${GREEN}✓${NC} Directories created"

# ── Install dependencies ──────────────────────────────────────────────────────
echo ""
echo "📦 Installing dependencies..."

pnpm install --frozen-lockfile

# Install dev tooling (skip if already present)
MISSING_DEPS=()
node -e "require('./node_modules/husky')" 2>/dev/null             || MISSING_DEPS+=(husky)
node -e "require('./node_modules/lint-staged')" 2>/dev/null       || MISSING_DEPS+=(lint-staged)
node -e "require('./node_modules/prettier')" 2>/dev/null          || MISSING_DEPS+=(prettier)
node -e "require('./node_modules/@testing-library/react')" 2>/dev/null || MISSING_DEPS+=("@testing-library/react")
node -e "require('./node_modules/@testing-library/jest-dom')" 2>/dev/null || MISSING_DEPS+=("@testing-library/jest-dom")

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
  echo "Installing missing dev deps: ${MISSING_DEPS[*]}"
  pnpm add --save-dev "${MISSING_DEPS[@]}"
fi

echo -e "${GREEN}✓${NC} Dependencies installed"

# ── Husky (git hooks) ─────────────────────────────────────────────────────────
echo ""
echo "🐶 Setting up Husky..."

# Husky v9+ uses direct file approach (not deprecated `husky add`)
pnpm exec husky init

echo "pnpm exec lint-staged" > .husky/pre-commit
echo "pnpm lint" > .husky/pre-push

chmod +x .husky/pre-commit .husky/pre-push

echo -e "${GREEN}✓${NC} Husky configured (pre-commit: lint-staged, pre-push: type-check)"

# ── .prettierrc ───────────────────────────────────────────────────────────────
if [ ! -f .prettierrc ]; then
  echo ""
  echo "💅 Creating .prettierrc..."
  cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
EOF
  echo -e "${GREEN}✓${NC} .prettierrc created"
fi

# ── lint-staged config in package.json ───────────────────────────────────────
if ! node -e "const p=require('./package.json'); process.exit(p['lint-staged']?0:1)" 2>/dev/null; then
  echo ""
  echo "📝 Adding lint-staged config to package.json..."
  node --input-type=module << 'JSEOF'
import { readFileSync, writeFileSync } from 'fs'
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
if (!pkg['lint-staged']) {
  pkg['lint-staged'] = {
    '*.{ts,tsx}': ['prettier --write', 'tsc --noEmit --skipLibCheck'],
    '*.{js,mjs,cjs}': ['prettier --write'],
    '*.{json,md,yml,yaml}': ['prettier --write']
  }
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
  console.log('lint-staged config added to package.json')
}
JSEOF
fi

# ── jest.config.js ────────────────────────────────────────────────────────────
# Skip if any jest config already exists (project has jest.config.escrow.cjs)
if [ ! -f jest.config.js ] && [ ! -f jest.config.ts ] && [ ! -f jest.config.mjs ]; then
  echo ""
  echo "🧪 Creating jest.config.js..."
  # Project uses "type":"module" — use ESM-compatible config
  cat > jest.config.js << 'EOF'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

export default createJestConfig(config)
EOF
  echo -e "${GREEN}✓${NC} jest.config.js created"
fi

# ── jest.setup.ts ─────────────────────────────────────────────────────────────
if [ ! -f jest.setup.ts ] && [ ! -f jest.setup.js ]; then
  cat > jest.setup.ts << 'EOF'
import '@testing-library/jest-dom'
EOF
  echo -e "${GREEN}✓${NC} jest.setup.ts created"
fi

# ── GitHub CLI features ───────────────────────────────────────────────────────
echo ""
echo "🔍 Checking GitHub CLI..."

if command -v gh &> /dev/null; then
  echo -e "${GREEN}✓${NC} GitHub CLI detected"

  if gh auth status &> /dev/null; then
    echo -e "${GREEN}✓${NC} GitHub CLI authenticated"

    echo ""
    echo "Would you like to enable GitHub security features? (y/n)"
    read -r enable_features

    if [ "$enable_features" = "y" ]; then
      REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
      echo ""

      echo "Enabling Dependabot vulnerability alerts..."
      gh api -X PUT "/repos/${REPO}/vulnerability-alerts" 2>/dev/null \
        && echo -e "${GREEN}✓${NC} Dependabot vulnerability alerts enabled" \
        || echo -e "${YELLOW}⚠${NC} Could not enable vulnerability alerts (may already be on)"

      echo "Enabling Dependabot security updates..."
      gh api -X PUT "/repos/${REPO}/automated-security-fixes" 2>/dev/null \
        && echo -e "${GREEN}✓${NC} Dependabot security updates enabled" \
        || echo -e "${YELLOW}⚠${NC} Could not enable security updates"

      echo "Enabling secret scanning..."
      gh api -X PATCH "/repos/${REPO}" \
        --field security_and_analysis='{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}' \
        2>/dev/null \
        && echo -e "${GREEN}✓${NC} Secret scanning + push protection enabled" \
        || echo -e "${YELLOW}⚠${NC} Could not enable secret scanning (requires GitHub Advanced Security)"
    fi
  else
    echo -e "${YELLOW}⚠${NC} GitHub CLI not authenticated — run: gh auth login"
  fi
else
  echo -e "${YELLOW}⚠${NC} GitHub CLI not installed — install from: https://cli.github.com/"
fi

# ── Final checklist ───────────────────────────────────────────────────────────
echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Sync Vercel env vars → GitHub Secrets:"
echo "   ${YELLOW}→${NC} ./scripts/sync-vercel-to-github-secrets.sh --dry-run"
echo "   ${YELLOW}→${NC} ./scripts/sync-vercel-to-github-secrets.sh"
echo ""
echo "2. Create GitHub 'production' environment:"
echo "   ${YELLOW}→${NC} GitHub → Settings → Environments → New → 'production'"
echo "   ${YELLOW}→${NC} Add required reviewer: @remix01, branch: main only"
echo ""
echo "3. Enable branch protection on main:"
echo "   ${YELLOW}→${NC} GitHub → Settings → Branches → Add rule"
echo "   ${YELLOW}→${NC} Require checks: 'Type Check', 'Tests', 'Build', 'Analyze'"
echo ""
echo "4. Test workflows:"
echo "   ${YELLOW}→${NC} git add ."
echo "   ${YELLOW}→${NC} git commit -m \"ci: setup GitHub Actions\""
echo "   ${YELLOW}→${NC} git push"
echo ""
echo "5. Review documentation:"
echo "   ${YELLOW}→${NC} GITHUB_ACTIONS_README.md"
echo "   ${YELLOW}→${NC} SECRETS_SETUP.md"
echo ""
echo "🎉 Happy coding!"
