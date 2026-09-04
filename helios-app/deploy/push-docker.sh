#!/usr/bin/env bash
# Build and restart the production Helios Docker container on the VPS.
# Requires SSHPASS in the environment (root password). Never commit that value.
# Usage: SSHPASS=... ./deploy/push-docker.sh [host]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-${HELIOS_DEPLOY_HOST:-154.222.19.38}}"
USER="${HELIOS_DEPLOY_USER:-root}"
REMOTE="${USER}@${HOST}"
REMOTE_DIR="${HELIOS_DEPLOY_DIR:-/root/helios-space-sp-/helios-app}"

if [[ -z "${SSHPASS:-}" ]]; then
  echo "SSHPASS is required (root password for ${REMOTE})." >&2
  exit 1
fi

if ! command -v sshpass >/dev/null 2>&1; then
  echo "sshpass is required." >&2
  exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync is required." >&2
  exit 1
fi

SSH=(sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20)
RSH="sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20"

echo "==> syncing ${ROOT} -> ${REMOTE}:${REMOTE_DIR}"
"${SSH[@]}" "$REMOTE" "mkdir -p '${REMOTE_DIR}'"
rsync -az --delete \
  --exclude node_modules \
  --exclude dist \
  --exclude '*.db' \
  --exclude '*.db-*' \
  --exclude .env \
  --exclude .git \
  -e "$RSH" \
  "$ROOT/" \
  "${REMOTE}:${REMOTE_DIR}/"

echo "==> rebuilding docker compose on ${REMOTE}"
"${SSH[@]}" "$REMOTE" "set -e
cd '${REMOTE_DIR}'
if [[ ! -f .env ]]; then
  echo 'Missing ${REMOTE_DIR}/.env with HELIOS_ADMIN_EMAIL and HELIOS_ADMIN_PASSWORD' >&2
  exit 1
fi
docker compose build
docker compose up -d --force-recreate
sleep 2
docker compose ps
curl -sI http://127.0.0.1:8080/ | head -12
"

echo "docker release live on ${HOST}"
