# Helios → Simple Work Collaboration Platform

This document describes how Helios Space should change from a multi-page product into a **simpler platform to collaborate on work**. It is the product target for navigation, Lifestyle, Chat, Home, Mini Apps, Helios Agent, and WorkBuddys.

## Product goal

Keep only what helps people work together:

- **Mini Apps** for doing the work (sheets, docs, code, etc.)
- **Lifestyle** as the social feed (including live collab posts)
- **Chat** as iMessage-style messaging
- **Home** as the dashboard (including projects — no separate Projects page)
- **Helios** as a buddy who helps you understand files without opening them
- **WorkBuddys** as the name for friends / collaborators

Remove cluttered separate destinations (especially a standalone Live page and a standalone Projects page).

---

## 1. Navigation & Lifestyle (no separate Live section)

### Keep

- **Mini Apps** as a first-class section in the main nav.
- **Lifestyle** as the social surface.

### Change

| Before | After |
|--------|--------|
| Separate **Live** nav item + `LiveView` | **Remove Live from nav.** Live collab lives inside Lifestyle. |
| Lifestyle = feed only; Live = its own room list | Lifestyle = **social media feed**. Going live creates a **feed post** for that live collab. |
| Live sessions discovered only under Live | Live sessions appear as **Lifestyle posts** (join / watch from the post). |

### Lifestyle behavior

- Lifestyle is a social feed: posts, reactions, comments, follows — familiar social media patterns.
- When someone starts a live collab, Helios automatically (or via one tap) publishes a **Live Collab post** into Lifestyle.
- That post is the entry point into the session — no separate Live tab.
- Existing Live APIs can stay under the hood; the UI surface moves into Lifestyle only.

### Nav target (authenticated)

Suggested primary nav after simplification:

1. **Home**
2. **Lifestyle** (social + live posts)
3. **Apps** (Mini Apps)
4. **Chat** (iMessage-style)
5. **Profile** (account / settings)

Optional later: Explore / Spaces only if they still earn a place; do not bring Live or Projects back as top-level pages.

---

## 2. Chat → iMessage-style

### Keep

- The **Chat** section (do not remove it).

### Change

Restyle and simplify Chat Hub toward an **iMessage-like** experience:

- Clean conversation list on the left (or full-width on mobile).
- Bubble thread on the right / below: clear sent vs received, soft bubbles, timestamps.
- Simple composer: text + attachments; less “hub / tabs / dense chrome.”
- Prefer **WorkBuddy DMs** and small work groups over many chat “kinds” competing in the UI.
- Unread badges stay; keep polling / badge behavior that already works.

Goal: Chat should feel like messaging a WorkBuddy, not like a Slack clone with project/group/private tab overload.

---

## 3. Delete Projects page → Home section + free API + Helios buddy

### Projects

| Before | After |
|--------|--------|
| Separate **Projects** page (`SpacesView` / projects nav) | **Delete the Projects page** from nav. |
| Projects managed in their own view | Projects live as a **section on Home** (recent work, open, create). |

Home becomes the place to see today’s work and jump into project workspaces / Mini Apps.

### Free API

- Ship a **free, usable API** for core collaboration flows (auth session, projects list/create, posts, chat, Helios when configured).
- Document public/free endpoints clearly so the platform stays open for simple integrations.
- Keep the app fully usable **without** a paid AI key (current “Helios AI without a key” behavior remains the baseline).

### Helios Agent = buddy (file preview without opening)

Helios should act like a **work buddy**, not only a floating code assistant:

- From Home, Lifestyle, Chat, or a file list, ask Helios about a file.
- Helios **summarizes / previews** content **without forcing the user to open the full editor**.
- Typical buddy asks:
  - “What’s in this sheet?”
  - “Summarize this doc.”
  - “What does this file do?”
  - “Any risks before I open it?”
- Opening the full workspace remains optional after the preview.

---

## 4. Mini Apps, IDE + Helios, WorkBuddys, simpler platform

### Mini Apps must be real tools

Mini Apps such as the Excel-like workbook should have **their own identity and depth**, not empty shells:

- Clear **product names** (e.g. Workbook / Document / Presentation — not generic placeholders).
- Spreadsheets need **formulas, cells, charts**, and real editing — not a scratch pad.
- Same bar for other suite tools: docs, slides, notebooks, etc. should feel like actual apps.

### Code editor = IDE with Helios side by side

| Before | After |
|--------|--------|
| Code workspace + floating Helios panel | **IDE-style layout**: editor + **Helios docked side by side** |
| Helios as optional overlay | Helios as a persistent buddy column while coding |

Layout sketch:

```
┌─────────────┬──────────────────────────┬─────────────┐
│ file tree   │  editor / tabs / preview │  Helios     │
│             │                          │  (buddy)    │
└─────────────┴──────────────────────────┴─────────────┘
```

### Friends = WorkBuddys

- Rename friend / collaborator framing to **WorkBuddys** (product spelling for this redesign).
- WorkBuddys appear in Chat, Lifestyle (live collab posts), and project sharing on Home.
- Collaboration is “work with your WorkBuddys,” not a separate social network brand.

### Overall platform tone

Helios becomes a **simple platform to collaborate on work**:

- Fewer top-level pages
- Social + live in one Lifestyle feed
- Messaging that feels personal (iMessage-like)
- Projects under Home
- Real Mini Apps
- Helios as a side-by-side buddy
- WorkBuddys as the people you collaborate with

---

## Implementation map (current → target)

| Area | Current (approx.) | Target |
|------|-------------------|--------|
| Nav | Home, Explore, Spaces, Lifestyle, Apps, **Live**, Chat, **Projects**, Profile | Home, Lifestyle, Apps, Chat, Profile (+ trim the rest) |
| `LiveView` | Top-level view | Remove from nav; embed live join/create in Lifestyle posts |
| `SpacesView` / projects | Top-level Projects | Home “Projects” section |
| `ChatView` | Chat Hub tabs | iMessage-style bubbles + simple list |
| `HeliosPanel` | Floating / overlay | Buddy: file preview + IDE side panel |
| Suite apps (`Excel`, etc.) | Named in catalog; deepen fidelity | Real formulas & tool features; keep clear names |
| Friends | Generic / incomplete | **WorkBuddys** |

### Suggested code touchpoints

- `src/components/GlobalShell.tsx` — nav items
- `src/App.tsx` — view routing (drop `live` / `projects` as primary views)
- `src/views/LifestyleView.tsx` — social feed + live collab posts
- `src/views/LiveView.tsx` — fold into Lifestyle or thin session overlay
- `src/views/ChatView.tsx` + `ChatView.css` — iMessage UI
- `src/views/HomeView.tsx` — Projects section
- `src/components/HeliosPanel.tsx` — buddy preview + side-by-side IDE
- `src/workspaces/CodeWorkspace.tsx` / `ProjectWorkspace.tsx` — IDE + Helios column
- `src/product/miniApps.ts` / spreadsheet workspace — formulas & real app behavior
- `server/` — free API surface + live→post creation when going live

---

## Out of scope for this redesign doc

This README defines **product direction**. Shipping may be incremental:

1. Nav + Lifestyle live posts + remove Live/Projects pages  
2. Home projects section  
3. iMessage Chat UI  
4. Helios buddy preview + IDE side-by-side  
5. Spreadsheet formulas / Mini App fidelity  
6. WorkBuddys naming across UI  

Update the main `README.md` “Implemented functionality” section as each slice lands.
