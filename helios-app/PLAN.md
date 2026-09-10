# Helios Space — Product rebuild plan (pre-code)

**Status:** approved — **implementing** (user: Ok)  
**Updated:** 2026-09-09 (v2 — Instagram Lifestyle + chrome collapse + IDE autosave)  
**Branch:** `cursor/collab-redesign-readme-779e`

This README is required **before** any product code. It merges the latest screenshot feedback with the earlier rebuild brief.

---

## 0. Screenshot: what must leave

Space (Lifestyle) still shows cards that **must not exist**:

1. **“Your space”** Solar card (Dawn / posts / level — e.g. 60 Dawn)  
2. **CREATE → Web Code Editor** promo + **Go to Create**  
3. Any similar Mini App / Create marketing in the Lifestyle chrome  

**Rule:** Lifestyle is a **social feed only**. No Mini App features, no Create funnel, no Solar scoreboard.

---

## 1. Product shape

### Navigation

| Before | After |
|--------|-------|
| Space · **Create** · Messages · Home · Me | Space · **Mini App ▾** · Messages · Home · Me |

- **Delete Create** as a rail / primary destination.
- Trigger is the words **“Mini App”** + an **arrow** (not a grid icon):
  - Collapsed: `Mini App ▾`
  - Expanded: `Mini App ▴` + docked half-screen panel under the top bar
- Panel colours match landing/auth liquid glass: `#eceff3`, terracotta `#c96442`, blue `#5b8def`, Codex grey glass — **no loud rainbow launcher**.

---

## 2. Kill Create as a product concept

| Remove | Keep (renamed) |
|--------|----------------|
| Nav **Create** | **Mini App** label + arrow |
| Lifestyle CREATE / Web Code Editor cards | — |
| Home “Go to Create” marketing | Quiet “Continue a file” if needed |
| Default hobby **coding** driving Web Code | Neutral social default |

`MiniAppsView` = panel content only, not a bottom-rail tab.

---

## 3. Lifestyle — Instagram-packed social feed

### Remove

- Your space / Solar / Dawn level card  
- CREATE / contextual Mini App card  
- Business / Coding (and similar) hobby / subject chips as feed structure  
- Mini App post kinds / “open tool” callouts in the feed chrome  

### Add / keep

- For you · Buddies · Saved  
- Composer (text / photo / work update / Go Live) — compact  
- **Add friend** on posts / avatars  
- Invite WorkBuddy stays social, not Create  

### Layout: packed like Instagram (not scattered words)

Current Lifestyle feels airy and “random scattered” (big cards, sparse captions, right-rail widgets). Rebuild toward a **dense social feed**:

| Instagram pattern | Helios mapping |
|-------------------|----------------|
| Full-bleed / tight media | Post media edge-to-edge inside the feed column; less side padding on mobile |
| Avatar + handle + · time on one row | Compact post header; no long essay chrome |
| Caption under media, truncated | Short body; “more” expand — not large scattered paragraphs |
| Action row (like / comment / share) | One tight icon row; reactions stay but quieter |
| Stories / buddies strip on top | Horizontal WorkBuddy / friends strip (optional), not Solar XP |
| Single column focus | **Remove right rail** on Space (or collapse it entirely) so the feed is the only column |
| Consistent card rhythm | Same post card template; drop one-off promo cards |

**Acceptance:** Opening Space feels like scrolling a packed social feed, not a marketing dashboard with orphan widgets.

---

## 4. Friend requests

### Chat hub

- Search by **username / handle** (server directory)  
- From result: **Add friend** / Message / cancel pending  
- Requests inbox (in / out)  

### Lifestyle

- Direct **Add friend** on another user’s post or avatar  

### API sketch

| Endpoint | Purpose |
|----------|---------|
| `GET /api/users/search?q=` | Username search |
| `POST /api/friends/request` | Send |
| `GET /api/friends/requests` | Inbox |
| `POST /api/friends/requests/:id/respond` | Accept / decline |
| `GET /api/friends` | Graph for Buddies tab |

---

## 5. Mini Apps = M365 set (+ Helios IDE)

Product surface only:

| App | Role |
|-----|------|
| Word | Documents |
| Excel | Spreadsheets |
| PowerPoint | Presentations |
| Outlook | Mail |
| Calendar | Schedule |
| OneNote | Notes |
| To Do / Tasks | Tasks |
| Planner | Boards |
| Loop / Lists | Optional if capacity |
| Helios IDE | Replaces Web Code Editor (§7) |

Alias legacy IDs; do not show Business/Coding hobby apps in the launcher.

---

## 6. Word / PPT / Excel — pro hot features

Not bit-perfect Office — **daily hot path** so it feels like a working platform.

### Word

Styles, fonts, lists, spacing, insert image/table/link/break/comment, find/replace, header/footer, Helios grammar, export docx/PDF, inline Helios rewrite.

### PowerPoint (rebuild — current is too thin)

- Layouts (title, title+content, two-column, blank, section)  
- **Insert photos** (upload, drag-drop, URL)  
- Shapes + text boxes  
- **Designer** pane (themes / colour ideas; Helios-assisted)  
- Transitions + simple animations  
- Presenter + notes, reorder/duplicate, crop/z-order, export  

### Excel

`SUM` / `AVERAGE` / `IF` / `XLOOKUP` lite / `COUNTIF`, formats, freeze, sort/filter, charts, CSV.

