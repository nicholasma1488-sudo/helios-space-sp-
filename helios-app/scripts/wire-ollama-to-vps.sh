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

echo "==> reverse-tunnel VPS:11434 -> Cursor Ollama"
# Remote listen on localhost only
pkill -f "sshpass .*${HOST}.*-R 11434:127.0.0.1:11434" 2>/dev/null || true
nohup sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ExitOnForwardFailure=yes \
  -N -R 127.0.0.1:11434:127.0.0.1:11434 "$REMOTE" > /tmp/ollama-tunnel.log 2>&1 &
echo "tunnel_pid=$!"
sleep 2

echo "==> point Helios site_settings at Ollama"
"${SSH[@]}" "$REMOTE" "export PATH=/usr/local/bin:\$PATH
python3 - <<'PY'
import sqlite3
db='/var/lib/helios-space/helios.db'
c=sqlite3.connect(db)
pairs=[
  ('openai_api_key','ollama'),
  ('openai_base_url','http://127.0.0.1:11434'),
  ('openai_model','${MODEL}'),
]
for k,v in pairs:
  c.execute('INSERT INTO site_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', (k,v))
c.commit()
print(c.execute(\"select key,value from site_settings where key like 'openai%'\").fetchall())
c.close()
PY
# verify tunnel from VPS side
curl -fsS http://127.0.0.1:11434/api/tags | head -c 200; echo
systemctl restart helios-space
sleep 2
systemctl is-active helios-space
"

echo "Wired. Keep this Cursor session (and the tunnel process) alive while production uses Ollama."
echo "Tunnel log: /tmp/ollama-tunnel.log"
