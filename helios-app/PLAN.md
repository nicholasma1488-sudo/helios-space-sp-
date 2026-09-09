# Helios Space — Product rebuild plan (pre-code)

**Status:** planning only — **do not implement until this doc is approved**  
**Date:** 2026-09-09  
**Branch:** `cursor/collab-redesign-readme-779e`  
**Supersedes:** previous “ready to deploy” slice in this file’s earlier revisions

This is the README the product asked for **before** code changes. It turns the screenshot + chat feedback into a concrete build plan.

---

## 0. What the screenshot is pointing at

The mobile Space (Lifestyle) right rail currently shows:

1. **“Your space”** Solar card (Dawn / posts / level)  
2. **CREATE → Web Code Editor** promo card with **Go to Create**

**Decision:** both cards **leave Lifestyle**. Space is a social feed, not a Create warehouse and not a Solar scoreboard.

Related rule: Lifestyle must **not** embed Mini App promo, Mini App post kinds, or “open this tool” callouts. Work can still be *linked* from a post later, but the feed chrome itself stays social.

---

## 1. Product shape after this rebuild

### Navigation (logged-in)

| Before | After |
|--------|-------|
| Space · **Create** · Messages · Home · Me | Space · **Mini App ▾** · Messages · Home · Me |

- **Remove the Create nav destination** (`view: 'apps'` / Create page as a primary rail item).
- **Mini App** is **not** a Lucide grid icon. It is the words **“Mini App”** plus a **chevron/arrow** that expands or collapses a docked panel (same half-screen top-bar expand we already have, but labeled correctly).
- Collapsed: `Mini App ▾`  
- Expanded: `Mini App ▴` (or rotated arrow) + panel open under the top bar.

Home may keep a quiet “continue a file” list, but **no “Go to Create” / Web Code Editor marketing cards**.

### Visual / colour

- Mini App panel colours must match the **landing + auth liquid-glass** tone:
  - bg atmosphere `#eceff3`
  - terracotta `#c96442`
  - Gemini blue `#5b8def`
  - Codex grey glass surfaces  
- Drop mismatched per-app rainbow that fights the shell (re-map suite accents into terracotta / blue / grey family).

---

## 2. Kill Create as a product concept

| Remove / quiet | Keep (renamed) |
|----------------|----------------|
| Nav label **Create** | Trigger label **Mini App** |
| Lifestyle **CREATE** card + Web Code Editor promo | — |
| Home hero **Create** CTA copy | “Open a file” / “Continue” if needed |
| Marketing copy “Create suite” | “Mini Apps” / “Microsoft 365–style tools” |
| Default space hobby **coding** driving Web Code Editor | Neutral social default (no subject maze) |

`MiniAppsView` either becomes the panel content only, or a rare deep-link — **not** a bottom-rail tab.

---

## 3. Lifestyle / Space — social only

### Remove from Lifestyle UI

- “Your space” Solar pulse card  
- CREATE / contextual Mini App card  
- Any hobby / subject chips that surface **Business**, **Coding**, etc. as first-class feed filters  
- Composer branches that treat Mini App as a post type  
- Dead `mini-app` postKind state

### Keep / improve

- For you · Buddies · Saved  
- Composer: text / work update / Go Live / photo  
- Invite WorkBuddy  
- **New:** send a **friend request** directly from a profile/post affordance on Lifestyle (one tap → request), without bouncing through Create

### Data cleanup (catalog)

In `src/product/catalog.ts` (and any SpaceView leftovers):

- Stop promoting subject spaces like **business / coding** as required Lifestyle structure  
- Prefer a flat social graph (friends + feed), not a subject maze  
- Orphaned `SpaceView` / Explore subject UI can stay unlinked until deleted in a later cleanup PR

---

## 4. Friend requests (new social primitive)

Today: follows exist on orphaned Space/Explore; Chat creates threads by handle; **no friend-request API/UI**.

### Chat hub

- Search by **username / handle** (server directory search, not only local conversation filter)
- From a result: **Add friend** / **Message** / **Cancel pending**
- Friend request inbox (incoming / outgoing) inside Messages or a small requests sheet

### Lifestyle

- On another user’s post or avatar menu: **Add friend**
- Optimistic pending state; toast on accept

### Server sketch

| Endpoint | Purpose |
|----------|---------|
| `GET /api/users/search?q=` | Username search (privacy-safe fields) |
| `POST /api/friends/request` `{ handle \| user_id }` | Send request |
| `GET /api/friends/requests` | Inbox |
| `POST /api/friends/requests/:id/respond` `{ accept \| decline }` | Respond |
| `GET /api/friends` | Accepted friends (Buddies tab can later use real graph) |

