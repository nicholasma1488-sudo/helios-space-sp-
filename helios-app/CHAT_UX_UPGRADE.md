# Helios Space — chat & collab upgrade plan

This is the working README for the current production-quality upgrade pass.
**No implementation starts until this file exists.** Scores below are the
quality gate: anything under **4** on any criterion is blocked until fixed.

## Product reality (do not pretend otherwise)

This repository is **Helios Space**: React + Vite client, Express + SQLite
server, email/password accounts, BYOK Helios AI, Spaces / Chat Hub / Live /
Forge (Helios IDE). It is **not** a SvelteKit, passphrase-only, or
end-to-end-encrypted-sync chat app.

The requested hour blocks are implemented **on these real surfaces**, without
inventing a second architecture:

| Requested idea | Actual Helios surface |
| --- | --- |
| Main AI chat | Helios side panel (`HeliosPanel`) + Home agent bar |
| Starter suggestions that block chat | Home agent chips + Helios empty-state quick actions |
| Messages / sidebar | Chat Hub (`ChatView`) |
| Forge preview | Code workspace / Helios IDE live `iframe` |
| Profile menu | Authenticated top-bar account menu |
| Memory | Local, inspectable Helios memory (never a new plaintext message dump) |
| Collabs | Existing project / group / private conversations + member activity |
| Language | Existing `src/i18n` (English keys, 简体, 繁體) |

**Privacy / architecture constraints we will not violate**

- No new server-side store of Helios AI transcripts.
- No fake “encrypted sync”. Device prefs use `localStorage`. Account-visible
  data that already lives on the server (avatar, edited chat messages, leave)
  uses the existing session cookie, same as Chat Hub today.
- Sign-out cannot become “passphrase-only”: this product has email accounts.
  Sign-out will revoke the session and wipe **session-scoped** client data
  (memory, Helios agent chat history, pending prompts, composer drafts,
  model-tab cache). Device accessibility prefs (theme, reduced motion, UI
  language) stay.
- BYOK keys stay in `/api/me/ai`. Sign-out does not delete the user’s stored
  key on the server (that would be data loss); it clears the local session so
  the key is unreachable until they sign in again.

## Exact work list (priority order)

### Hour 0–1.5 — UI cleanup & blocking elements (HARD)

1. Permanently remove Home agent example chips (`HomeAgentBar` `SUGGESTIONS`).
2. Permanently remove Helios panel empty-state suggestion lists
   (`AGENT_SUGGESTIONS` / contextual “Try asking” chips). They must never
   overlay or intercept the composer.
3. Helios panel: message log + composer usable on first paint; no leftover
   click-stealers; overflow/scroll isolated to the log.
4. Chat Hub: dense, aligned thread (list, composer, sidebar); mobile
   thread/sidebar switch without clipping; composer always reachable.
5. Kill accidental interaction surfaces (hover-only pin that sits in the
   gutter; unused “⋯” that does nothing).

### Hour 1.5–3 — Full-screen + Forge preview full-screen (HARD)

1. Profile menu: **Full screen** toggle. Hides rail, top bar, and non-essential
   chrome. Escape and the same menu item restore prior rail/top-bar collapse
   state.
2. Persist in `localStorage` (`helios-chrome-fullscreen`). No encrypted sync
   layer exists; this is a device preference, same family as rail collapse.
3. Forge / Helios IDE preview: independent full-screen overlay (own toggle,
   `z-index` above workspace, Escape exits preview only, does not toggle app
   chrome). Zero layout breakage on enter/exit.

### Hour 3–4.5 — Profile icons + sign out + memory (HARD)

1. `UserAvatar`: initials + deterministic color fallback; optional cropped
   image upload (bounded data URL on `/api/me`). Use everywhere we currently
   show a single letter (top bar, Chat Hub, Helios, feed cards we touch).
2. Complete sign-out: `POST /api/logout`, `RESET_SESSION`, clear
   sessionStorage + Helios memory + pending agent prompts + composer drafts.
   Land on the public landing page.
3. Helios continuity (privacy-first):
   - No Settings “add a note” memory card
   - Prior local Helios chats (`helios-agent-history-v1`) are summarized into
     the next request so the agent can continue earlier work
   - Current thread turns are sent to the agent planner
   - Sign-out still wipes that on-device history

### Hour 4.5–6 — Message editing UI (HARD)

1. Own Chat Hub messages: inline edit, ⌘/Ctrl+Enter save, Escape cancel,
   visible confirm/cancel, “edited” mark.
