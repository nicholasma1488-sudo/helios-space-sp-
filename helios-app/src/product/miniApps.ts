import type { AccountAudience, BillingPlanId, Project } from '../api'

export type SuiteEdition = 'child' | 'alpha' | 'adult' | 'orbit'
export type SuiteTrack = 'core' | 'student' | 'work'

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
    id: 'essay-studio', name: 'Essay', letter: 'E', color: '#2B579A',
    description: 'Thesis, evidence and conclusion in a full writing workspace.',
    projectType: 'writing', spaceChild: 'english', spaceAdult: 'english', newName: 'Essay', track: 'student',
  },
  {
    id: 'gradebook', name: 'Gradebook', letter: 'G', color: '#107C41',
    description: 'Mark quizzes and projects in a real spreadsheet.',
    projectType: 'spreadsheet', spaceChild: 'maths', spaceAdult: 'maths', newName: 'Gradebook', track: 'student',
  },
  {
    id: 'lesson-slides', name: 'Lessons', letter: 'L', color: '#C43E1C',
    description: 'Classroom slides with a goal, example and practice.',
    projectType: 'presentation', spaceChild: 'english', spaceAdult: 'english', newName: 'Lesson', track: 'student',
  },
  {
    id: 'lab-notebook', name: 'Lab', letter: 'B', color: '#038387',
    description: 'Method, observations and findings in a durable lab notebook.',
    projectType: 'notebook', spaceChild: 'science', spaceAdult: 'science', newName: 'Lab notebook', track: 'student',
  },
  {
    id: 'quiz-builder', name: 'Forms', letter: 'Q', color: '#008272',
    description: 'Build quizzes and collect answers like a real form.',
    projectType: 'survey', spaceChild: 'english', spaceAdult: 'english', newName: 'Quiz', track: 'student',
  },
  {
    id: 'flashcard-maker', name: 'Flashcards', letter: 'F', color: '#185ABD',
    description: 'Question and answer cards saved as a document you can revise.',
    projectType: 'doc', spaceChild: 'languages', spaceAdult: 'languages', newName: 'Flashcards', track: 'student',
  },
  {
    id: 'reader', name: 'Reader', letter: 'R', color: '#CA5010',
    description: 'Chapters, bookmarks and notes for assigned reading.',
    projectType: 'book', spaceChild: 'reading', spaceAdult: 'reading', newName: 'Reading', track: 'student',
  },
  {
    id: 'math-lab', name: 'Maths', letter: 'M', color: '#0078D4',
    description: 'Formulas, graphs and worked steps in a maths workspace.',
    projectType: 'math', spaceChild: 'maths', spaceAdult: 'maths', newName: 'Maths work', track: 'student',
  },
  {
    id: 'homework-board', name: 'Homework', letter: 'H', color: '#5C2D91',
    description: 'A board for due, doing, stuck and handed-in work.',
    projectType: 'board', spaceChild: 'english', spaceAdult: 'english', newName: 'Homework', track: 'student',
  },
  {
    id: 'study-guide', name: 'Study', letter: 'S', color: '#2B88D8',
    description: 'Key ideas, terms and practice prompts in one guide.',
    projectType: 'doc', spaceChild: 'english', spaceAdult: 'english', newName: 'Study guide', track: 'student',
  },

  {
    id: 'documentation', name: 'Docs', letter: 'D', color: '#185ABD',
    description: 'Product or team documentation you can keep shipping from.',
    projectType: 'writing', spaceChild: 'business', spaceAdult: 'business', newName: 'Docs', track: 'work',
  },
  {
    id: 'budget-sheet', name: 'Budget', letter: 'U', color: '#107C41',
    description: 'Income, spend and remaining balance in a real workbook.',
    projectType: 'spreadsheet', spaceChild: 'business', spaceAdult: 'business', newName: 'Budget', track: 'work',
  },
  {
    id: 'pitch-deck', name: 'Pitch', letter: 'I', color: '#C43E1C',
    description: 'Problem, solution, market and ask as a working deck.',
    projectType: 'presentation', spaceChild: 'business', spaceAdult: 'business', newName: 'Pitch deck', track: 'work',
  },
  {
    id: 'meeting-notes', name: 'Meetings', letter: 'T', color: '#038387',
    description: 'Agenda, decisions and owners in a document you can reopen.',
    projectType: 'doc', spaceChild: 'business', spaceAdult: 'business', newName: 'Meeting notes', track: 'work',
  },
  {
    id: 'proposal-writer', name: 'Proposals', letter: 'O', color: '#2B579A',
    description: 'Scope, risks and next steps for work you need approved.',
    projectType: 'writing', spaceChild: 'business', spaceAdult: 'business', newName: 'Proposal', track: 'work',
  },
  {
    id: 'product-spec', name: 'Specs', letter: 'C', color: '#5C2D91',
    description: 'Problem, users and acceptance criteria in a spec.',
    projectType: 'writing', spaceChild: 'business', spaceAdult: 'ai', newName: 'Product spec', track: 'work',
  },
  {
    id: 'okrs', name: 'OKRs', letter: 'K', color: '#CA5010',
    description: 'Objectives and key results tracked in a spreadsheet.',
    projectType: 'spreadsheet', spaceChild: 'business', spaceAdult: 'business', newName: 'OKRs', track: 'work',
  },
  {
    id: 'project-board', name: 'Planner', letter: 'A', color: '#744DA9',
    description: 'To do, doing and done for work that has to finish.',
    projectType: 'board', spaceChild: 'business', spaceAdult: 'business', newName: 'Project board', track: 'work',
  },
  {
    id: 'business-planner', name: 'Planner+', letter: 'Z', color: '#8A8886',
    description: 'Problem, customer, model and the next milestone.',
    projectType: 'doc', spaceChild: 'business', spaceAdult: 'business', newName: 'Business plan', track: 'work',
  },
  {
    id: 'report-writer', name: 'Reports', letter: 'Y', color: '#0078D4',
    description: 'Findings, evidence and recommendations in a report.',
    projectType: 'writing', spaceChild: 'business', spaceAdult: 'business', newName: 'Report', track: 'work',
  },
]