Reuse rate limits similar to follow. Do **not** invent “friends” by silently following.

---

## 5. Mini Apps = Microsoft 365 set (only)

Replace the sprawling suite + huge `MINI_APP_CATALOG` *as the product surface* with **M365-shaped apps people actually use**. Legacy catalog IDs may alias for old files.

### In scope (v1 surface)

| App | Role |
|-----|------|
| **Word** (Docs) | Documents |
| **Excel** (Sheets) | Spreadsheets |
| **PowerPoint** (Slides) | Presentations |
| **Outlook** (Mail) | Mail drafts / threads UI |
| **Calendar** | Schedule |
| **OneNote** (Notebook) | Notes |
| **To Do / Tasks** | Tasks |
| **Planner** | Boards |
| **Loop** (optional if capacity) | Collaborative pages |
| **Lists** (optional) | Simple lists |
| **Teams-lite chat link** | Deep-link to Messages, not a fake Teams clone |
| **Helios IDE** (replaces Web Code Editor) | Cursor-style coding — see §7 |

**Out of product surface:** random hobby mini-apps, duplicate “Web Code Editor” promo, Business/Coding subject apps as Lifestyle features.

### Colour

Unified glass chrome; each app gets a **subtle** accent only (Word terracotta, Excel green-muted→grey-green within token set, PPT warm terracotta variant, IDE blue) — no loud multi-hue launcher.

---

## 6. Word / PowerPoint / Excel — “every hot feature” people use

We cannot ship bit-for-bit Microsoft Office. We **can** ship the **daily hot path** features so Helios feels like a **pro working platform**, not a toy contentEditable.

### Word (priority hot features)

- Styles: Normal, Title, Heading 1–3  
- Font family / size / bold / italic / underline / highlight  
- Alignment, lists, indent, line spacing  
- Insert: image (upload + URL), table, link, page break, comment  
- Find / replace  
- Header / footer + page numbers  
- Spell / grammar assist via Helios (inline)  
- Track-changes *lite* (suggest mode) if time  
- Export: `.docx` (best effort) + PDF print  
- **Inline Helios edit:** rewrite selection / whole doc **without** leaving the soft panel (see §8)

### PowerPoint (current PPT is too thin — rebuild)

Today: title + body + notes only. **Not acceptable.**

Must add:

- Slide **layouts** (title, title+content, two-column, blank, section)  
- **Insert photos** (upload, drag-drop, stock/unsplash URL)  
- Shapes (rect, ellipse, line, arrow) + text boxes  
- Designer-style **Design ideas** pane (template themes / colour variants — Helios-assisted)  
- Master / theme colours + fonts  
- Transitions (fade / push) + simple appear animations  
- Presenter view + speaker notes  
- Reorder / duplicate slides  
- Image crop / z-order  
- Export PDF / images  

### Excel hot path

- Richer formula set (`SUM`, `AVERAGE`, `IF`, `VLOOKUP`/`XLOOKUP` lite, `COUNTIF`)  
- Number formats, freeze header, sort/filter  
- Charts (bar/line/pie)  
- Insert image in sheet (optional)  
- CSV import/export  

### Shared “pro platform” chrome

- File menu: New / Open recent / Rename / Duplicate / Share to Space / Invite collaborator  
- Version history (reuse project versions where present)  
- Presence / collaborators list  
- Helios side panel docked (not a modal chatbot)

---

## 7. Replace Web Code Editor → Cursor-style Helios IDE

**Goal:** side-by-side **editor + Helios**, with **Git connection**, feeling closer to Cursor than to a single Monaco demo.

### Layout

```
┌────────────┬──────────────────────────┬─────────────────┐
│ File tree  │ Monaco editor / tabs     │ Helios panel    │
│ + Git      │                          │ chat / edits    │
│ status     │ terminal / preview       │ apply patches   │
└────────────┴──────────────────────────┴─────────────────┘
```

### Features

- Multi-file project (keep)  
- **Git:** init / status / diff / commit / branch (local in project storage first; remote URL + token optional)  
- Helios **side-by-side** always available (not only a floating orb)  
- Apply code edits as diffs into the open file  
- Terminal + preview for web stacks  
- Rename surface: **Helios IDE** (kill “Web Code Editor” product name)

Primary files today: `CodeWorkspace.tsx`, `RepoFrame.tsx`, `repoModel.ts`, `HeliosPanel.tsx` — extend rather than invent a second editor.

---

## 8. Helios AI that actually changes stuff (without opening the full app)

**User ask:** fetch an API key for a free unlimited site; let Helios change Word/PPT/etc. without opening the heavy workspace chrome.

### Honest constraint (must stay in plan)

