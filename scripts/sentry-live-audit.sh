#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${SENTRY_AUTH_TOKEN:-}" ]]; then
  echo "Missing SENTRY_AUTH_TOKEN env var" >&2
  exit 1
fi

BASES=(
  "https://sentry.io/api/0"
  "https://us.sentry.io/api/0"
  "https://de.sentry.io/api/0"
)

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
OUT="audit/sentry_live_audit_${TS}.json"
mkdir -p audit

echo '{' > "$OUT"
echo "  \"generated_at_utc\": \"$TS\"," >> "$OUT"
echo '  "results": [' >> "$OUT"

first=1
for base in "${BASES[@]}"; do
  for path in "/" "/organizations/"; do
    url="${base}${path}"
    set +e
    header_out="$(curl -I -sS -H "Authorization: Bearer ${SENTRY_AUTH_TOKEN}" "$url" 2>&1)"
    code=$?
    set -e
    status_line="$(printf '%s\n' "$header_out" | awk '/^HTTP\//{print; exit}')"
    curl_error="$(printf '%s\n' "$header_out" | awk '/^curl:/{print; exit}')"

    [[ $first -eq 0 ]] && echo '    ,' >> "$OUT"
    first=0
    cat >> "$OUT" <<JSON
    {
      "url": "${url}",
      "exit_code": ${code},
      "status_line": "${status_line}",
      "curl_error": "${curl_error}"
    }
JSON
  done
done

echo '' >> "$OUT"
echo '  ]' >> "$OUT"
echo '}' >> "$OUT"

echo "Saved: $OUT"
