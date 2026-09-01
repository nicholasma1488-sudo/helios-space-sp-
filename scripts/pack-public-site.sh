#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
site="$root/site"
out="$site/helios-space-website.zip"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

mkdir -p "$tmp/helios-space-website"
# Pack the live site without nesting the zip inside itself.
find "$site" -maxdepth 1 -type f ! -name 'helios-space-website.zip' -exec cp {} "$tmp/helios-space-website/" \;

rm -f "$out"
(cd "$tmp" && zip -r -q "$out" helios-space-website)
echo "Wrote $out"
