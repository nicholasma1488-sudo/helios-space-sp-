# Helios → One place, few apps, obvious icons, WorkBuddys

Helios is a **single, together** work + study collab app. Users should **never spend time figuring the product out** — if they hunt around and still can’t do the job, the design failed.

Tone: **M365-simple** (正规、浅色、好认) + light social + realtime collab. Not an AI demo. Not a warehouse of empty tools.

---

## North star

> Open Helios → see everything that matters in one place → tap a clear icon → do school/work with WorkBuddys. No exploration tour required.

### Hard rules

1. **一切都在一起** — Home is the hub. Files, Apps, Messages, Lifestyle, and “who’s online” sit in one calm shell. Don’t scatter the same job across five pages.
2. **不要让用户找半天** — Every useful action is visible with a **small icon + short label**. If it isn’t findable in 5 seconds, hide it or delete it.
3. **找得到就要能用** — No dead tiles, fake labs, or “coming soon” mazes. If it shows up, it works.
4. **功能不要太多 / App 少一点** — Fewer apps, fewer buttons. Depth only where students and normal work need it.
5. **写的话不要太难用** — Writing tools stay plain: type, title, share. No thesis-studio complexity on the first screen.
6. **每个入口都有小图标** — Icons teach “这是干啥的” before the user reads a paragraph.
7. **每个 Mini App 有自己的小姐姐 + 自己的名字** — Cute guide character under the app name so apps feel friendly and memorable, not like a generic Office clone list.

---

## One shell (everything together)

```
┌─────────────────────────────────────────────────────────┐
│  Helios                          🔍  Search   👤 Me     │
├──────────┬──────────────────────────────────────────────┤
│ Home     │  Recent files · New · WorkBuddys online      │
│ Lifestyle│  (social feed + live posts live here too)    │
│ Apps     │  Few Mini Apps with 小姐姐 + icons           │
│ Messages │  iMessage-simple chat                        │
│ Me       │  Account                                     │
└──────────┴──────────────────────────────────────────────┘
```

- **No separate Live page** — go live → Lifestyle post → Join.
- **No separate Projects page** — files/projects live on **Home**.
- Lifestyle / Messages / Apps are tabs in the **same** product, not different products.

---

## Icons everywhere (teach by glance)

Every nav item, Mini App, and primary action gets:

| Element | Pattern |
|---------|---------|
| Nav | Icon + 1 word (Home / Lifestyle / Apps / Messages / Me) |
| Mini App tile | App icon + **原创名字** + **小姐姐** avatar under the name + 4–6 word job line |
| Primary actions | Icon buttons: New · Open · Share · Invite · Go live · Ask Helios |
| Empty states | One icon + one sentence + one button |

No icon-only mystery controls. Icon + label always.

---

## Fewer Mini Apps (school + normal work)

Cut the huge catalog. Ship a **short list** people actually need for class and everyday work:

| App id | 原创名字 | 小姐姐 | Icon idea | What it does (plain) |
|--------|----------|--------|-----------|----------------------|
| `write` | **墨语** | 小墨 | document | Easy writing — essays, letters, notes. Not hard. |
| `sheet` | **格间** | 小格 | table | Numbers, homework tables, simple formulas. |
| `slides` | **光幕** | 小光 | slides | Class / meeting slides. Make → present. |
| `notes` | **随身本** | 小本 | notebook | Class notes you keep adding to. |
| `tasks` | **今日事** | 小办 | checklist | Homework / to-dos: due → doing → done. |
| `cards` | **记卡** | 小记 | cards | Flashcards for vocab / facts. |
| `code` | **搭子码** | 小码 | code | Simple IDE + Helios beside you. |
| `chat` | *(nav Messages)* | — | message | Talk to WorkBuddys (not a Mini App tile). |

**That’s the set.** No stocks, pitch decks, comic studios, lab museums, or 80 catalog clones on the home grid.

Optional later (only if users ask): Quiz form, Reading list — still with their own 小姐姐 + name, still not dumped into a crowded grid.

### Writing must stay easy (`墨语`)

- Big text area, title, Share / Invite WorkBuddy.
- Headings & lists are enough on day one.
- Helios can help rewrite — optional, calm, not a wall of modes.

### Spreadsheet must be real but approachable (`格间`)

- Cells, a few common formulas (`SUM`, `AVERAGE`, basic arithmetic), simple chart.
- Don’t expose every Excel power feature on first open.

---

## 小姐姐 system (per Mini App)

Each Mini App tile and header shows:

```
  [app icon]
   墨语
  (小墨 avatar)     ← 小姐姐 under the name
  “写作业、写信，随便写”
```

Rules:

- One **小姐姐** per Mini App (name + simple portrait / avatar).
- She is a **friendly guide**, not a chatbot wall — short tip under the name (“点这里开始写”).
- Same character appears in empty states and light onboarding (one line, then gone).
- Visual style: clean, cute, consistent — still fits a light M365-like product, not a game lobby.

Suggested roster:

| 小姐姐 | App | One-line tip |
|--------|-----|--------------|
| 小墨 | 墨语 | 想写就写，写完就能分享 |
| 小格 | 格间 | 表格算数，作业账本都行 |
| 小光 | 光幕 | 做几页幻灯片就上课/开会 |
| 小本 | 随身本 | 课堂笔记放这里 |
| 小办 | 今日事 | 今天要交的都列出来 |
| 小记 | 记卡 | 背单词、背考点 |
| 小码 | 搭子码 | 写代码时 Helios 坐旁边 |

Helios itself stays the **work buddy** (not a competing 小姐姐 per screen): file preview without opening + side-by-side in 搭子码.

---

## Social + realtime (still together)

- **Lifestyle**: social feed for progress, questions, and **live collab posts**.
- Go live → auto post in feed → WorkBuddys tap **Join**.
- **Messages**: iMessage-simple; invite WorkBuddy to a file from one Share button.
- Realtime collab happens *from* the feed or the open file — users don’t learn a separate “Live product.”

---

## What we deliberately cut

- Hunting through Explore / Spaces / Live / Projects as separate worlds  
- Giant Mini App catalogs that don’t work or look the same  
- Hard writing studios and feature checklists on first paint  
- Purple AI glow / “explore our platform” tourism  
- Anything that makes users **spend time learning Helios instead of doing homework/work**

---

## Visual language (unchanged direction)

Light Fluent / M365 palette, professional blue, plain UI type, short motion. Icons + 小姐姐 give warmth; colors stay office-calm.

---

## Ship order

1. ~~**One shell + icons**~~ — done  
2. ~~**Cut Apps list**~~ — done (7 apps + 小姐姐)  
3. ~~**Home**~~ — done (files + WorkBuddys)  
4. ~~**Lifestyle** live posts~~ — done (no Live tab)  
5. ~~**墨语 / 格间**~~ — writing kept simple; SUM/AVERAGE formulas  
6. ~~**Messages**~~ — iMessage-oriented styling  
7. ~~**搭子码 + Helios**~~ — Helios docked as file-preview buddy  

Main `README.md` lists what shipped in this pass.

---

## One-line product definition

**Helios is one simple place for school and everyday work — few Mini Apps, each with its own name, icon, and 小姐姐; social + live with WorkBuddys; no hunting, no empty tools.**
