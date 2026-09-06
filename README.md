# Helios Space — Simpler Collaboration Platform

Helios Space (`helios-app/`) is a React + Express product for creating projects, sharing progress, chatting, and collaborating in mini-app workspaces. Data (accounts, projects, posts, audiences, reactions) persists in SQLite via the included Express server.

This document is the **product redesign plan**: turn Helios Space into a simpler platform to collaborate on work with **WorkBuddys**.

For local setup, admin config, and verification commands, see [`helios-app/README.md`](helios-app/README.md).

---

## Current platform (baseline)

Today the authenticated shell is a multi-page navigation model:

| Nav item | Role today |
| --- | --- |
| **Home** | Resume work, today tasks, live highlights, notifications |
| **Explore** | Discovery / search |
| **Spaces** | Subject & hobby spaces |
| **Lifestyle** | Social-style feed (posts, reactions, comments) |
| **Apps** | Mini apps / suite workspaces |
| **Live** | Separate live discovery / session surface |
| **Chat Hub** | Messaging with unread badges |
| **Projects** | Dedicated projects page |
| **Profile** | Account |

Other notable pieces: Monaco/code and creative workspaces, Helios AI panel, cinematic logged-out landing, plans (Free / Alpha / Orbit), and optional admin AI configuration.

---

## Vision

Helios Space should feel like **one simple place to collaborate on work** — not a dashboard of disconnected products.

Collaborators are **WorkBuddys**. The Helios agent is a **buddy** that helps you move through work (including previewing files) without forcing every file into a full editor. Live collaboration belongs in the social **Lifestyle** feed as posts, not as its own top-level world. Mini apps stay useful but stay **simple** — not branded clones of Excel/Word with heavy formula systems.

---

## Redesign changes (requirements)

### 1. Pages / navigation simplification

- **Keep** the **mini apps** section (Apps) as a core area; simplify overall page structure around that focus.
- **Remove** the separate **Live** nav item / Live page.
- Put **live collab inside Lifestyle**.
- Treat **Lifestyle** as a **social media** experience (feed-first).
- When someone **goes live**, the product creates a **Lifestyle post for that live collab**. Discovery and joining happen from that post / feed — **no separate Live section**.

**Target primary nav (authenticated):** Home · Explore · Spaces · Lifestyle · Apps · Chat · Profile  
(Live and Projects are no longer top-level destinations.)

### 2. Chat → iMessage-like

- **Keep** the Chat section.
- Redesign Chat UI/UX to feel like **iMessage**: conversation list + bubble threads, clear sent/received alignment, compact and personal rather than “enterprise chat hub” chrome.

### 3. Projects → Home section + Free API + Helios buddy

- **Delete** the dedicated **Projects page**.
- Make **Projects a section on the Home page** (create, resume, and manage work from Home).
- Add a **Free API** (public, unauthenticated read surface for public collaboration data — catalog, lifestyle feed, public spaces/apps, health, etc.).
- Make the **Helios agent** work like a buddy that helps you **view / preview files without opening them** in the full editor.

### 4. Mini apps & collaboration

- **Simplify mini apps.** Tools that behave like “Excel” should **not** ship as separate branded products with full spreadsheet formula systems and product-style naming. Prefer lightweight, Helios-native helpers over Office clones.
- The **code editor** should be an **IDE-style** layout with **Helios side by side** (editor + buddy panel).
- Friends / collaborators are called **WorkBuddys** consistently in product copy and invites.
- North star: a **more simple platform to collaborate on work**.

---

## Target information architecture

```text
Home
  └── Projects section (list / create / resume)   ← was separate Projects page
Apps
  └── Simple mini-app workspaces
      └── Code → IDE layout + Helios side by side
Lifestyle  (social feed)
  └── Going live → creates a live-collab post here
  └── No separate Live page
Chat
  └── iMessage-like threads with WorkBuddys
Helios (buddy)
  └── Preview files without fully opening them
  └── Side-by-side in the code IDE
```

---

## Free API (planned surface)

Unauthenticated, read-only, rate-limited. No private project contents.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/free` | Catalog of free endpoints + product blurb |
| `GET` | `/api/free/health` | Liveness |
| `GET` | `/api/free/lifestyle` | Public Lifestyle feed |
| `GET` | `/api/free/live` | Active public live sessions (also represented as Lifestyle posts) |
| `GET` | `/api/free/spaces` | Public space labels / summaries |
| `GET` | `/api/free/apps` | Public mini-app catalog |

Authenticated APIs (`/api/session`, `/api/projects`, `/api/posts`, …) remain for logged-in WorkBuddys.

---

## Implementation checklist

Use this as the acceptance map for the redesign (not a calendar estimate):

- [ ] Remove Live from primary nav; route live entry points into Lifestyle
- [ ] On Go Live, create a Lifestyle **live-collab post**; end/replay stays feed-discoverable
- [ ] Remove Projects page; Home hosts the Projects section
- [ ] Chat visual/UX pass toward iMessage patterns
- [ ] Helios buddy: file preview / summarize without opening full editor
- [ ] Code workspace: IDE layout with Helios panel side by side
- [ ] Simplify mini apps: drop Excel-like product naming and heavy formula-suite framing
- [ ] Rename collaborator language to **WorkBuddys** across UI
- [ ] Ship Free API routes documented above
- [ ] Update in-app copy and this README when behavior ships

---

## Repo layout

```text
/
├── README.md                 ← this redesign vision
└── helios-app/               ← application (client + Express server)
    ├── README.md             ← setup, admin, verification
    ├── src/                  ← React app (views, workspaces, product)
    └── server/               ← Express + SQLite API
```

## Quick start

```bash
cd helios-app
npm install
npm --prefix server install
npm run dev
```

Client: `http://localhost:5173` (proxies `/api` → `http://localhost:8080`).  
Full runbook: [`helios-app/README.md`](helios-app/README.md).