2. Server: `PATCH` own message body; keep pin/select/Helios-branch behavior.
3. Helios panel user bubbles: same inline edit before resend (edits the
   pending local turn, does not invent a server Helios transcript store).

### Hour 6–7.5 — File sending (HARD)

1. Drag-and-drop onto the Chat composer (and a drop overlay).
2. Multi-file queue with image/document preview, per-file remove, size/type
   errors, sending progress.
3. Stay client-encoded (existing base64 attachment). Keep the 1 MB server
   cap; show it before upload. Mobile-friendly attach button.

### Hour 7.5–9 — Language support (HARD)

Already shipped on `cursor/ollama-helios-wire-779e` (English / 简体 / 繁體,
`t()` keys, Settings + landing switchers, server reply language). This block
**finishes leftovers**: every string this upgrade adds is translated; remaining
visible English chrome we touch (e.g. Home “New file”) is wrapped. No Svelte
i18n rewrite.

### Hour 9–10 — Collabs MVP (HARD)

Ship the async MVP on Chat Hub (real-time sockets are out of scope):

1. Conversation **members** list + last-read activity.
2. **Leave** a group/private thread (owner can leave only if another member
   remains, or the conversation is deleted when the last member leaves).
3. Clear ownership (`created_by` / role).
4. Do not break project chats, temporary empty states, BYOK, or Helios panel.

**Explicitly missing after this MVP:** live typing, presence heartbeats,
CRDT/E2E shared buffers. Those need a realtime channel this server does not
have.

## Quality rubric

Score each hour block 1–5. **Ship gate: every criterion ≥ 4.**

1. Completeness
2. Polish & UX
3. Edge cases & robustness
4. Privacy & architecture fit
5. Code quality
6. Accessibility & performance

After each block: write the scores in this file’s “Rubric scores” section and
fix anything below 4 before the next block.

## How success is measured

- Helios panel opens to an empty, usable composer — no suggestion buttons.
- Home agent bar has a single input, no example chips.
- Chat Hub thread scrolls inside the log; composer is visible on mobile and
  desktop without covering messages.
- Profile → Full screen hides chrome; Escape restores it. Forge preview
  full-screen is independent.
- Avatars render consistently; upload rejects oversized/non-image files.
- Sign-out returns to landing; a new session does not see the previous
  user’s Helios memory, agent chat history, or pending prompts.
- Helios panel History restores prior local chats after the panel unmounts;
  transcripts stay in `helios-agent-history-v1` on this device only.
- Desktop (≥1100px) keeps a persistent Helios history rail beside the thread;
  narrower viewports overlay history without unmounting the conversation.
- Helios My API keys are added in the panel, not by leaving for Settings.
- New Helios turns include a bounded recap of earlier on-device chats.
- Own messages edit in place; pins and Helios selection still work.
- Files can be dropped, previewed, rejected with a clear error, and sent.
- New UI strings have 简体 and 繁體 entries.
- A group chat shows members + leave; project chats still open the Project.

Verification: `npx tsc -p tsconfig.app.json --noEmit`, Chat Hub / Helios /
Forge / Settings exercised in the browser (or headless Chrome).

## Rubric scores

Filled in after each block.

| Block | Completeness | Polish | Robustness | Privacy | Code | A11y/Perf | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 0–1.5 UI cleanup | 5 | 4 | 4 | 5 | 4 | 4 | Home chips + Helios suggestion lists removed; Chat Hub log/composer isolated; mobile back is a real control |
| 1.5–3 Full-screen | 5 | 4 | 4 | 5 | 4 | 4 | App chrome via `helios-chrome-fullscreen`; Forge preview overlay + capture-phase Escape |
| 3–4.5 Avatar / sign-out / memory | 5 | 4 | 4 | 5 | 4 | 4 | Initials + bounded upload; session wipe keeps theme/language; memory is local-only |
| 4.5–6 Message editing | 5 | 4 | 4 | 5 | 4 | 4 | Chat Hub PATCH + inline edit; Helios user bubbles edit locally only |
| 6–7.5 File sending | 5 | 4 | 4 | 5 | 4 | 4 | DnD, queue of 8, 1 MB cap, image preview, send progress |
| 7.5–9 Language leftovers | 4 | 4 | 4 | 5 | 4 | 4 | New strings translated; catalog product names stay English by design |
| 9–10 Collabs MVP | 4 | 4 | 4 | 5 | 4 | 4 | Members + last-read + leave. No typing/presence/CRDT (documented) |
