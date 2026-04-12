#!/usr/bin/env bash
set -euo pipefail

PROJECT_REF="${PROJECT_REF:-wgdbjpobxvjytvhpjslv}"
MCP_SERVER_NAME="${MCP_SERVER_NAME:-supabase}"
MCP_URL="${MCP_URL:-https://mcp.supabase.com/mcp?project_ref=${PROJECT_REF}}"
CODEX_BIN="${CODEX_BIN:-}"
INSTALL_SKILLS="${INSTALL_SKILLS:-0}"
SUPABASE_TOKEN_ENV_VAR="${SUPABASE_TOKEN_ENV_VAR:-SUPABASE_ACCESS_TOKEN}"

log() { echo "[setup-supabase-mcp] $*"; }
warn() { echo "[setup-supabase-mcp] WARNING: $*" >&2; }
err() { echo "[setup-supabase-mcp] ERROR: $*" >&2; }

resolve_codex_bin() {
  if [[ -n "${CODEX_BIN}" ]]; then
    if [[ ! -x "${CODEX_BIN}" ]]; then
      err "CODEX_BIN is set but not executable: ${CODEX_BIN}"
      exit 1
    fi
    return
  fi

  if [[ -x "/opt/codex/bin/codex" ]]; then
    CODEX_BIN="/opt/codex/bin/codex"
  elif command -v codex >/dev/null 2>&1; then
    CODEX_BIN="$(command -v codex)"
  else
    err "codex CLI not found. Install it or set CODEX_BIN=/path/to/codex"
    exit 1
  fi
}

ensure_remote_mcp_enabled() {
  local config_dir config_path tmp
  config_dir="${HOME}/.codex"
  config_path="${config_dir}/config.toml"
  tmp="${config_path}.tmp"

  mkdir -p "${config_dir}"

  if [[ ! -f "${config_path}" ]]; then
    cat > "${config_path}" <<'TOML'
[mcp]
remote_mcp_client_enabled = true
TOML
    log "Created ${config_path} with [mcp].remote_mcp_client_enabled = true"
    return
  fi

  if ! rg -q '^\[mcp\]$' "${config_path}"; then
    {
      echo
      echo "[mcp]"
      echo "remote_mcp_client_enabled = true"
    } >> "${config_path}"
    log "Appended missing [mcp] section to ${config_path}"
    return
  fi

  # Ensure this key is set to true specifically inside the [mcp] table.
  awk '
    BEGIN { in_mcp=0; handled=0 }

    /^\[.*\]$/ {
      if (in_mcp && !handled) {
        print "remote_mcp_client_enabled = true"
        handled=1
      }
      in_mcp = ($0 == "[mcp]")
      print
      next
    }

    {
      if (in_mcp && $0 ~ /^remote_mcp_client_enabled[[:space:]]*=/) {
        print "remote_mcp_client_enabled = true"
        handled=1
      } else {
        print
      }
    }

    END {
      if (in_mcp && !handled) {
        print "remote_mcp_client_enabled = true"
      }
    }
  ' "${config_path}" > "${tmp}"

  mv "${tmp}" "${config_path}"
  log "Ensured [mcp].remote_mcp_client_enabled = true in ${config_path}"
}

ensure_mcp_server() {
  local existing_json existing_url

  if existing_json="$(${CODEX_BIN} mcp get "${MCP_SERVER_NAME}" --json 2>/dev/null)"; then
    existing_url="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("transport",{}).get("url", ""))' <<<"${existing_json}" 2>/dev/null || true)"

    if [[ "${existing_url}" == "${MCP_URL}" ]]; then
      log "MCP server '${MCP_SERVER_NAME}' already configured with correct URL"
      return
    fi

    warn "MCP server '${MCP_SERVER_NAME}' exists but URL differs. Replacing configuration."
    ${CODEX_BIN} mcp remove "${MCP_SERVER_NAME}"
  fi

  log "Adding MCP server '${MCP_SERVER_NAME}' => ${MCP_URL}"
  ${CODEX_BIN} mcp add "${MCP_SERVER_NAME}" --url "${MCP_URL}" --bearer-token-env-var "${SUPABASE_TOKEN_ENV_VAR}"
}

should_attempt_login() {
  local server_json auth_status

  if ! server_json="$(${CODEX_BIN} mcp get "${MCP_SERVER_NAME}" --json 2>/dev/null)"; then
    return 1
  fi

  auth_status="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print((d.get("auth_status") or "").strip().lower())' <<<"${server_json}" 2>/dev/null || true)"

  if [[ "${auth_status}" == "unsupported" ]]; then
    warn "MCP auth is unsupported in this Codex environment; skipping login."
    return 1
  fi

  return 0
}

install_supabase_skills() {
  if [[ "${INSTALL_SKILLS}" != "1" ]]; then
    log "Optional: INSTALL_SKILLS=1 to run: npx skills add supabase/agent-skills"
    return
  fi

  if ! command -v npx >/dev/null 2>&1; then
    warn "npx is not installed; skipping optional skills installation"
    return
  fi

  log "Installing optional Supabase skills"
  if ! npx skills add supabase/agent-skills; then
    warn "Could not install skills (often network or npm registry restriction)."
  fi
}

main() {
  resolve_codex_bin
  log "Using Codex binary: ${CODEX_BIN}"

  ensure_remote_mcp_enabled
  ensure_mcp_server

  log "Current MCP servers:"
  ${CODEX_BIN} mcp list

  if should_attempt_login; then
    log "Starting interactive auth with: ${CODEX_BIN} mcp login ${MCP_SERVER_NAME}"
    if [[ -t 0 && -t 1 ]]; then
      ${CODEX_BIN} mcp login "${MCP_SERVER_NAME}" || warn "Login command failed; retry manually."
    else
      warn "No TTY detected; skipping interactive login. Run manually in a terminal."
    fi
  fi

  install_supabase_skills

  log "Done."
  log "If auth still fails, verify Supabase OAuth Server is enabled and the project ref is correct (${PROJECT_REF})."
}

main "$@"
