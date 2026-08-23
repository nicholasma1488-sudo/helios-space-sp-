import type { BillingPlanId, Project } from '../api'

export type SuiteEdition = 'free' | 'orbit'
export type SuiteTrack = 'core' | 'orbit'

export interface SuiteApp {
  id: string
  name: string
  letter: string
  color: string
  description: string
  projectType: Project['type']
  spaceChild: string
  spaceAdult: string
  newName: string
  track: SuiteTrack
}

export const SUITE_APPS: SuiteApp[] = [
  {
    id: 'word-docs', name: 'Word', letter: 'W', color: '#185ABD',
    description: 'Write essays, letters and long documents with headings and lists.',
    projectType: 'writing', spaceChild: 'english', spaceAdult: 'business', newName: 'Document', track: 'core',
  },
  {
    id: 'spreadsheet', name: 'Excel', letter: 'X', color: '#107C41',
    description: 'Workbooks with cells, formulas and charts — not a scratch pad.',
    projectType: 'spreadsheet', spaceChild: 'maths', spaceAdult: 'business', newName: 'Workbook', track: 'core',
  },
  {
    id: 'presentation', name: 'PowerPoint', letter: 'P', color: '#C43E1C',
    description: 'Build a real slide deck, then present it from the same file.',
    projectType: 'presentation', spaceChild: 'english', spaceAdult: 'business', newName: 'Presentation', track: 'core',
  },
  {
    id: 'notebook', name: 'OneNote', letter: 'N', color: '#7719AA',
    description: 'A notebook you can keep adding to for class or work.',
    projectType: 'notebook', spaceChild: 'science', spaceAdult: 'business', newName: 'Notebook', track: 'core',
  },
  {
    id: 'stocks', name: 'Stocks', letter: '$', color: '#0F9D58',
    description: 'A live watchlist you can open any time — add tickers and keep them on this account.',
    projectType: 'doc', spaceChild: 'business', spaceAdult: 'business', newName: 'Watchlist', track: 'orbit',
  },

  {
    id: 'essay-studio', name: 'Essay', letter: 'E', color: '#2B579A',
    description: 'Thesis, evidence and conclusion in a full writing workspace.',
    projectType: 'writing', spaceChild: 'english', spaceAdult: 'english', newName: 'Essay', track: 'orbit',
  },
  {
    id: 'gradebook', name: 'Gradebook', letter: 'G', color: '#107C41',
    description: 'Mark quizzes and projects in a real spreadsheet.',
    projectType: 'spreadsheet', spaceChild: 'maths', spaceAdult: 'maths', newName: 'Gradebook', track: 'orbit',
  },
  {
    id: 'lesson-slides', name: 'Lessons', letter: 'L', color: '#C43E1C',
    description: 'Classroom slides with a goal, example and practice.',
    projectType: 'presentation', spaceChild: 'english', spaceAdult: 'english', newName: 'Lesson', track: 'orbit',
  },
  {
    id: 'lab-notebook', name: 'Lab', letter: 'B', color: '#038387',
    description: 'Method, observations and findings in a durable lab notebook.',
    projectType: 'notebook', spaceChild: 'science', spaceAdult: 'science', newName: 'Lab notebook', track: 'orbit',
  },
  {
    id: 'quiz-builder', name: 'Forms', letter: 'Q', color: '#008272',
    description: 'Build quizzes and collect answers like a real form.',
    projectType: 'survey', spaceChild: 'english', spaceAdult: 'english', newName: 'Quiz', track: 'orbit',
  },
  {
    id: 'flashcard-maker', name: 'Flashcards', letter: 'F', color: '#185ABD',
    description: 'Question and answer cards saved as a document you can revise.',
    projectType: 'doc', spaceChild: 'languages', spaceAdult: 'languages', newName: 'Flashcards', track: 'orbit',
  },
  {
    id: 'reader', name: 'Reader', letter: 'R', color: '#CA5010',
    description: 'Chapters, bookmarks and notes for assigned reading.',
    projectType: 'book', spaceChild: 'reading', spaceAdult: 'reading', newName: 'Reading', track: 'orbit',
  },
  {
    id: 'math-lab', name: 'Maths', letter: 'M', color: '#0078D4',
    description: 'Formulas, graphs and worked steps in a maths workspace.',
    projectType: 'math', spaceChild: 'maths', spaceAdult: 'maths', newName: 'Maths work', track: 'orbit',
  },
  {
    id: 'homework-board', name: 'Homework', letter: 'H', color: '#5C2D91',
    description: 'A board for due, doing, stuck and handed-in work.',
    projectType: 'board', spaceChild: 'english', spaceAdult: 'english', newName: 'Homework', track: 'orbit',
  },
  {
    id: 'study-guide', name: 'Study', letter: 'S', color: '#2B88D8',
    description: 'Key ideas, terms and practice prompts in one guide.',
    projectType: 'doc', spaceChild: 'english', spaceAdult: 'english', newName: 'Study guide', track: 'orbit',
  },

  {
    id: 'documentation', name: 'Docs', letter: 'D', color: '#185ABD',
    description: 'Product or team documentation you can keep shipping from.',
    projectType: 'writing', spaceChild: 'business', spaceAdult: 'business', newName: 'Docs', track: 'orbit',
  },
  {
    id: 'budget-sheet', name: 'Budget', letter: 'U', color: '#107C41',
    description: 'Income, spend and remaining balance in a real workbook.',
    projectType: 'spreadsheet', spaceChild: 'business', spaceAdult: 'business', newName: 'Budget', track: 'orbit',
  },
  {
    id: 'pitch-deck', name: 'Pitch', letter: 'I', color: '#C43E1C',
    description: 'Problem, solution, market and ask as a working deck.',
    projectType: 'presentation', spaceChild: 'business', spaceAdult: 'business', newName: 'Pitch deck', track: 'orbit',
  },
  {
    id: 'meeting-notes', name: 'Meetings', letter: 'T', color: '#038387',
    description: 'Agenda, decisions and owners in a document you can reopen.',
    projectType: 'doc', spaceChild: 'business', spaceAdult: 'business', newName: 'Meeting notes', track: 'orbit',
  },
  {
    id: 'proposal-writer', name: 'Proposals', letter: 'O', color: '#2B579A',
    description: 'Scope, risks and next steps for work you need approved.',
    projectType: 'writing', spaceChild: 'business', spaceAdult: 'business', newName: 'Proposal', track: 'orbit',
  },
  {
    id: 'product-spec', name: 'Specs', letter: 'C', color: '#5C2D91',
    description: 'Problem, users and acceptance criteria in a spec.',
    projectType: 'writing', spaceChild: 'business', spaceAdult: 'ai', newName: 'Product spec', track: 'orbit',
  },
  {
    id: 'okrs', name: 'OKRs', letter: 'K', color: '#CA5010',
    description: 'Objectives and key results tracked in a spreadsheet.',
    projectType: 'spreadsheet', spaceChild: 'business', spaceAdult: 'business', newName: 'OKRs', track: 'orbit',
  },
  {
    id: 'project-board', name: 'Planner', letter: 'A', color: '#744DA9',
    description: 'To do, doing and done for work that has to finish.',
    projectType: 'board', spaceChild: 'business', spaceAdult: 'business', newName: 'Project board', track: 'orbit',
  },
  {
    id: 'business-planner', name: 'Planner+', letter: 'Z', color: '#8A8886',
    description: 'Problem, customer, model and the next milestone.',
    projectType: 'doc', spaceChild: 'business', spaceAdult: 'business', newName: 'Business plan', track: 'orbit',
  },
  {
    id: 'report-writer', name: 'Reports', letter: 'Y', color: '#0078D4',
    description: 'Findings, evidence and recommendations in a report.',
    projectType: 'writing', spaceChild: 'business', spaceAdult: 'business', newName: 'Report', track: 'orbit',
  },
]

