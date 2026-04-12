#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="wgdbjpobxvjytvhpjslv"
MCP_URL="https://mcp.supabase.com/mcp?project_ref=${PROJECT_REF}"
CODEX_BIN="${CODEX_BIN:-}"
INSTALL_SKILLS="${INSTALL_SKILLS:-0}"

if [[ -z "${CODEX_BIN}" ]]; then
  if [[ -x "/opt/codex/bin/codex" ]]; then
    CODEX_BIN="/opt/codex/bin/codex"
  elif command -v codex >/dev/null 2>&1; then
    CODEX_BIN="$(command -v codex)"
  else
    echo "Error: codex CLI not found. Install Codex CLI or set CODEX_BIN." >&2
    exit 1
  fi
fi

mkdir -p "${HOME}/.codex"
CONFIG_PATH="${HOME}/.codex/config.toml"

if [[ ! -f "${CONFIG_PATH}" ]]; then
  cat > "${CONFIG_PATH}" <<'TOML'
[mcp]
remote_mcp_client_enabled = true
TOML
else
  if ! rg -q '^\[mcp\]$' "${CONFIG_PATH}"; then
    {
      echo
      echo "[mcp]"
    } >> "${CONFIG_PATH}"
  fi

  if ! rg -q '^remote_mcp_client_enabled\s*=\s*true\s*$' "${CONFIG_PATH}"; then
    awk '
      BEGIN { in_mcp=0; inserted=0 }
      /^\[.*\]$/ {
        if (in_mcp && !inserted) {
          print "remote_mcp_client_enabled = true"
          inserted=1
        }
        in_mcp = ($0 == "[mcp]")
        print
        next
      }
      { print }
      END {
        if (in_mcp && !inserted) print "remote_mcp_client_enabled = true"
      }
    ' "${CONFIG_PATH}" > "${CONFIG_PATH}.tmp"
    mv "${CONFIG_PATH}.tmp" "${CONFIG_PATH}"
  fi
fi

echo "Using Codex binary: ${CODEX_BIN}"
echo "Adding Supabase MCP server..."
"${CODEX_BIN}" mcp add supabase --url "${MCP_URL}" || true

MCP_LIST_OUTPUT="$("${CODEX_BIN}" mcp list)"
echo "${MCP_LIST_OUTPUT}"

if echo "${MCP_LIST_OUTPUT}" | grep -E '^supabase\s' | grep -q 'Unsupported'; then
  echo "Skipping 'mcp login supabase': auth is unsupported in this Codex environment."
else
  echo "Starting Supabase MCP login..."
  "${CODEX_BIN}" mcp login supabase
fi

if [[ "${INSTALL_SKILLS}" == "1" ]]; then
  echo "Installing Supabase agent skills..."
  if ! npx skills add supabase/agent-skills; then
    echo "Warning: skill install failed (e.g., npm registry HTTP 403 in restricted environments)."
  fi
else
  echo "Optional: set INSTALL_SKILLS=1 to run: npx skills add supabase/agent-skills"
fi
