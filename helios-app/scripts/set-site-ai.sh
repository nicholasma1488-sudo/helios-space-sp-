#!/usr/bin/env bash
# Point the production Helios site default (the "Free · Helios" tab) at an
# OpenAI-compatible provider, e.g. Ollama Cloud (https://ollama.com).
#
# Requires in the environment (never commit these):
#   SSHPASS               VPS root password
#   HELIOS_SITE_AI_KEY    provider API key
# Optional:
#   HELIOS_SITE_AI_BASE   base URL   (default https://ollama.com)
#   HELIOS_SITE_AI_MODEL  model name (default gemma4:31b)
# Usage: SSHPASS='...' HELIOS_SITE_AI_KEY='...' ./scripts/set-site-ai.sh [host]
set -euo pipefail

HOST="${1:-${HELIOS_DEPLOY_HOST:-154.222.19.38}}"
USER="${HELIOS_DEPLOY_USER:-root}"
REMOTE="${USER}@${HOST}"
BASE="${HELIOS_SITE_AI_BASE:-https://ollama.com}"
MODEL="${HELIOS_SITE_AI_MODEL:-gemma4:31b}"

if [[ -z "${SSHPASS:-}" || -z "${HELIOS_SITE_AI_KEY:-}" ]]; then
  echo "SSHPASS and HELIOS_SITE_AI_KEY are required." >&2
  exit 1
fi
if [[ "$HELIOS_SITE_AI_KEY" == *"'"* ]]; then
  echo "HELIOS_SITE_AI_KEY must not contain single quotes." >&2
  exit 1
fi

echo "==> checking ${BASE} model ${MODEL}"
CHECK_URL="${BASE%/}/v1/chat/completions"
if ! curl -fsS --max-time 60 "$CHECK_URL" \
    -H "Authorization: Bearer ${HELIOS_SITE_AI_KEY}" -H 'Content-Type: application/json' \
    -d "{\"model\":\"${MODEL}\",\"messages\":[{\"role\":\"user\",\"content\":\"Reply with: ready\"}],\"max_tokens\":8}" \
    | grep -q '"choices"'; then
  echo "Provider check failed for ${MODEL} at ${CHECK_URL}" >&2
  exit 1
fi

echo "==> writing site_settings on ${REMOTE}"
# CentOS 7 ships sqlite 3.7 (no UPSERT), so use INSERT OR REPLACE.
sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 "$REMOTE" "set -e
DB=/var/lib/helios-space/helios.db
mkdir -p /var/lib/helios-space/backups
cp \"\$DB\" /var/lib/helios-space/backups/helios-\"\$(date +%Y%m%d-%H%M)\".pre-site-ai.db
sqlite3 \"\$DB\" \"INSERT OR REPLACE INTO site_settings(key,value) VALUES('openai_api_key','${HELIOS_SITE_AI_KEY}'),('openai_base_url','${BASE}'),('openai_model','${MODEL}'); SELECT key, CASE WHEN key='openai_api_key' THEN substr(value,1,4)||'…' ELSE value END FROM site_settings WHERE key LIKE 'openai%';\"
chown helios-space:helios-space \"\$DB\"* 2>/dev/null || true
systemctl restart helios-space
sleep 2
systemctl is-active helios-space
"
echo "Site default is now ${MODEL} @ ${BASE}."
