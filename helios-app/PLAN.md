# Helios Space — Next Slice Plan

## Status: **in progress**

Keep Lifestyle as the social core. Attachment UI is a real window. Create opens an expanding Mini App picker (iPhone-model style), without guide emojis.

---

## Product intent (do not lose)

Helios Space is a **liquid-glass social collaboration room**, not an AI demo and not an Office warehouse.

| Keep | Change |
|------|--------|
| **Lifestyle / Space feed** — For you, Buddies, composer, posts, invite WorkBuddy | Polish layout; do **not** remove or replace Lifestyle |
| Messages, Home, Me | Calm shell only |
| Create tools that actually open files | How you *pick* a tool (animation + window) |
| Free forever | No Orbit / Stripe / paywall copy |

Reference: [`PRODUCT.md`](./PRODUCT.md) §3–4 (Lifestyle → Space Feed).

---

## 1. Keep Lifestyle

**Source of truth:** `src/views/LifestyleView.tsx` + `LifestyleView.css`  
Nav label **Space** still routes to Lifestyle (`GlobalShell` → `view: 'lifestyle'`).

### Stay

- Feed tabs (For you / Buddies / Saved)
- Expandable composer (text / work / Go Live)
- WorkBuddy strip + invite (not X-style repost maze)
- Glass feed cards, calm motion

### Light polish only (same slice if cheap)

- Composer option row overflow on mid widths (Photo + audience + project select)
- Remove dead `mini-app` composer branch / copy if still present
- Do **not** gut Solar/right rail in this slice unless it blocks the picker work

**Acceptance:** Opening **Space** still feels like a social feed first. No Create grid replaces the feed.

---

## 2. Attachment UI bug — fix

**Problem:** Messages attach UI is a fragile absolute panel, not a real window. It overflows, duplicates lists, and fights the composer.

**Primary files**

- `src/views/ChatView.tsx` — `showAttachments` / `.chat-attachment-menu`
- `src/views/ChatView.css` — absolute `bottom`, `max-height: 360px`, `.chat-project-attachment { min-width: 320px }`
- Lifestyle composer attach row — `LifestyleView.tsx` / `.composer-options`

### Bugs to fix

1. **Chat attach menu** sits as `position: absolute` above the composer → clips, overlaps, no Escape / focus trap.
2. **“Shared Projects” and “Shared Mini Apps”** both map `state.projects` → duplicate UI.
3. **Project attachment cards** force `min-width: 320px` → horizontal overflow in narrow chat panes.
4. Lifestyle composer **single flex row** of attach controls wraps badly under ~1180px.

### Fix shape

Replace the floating menu with a **small sheet / popover window**:

- Anchored to the `+` attach button (or centered sheet on mobile)
- Backdrop click + Escape closes
- `useFocusTrap` (same pattern as other modals)
- One list: **Upload file** + **Attach a project** (no duplicate “Mini Apps” section)
- Fluid width: `min(360px, calc(100% - 24px))`; drop hard `min-width: 320px` on cards
- Lifestyle: stack attach controls on smaller breakpoints; keep media preview inside the composer card

**Acceptance:** Click attach → stable window; keyboard closes it; no duplicate lists; no horizontal scroll in Messages on phone widths.

---

## 3. Mini Apps picker — iPhone-style expand window

**Inspiration:** Apple product page / store flow — click a product family → **expanding window animation** → choose generation/model (e.g. which iPhone).  
**Helios mapping:** click Create entry (or the top-bar context control) → **same expand animation** → choose a **Mini App** (Docs, Sheets, Code, …) → New file / open recent.

### Click target

Prefer making **Create** open this experience (rail + Create page).  
Optional second entry: turn the static top-bar cluster  
`Space · Social collaboration · [Coding chip]`  
(`AuthenticatedTopBar` `.topbar-context-nav`) into a clickable **Create / Apps** opener — today that chrome is **not** interactive and sits next to Search; do not leave a dead “attachment-looking” control there.

### Interaction

