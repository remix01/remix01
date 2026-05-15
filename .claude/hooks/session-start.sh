#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-/home/user/remix01}"

echo "[session-start] Installing pnpm dependencies..."
pnpm install
echo "[session-start] Done."
