#!/usr/bin/env bash
# Expose Cursor-machine Ollama to the production VPS via SSH reverse tunnel,
# then point Helios AI settings at 127.0.0.1:11434 on the VPS.
#
# Requires: SSHPASS (VPS root password) in the environment. Never commit it.
# Usage: SSHPASS='...' ./scripts/wire-ollama-to-vps.sh [host]
set -euo pipefail

HOST="${1:-${HELIOS_DEPLOY_HOST:-154.222.19.38}}"
USER="${HELIOS_DEPLOY_USER:-root}"
REMOTE="${USER}@${HOST}"
MODEL="${HELIOS_OPENAI_MODEL:-llama3.2:3b}"

if [[ -z "${SSHPASS:-}" ]]; then
  echo "SSHPASS is required (VPS root password)." >&2
  exit 1
fi
if ! command -v sshpass >/dev/null 2>&1; then
  echo "sshpass is required." >&2
  exit 1
fi
if ! curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  echo "Local Ollama is not running on 127.0.0.1:11434" >&2
  exit 1
fi

SSH=(sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes)

echo "==> reverse-tunnel VPS:11434 -> Cursor Ollama (auto-reconnect)"
pkill -f "ssh .*-R 127.0.0.1:11434:127.0.0.1:11434 ${REMOTE}" 2>/dev/null || true
nohup bash -c "while true; do sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -o ExitOnForwardFailure=yes \
  -N -R 127.0.0.1:11434:127.0.0.1:11434 '${REMOTE}'; echo 'tunnel dropped, retrying in 5s'; sleep 5; done" > /tmp/ollama-tunnel.log 2>&1 &
echo "tunnel_pid=$!"
sleep 4

echo "==> point Helios site_settings at Ollama"
# CentOS 7 ships sqlite 3.7 (no UPSERT), so use INSERT OR REPLACE.
"${SSH[@]}" "$REMOTE" "set -e
DB=/var/lib/helios-space/helios.db
mkdir -p /var/lib/helios-space/backups
cp \"\$DB\" /var/lib/helios-space/backups/helios-\$(date +%Y%m%d-%H%M).pre-ollama.db
sqlite3 \"\$DB\" \"INSERT OR REPLACE INTO site_settings(key,value) VALUES('openai_api_key','ollama'),('openai_base_url','http://127.0.0.1:11434'),('openai_model','${MODEL}'); SELECT key,value FROM site_settings WHERE key LIKE 'openai%';\"
chown helios-space:helios-space \"\$DB\"* 2>/dev/null || true
echo '--- tunnel check from VPS'
curl -fsS --max-time 10 http://127.0.0.1:11434/api/tags | head -c 160; echo
systemctl restart helios-space
sleep 2
systemctl is-active helios-space
"

echo "Wired. Keep this machine, 'ollama serve' and the tunnel loop alive while production uses Ollama."
echo "Tunnel log: /tmp/ollama-tunnel.log"