### Shared

File menu, share to Space, collaborators, docked Helios panel, **autosave** (no manual “save ritual” as the primary model).

---

## 7. Web Code → Cursor-style Helios IDE

```
┌──────────┬─────────────────────┬──────────────┐
│ Files    │ Monaco + tabs       │ Helios       │
│ (+ git   │ terminal / preview  │ apply diffs  │
│  status) │                     │              │
└──────────┴─────────────────────┴──────────────┘
```

### Must

- Side-by-side **editor + Helios**  
- **Git connection** (remote URL / status / pull / branch awareness)  
- Kill product name **Web Code Editor** → **Helios IDE**  

### Autosave — get rid of the commit thing

User direction: **auto-saves work** and **remove the commit-centric UX**.

| Do | Don’t |
|----|-------|
| Debounced autosave of every file edit to the server | Primary “Commit” button as how you save work |
| Optional silent local history / versions | Force users through git commit to keep work |
| Git for **connect / sync / status** (and optional push later) | Teach “commit” as Helios’s save model |

Interpretation: Helios IDE behaves like Cursor/docs — **edits persist automatically**. Git is connection infrastructure, not a commit homework loop in the UI.

Primary files: `CodeWorkspace.tsx`, `RepoFrame.tsx`, `repoModel.ts`, `HeliosPanel.tsx`.

---

## 8. Shell chrome: collapse sidebar + top bar

Same interaction language for **left rail** and **top bar**.

### Collapse

- Click an **arrow** control on the chrome edge → sidebar / top bar **collapses** (more canvas for feed or IDE).  
- Persist preference in `localStorage` (per surface if needed).

### Expand (hover reveal)

- When collapsed, the chrome is a thin hit zone at the edge.  
- **Hover** that area → a **peek arrow** appears.  
- **Click** the arrow → expand again.  
- Keyboard: optional `[` / `]` or Escape-to-expand later.  
- Touch: swipe / tap the peek arrow (no hover) on mobile.

### Scope

| Chrome | Collapsed behaviour |
|--------|---------------------|
| Left nav rail (`GlobalShell`) | Icons/labels gone; ~0–12px edge + peek arrow |
| Top bar (`AuthenticatedTopBar`) | Height collapses; Mini App / search / profile available via peek or a slim strip |

Do not break Mini App expand panel: if top bar is collapsed, opening Mini App can temporarily expand the top bar or dock the panel from the peek control.

---

## 9. Helios AI that changes stuff without opening the full app

### Constraint

No legitimate **free unlimited forever** API key can be scraped or invented. Keys stay in **server env / admin settings**, never git.

### Build

1. OpenAI-compatible config + free-tier provider docs (Groq / Google AI Studio / OpenRouter, etc.).  
2. Local helper fallback when no key.  
3. Inline actions return **patches** (rewrite selection, design idea, fill sheet rows) applied from Mini App panel / lightweight inspector **without** opening full Word/PPT chrome.  
4. Accept / Reject preview strip.

Operator pastes their own free-tier key after signup.

---

## 10. Interesting extras (after core)

1. Buddies tab = real friends graph  
2. @mention in composer  
3. Shared folder per friendship  
4. Live cursors lite on Word/PPT  
5. PPT Designer template packs  
6. Command palette (no “Commit IDE” as primary — use “Open IDE”, “Add friend”)  
7. Home activity digest (still no Solar XP card)

---

## 11. Implementation order (when approved)

**No feature coding until approval.**

| Step | Work |
|------|------|
| A | Remove Lifestyle Your space + CREATE cards; Instagram-pack the feed; drop right-rail promos |
| B | Drop Create nav; **Mini App** text + arrow panel; liquid-glass colours |
| C | Sidebar + top bar collapse / hover-peek expand |
| D | M365-only suite + aliases; retire coding/business hobby launcher paths |
| E | Friend request API + Chat username search + Lifestyle Add friend |
| F | PPT rebuild (photos, Designer, layouts) |
| G | Word / Excel hot features + autosave everywhere |
| H | Helios IDE Cursor layout; git connection; **remove commit-as-save**; autosave |
| I | Inline Helios patches without full workspace |
| J | Docs / deploy sync |

### Acceptance checklist

- [ ] Screenshot cards gone from Space  
- [ ] Lifestyle packed like Instagram; no Mini App / Create / Solar widgets  
- [ ] No Create nav; **Mini App** + arrow toggles panel; colours match landing  
- [ ] Friend request from Chat search + Lifestyle  
- [ ] No Business/Coding hobby requirement  
- [ ] M365 apps + deep Word/PPT/Excel hot features  
- [ ] Helios IDE: side-by-side Helios, git connection, **autosave**, no commit homework UX  
- [ ] Sidebar + top bar: arrow collapse; hover edge → peek arrow → expand  
- [ ] Helios can patch files without opening full app chrome  
- [ ] No API secrets in git  

---

## 12. Non-goals

- Bit-perfect Microsoft Office  
- Microsoft Graph OAuth (unless separately requested)  
- Fake “unlimited free” hosted AI keys in the repo  
- Orbit / Stripe paywalls  
- Solar XP as Lifestyle primary UI  
- Commit-driven save as the main IDE workflow  

---

## 13. How to approve

- **「按这个 PLAN 做」** — implement in the order above  
- **「改 PLAN：…」** — adjust first  

Until then: **documentation only** (this file + README pointer).
