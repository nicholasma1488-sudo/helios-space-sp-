# Helios Space

Helios Space is a spatial social OS for students and creators: discover, create, learn, build, share, and collaborate. Accounts, projects, posts, follows, live sessions, chat, and Solar XP are persisted in SQLite by the included Express server.

The logged-out experience is a time-based cinematic fly-through (Three.js + CSS3D, paused when the tab is hidden, reduced when `prefers-reduced-motion` is set). After sign-in, the shell is Home, Explore, Create, Projects, Mini Apps, Chat, Learn, and Profile, with Studio, Spaces, Lifestyle, and Live still reachable from the top bar and command palette.

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
- Helios Mini Apps: working local tools (calculator, scientific calculator, unit converter, timers, notes, markdown, document editor, code playground, flashcards, whiteboard, spreadsheet, physics helpers) plus project-bound workspaces that can Go Live
- Public profiles with follow counts and a Following feed (`GET /api/posts?following=true`)
- Live collaboration presence over Server-Sent Events (`GET /api/live/:id/events`) — not a fake WebSocket
- Solar XP, identities, notifications, search, and project files/commits/collaborators
- Direction-aware primary-view transitions, active navigation motion, dialog focus trapping, and keyboard shortcuts
- Theme, reduced-motion preference, and JSON account-data export
- Optional Helios AI using an administrator-configured OpenAI-compatible endpoint
- Environment-configured admin panel for users, site settings, and AI configuration
- Chat unread badge on desktop rail and mobile nav, polled every 30 seconds and cleared on entering Chat Hub
- Home view shimmer loading skeleton and API error recovery banner
- Projects view pre-selects the active Space when navigated from a Space context
- Global React error boundary protecting against unexpected view crashes
- Helios AI self-negation correction: upstream model replies claiming inability are replaced with a Helios-scoped boundary explanation

## Honest limits

- Chat Hub polls over HTTP. It is not a WebSocket transport.
- Mini App tool data (notes, drawings, sheets) is account-scoped `localStorage`, not server files.
- Helios AI requires an administrator-configured provider key. Without it, the app still runs and `/api/helios/chat` returns `AI_NOT_CONFIGURED`.
- There is no GitHub sync. Project versions, collaborators, and live presence are native to this server.

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

The API suite starts the Express server against a temporary isolated SQLite database and verifies authentication, projects, public/private visibility, cursor pagination, search/category filters, reactions, comments, saved posts, follows, public profiles, malformed input, unknown routes, logout, and the unconfigured-AI response.

## Helios AI without a key

The application runs fully without an OpenAI API key. `/api/site` reports AI as disabled and `/api/helios/chat` returns a stable `AI_NOT_CONFIGURED` response. The proxy normalizes administrator-configured provider URLs, validates bounded context, handles non-JSON upstream responses, and maps authentication, rate-limit, timeout, configuration, and network failures without exposing credentials. No key is included in this repository.
