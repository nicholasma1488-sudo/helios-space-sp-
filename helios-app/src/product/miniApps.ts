import type { BillingPlanId, Project } from '../api'

export type SuiteEdition = 'free' | 'orbit'
export type SuiteTrack = 'core' | 'orbit'

export interface SuiteApp {
  id: string
  /** Product name shown on the tile */
  name: string
  letter: string
  color: string
  description: string
  projectType: Project['type']
  spaceChild: string
  spaceAdult: string
  /** Default new file name */
  newName: string
  track: SuiteTrack
  /** Guide persona under the app name */
  guideName: string
  guideTip: string
  /** Short emoji used as the guide avatar */
  guideEmoji: string
  /** Lucide-style icon key for the tile */
  icon: 'write' | 'sheet' | 'notes' | 'tasks' | 'code' | 'slides' | 'board' | 'mail' | 'calendar' | 'draw' | 'read' | 'plan' | 'list' | 'loop'
}

/** Mini Apps — Helios-native names (M365-shaped capabilities). */
export const SUITE_APPS: SuiteApp[] = [
  {
    id: 'word-docs',
    name: 'Quill',
    letter: 'Q',
    color: '#c96442',
    description: 'Helios documents — styles, images, tables, comments, and rewrite.',
    projectType: 'writing',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Quill doc',
    track: 'core',
    guideName: 'Quill',
    guideTip: 'Write and share',
    guideEmoji: '',
    icon: 'write',
  },
  {
    id: 'spreadsheet',
    name: 'Lattice',
    letter: 'L',
    color: '#5a6270',
    description: 'Helios spreadsheets — formulas, charts, filters, and CSV.',
    projectType: 'spreadsheet',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Lattice sheet',
    track: 'core',
    guideName: 'Lattice',
    guideTip: 'Numbers that move',
    guideEmoji: '',
    icon: 'sheet',
  },
  {
    id: 'presentation',
    name: 'Stage',
    letter: 'S',
    color: '#c96442',
    description: 'Helios decks — layouts, photos, Designer, and present mode.',
    projectType: 'presentation',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Stage deck',
    track: 'core',
    guideName: 'Stage',
    guideTip: 'One idea per slide',
    guideEmoji: '',
    icon: 'slides',
  },
  {
    id: 'notebook',
    name: 'Folio',
    letter: 'N',
    color: '#5b8def',
    description: 'Helios notebooks for ideas, class notes, and snippets.',
    projectType: 'notebook',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Folio notes',
    track: 'core',
    guideName: 'Folio',
    guideTip: 'Capture first',
    guideEmoji: '',
    icon: 'notes',
  },
  {
    id: 'homework-board',
    name: 'Pulse',
    letter: 'T',
    color: '#7a8bb8',
    description: 'Helios tasks: To do → Doing → Done.',
    projectType: 'board',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Pulse list',
    track: 'core',
    guideName: 'Pulse',
    guideTip: 'Move one thing forward',
    guideEmoji: '',
    icon: 'tasks',
  },
  {
    id: 'mail-draft',
    name: 'Dispatch',
    letter: 'O',
    color: '#5b8def',
    description: 'Helios mail drafts with recipients, subject, and body.',
    projectType: 'doc',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Dispatch draft',
    track: 'core',
    guideName: 'Dispatch',
    guideTip: 'Draft before you send',
    guideEmoji: '',
    icon: 'mail',
  },
  {
    id: 'calendar-plan',
    name: 'Orbit',
    letter: 'C',
    color: '#c96442',
    description: 'Helios calendar for collab time and milestones.',
    projectType: 'board',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Orbit schedule',
    track: 'core',
    guideName: 'Orbit',
    guideTip: 'Protect the milestone',
    guideEmoji: '',
    icon: 'calendar',
  },
  {
    id: 'planner-board',
    name: 'Cascade',
    letter: 'P',
    color: '#5a6270',
    description: 'Helios boards that break goals into buckets.',
    projectType: 'board',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Cascade board',
    track: 'core',
    guideName: 'Cascade',
    guideTip: 'Break the goal down',
    guideEmoji: '',
    icon: 'plan',
  },
  {
    id: 'loop-page',
    name: 'Weave',
    letter: 'L',
    color: '#7a8bb8',
    description: 'Helios live pages you edit together.',
    projectType: 'doc',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Weave page',
    track: 'core',
    guideName: 'Weave',
    guideTip: 'Edit one page together',
    guideEmoji: '',
    icon: 'loop',
  },
  {
    id: 'lists',
    name: 'Tally',
    letter: 'L',
    color: '#5a6270',
    description: 'Helios checklists with owners and ticks.',
    projectType: 'board',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Tally list',
    track: 'core',
    guideName: 'Tally',
    guideTip: 'Tick items off',
    guideEmoji: '',
    icon: 'list',
  },
  {
    id: 'code',
    name: 'Forge',
    letter: 'F',
    color: '#5b8def',
    description: 'Helios IDE: files, git connection, autosave, side-by-side Helios.',
    projectType: 'code',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Forge project',
    track: 'core',
    guideName: 'Forge',
    guideTip: 'Helios sits beside you',
    guideEmoji: '',
    icon: 'code',
  },
]


