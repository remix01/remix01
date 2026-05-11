#!/bin/sh
# =============================================================================
# MinIO Initialization Script
# Runs via the minio-init service in docker-compose.
# Creates buckets, sets public-read policies, and creates an app service account.
# =============================================================================

set -e

MINIO_ALIAS="liftgo"
MC="mc"

echo "[minio-init] Waiting for MinIO to be ready..."
until $MC alias set "${MINIO_ALIAS}" \
  "${MINIO_ENDPOINT:-http://minio:9000}" \
  "${MINIO_ROOT_USER:-minioadmin}" \
  "${MINIO_ROOT_PASSWORD:-minioadmin}" \
  > /dev/null 2>&1; do
  sleep 2
done
echo "[minio-init] MinIO is ready."

# ─── Public buckets ────────────────────────────────────────────────────────────
PUBLIC_BUCKETS="agent-uploads inquiry-attachments chat-attachments portfolio mojster-galerija profilne-slike"

for BUCKET in $PUBLIC_BUCKETS; do
  if $MC ls "${MINIO_ALIAS}/${BUCKET}" > /dev/null 2>&1; then
    echo "[minio-init] Bucket '${BUCKET}' already exists – skipping."
  else
    $MC mb "${MINIO_ALIAS}/${BUCKET}"
    echo "[minio-init] Created bucket '${BUCKET}'."
  fi

  # Apply anonymous read policy
  $MC anonymous set public "${MINIO_ALIAS}/${BUCKET}"
  echo "[minio-init] Applied public-read policy to '${BUCKET}'."

  # Lifecycle: delete incomplete multipart uploads after 7 days
  $MC ilm rule add --expire-days 7 "${MINIO_ALIAS}/${BUCKET}" > /dev/null 2>&1 || true
done

# ─── Private buckets ──────────────────────────────────────────────────────────
PRIVATE_BUCKETS="task-images mojster-certifikati"

for BUCKET in $PRIVATE_BUCKETS; do
  if $MC ls "${MINIO_ALIAS}/${BUCKET}" > /dev/null 2>&1; then
    echo "[minio-init] Bucket '${BUCKET}' already exists – skipping."
  else
    $MC mb "${MINIO_ALIAS}/${BUCKET}"
    echo "[minio-init] Created private bucket '${BUCKET}'."
  fi

  # Ensure no public access on private buckets
  $MC anonymous set none "${MINIO_ALIAS}/${BUCKET}" > /dev/null 2>&1 || true
done

# ─── Application service account ──────────────────────────────────────────────
# Creates a dedicated service account (non-root) for the Next.js app.
# Credentials are taken from MINIO_ACCESS_KEY / MINIO_SECRET_KEY env vars.
if [ -n "${MINIO_ACCESS_KEY}" ] && [ -n "${MINIO_SECRET_KEY}" ]; then
  EXISTING=$($MC admin user list "${MINIO_ALIAS}" 2>/dev/null | grep "^${MINIO_ACCESS_KEY}" || true)
  if [ -z "${EXISTING}" ]; then
    $MC admin user add "${MINIO_ALIAS}" "${MINIO_ACCESS_KEY}" "${MINIO_SECRET_KEY}"
    echo "[minio-init] Created service account '${MINIO_ACCESS_KEY}'."

    # Attach a readwrite policy scoped to the application buckets
    $MC admin policy attach "${MINIO_ALIAS}" readwrite \
      --user "${MINIO_ACCESS_KEY}" > /dev/null 2>&1 || true
    echo "[minio-init] Attached readwrite policy to service account."
  else
    echo "[minio-init] Service account '${MINIO_ACCESS_KEY}' already exists – skipping."
  fi
else
  echo "[minio-init] MINIO_ACCESS_KEY / MINIO_SECRET_KEY not set – using root credentials."
fi

echo "[minio-init] Initialisation complete."
