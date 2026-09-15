# Helios AI keys — free / “unlimited” options

Helios uses OpenAI-compatible settings (env or Admin):

- `openai_api_key` / `HELIOS_AI_API_KEY`
- `openai_base_url` / `HELIOS_AI_BASE_URL`
- `openai_model` / `HELIOS_AI_MODEL`

**Never commit real keys.**

## Reality check (this production VPS)

- RAM ≈ **1.8GB** → **do not run Ollama here** (it will thrash or OOM).
- Pollinations legacy text API is **deprecated / 402** for many callers — not reliable anymore.
- Out of the box Helios stays on **`helios-local-free`**: unlimited local helper + **file Write without opening** via Mini App panel (`/api/projects/:id/helios-patch`).

## Best “unlimited” path

Run **Ollama on a stronger machine** (≥8GB RAM), then point Helios at it:

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
ollama serve
```

```bash
HELIOS_AI_API_KEY=ollama
HELIOS_AI_BASE_URL=http://YOUR_OLLAMA_HOST:11434
HELIOS_AI_MODEL=llama3.2
```

Or Admin → AI settings with the same values. Self-hosted = no cloud token bill.

## Best free cloud key (paste yourself)

1. Open [https://console.groq.com](https://console.groq.com) → create free API key  
2. Admin AI settings:

| Field | Value |
|-------|--------|
| API key | your Groq key |
| Base URL | `https://api.groq.com/openai` |
| Model | `llama-3.1-8b-instant` (or current Groq free model) |

Alternatives with free quotas: Google AI Studio (Gemini), OpenRouter free routes.

## Write Mini App files without opening them

Already shipped:

1. Open **Mini App** panel  
2. Enter an app → select a recent file (do **not** need Open)  
3. Type instruction → **Write**  
4. Server patches SQLite project content and returns a preview  

Works on local rules always; smarter when a real upstream (Ollama/Groq) is configured.
