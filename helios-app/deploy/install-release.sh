#!/usr/bin/env bash
# Activate a release directory that already exists on the VPS.
# Usage (on the server, as root): ./install-release.sh /opt/helios-space/releases/YYYYMMDD-HHMM
set -euo pipefail

RELEASE_DIR="${1:-}"
if [[ -z "$RELEASE_DIR" || ! -d "$RELEASE_DIR/server" || ! -d "$RELEASE_DIR/dist" ]]; then
  echo "usage: $0 /opt/helios-space/releases/<version>" >&2
  exit 1
fi

cd "$RELEASE_DIR/server"
npm ci --omit=dev
ln -sfn "$RELEASE_DIR" /opt/helios-space/current
systemctl restart helios-space
sleep 2
systemctl is-active helios-space
readlink -f /opt/helios-space/current
