#!/usr/bin/env bash
# Publish a new Helios Space release to the existing VPS.
# Does not replace /var/lib/helios-space (SQLite).
#
# Required env:
#   SSHPASS     root password for the VPS (sshpass -e)
# Optional:
#   SSH_USER    default root
#   SSH_HOST    default 149.88.73.252
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH_USER="${SSH_USER:-root}"
SSH_HOST="${SSH_HOST:-149.88.73.252}"
TARGET="$SSH_USER@$SSH_HOST"
RSH='sshpass -e ssh -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no'

if [[ -z "${SSHPASS:-}" ]]; then
  echo "SSHPASS is required (do not commit it)." >&2
  exit 1
fi
command -v sshpass >/dev/null || { echo "sshpass is required." >&2; exit 1; }
command -v rsync >/dev/null || { echo "rsync is required." >&2; exit 1; }

echo "Building frontend…"
(cd "$ROOT" && npm run build)

RELEASE="$($RSH "$TARGET" 'date +%Y%m%d-%H%M')"
REMOTE_ROOT="/opt/helios-space/releases/$RELEASE"
echo "Publishing release $RELEASE to $SSH_HOST…"

$RSH "$TARGET" "mkdir -p '$REMOTE_ROOT/dist' '$REMOTE_ROOT/server'"

rsync -az --delete -e "$RSH" \
  "$ROOT/dist/" \
  "$TARGET:$REMOTE_ROOT/dist/"

rsync -az --delete \
  --exclude node_modules \
  --exclude '*.db' \
  --exclude '*.db-*' \
  --exclude integration.test.mjs \
  -e "$RSH" \
  "$ROOT/server/" \
  "$TARGET:$REMOTE_ROOT/server/"

$RSH "$TARGET" "set -e
cd '$REMOTE_ROOT/server'
npm ci --omit=dev
ln -sfn '$REMOTE_ROOT' /opt/helios-space/current
systemctl restart helios-space
sleep 2
systemctl is-active helios-space
readlink -f /opt/helios-space/current
curl -sI http://127.0.0.1:8080/ | head -12
"

ASSET="$(grep -oE '/assets/[^"]+\.js' "$ROOT/dist/index.html" | head -1 || true)"
echo "Verifying public site…"
curl -fsSI "https://helioschat.space/" | head -20
if [[ -n "$ASSET" ]]; then
  curl -fsSI "https://helioschat.space$ASSET" | head -12
  if curl -fsS "https://helioschat.space/" | grep -F -q "$ASSET"; then
    echo "Live HTML serves $ASSET"
  else
    echo "WARNING: live HTML does not yet mention $ASSET" >&2
    exit 1
  fi
fi
curl -fsS "https://helioschat.space/api/site"
echo
echo "Deployed $RELEASE"