export function editionFor(audience?: AccountAudience | null, plan?: BillingPlanId | null): SuiteEdition {
  if (audience === 'adult') return plan === 'orbit' ? 'orbit' : 'adult'
  return plan === 'alpha' ? 'alpha' : 'child'
}

export function editionLabel(edition: SuiteEdition) {
  if (edition === 'alpha') return 'Alpha'
  if (edition === 'orbit') return 'Orbit'
  if (edition === 'adult') return 'Adult'
  return 'Child'
}

export function editionKicker(edition: SuiteEdition) {
  if (edition === 'alpha') return 'STUDENT UPGRADE'
  if (edition === 'orbit') return 'WORK UPGRADE'
  if (edition === 'adult') return 'ADULT EDITION'
  return 'CHILD EDITION'
}

export function editionBlurb(edition: SuiteEdition) {
  if (edition === 'alpha')
    return 'A school 365 suite: write essays, mark grades, teach slides and keep lab work in files that save to your Projects.'
  if (edition === 'orbit')
    return 'A work 365 suite: documents, workbooks, decks, meetings and plans you can actually run a week from.'
  if (edition === 'adult')
    return 'Word, Excel, PowerPoint and OneNote for work. Upgrade to Orbit when you need the full office.'
  return 'Word, Excel, PowerPoint and OneNote for school. Upgrade to Alpha for the full student suite.'
}

export function paidEditionFor(edition: SuiteEdition): 'alpha' | 'orbit' {
  return edition === 'adult' || edition === 'orbit' ? 'orbit' : 'alpha'
}

export function suiteAppsForEdition(edition: SuiteEdition) {
  const track = edition === 'adult' || edition === 'orbit' ? 'work' : 'student'
  return SUITE_APPS.filter(app => app.track === 'core' || app.track === track)
}

export function suiteAppUnlocked(app: SuiteApp, edition: SuiteEdition) {
  if (app.track === 'core') return true
  if (app.track === 'student') return edition === 'alpha'
  return edition === 'orbit'
}

export function unlockLabel(edition: SuiteEdition) {
  return edition === 'adult' || edition === 'orbit' ? 'Unlock with Orbit' : 'Unlock with Alpha'
}

export function spaceForSuiteApp(app: SuiteApp, audience?: AccountAudience | null) {
  return audience === 'adult' ? app.spaceAdult : app.spaceChild
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
  if (edition === 'alpha') return 'Student apps'
  if (edition === 'orbit') return 'Office apps'
  if (edition === 'adult') return 'Work apps'
  return 'School apps'
}

function writingData(html: string) {
  return { html, progress: 0, bookmarks: [], notes: [], readerMode: false }
}

export function suiteStarterContent(app: SuiteApp, audience?: AccountAudience | null) {
  const school = audience !== 'adult'
  if (app.id === 'word-docs') {
    return writingData(school
      ? '<h1>School document</h1><h2>Title</h2><p></p><h2>What I need to say</h2><p></p><h2>Evidence</h2><p></p>'
      : '<h1>Work document</h1><h2>Purpose</h2><p></p><h2>Decision</h2><p></p><h2>Next steps</h2><p></p>')
  }
  if (app.id === 'spreadsheet') {
    const header = school
      ? [['Task', 'Due', 'Score', 'Notes', '', '', '', ''], ['Homework 1', '', '', '', '', '', '', '']]
      : [['Item', 'Owner', 'Status', 'Amount', '', '', '', ''], ['Kickoff', '', 'Open', '', '', '', '', '']]
    const cells = header.map(row => [...row])
    while (cells.length < 24) cells.push(Array(8).fill(''))
    return { cells, selected: 'A2', chartColumn: 1 }
  }
  if (app.id === 'presentation') {
    const slides = school
      ? [
        { title: 'Learning goal', body: 'By the end, I will be able to…', notes: '' },
        { title: 'Key idea', body: 'One clear point with an example.', notes: '' },
        { title: 'Practice', body: 'Show the work, then check it.', notes: '' },
      ]
      : [
        { title: 'Agenda', body: 'What this meeting needs to decide.', notes: '' },
        { title: 'Update', body: 'What changed, and what is blocked.', notes: '' },
        { title: 'Ask', body: 'The decision or next owner.', notes: '' },
      ]
    return { slides: slides.map(slide => ({ id: crypto.randomUUID(), ...slide })), activeSlide: 0 }
  }
  if (app.id === 'notebook') {
    return {
      title: school ? 'Class notebook' : 'Work notebook',
      cells: school
        ? [
          { id: 'class', kind: 'markdown', body: '# Class notes\nWhat did we cover?' },
          { id: 'todo', kind: 'markdown', body: '## Homework\n' },
        ]
        : [
          { id: 'today', kind: 'markdown', body: '# Today\nWhat needs to move?' },
          { id: 'actions', kind: 'markdown', body: '## Actions\n' },
        ],
    }
  }
  return null
}

export function suiteStarterWorkspace(app: SuiteApp, audience?: AccountAudience | null) {
  const data = suiteStarterContent(app, audience)
  if (!data) return ''
  return JSON.stringify({
    schema: 'helios-workspace-v1',
    appKind: app.id,
    data,
  })
}
