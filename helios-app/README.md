# Helios Space

Helios Space is a React application for creating projects and sharing progress. Accounts, projects, posts, audiences, and reactions are persisted in SQLite by the included Express server.

The logged-out experience opens with a cinematic product landing page and a motion-connected transition into authentication. Inside the app, Lifestyle uses a familiar social-feed information architecture while retaining the Helios graphite, solar, violet, and sky visual language. Chat Hub shows unread badges in navigation, Home has loading states, and error boundaries protect against unexpected crashes.

## Run locally

Requirements: Node.js 22 or newer.

```bash
npm install
npm --prefix server install
npm run dev
```

The client runs at `http://localhost:5173` and proxies `/api` to the server at `http://localhost:8080`. Set `HELIOS_API_URL` if the API uses another origin.

For a production-style run:

```bash
npm run build
npm --prefix server start
```

The server then serves the built app at `http://localhost:8080`.

For a reverse-proxy deployment, set `NODE_ENV=production`. The server binds to
`127.0.0.1` by default; override `HOST` only when the runtime requires another
interface. `PORT` defaults to `8080`, and `DATA_DIR` can point SQLite at a
dedicated persistent directory.

## Implemented functionality

- Account signup, login, logout, and per-user sessions
- Persistent code, document, design, and research projects
- Monaco editor with autosave, explicit save, safe close, and publish flow
- Cinematic responsive landing page with a Three.js/WebGL orbit scene, pointer parallax, drag inertia, clickable/keyboard product-mode switching, reduced-motion fallbacks, and a portal transition into authentication
- Facebook-inspired Lifestyle layout with highlights, an expandable composer, search, category filters, saved posts, and cursor pagination
- Public and private progress posts with server-enforced visibility
- One persistent reaction per user and post: Like, Love, Appreciate, Learned, Inspired, or Fire
- Persistent inline comments with author/post-owner moderation
- Explore search, category filters, real sorting, and post deletion for authors
- Spaces derived from the real space labels on the user’s projects
- Account-scoped daily task list stored in the browser
- Helios Mini Apps with account-isolated browser storage:
  - Focus Orbit timer with refresh-safe timing
  - Quick Notes
  - Habit Pulse
  - Decision Flip
- Direction-aware primary-view transitions, active navigation motion, dialog focus trapping, and keyboard shortcuts
- Theme, reduced-motion preference, and JSON account-data export
- Optional Helios AI using an administrator-configured OpenAI-compatible endpoint
- Environment-configured admin panel for users, site settings, and AI configuration
- Chat unread badge on desktop rail and mobile nav, polled every 30 seconds and cleared on entering Chat Hub
- Home view shimmer loading skeleton and API error recovery banner
- Projects view pre-selects the active Space when navigated from a Space context
- Global React error boundary protecting against unexpected view crashes
- Helios AI self-negation correction: upstream model replies claiming inability are replaced with a Helios-scoped boundary explanation

## Deliberately not represented as available

This build does not claim to provide live broadcasting, replay/transcript generation, multi-user project collaboration, WorkBuddy/Space membership privacy, GitHub sync, persistent project versions, or Solar rewards. Those features need dedicated server models and integrations before they should appear in the UI.

## Admin setup

The admin account is created only when both variables are set:

```bash
HELIOS_ADMIN_EMAIL=admin@example.com \
HELIOS_ADMIN_PASSWORD='use-a-long-unique-password' \
npm --prefix server start
```

Do not commit credentials. If credentials were ever exposed, rotate them and invalidate existing admin sessions.

## Verification

```bash
npm run build
npm run lint
npm run test:api
npm audit --omit=dev
```

Or run all three gates:

```bash
npm run check
```

The API suite starts the Express server against a temporary isolated SQLite database and verifies authentication, projects, public/private visibility, cursor pagination, search/category filters, reactions, comments, saved posts, malformed input, unknown routes, logout, and the unconfigured-AI response.

Browser QA artifacts are generated under `output/playwright/`. The upgrade specification and acceptance checklist live in `HELIOS_UPGRADE_MASTER_PROMPT.md` and `HELIOS_UPGRADE_TODO.md`.

## Helios AI without a key

The application runs fully without an OpenAI API key. `/api/site` reports AI as disabled and `/api/helios/chat` returns a stable `AI_NOT_CONFIGURED` response. The proxy normalizes administrator-configured provider URLs, validates bounded context, handles non-JSON upstream responses, and maps authentication, rate-limit, timeout, configuration, and network failures without exposing credentials. No key is included in this repository.
