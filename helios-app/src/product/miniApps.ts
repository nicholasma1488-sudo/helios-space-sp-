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

/** Mini Apps — Microsoft 365–shaped tools + Helios IDE. */
export const SUITE_APPS: SuiteApp[] = [
  {
    id: 'word-docs',
    name: 'Word',
    letter: 'W',
    color: '#c96442',
    description: 'Documents with styles, images, tables, and Helios rewrite.',
    projectType: 'writing',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Document',
    track: 'core',
    guideName: 'Word',
    guideTip: 'Write and share',
    guideEmoji: '',
    icon: 'write',
  },
  {
    id: 'spreadsheet',
    name: 'Excel',
    letter: 'X',
    color: '#5a6270',
    description: 'Spreadsheets with formulas, charts, and CSV.',
    projectType: 'spreadsheet',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Workbook',
    track: 'core',
    guideName: 'Excel',
    guideTip: 'Numbers that move',
    guideEmoji: '',
    icon: 'sheet',
  },
  {
    id: 'presentation',
    name: 'PowerPoint',
    letter: 'P',
    color: '#c96442',
    description: 'Slides with layouts, photos, Designer themes, and present mode.',
    projectType: 'presentation',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Presentation',
    track: 'core',
    guideName: 'PowerPoint',
    guideTip: 'One idea per slide',
    guideEmoji: '',
    icon: 'slides',
  },
  {
    id: 'notebook',
    name: 'OneNote',
    letter: 'N',
    color: '#5b8def',
    description: 'Notebook pages for ideas and class notes.',
    projectType: 'notebook',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Notebook',
    track: 'core',
    guideName: 'OneNote',
    guideTip: 'Capture first',
    guideEmoji: '',
    icon: 'notes',
  },
  {
    id: 'homework-board',
    name: 'To Do',
    letter: 'T',
    color: '#7a8bb8',
    description: 'Tasks: To do → Doing → Done.',
    projectType: 'board',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'To-do',
    track: 'core',
    guideName: 'To Do',
    guideTip: 'Move one thing forward',
    guideEmoji: '',
    icon: 'tasks',
  },
  {
    id: 'mail-draft',
    name: 'Outlook',
    letter: 'O',
    color: '#5b8def',
    description: 'Mail drafts with clear recipients and body.',
    projectType: 'doc',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Mail draft',
    track: 'core',
    guideName: 'Outlook',
    guideTip: 'Draft before you send',
    guideEmoji: '',
    icon: 'mail',
  },
  {
    id: 'calendar-plan',
    name: 'Calendar',
    letter: 'C',
    color: '#c96442',
    description: 'Plan collaboration time and milestones.',
    projectType: 'board',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Schedule',
    track: 'core',
    guideName: 'Calendar',
    guideTip: 'Protect the milestone',
    guideEmoji: '',
    icon: 'calendar',
  },
  {
    id: 'planner-board',
    name: 'Planner',
    letter: 'P',
    color: '#5a6270',
    description: 'Break goals into buckets you can move.',
    projectType: 'board',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Plan',
    track: 'core',
    guideName: 'Planner',
    guideTip: 'Break the goal down',
    guideEmoji: '',
    icon: 'plan',
  },
  {
    id: 'loop-page',
    name: 'Loop',
    letter: 'L',
    color: '#7a8bb8',
    description: 'A live page you edit together.',
    projectType: 'doc',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Loop page',
    track: 'core',
    guideName: 'Loop',
    guideTip: 'Edit one page together',
    guideEmoji: '',
    icon: 'loop',
  },
  {
    id: 'lists',
    name: 'Lists',
    letter: 'L',
    color: '#5a6270',
    description: 'Checklists, ticks, and who owns what.',
    projectType: 'board',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'List',
    track: 'core',
    guideName: 'Lists',
    guideTip: 'Tick items off',
    guideEmoji: '',
    icon: 'list',
  },
  {
    id: 'code',
    name: 'Helios IDE',
    letter: 'H',
    color: '#5b8def',
    description: 'Cursor-style IDE: files, git connection, autosave, Helios side-by-side.',
    projectType: 'code',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: 'Helios IDE',
    track: 'core',
    guideName: 'IDE',
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
  return 'Microsoft 365–shaped Mini Apps plus Helios IDE — then share progress on Space.'
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