1. User clicks **Create** (or the context chip).
2. Backdrop fades; a **panel expands** (scale + slight rise), reusing motion close to `.live-setup-expand` in `ProjectWorkspace.css` / spring tokens in `index.css`.
3. Window title: **Create** / “Pick a tool”.
4. Grid of **all Mini Apps** (from `SUITE_APPS` in `miniApps.ts`) — icon + name + one short line. **No guide emojis.**
5. Select an app → same window shows New / recent files for that app (like picking a “generation”), then opens `ProjectWorkspace`.
6. Reduced motion: fade only, no bounce.

### Implementation sketch

| Piece | Path / note |
|-------|-------------|
| Data | `src/product/miniApps.ts` — keep `icon` Lucide keys; **remove `guideEmoji` from UI** |
| Shell | New `MiniAppPicker.tsx` (or upgrade `MiniAppsView` `.suite-picker`) |
| Motion | Expand from click origin if cheap (FLIP); else centered spring expand |
| Open | `createSuiteProject` / `openProjectWorkspace` in `flow.ts` unchanged |

**Acceptance:** One clear expand animation; every suite app selectable; feels like a product chooser, not a chatbot launcher.

---

## 4. Get rid of emojis

| Location | Action |
|----------|--------|
| `miniApps.ts` `guideEmoji` | Stop rendering on Create tiles, picker, Home recent |
| Create tiles | Lucide / letter mark only (`icon` field already exists) |
| Brand `✦` / Sparkles-heavy empty states | Prefer quiet icons or none |
| Lifestyle reactions (👍❤️…) | **Keep for now** (social feed affordance) — out of scope unless they feel too loud |

**Acceptance:** Create / Home / picker have **zero decorative emoji**.

---

## 5. Less “AI-like”

Tone: calm tools + social work — not neon assistant theater.

| Do | Don’t |
|----|--------|
| Liquid glass, terracotta + soft blue, Codex grey | Purple glow, orbit fireworks in the logged-in shell |
| Short labels: Create, Docs, Run, Invite | “Ask the universe”, sparkle walls, Orbit paywalls |
| Helios as a **side panel helper** when editing | Floating AI orb as the product identity |
| README / UI say **free forever** | Stripe / Orbit / Alpha plan myths |

Concrete cleanup in this slice:

- Create header: drop Sparkles + “FREE FOREVER” kicker noise (or one quiet free line)
- Top-bar / empty states: fewer Sparkles icons
- Chat CSS: remove leftover purple/orbit base styles once the attach window lands
- Do not grow Helios FAB behavior in this slice

---

## Implementation order

1. **Attachment window** (Messages + Lifestyle overflow) — unblocks real use  
2. **Strip Create emojis** + quiet Create copy  
3. **Expanding Mini App picker window** (iPhone-gen-style motion)  
4. **Top-bar context** — either make it the picker trigger or leave it purely informational (no broken/dead control)  
5. **De-AI pass** on Create + attach chrome only  

Lifestyle feed stays online through all steps.

---

## Out of scope (this plan)

- Rewriting landing Three.js orbit scene  
- Cutting the suite down to five apps (can follow later; picker should still list what ships)  
- Replacing Helios AI backend  
- Billing / Orbit resurrection  

---

## Verify when implemented

```bash
npm run build
npm run lint
npm run test:api
```

Manual:

- [ ] Space (Lifestyle) feed still primary social surface  
- [ ] Messages `+` opens attach **window**; Escape closes; no duplicate project lists; no overflow  
- [ ] Create click → expand animation → all mini apps → open Docs/Code without emoji guides  
- [ ] No decorative emoji on Create tiles / picker  
- [ ] Logged-in shell still calm (no purple neon / Orbit paywall)

---

## File checklist

| Area | Files |
|------|--------|
| Lifestyle keep | `LifestyleView.tsx`, `LifestyleView.css` |
| Attach bug | `ChatView.tsx`, `ChatView.css`, Lifestyle composer CSS |
| Picker | `MiniAppsView.tsx` / new `MiniAppPicker.tsx`, `MiniAppsView.css`, `miniApps.ts` |
| Top bar | `AuthenticatedTopBar.tsx`, `AuthenticatedTopBar.css` |
| Motion tokens | `index.css`, `ProjectWorkspace.css` (`live-setup-expand`) |
| Docs | this file + short pointer in `README.md` |
