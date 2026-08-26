#!/usr/bin/env bash
# Build a versioned Helios Space release tarball on this machine.
# Usage: ./deploy/release.sh [version]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:-$(date -u +%Y%m%d%H%M%S)}"
STAGE="$(mktemp -d)"
OUT="${HELIOS_RELEASE_DIR:-$ROOT/dist}/helios-space-${VERSION}.tar.gz"

cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

mkdir -p "$(dirname "$OUT")" "$STAGE/helios-space"

echo "==> building frontend"
cd "$ROOT"
npm ci
npm run build

echo "==> staging release $VERSION"
rsync -a --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude dist \
  --exclude data \
  --exclude '*.db' \
  --exclude '*.db-journal' \
  "$ROOT/" "$STAGE/helios-space/"
rm -rf "$STAGE/helios-space/dist"
cp -a "$ROOT/dist" "$STAGE/helios-space/dist"
printf '%s\n' "$VERSION" > "$STAGE/helios-space/.release-version"

echo "==> packing $OUT"
tar -C "$STAGE" -czf "$OUT" helios-space
echo "$OUT"
