#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

echo ""
echo "🚀 LiftGO GitHub Actions Setup"
echo "================================"
echo ""

# Check Node.js
NODE_REQUIRED=20
NODE_CURRENT=$(node -v 2>/dev/null | sed 's/v//' | cut -d. -f1 || echo "0")
if [ "$NODE_CURRENT" -lt "$NODE_REQUIRED" ]; then
  error "Node.js $NODE_REQUIRED+ required. Found: $(node -v 2>/dev/null || echo 'not installed')"
fi
info "Node.js $(node -v) ✓"

# Check pnpm
if ! command -v pnpm &>/dev/null; then
  info "Installing pnpm via corepack..."
  corepack enable
  corepack prepare pnpm@9.15.9 --activate
fi
info "pnpm $(pnpm -v) ✓"

# Install dependencies
info "Installing dependencies..."
pnpm install --frozen-lockfile

# Create .prettierrc if missing
if [ ! -f .prettierrc ]; then
  info "Creating .prettierrc..."
  cat > .prettierrc << 'EOF'
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
EOF
fi

# Create jest.config.js if missing
if [ ! -f jest.config.js ] && [ ! -f jest.config.ts ] && [ ! -f jest.config.cjs ]; then
  info "Creating jest.config.js..."
  cat > jest.config.js << 'EOF'
export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/api/**/*.ts',
    '!**/*.d.ts',
  ],
}
EOF
fi

echo ""
info "Setup complete! Next steps:"
echo ""
echo "  1. Configure GitHub Secrets (see SECRETS_SETUP.md)"
echo "  2. Commit and push:"
echo "     git add ."
echo "     git commit -m 'ci: setup GitHub Actions'"
echo "     git push"
echo ""
echo "  3. Go to GitHub → Actions tab to watch workflows run"
echo ""
