# Helios AI keys — free / “unlimited” options

Helios uses OpenAI-compatible settings (env bootstrap or Admin):

| Setting key | Env var |
|-------------|---------|
| `openai_api_key` | `HELIOS_OPENAI_API_KEY` (or `OPENAI_API_KEY`) |
| `openai_base_url` | `HELIOS_OPENAI_BASE_URL` (or `OPENAI_BASE_URL`) |
| `openai_model` | `HELIOS_OPENAI_MODEL` (or `OPENAI_MODEL`) |

The server calls `${baseUrl}/v1/chat/completions` (OpenAI-compatible).  
**Never commit real keys or VPS passwords.**

## Reality check (production VPS)

- Host `154.222.19.38` has ≈ **1.8GB RAM** → **do not run Ollama on the VPS** (OOM / thrash).
- Pollinations legacy text API is **deprecated / 402** for many callers — not reliable.
- Without an upstream key, Helios uses **`helios-local-free`**: local helper + Mini App **Write** via `/api/projects/:id/helios-patch`.

## Cursor cloud / strong machine (recommended for Ollama)

On a machine with ≥8GB RAM (Cursor agent VMs are fine):

```bash
# once
sudo apt-get install -y zstd
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2:3b

# start Helios pointed at local Ollama
./scripts/start-ollama-helios.sh
```

Defaults:

| Field | Value |
|-------|--------|
| API key | `ollama` |
| Base URL | `http://127.0.0.1:11434` |
| Model | `llama3.2:3b` |

Verified shape of a successful chat:

```json
{"reply":"…","model":"llama3.2:3b"}
```

### Wire production Helios to Cursor Ollama

Production cannot host the model. Use an SSH **reverse tunnel** so the VPS sees Ollama on `127.0.0.1:11434`:

```bash
SSHPASS='…' ./scripts/wire-ollama-to-vps.sh 154.222.19.38
```

That script:

1. Opens `VPS:127.0.0.1:11434` → Cursor `127.0.0.1:11434`
2. Writes `site_settings` (`openai_*` → Ollama)
3. Restarts `helios-space`

Keep **both** `ollama serve` and the tunnel process alive while production uses this path.  
If the Cursor session ends, production AI falls back / fails until you re-tunnel or paste a cloud key.

## Best free cloud key (paste yourself)

1. Open [https://console.groq.com](https://console.groq.com) → create free API key  
2. Admin → AI settings:

| Field | Value |
|-------|--------|
| API key | your Groq key |
| Base URL | `https://api.groq.com/openai` |
| Model | `llama-3.1-8b-instant` (or current Groq free model) |

Alternatives with free quotas: Google AI Studio (Gemini), OpenRouter free routes.

## Write Mini App files without opening them

1. Open **Mini App** panel  
2. Enter an app → select a recent file (do **not** need Open)  
3. Type instruction → **Write**  
4. Server patches SQLite project content and returns a preview  

Works on local rules always; smarter when a real upstream (Ollama/Groq) is configured.
