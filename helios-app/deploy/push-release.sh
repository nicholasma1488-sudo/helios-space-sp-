#!/usr/bin/env bash
# Push the current Helios Space build to the production VPS.
# Requires SSHPASS in the environment (root password). Never commit that value.
# Usage: SSHPASS=... ./deploy/push-release.sh [host]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${1:-${HELIOS_DEPLOY_HOST:-154.222.19.38}}"
USER="${HELIOS_DEPLOY_USER:-root}"
REMOTE="${USER}@${HOST}"

if [[ -z "${SSHPASS:-}" ]]; then
  echo "SSHPASS is required (root password for ${REMOTE})." >&2
  exit 1
fi

if ! command -v sshpass >/dev/null 2>&1; then
  echo "sshpass is required." >&2
  exit 1
fi

SSH=(sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20)
RSH="sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20"
RELEASE="$(date -u +%Y%m%d-%H%M)"

echo "==> building frontend"
cd "$ROOT"
npm ci
npm run build

echo "==> creating release ${RELEASE} on ${REMOTE}"
"${SSH[@]}" "$REMOTE" "mkdir -p /opt/helios-space/releases/${RELEASE}/dist /opt/helios-space/releases/${RELEASE}/server"

echo "==> syncing dist"
rsync -az --delete -e "$RSH" \
  "$ROOT/dist/" \
  "${REMOTE}:/opt/helios-space/releases/${RELEASE}/dist/"

echo "==> syncing server"
rsync -az --delete \
  --exclude node_modules \
  --exclude '*.db' \
  --exclude '*.db-*' \
  --exclude integration.test.mjs \
  -e "$RSH" \
  "$ROOT/server/" \
  "${REMOTE}:/opt/helios-space/releases/${RELEASE}/server/"

echo "==> installing and activating"
"${SSH[@]}" "$REMOTE" "set -e
cd /opt/helios-space/releases/${RELEASE}/server
npm ci --omit=dev
ln -sfn /opt/helios-space/releases/${RELEASE} /opt/helios-space/current
systemctl restart helios-space
sleep 2
systemctl is-active helios-space
readlink -f /opt/helios-space/current
curl -sI http://127.0.0.1:8080/ | head -12
"

echo "released ${RELEASE}"