/** Old catalog ids → curated apps (so existing files still open). */
const LEGACY_APP_ALIASES: Record<string, string> = {
  'word-docs': 'word-docs',
  'essay-studio': 'word-docs',
  documentation: 'word-docs',
  'proposal-writer': 'word-docs',
  writing: 'word-docs',
  notebook: 'notebook',
  journal: 'notebook',
  notes: 'notebook',
  spreadsheet: 'spreadsheet',
  'budget-sheet': 'spreadsheet',
  'data-visualization': 'spreadsheet',
  'homework-board': 'homework-board',
  'project-board': 'planner-board',
  kanban: 'planner-board',
  checklist: 'checklist',
  presentation: 'presentation',
  'pitch-deck': 'presentation',
  'lesson-slides': 'presentation',
  whiteboard: 'whiteboard',
  drawing: 'whiteboard',
  reader: 'reader',
  'book-creator': 'reader',
  code: 'code',
  'web-code': 'code',
  'game-prototype': 'code',
  'mail-draft': 'mail-draft',
  'calendar-plan': 'calendar-plan',
  'planner-board': 'planner-board',
  'loop-page': 'loop-page',
  lists: 'lists',
}

export function editionFor(plan?: BillingPlanId | null): SuiteEdition {
  return plan === 'orbit' ? 'orbit' : 'free'
}

export function editionLabel(_edition: SuiteEdition) {
  return 'Helios'
}

export function editionKicker(_edition: SuiteEdition) {
  return 'FREE FOREVER'
}

export const WRITING_LIMITS = {
  free: { documents: null as number | null, characters: null as number | null },
  orbit: { documents: null as number | null, characters: null as number | null },
}

export function editionBlurb(_edition: SuiteEdition) {
  return 'Helios Mini Apps — Quill, Lattice, Stage, Folio, Forge, and more — then share on Space.'
}

export function suiteAppsForEdition(_edition: SuiteEdition) {
  return SUITE_APPS
}

export function suiteAppUnlocked(_app: SuiteApp, _edition: SuiteEdition) {
  return true
}

export function unlockLabel(_edition: SuiteEdition) {
  return 'All available'
}

export function spaceForSuiteApp(app: SuiteApp) {
  return app.spaceAdult
}

export function nextSuiteFileName(base: string, existing: Array<{ name: string; app_kind: string }>, appKind: string) {
  const used = new Set(existing.filter(item => item.app_kind === appKind).map(item => item.name))
  if (!used.has(base)) return base
  let index = 2
  while (used.has(`${base} ${index}`)) index += 1
  return `${base} ${index}`
}

export function getSuiteApp(id: string) {
  const resolved = LEGACY_APP_ALIASES[id] ?? id
  return SUITE_APPS.find(app => app.id === resolved) ?? null
}

export function suiteHomeTitle(_edition: SuiteEdition) {
  return 'Mini Apps'
}

function writingData(html: string) {
  return { html, progress: 0, bookmarks: [], notes: [], readerMode: false }
}

function boardData(columns: Array<{ id: string; title: string; cards: Array<{ id: string; title: string; note: string }> }>) {
  return { columns }
}

