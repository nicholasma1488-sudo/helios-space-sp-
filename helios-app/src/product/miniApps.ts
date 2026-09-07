import type { BillingPlanId, Project } from '../api'

export type SuiteEdition = 'free' | 'orbit'
export type SuiteTrack = 'core' | 'orbit'

export interface SuiteApp {
  id: string
  /** Product name shown on the tile (原创名字) */
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
  /** 小姐姐 guide under the app name */
  guideName: string
  guideTip: string
  /** Short emoji used as the guide avatar */
  guideEmoji: string
  /** Lucide-style icon key for the tile */
  icon: 'write' | 'sheet' | 'notes' | 'tasks' | 'code'
}

/**
 * Social collaboration Create set — single-digit only.
 * Each Mini App has its own name, icon, and 小姐姐.
 */
export const SUITE_APPS: SuiteApp[] = [
  {
    id: 'word-docs',
    name: '墨语',
    letter: '墨',
    color: '#c96442',
    description: '写一段话、一篇帖、一份分享 —— 写完就能发到 Space。',
    projectType: 'writing',
    spaceChild: 'english',
    spaceAdult: 'business',
    newName: '文稿',
    track: 'core',
    guideName: '小墨',
    guideTip: '写完就能分享',
    guideEmoji: '📝',
    icon: 'write',
  },
  {
    id: 'notebook',
    name: '随身本',
    letter: '本',
    color: '#5b8def',
    description: '随手记下灵感与协作要点。',
    projectType: 'notebook',
    spaceChild: 'science',
    spaceAdult: 'business',
    newName: '笔记',
    track: 'core',
    guideName: '小本',
    guideTip: '灵感先落这里',
    guideEmoji: '📓',
    icon: 'notes',
  },
  {
    id: 'spreadsheet',
    name: '格间',
    letter: '格',
    color: '#3d8b6e',
    description: '轻量表格，SUM / AVERAGE 够用。',
    projectType: 'spreadsheet',
    spaceChild: 'maths',
    spaceAdult: 'business',
    newName: '表格',
    track: 'core',
    guideName: '小格',
    guideTip: '简单算一下',
    guideEmoji: '📊',
    icon: 'sheet',
  },
  {
    id: 'homework-board',
    name: '今日事',
    letter: '事',
    color: '#7a8bb8',
    description: '协作待办：待做 → 进行中 → 完成。',
    projectType: 'board',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: '待办',
    track: 'core',
    guideName: '小办',
    guideTip: '一起推进一件事',
    guideEmoji: '✅',
    icon: 'tasks',
  },
  {
    id: 'code',
    name: '搭子码',
    letter: '码',
    color: '#5a6270',
    description: '轻 IDE，Helios 坐旁边帮你先看文件。',
    projectType: 'code',
    spaceChild: 'ai',
    spaceAdult: 'ai',
    newName: '代码',
    track: 'core',
    guideName: '小码',
    guideTip: 'Helios 坐旁边',
    guideEmoji: '💻',
    icon: 'code',
  },
]

/** Old catalog ids → curated apps (so existing files still open). */
const LEGACY_APP_ALIASES: Record<string, string> = {
  'word-docs': 'word-docs',
  'essay-studio': 'word-docs',
  documentation: 'word-docs',
  'proposal-writer': 'word-docs',
  'product-spec': 'word-docs',
  'report-writer': 'word-docs',
  'meeting-notes': 'notebook',
  'study-guide': 'notebook',
  spreadsheet: 'spreadsheet',
  gradebook: 'spreadsheet',
  'budget-sheet': 'spreadsheet',
  okrs: 'spreadsheet',
  presentation: 'word-docs',
  'lesson-slides': 'word-docs',
  'pitch-deck': 'word-docs',
  notebook: 'notebook',
  'lab-notebook': 'notebook',
  'homework-board': 'homework-board',
  'project-board': 'homework-board',
  'flashcard-maker': 'notebook',
  reader: 'notebook',
  'math-lab': 'spreadsheet',
  'quiz-builder': 'notebook',
  'business-planner': 'notebook',
  stocks: 'spreadsheet',
  code: 'code',
  'algorithm-lab': 'code',
  'api-playground': 'code',
  'game-prototype': 'code',
}

export function editionFor(plan?: BillingPlanId | null): SuiteEdition {
  return plan === 'orbit' ? 'orbit' : 'free'
}

export function editionLabel(edition: SuiteEdition) {
  return edition === 'orbit' ? 'Orbit' : 'Free'
}

export function editionKicker(edition: SuiteEdition) {
  return edition === 'orbit' ? 'ORBIT' : 'FREE'
}

export const WRITING_LIMITS = {
  free: { documents: 60, characters: 40_000 },
  orbit: { documents: null as number | null, characters: 500_000 },
}

export function editionBlurb(_edition: SuiteEdition) {
  return '五个创作工具。做完就分享到 Space —— 没有科目，没有 hobbies。'
}

export function suiteAppsForEdition(_edition: SuiteEdition) {
  return SUITE_APPS
}

export function suiteAppUnlocked(_app: SuiteApp, _edition: SuiteEdition) {
  // Curated set is fully free — no hunting for locked tiles.
  return true
}

export function unlockLabel(_edition: SuiteEdition) {
  return '全部可用'
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
  return 'Create'
}

function writingData(html: string) {
  return { html, progress: 0, bookmarks: [], notes: [], readerMode: false }
}

export function suiteStarterContent(app: SuiteApp) {
  if (app.id === 'word-docs') {
    return writingData('<h1>标题</h1><p>在这里开始写。标题、正文、列表就够用了。</p><ul><li>要点一</li><li>要点二</li></ul>')
  }
  if (app.id === 'spreadsheet') {
    const cells = [
      ['项目', '数量', '单价', '小计', '', '', '', ''],
      ['作业纸', '2', '5', '=B2*C2', '', '', '', ''],
      ['笔记本', '1', '12', '=B3*C3', '', '', '', ''],
      ['合计', '', '', '=SUM(D2:D3)', '', '', '', ''],
      ['平均', '', '', '=AVERAGE(C2:C3)', '', '', '', ''],
    ]
    while (cells.length < 24) cells.push(Array(8).fill(''))
    return { cells, selected: 'A2', chartColumn: 1 }
  }
  if (app.id === 'notebook') {
    return {
      title: '随身本',
      cells: [
        { id: 'today', kind: 'markdown', body: '# 今天\n课堂上记下的要点：' },
        { id: 'todo', kind: 'markdown', body: '## 回去要做\n- ' },
      ],
    }
  }
  if (app.id === 'homework-board') {
    return {
      columns: [
        { id: 'due', title: '待做', cards: [{ id: crypto.randomUUID(), title: '今天要交的作业', note: '' }] },
        { id: 'doing', title: '进行中', cards: [] },
        { id: 'done', title: '完成', cards: [] },
      ],
    }
  }
  if (app.id === 'code') {
    return {
      files: {
        'README.md': '# 搭子码\n\n在左边打开文件，Helios 在右边陪你看代码。\n',
        'main.js': "console.log('你好，WorkBuddy')\n",
      },
      activeFile: 'main.js',
      openFiles: ['main.js', 'README.md'],
      terminal: [],
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
