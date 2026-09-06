# Helios → Everyday Work Collab (M365-simple + social + realtime)

Helios should feel like a **normal work app anyone can use without training** — as obvious as Microsoft 365 — while keeping **most existing power features**, plus a light **social feed** and **realtime collaborate**.

Not an “AI product.” Not a dark neon dashboard. A **正规协作平台**: clean, calm, office-grade.

---

## North star

> A collab work website/app that **ordinary people open once and already know how to use** — simple like Word / Excel / Teams — with social posts and live collaboration built in.

### Design principles

1. **一看就会用** — Labels in plain language. One primary action per screen. No jargon, no mode maze.
2. **最简洁，功能大多保留** — Hide complexity behind progressive disclosure. Power stays; chrome goes.
3. **正规项目观感（像 M365）** — Light, professional Office palette. No purple-glow “AI startup” look.
4. **社交媒体 + 实时协作** — Feed for sharing progress / going live; realtime co-editing and live sessions with WorkBuddys.
5. **编程也要更简单** — Code IDE stays, but beside Helios buddy and plain-language controls so non-experts can still open, ask, and collaborate.

---

## Visual language (M365-like, not AI)

Replace graphite / violet / neon AI aesthetics with an Office-family system:

| Token idea | Direction |
|------------|-----------|
| Background | Soft light gray / white (`#f3f2f1` / `#ffffff`) — Fluent-like |
| Surfaces | White cards / panes, subtle borders (`#edebe9`) |
| Text | Near-black body (`#242424`), secondary gray (`#605e5c`) |
| Primary accent | Professional blue (`#0f6cbd` / Fluent brand blue) — not violet |
| Success / warn / danger | Standard Office semantic greens / oranges / reds |
| Typography | Clear UI sans (Segoe-like / system UI), not display/AI fonts |
| Motion | Short, purposeful; no glow, bloom, or orbit theatrics in-app |
| Icons | Simple line icons; consistent size; avoid emoji as UI chrome |

**Anti-patterns to remove:** purple-on-dark, neon accents, glassmorphism glow, cinematic orbit UI as the daily product shell, dense “dashboard widget walls.”

Landing can stay expressive; **the logged-in app must look like a real productivity suite**.

---

## Keep most features — simplify how they appear

| Keep (capability) | How ordinary users see it |
|-------------------|---------------------------|
| Documents, sheets, slides, notebooks, code | **Apps** — open like Office apps |
| Projects | **My files / Recent** on Home (no separate Projects page) |
| Posts, reactions, comments | **Lifestyle** social feed |
| Live collab / going live | A **post + Join** in Lifestyle (no Live tab) |
| Chat | **Messages** — iMessage-simple bubbles |
| Helios AI | **Buddy** — “Ask about this file” without opening it |
| Spaces / subjects | Soft grouping under Home / Apps, not a nav maze |
| Explore | Optional search on Home / Lifestyle — not a required tab |
| Free API | Documented, free core endpoints |

**Rule:** If a feature needs a tutorial, the UI failed. Put advanced options behind “More” / overflow, not on the first screen.

---

## Information architecture (max 5 places)

1. **Home** — Recent files, projects section, “New”, WorkBuddys online, short tips (one sentence).
2. **Lifestyle** — Social media feed + live collab posts.
3. **Apps** — Mini Apps (Workbook, Document, Presentation, Notebook, Code, …).
4. **Chat** — Messages with WorkBuddys (iMessage-style).
5. **Me / Profile** — Account, theme, export, settings.

**Remove from primary nav:** Live, Projects, and any extra hubs that duplicate Home / Lifestyle / Apps.

---

## 1. Lifestyle = social + realtime live posts

- Familiar social patterns: feed, composer, like/comment, follow.
- **Go live** from Lifestyle → creates a **Live Collab post** in the feed.
- Others tap **Join** on that post — no separate Live section.
- Realtime: presence, cursors / comments / shared session where the product already supports live APIs.
- Tone: work-social (share progress, ask for help, go live on a file) — not a generic meme network.

## 2. Chat = simple Messages (iMessage-like)

- Conversation list + bubble thread.
- Plain “Message WorkBuddy” — minimize Project/Group/Private tab overload.
- Attach a file / project lightly; don’t look like Slack admin.