export function suiteStarterContent(app: SuiteApp) {
  if (app.id === 'word-docs' || app.id === 'loop-page') {
    return writingData(
      app.id === 'loop-page'
        ? '<h1>Loop page</h1><p>Edit together here: goals, decisions, to-dos.</p><ul><li>Decide today</li><li>Whose input is still needed</li></ul>'
        : '<h1>Title</h1><p>Start writing here. A title, body, and list are enough.</p><ul><li>Point one</li><li>Point two</li></ul>',
    )
  }
  if (app.id === 'mail-draft') {
    return writingData('<h1>Mail draft</h1><p><strong>To:</strong></p><p><strong>Subject:</strong></p><p>Start the body here…</p>')
  }
  if (app.id === 'reader') {
    return writingData('<h1>Reading</h1><p>Paste or write the long text to read. Add annotations and excerpts.</p><blockquote>Put excerpts here</blockquote>')
  }
  if (app.id === 'spreadsheet') {
    const cells = [
      ['Item', 'Qty', 'Price', 'Subtotal', '', '', '', ''],
      ['Worksheet paper', '2', '5', '=B2*C2', '', '', '', ''],
      ['Notebook', '1', '12', '=B3*C3', '', '', '', ''],
      ['Total', '', '', '=SUM(D2:D3)', '', '', '', ''],
      ['Average', '', '', '=AVERAGE(C2:C3)', '', '', '', ''],
    ]
    while (cells.length < 24) cells.push(Array(8).fill(''))
    return { cells, selected: 'A2', chartColumn: 1 }
  }
  if (app.id === 'presentation') {
    return {
      slides: [
        { id: crypto.randomUUID(), title: 'Opening', body: 'One sentence on what you’ll cover today.', notes: '', layout: 'title', theme: 'terracotta-glass', shapes: [], transition: 'none' },
        { id: crypto.randomUUID(), title: 'Key point', body: 'Cover only the most important point.', notes: '', layout: 'title-content', theme: 'terracotta-glass', shapes: [], transition: 'fade' },
        { id: crypto.randomUUID(), title: 'Next steps', body: 'What should the audience do after they leave.', notes: '', layout: 'two-column', theme: 'blue-glass', shapes: [], transition: 'none', secondary: 'Leave room for questions.' },
      ],
      activeSlide: 0,
    }
  }
  if (app.id === 'notebook') {
    return {
      title: 'Notebook',
      cells: [
        { id: 'today', kind: 'markdown', body: '# Today\nKey points from class:' },
        { id: 'todo', kind: 'markdown', body: '## To do later\n- ' },
      ],
    }
  }
  if (app.id === 'whiteboard') {
    return {
      strokes: [],
      layers: [{ id: 'base', name: 'Base', visible: true }, { id: 'details', name: 'Details', visible: true }],
      activeLayer: 'details',
      color: '#171819',
      size: 4,
      pages: [],
      comicElements: [],
      note: 'Sketch a flow or rough idea on the board.',
    }
  }
  if (app.id === 'homework-board') {
    return boardData([
      { id: 'due', title: 'To do', cards: [{ id: crypto.randomUUID(), title: 'Homework due today', note: '' }] },
      { id: 'doing', title: 'Doing', cards: [] },
      { id: 'done', title: 'Done', cards: [] },
    ])
  }
  if (app.id === 'calendar-plan') {
    return boardData([
      { id: 'mon', title: 'This week', cards: [{ id: crypto.randomUUID(), title: 'Collab sync', note: 'Pick a time' }] },
      { id: 'soon', title: 'Later', cards: [] },
      { id: 'done', title: 'Done', cards: [] },
    ])
  }
  if (app.id === 'planner-board') {
    return boardData([
      { id: 'backlog', title: 'Backlog', cards: [{ id: crypto.randomUUID(), title: 'This week’s goal', note: '' }] },
      { id: 'doing', title: 'Doing', cards: [] },
      { id: 'done', title: 'Done', cards: [] },
    ])
  }
  if (app.id === 'lists' || app.id === 'checklist') {
    return boardData([
      { id: 'open', title: app.id === 'checklist' ? 'To check' : 'To do', cards: [{ id: crypto.randomUUID(), title: 'First item', note: '' }] },
      { id: 'done', title: 'Done', cards: [] },
    ])
  }
  if (app.id === 'code') {
    return {
      files: {
        'README.md': '# Code\n\nMulti-file workspace: switch languages (including C++), preview, run, and download a zip.\n',
        'main.cpp': `#include <iostream>\n\nint main() {\n  std::cout << "Hello, WorkBuddy\\n";\n  return 0;\n}\n`,
        'index.html': `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8" />\n  <title>Preview</title>\n  <link rel="stylesheet" href="styles.css" />\n</head>\n<body>\n  <main id="app">Code preview</main>\n  <script src="app.js"></script>\n</body>\n</html>\n`,
        'styles.css': `body { font-family: system-ui, sans-serif; background: #f4f1ec; color: #1c1917; padding: 24px; }\nmain { padding: 20px; border-radius: 16px; background: rgba(255,255,255,.7); border: 1px solid rgba(255,255,255,.55); }\n`,
        'app.js': `console.log('Hello, WorkBuddy')\ndocument.getElementById('app').textContent = 'Preview ready'\n`,
      },
      activeFile: 'main.cpp',
      openFiles: ['main.cpp', 'index.html', 'README.md'],
      terminal: [],
      language: 'cpp',
    }
  }
  return null
}

export function suiteStarterWorkspace(app: SuiteApp) {
  const data = suiteStarterContent(app)
  if (!data) return ''
  return JSON.stringify({
    schema: 'helios-workspace-v1',
    appKind: app.id,
    data,
  })
}
