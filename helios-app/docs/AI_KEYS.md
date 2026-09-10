# Helios AI keys — free / “unlimited” options

Helios talks to any **OpenAI-compatible** endpoint via admin settings / env:

- `HELIOS_AI_API_KEY` (or site setting `openai_api_key`)
- `HELIOS_AI_BASE_URL` (`openai_base_url`)
- `HELIOS_AI_MODEL` (`openai_model`)

Never commit real keys to git.

## Closest thing to “unlimited tokens”

### 1) Ollama on your own machine / VPS (recommended)

Self-hosted = **no cloud token meter**. Helios can drive Quill / Lattice / Stage / Forge file writes through `/api/projects/:id/helios-patch` and `/api/helios/chat`.

```bash
# on the AI host
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
ollama serve   # default http://127.0.0.1:11434
```

Point Helios at Ollama’s OpenAI shim:

```bash
HELIOS_AI_API_KEY=ollama
HELIOS_AI_BASE_URL=http://127.0.0.1:11434
HELIOS_AI_MODEL=llama3.2
```

Or in Admin → AI settings:
- API key: `ollama` (any non-empty string)
- Base URL: `http://127.0.0.1:11434` (or your private LAN URL)
- Model: `llama3.2` / `qwen2.5` / whatever you pulled

If Helios runs on another host, bind Ollama to that network interface and firewall it.

### 2) Cloud free tiers (not unlimited — rate limited)

| Provider | Notes |
|----------|--------|
| **Groq** | Fast free tier, OpenAI-compatible. Good for chat + patches. |
| **Google AI Studio (Gemini)** | Free quota; use an OpenAI-compatible proxy or Gemini native adapter if you add one. |
| **OpenRouter** | Free model routes available; still quota’d. |
| **Pollinations** | Already supported as a fallback path in Helios when configured. |

These are **free**, not infinite. For “无限”, use Ollama.

## Write files without opening the project

From the **Mini App** panel:

1. Pick a recent file (or create one).
2. Type an instruction in **Helios edit without opening**.
3. Apply → server writes project `content` via `/api/projects/:id/helios-patch`.

Local rule engine always works. With a real upstream key (Ollama/Groq/…), Helios may rewrite the full JSON content for smarter edits.

Example instructions:

- Quill: `append: Add a closing paragraph about next steps`
- Stage: `theme: blue` or `new slide: Roadmap`
- Lattice: `fill sample`
- Forge: set `path` to `main.cpp` and `rewrite: ...`
