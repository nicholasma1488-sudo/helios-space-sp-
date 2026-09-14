#!/usr/bin/env bash
# Start Ollama (if needed) and Helios Space pointed at local Ollama.
# Intended for the Cursor cloud/dev machine (needs ~8GB+ free RAM).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/usr/local/bin:$PATH"
export OLLAMA_HOST="${OLLAMA_HOST:-127.0.0.1:11434}"
export HELIOS_OPENAI_API_KEY="${HELIOS_OPENAI_API_KEY:-ollama}"
export HELIOS_OPENAI_BASE_URL="${HELIOS_OPENAI_BASE_URL:-http://127.0.0.1:11434}"
export HELIOS_OPENAI_MODEL="${HELIOS_OPENAI_MODEL:-llama3.2:3b}"
export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-8080}"
export DATA_DIR="${DATA_DIR:-/tmp/helios-ollama-data}"
MODEL="${HELIOS_OPENAI_MODEL}"

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama not installed. On Ubuntu: sudo apt-get install -y zstd && curl -fsSL https://ollama.com/install.sh | sh" >&2
  exit 1
fi

mkdir -p "$DATA_DIR"

if ! curl -fsS "http://${OLLAMA_HOST}/api/tags" >/dev/null 2>&1; then
  echo "==> starting ollama serve"
  nohup ollama serve > /tmp/ollama.log 2>&1 &
  for _ in $(seq 1 40); do
    curl -fsS "http://${OLLAMA_HOST}/api/tags" >/dev/null 2>&1 && break
    sleep 0.5
  done
fi

if ! curl -fsS "http://${OLLAMA_HOST}/api/tags" | grep -q "${MODEL%%:*}"; then
  echo "==> pulling model ${MODEL}"
  ollama pull "$MODEL"
fi

echo "==> Helios AI -> ${HELIOS_OPENAI_BASE_URL} model=${MODEL}"
cd "$ROOT"
if [[ ! -d server/node_modules ]]; then
  npm --prefix server ci --omit=dev
fi

# Free the port if a previous Helios is stuck
if command -v fuser >/dev/null 2>&1; then
  fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
fi

exec node --experimental-sqlite server/server.js
