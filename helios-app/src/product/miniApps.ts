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
  icon: 'write' | 'sheet' | 'slides' | 'notes' | 'tasks' | 'cards' | 'code'
}

/**
 * Curated school + everyday work set only.
 * Each Mini App has its own name, icon, and 小姐姐.
 */
export const SUITE_APPS: SuiteApp[] = [
  {
    id: 'word-docs',
    name: '墨语',
    letter: '墨',
    color: '#0F6CBD',
    description: '写作业、写信、写笔记 —— 打开就能写。',
    projectType: 'writing',
    spaceChild: 'english',
    spaceAdult: 'business',
    newName: '文档',
    track: 'core',
    guideName: '小墨',
    guideTip: '想写就写，写完就能分享',
    guideEmoji: '📝',
    icon: 'write',
  },
  {
    id: 'spreadsheet',
    name: '格间',
    letter: '格',
    color: '#107C41',
    description: '表格、作业账本、简单公式（SUM / AVERAGE）。',
    projectType: 'spreadsheet',
    spaceChild: 'maths',
    spaceAdult: 'business',
    newName: '表格',
    track: 'core',
    guideName: '小格',
    guideTip: '表格算数，作业账本都行',
    guideEmoji: '📊',
    icon: 'sheet',
  },
  {
    id: 'presentation',
    name: '光幕',
    letter: '光',
    color: '#C43E1C',
    description: '做几页幻灯片，上课或开会直接演示。',
    projectType: 'presentation',
    spaceChild: 'english',
    spaceAdult: 'business',
    newName: '幻灯片',
    track: 'core',
    guideName: '小光',
    guideTip: '做几页幻灯片就上课/开会',
    guideEmoji: '🎬',
    icon: 'slides',
  },
  {
    id: 'notebook',
    name: '随身本',
    letter: '本',
    color: '#5B5FC7',
    description: '课堂笔记放这里，随时继续加。',
    projectType: 'notebook',
    spaceChild: 'science',
    spaceAdult: 'business',
    newName: '笔记',
    track: 'core',
    guideName: '小本',
    guideTip: '课堂笔记放这里',
    guideEmoji: '📓',
    icon: 'notes',
  },
  {
    id: 'homework-board',
    name: '今日事',
    letter: '事',
    color: '#8764B8',
    description: '今天要交的：待做 → 进行中 → 完成。',
    projectType: 'board',
    spaceChild: 'english',
    spaceAdult: 'english',
    newName: '待办',
    track: 'core',
    guideName: '小办',
    guideTip: '今天要交的都列出来',
    guideEmoji: '✅',
    icon: 'tasks',
  },
  {
    id: 'flashcard-maker',
    name: '记卡',
    letter: '卡',
    color: '#00A2AD',
    description: '背单词、背考点 —— 正反面卡片。',
    projectType: 'doc',
    spaceChild: 'languages',
    spaceAdult: 'languages',
    newName: '记卡',
    track: 'core',
    guideName: '小记',
    guideTip: '背单词、背考点',
    guideEmoji: '🃏',
    icon: 'cards',
  },
  {
    id: 'code',
    name: '搭子码',
    letter: '码',
    color: '#0078D4',
    description: '简单 IDE，Helios 坐在旁边帮你看文件。',
    projectType: 'code',
    spaceChild: 'ai',
    spaceAdult: 'ai',
    newName: '代码',
    track: 'core',
    guideName: '小码',
    guideTip: '写代码时 Helios 坐旁边',
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
  'study-guide': 'flashcard-maker',
  spreadsheet: 'spreadsheet',
  gradebook: 'spreadsheet',
  'budget-sheet': 'spreadsheet',
  okrs: 'spreadsheet',
  presentation: 'presentation',
  'lesson-slides': 'presentation',
  'pitch-deck': 'presentation',
  notebook: 'notebook',
  'lab-notebook': 'notebook',
  'homework-board': 'homework-board',
  'project-board': 'homework-board',
  'flashcard-maker': 'flashcard-maker',
  reader: 'flashcard-maker',
  'math-lab': 'spreadsheet',
  'quiz-builder': 'flashcard-maker',
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
  return '七个够用的工具：写、表、幻灯片、笔记、待办、记卡、代码。每个都有小姐姐带你，点图标就能用。'
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
  return '应用'
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
  if (app.id === 'presentation') {
    const slides = [
      { title: '主题', body: '一句话说清楚你要讲什么。', notes: '' },
      { title: '内容', body: '两到三个要点就够。', notes: '' },
      { title: '结尾', body: '下一步或作业要求。', notes: '' },
    ]
    return { slides: slides.map(slide => ({ id: crypto.randomUUID(), ...slide })), activeSlide: 0 }
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
  if (app.id === 'flashcard-maker') {
    return writingData(
      '<h1>记卡</h1><p><strong>正面：</strong>单词或考点</p><p><strong>背面：</strong>解释或答案</p><hr><p><strong>正面：</strong></p><p><strong>背面：</strong></p>',
    )
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