export function editionFor(plan?: BillingPlanId | null): SuiteEdition {
  return plan === 'orbit' ? 'orbit' : 'free'
}

export function editionLabel(edition: SuiteEdition) {
  return edition === 'orbit' ? 'Orbit' : 'Free'
}

export function editionKicker(edition: SuiteEdition) {
  return edition === 'orbit' ? 'ORBIT' : 'FREE EDITION'
}

export function editionBlurb(edition: SuiteEdition) {
  if (edition === 'orbit')
    return 'The full suite: Word, Excel, PowerPoint, OneNote, Stocks and every extra Mini App for school and work.'
  return 'Word, Excel, PowerPoint and OneNote. Upgrade to Orbit from the top-left banner for the complete Mini App suite.'
}

export function suiteAppsForEdition(_edition: SuiteEdition) {
  return SUITE_APPS
}

export function suiteAppUnlocked(app: SuiteApp, edition: SuiteEdition) {
  return app.track === 'core' || edition === 'orbit'
}

export function unlockLabel(_edition: SuiteEdition) {
  return 'Unlock with Orbit'
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
  return SUITE_APPS.find(app => app.id === id) ?? null
}

export function suiteHomeTitle(edition: SuiteEdition) {
  return edition === 'orbit' ? 'Orbit apps' : 'Apps'
}

function writingData(html: string) {
  return { html, progress: 0, bookmarks: [], notes: [], readerMode: false }
}

export function suiteStarterContent(app: SuiteApp) {
  if (app.id === 'word-docs') {
    return writingData('<h1>Document</h1><h2>Purpose</h2><p></p><h2>Decision</h2><p></p><h2>Next steps</h2><p></p>')
  }
  if (app.id === 'spreadsheet') {
    const cells = [
      ['Item', 'Owner', 'Status', 'Amount', '', '', '', ''],
      ['Kickoff', '', 'Open', '', '', '', '', ''],
    ]
    while (cells.length < 24) cells.push(Array(8).fill(''))
    return { cells, selected: 'A2', chartColumn: 1 }
  }
  if (app.id === 'presentation') {
    const slides = [
      { title: 'Agenda', body: 'What this meeting needs to decide.', notes: '' },
      { title: 'Update', body: 'What changed, and what is blocked.', notes: '' },
      { title: 'Ask', body: 'The decision or next owner.', notes: '' },
    ]
    return { slides: slides.map(slide => ({ id: crypto.randomUUID(), ...slide })), activeSlide: 0 }
  }
  if (app.id === 'stocks') {
    return {
      symbols: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'SPY', '0700.HK', 'BABA'],
    }
  }
  if (app.id === 'notebook') {
    return {
      title: 'Notebook',
      cells: [
        { id: 'today', kind: 'markdown', body: '# Today\nWhat needs to move?' },
        { id: 'actions', kind: 'markdown', body: '## Actions\n' },
      ],
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