- There is **no legitimate “free unlimited forever”** third-party API key we can scrape or invent.  
- Keys must come from a **provider account** (or local free helper) and live in **server env**, never in git.

### Recommended approach

1. Keep OpenAI-compatible admin config (`HELIOS_AI_*` / site settings).  
2. Prefer a **generous free tier** provider the operator can register (e.g. Groq / Google AI Studio / OpenRouter free models) — document signup steps in deploy README; **do not commit secrets**.  
3. Local fallback (`buildLocalHeliosReply`) remains when no key.  
4. **Inline actions** from Mini App panel, Messages Helios, and Lifestyle compose assist:
   - “Rewrite selection”  
   - “Apply design idea to this slide”  
   - “Fill 5 Excel rows from this prompt”  
   - Returns a **patch / structured JSON** the client applies in-place  

### “Without opening the actual function”

Interpretation we will build:

- From the **Mini App expand panel** or a **lightweight inspector**, Helios can mutate the **last/selected file** via API (`PATCH` content) and show a preview strip  
- Full Word/PPT UI is optional for that edit — user can Accept / Reject the patch in the panel  

If a true key is required for production, the human operator pastes it into admin/site settings after signup. The agent will wire the plumbing + docs, not fabricate unlimited keys.

---

## 9. More interesting features (additive, after core)

Priority after §§1–8:

1. **Friend graph → Buddies feed** uses real friends, not “everyone except me”  
2. **@mention** friends in Lifestyle composer  
3. **Shared folder** per friendship / small group  
4. **Live cursor** on Word/PPT when collaborators are in the same file (lite)  
5. **Design system templates** marketplace inside PPT Designer  
6. **Command palette** actions: “New Word”, “Invite @handle”, “Commit IDE”  
7. **Activity digest** on Home (friends’ docs + posts), still no Solar XP card

---

## 10. Implementation order (when approved)

Do **not** start coding until the user says to proceed.

| Step | Work | Primary files |
|------|------|----------------|
| A | Remove Lifestyle Your space + CREATE cards; strip Mini App promo from feed | `LifestyleView.tsx` / `.css` |
| B | Nav: drop Create; Mini App text + arrow expand/collapse | `GlobalShell.tsx`, `AuthenticatedTopBar.tsx`, `TopBarCreatePanel.*` |
| C | Recolour Mini App panel to liquid-glass tokens | `TopBarCreatePanel.css`, `miniApps.ts` accents |
| D | Narrow suite to M365 + Helios IDE; alias legacy IDs | `miniApps.ts`, `flow.ts`, `catalog.ts` |
| E | Friend request API + Chat search + Lifestyle Add friend | `server.js`, `api.ts`, `ChatView.tsx`, `LifestyleView.tsx` |
| F | PPT rebuild (layouts, photos, designer) | `ProductivityWorkspaces.tsx` (+ split files if needed) |
| G | Word / Excel hot-feature pass | same + CSS |
| H | Helios IDE Cursor layout + git | `CodeWorkspace.tsx`, `RepoFrame.tsx`, git helper module |
| I | Inline Helios patch apply without full workspace | `HeliosPanel.tsx`, server AI routes, project file PATCH |
| J | README / PRODUCT sync + deploy | `README.md`, `PRODUCT.md`, `deploy/README.md` |

### Acceptance checklist

- [ ] Screenshot cards (“Your space”, CREATE / Web Code Editor) gone from Space  
- [ ] No Create rail item; **Mini App** label + arrow toggles panel  
- [ ] Lifestyle has no Mini App feature chrome; hobbies like Business/Coding not required  
- [ ] Chat can search username and send friend request; Lifestyle can too  
- [ ] Mini App colours match landing/auth  
- [ ] PPT supports insert photos + designer-style themes  
- [ ] Word/Excel expose daily hot features listed above  
- [ ] Web Code Editor renamed/replaced by Helios IDE with git + Helios side-by-side  
- [ ] Helios can apply an edit patch without opening full workspace chrome  
- [ ] No API secrets in git; free-tier provider documented for operators  

---

## 11. Explicit non-goals (this rebuild)

- Bit-perfect Microsoft Office / Windows desktop parity  
- Real Microsoft account OAuth / Graph sync (unless separately requested)  
- Claiming unlimited free hosted AI without an operator-owned key  
- Bringing back Orbit / Stripe paywalls  
- Keeping Solar XP / Dawn level as a Lifestyle primary card  

---

## 12. How to approve

Reply with one of:

- **“按这个 PLAN 做”** — implement in the order above  
- **“改 PLAN：…”** — adjust scope first  
- Call out must-haves vs defer (especially Loop/Lists, track-changes, remote Git hosting)

Until then: **no feature code changes** beyond updating this plan and the root README pointer.
