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

## Bring your own key (per user)

Every user can override the site default from **Me → Settings → AI provider**:

- Presets: Groq, OpenAI, Google Gemini, DeepSeek, OpenRouter, Ollama (self-hosted), Custom
- Fields: API key · Base URL · Model, plus **Test connection** before saving
- Keys are stored **AES-256-GCM encrypted** (`user_ai_settings.api_key_enc`); the secret is
  `HELIOS_SECRET_KEY` or an auto-generated `DATA_DIR/.helios-secret` (0600). Only a preview
  like `gsk_…ab12` is ever returned to the browser.
- Resolution order: **user key → site default**. `POST /api/helios/chat` reports `"source": "user" | "site"`.
- In production, user base URLs must point at a public host (loopback / private ranges are rejected).

API: `GET / PUT / DELETE /api/me/ai`, `POST /api/me/ai/test`.

## Site default on Ollama Cloud (current production setup)

Production's **Free · Helios** tab runs `gemma4:31b` on [Ollama Cloud](https://ollama.com)
(OpenAI-compatible at `https://ollama.com/v1`). To change the key or model without touching
the repo:

```bash
SSHPASS='<vps root password>' HELIOS_SITE_AI_KEY='<ollama.com api key>' \
HELIOS_SITE_AI_MODEL='gemma4:31b' ./scripts/set-site-ai.sh
```

The script checks the model with one tiny completion, backs up the SQLite DB, writes
`site_settings` and restarts `helios-space`. The reverse tunnel from the Cursor machine is
no longer needed for production; it remains an option for a fully self-hosted model.

## Helios panel: model tabs and Agent mode

The Helios side panel has two model tabs, like VS Code model pickers:

- **Free · Helios** — the site default (e.g. the Cursor-machine Ollama above)
- **My API** — the key saved in Settings; clicking it before a key exists opens Settings

The tab is sent as `provider: "site" | "user"` to `/api/helios/chat` and the agent endpoints;
replies show `source` and the model that answered.

**Agent** mode (toggle next to the input) turns a prompt into steps that run inside the app:

| Step | What happens in the browser |
|------|------------------------------|
| `navigate` | switches to Home / Space feed / Mini Apps / Messages / Settings |
| `create_file` | creates a Quill · Lattice · Stage · Folio · Pulse · Cascade · Tally · Orbit · Dispatch · Forge file, opens it with starter content, then fills it with generated content |
| `update_file` | rewrites an existing file (the step card offers **Undo**) |
| `open_file` | opens a file the prompt names |
| `post` | shares a post in the Space feed, linked to the file just created |
| `set_theme` | light / dark / system |

The Home page also carries a **Helios Agent** card (input + example chips) so the agent is
usable straight from the main page: it switches the panel to Agent mode, opens it if needed,
and runs the goal.

The agent works *visibly*: a floating "Helios agent · step 1/2" pill (`AgentStatusBar`) sits over
the page while it runs, `create_file` first shows the Mini Apps page and rings the chosen app
tile before opening the file, and `post` switches to the Space feed and highlights the new post.
Status is broadcast through the `helios-agent-status` DOM event (`reportAgentStatus` in
`product/flow.ts`).

Flow: `POST /api/helios/agent` returns the plan instantly (rule planner for clear intents in
English or Chinese, model planner otherwise). The browser executes the steps and calls
`POST /api/helios/agent/content` per file, so the page opens first and the content streams in
afterwards. While the model writes, a Forge project shows a "Helios is writing this project…"
placeholder rather than the brief; the content endpoint saves the finished result (project
content **and** repo files) on the server, so reloading mid-generation loses nothing, and the
open Forge editor swaps its files in place when the result lands.
Small local models (Ollama, "instant"/"mini" cloud models) get compact prompts and
token caps; a Stage deck or Tally list takes ~25–30 s on a 4-core CPU with `llama3.2:3b`,
a Chinese Quill document ~45–60 s. Prompts that need no action fall back to a normal chat reply.

## Best free cloud key (site default, admin)

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