## 3. Home carries projects + free API + Helios buddy

- **Projects live on Home** (recent, open, new) — delete the Projects page.
- **Free API** for auth, files/projects, posts, chat, Helios-when-configured.
- **Helios buddy:** preview / summarize a file **without opening the editor**; then optional “Open”.

## 4. Apps, IDE, WorkBuddys, realtime collab

### Mini Apps (real tools, plain names)

- Clear names people already know: Document, Workbook, Presentation, Notebook, Code…
- Workbook needs **cells, formulas, charts** — real spreadsheet behavior.
- Same honesty for other apps: they must *work*, not only look like tiles.

### Code = simple IDE + Helios side by side

```
┌──────────┬─────────────────────┬────────────┐
│ files    │ editor / preview    │ Helios     │
│          │                     │ buddy      │
└──────────┴─────────────────────┴────────────┘
```

Make coding *look* approachable: big Open / Share / Ask Helios / Invite WorkBuddy actions; advanced git/terminal behind secondary UI.

### WorkBuddys

- Friends / collaborators are **WorkBuddys**.
- Invite to a file, chat, or live session in one obvious control: **Invite WorkBuddy**.
- Realtime collaborate: co-presence on files + live sessions from Lifestyle posts.

---

## Everyday-user UX checklist

Every primary screen must pass:

- [ ] Can a non-technical adult find **New**, **Open**, **Share**, **Message** in under 5 seconds?
- [ ] Is there **one** clear next action (not six equal CTAs)?
- [ ] Are labels everyday words (Files, Messages, Apps) not product jargon?
- [ ] Does color look like Office / Teams, not an AI demo?
- [ ] Can they go live / join collab from Lifestyle without hunting a Live tab?
- [ ] Can Helios explain a file before they open it?

---

## Implementation map (current → target)

| Area | Current (approx.) | Target |
|------|-------------------|--------|
| Visual system | Dark graphite + violet AI look | Light M365 / Fluent-like suite |
| Nav | Many hubs including Live + Projects | Home · Lifestyle · Apps · Chat · Me |
| Live | Own page | Lifestyle live posts + Join |
| Projects | Own page | Home “Files / Projects” section |
| Chat | Chat Hub complexity | Simple Messages (iMessage-like) |
| Helios | Floating AI panel energy | Calm buddy + IDE side column |
| Mini Apps | Catalog heavy | Real tools, plain names, formulas |
| People | Vague friends | **WorkBuddys** + realtime invite |
| Copy / IA | Feature-dense | Ordinary-language, progressive disclosure |

### Code touchpoints

- `src/index.css` — replace AI palette with Fluent-like light tokens
- `src/components/GlobalShell.tsx` — slim nav + calm chrome
- `src/App.tsx` — drop Live / Projects as primary views
- `src/views/LifestyleView.tsx` — social + live posts
- `src/views/LiveView.tsx` — session overlay only (entered from a post)
- `src/views/ChatView.tsx` — Messages UI
- `src/views/HomeView.tsx` — Files/Projects section, plain CTAs
- `src/components/HeliosPanel.tsx` — buddy preview, no “AI theater”
- `src/workspaces/CodeWorkspace.tsx` / `ProjectWorkspace.tsx` — IDE + Helios column
- Suite / spreadsheet workspaces — formulas & real app behavior
- `server/` — free API docs + live→Lifestyle post on go-live
- Landing / marketing — can stay cinematic; **in-app shell must be suite-simple**

---

## Ship order

1. **Visual + nav** — M365-like light theme; 5-item nav; remove Live/Projects from rail  
2. **Home files section** + plain New / Open / Invite WorkBuddy  
3. **Lifestyle** live collab posts (social + realtime entry)  
4. **Messages** iMessage-style Chat  
5. **Helios buddy** file preview + IDE side-by-side  
6. **Workbook formulas** / Mini App fidelity  
7. **WorkBuddys** naming + invite everywhere  

Update the main `README.md` “Implemented functionality” as each slice lands.

---

## One-line product definition

**Helios is a simple M365-style work suite with a social feed and realtime collab — ordinary people use it without learning; WorkBuddys work together live.**
