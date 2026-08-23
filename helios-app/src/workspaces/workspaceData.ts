import type { Project } from '../api'

export interface WorkspacePayload {
  schema: 'helios-workspace-v1'
  appKind: string
  data: Record<string, unknown>
}

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
}

function defaultData(appKind: string, legacyContent = ''): Record<string, unknown> {
  const kind = resolveWorkspaceKind(appKind)

  if (kind === 'code') {
    const looksLikeHtml = /<(!doctype|html|body|div|main|section)/i.test(legacyContent)
    if (looksLikeHtml) {
      return {
        files: { 'index.html': legacyContent, 'styles.css': '', 'app.js': '' },
        activeFile: 'index.html',
        openFiles: ['index.html'],
        terminal: [],
      }
    }
    return {
      files: {},
      activeFile: '',
      openFiles: [],
      terminal: [],
    }
  }

  if (kind === 'stocks') {
    return {
      symbols: ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'SPY', '0700.HK', 'BABA'],
    }
  }

  if (kind === 'spreadsheet') {
    const sheets: Record<string, string[][]> = {
      'budget-sheet': [
        ['Category', 'Planned', 'Actual', 'Difference', '', '', '', ''],
        ['Income', '1200', '1250', '=C2-B2', '', '', '', ''],
        ['Rent', '500', '500', '=C3-B3', '', '', '', ''],
        ['Food', '200', '180', '=C4-B4', '', '', '', ''],
        ['Total spend', '=SUM(B3:B4)', '=SUM(C3:C4)', '=C5-B5', '', '', '', ''],
      ],
      'gradebook': [
        ['Student', 'Quiz 1', 'Quiz 2', 'Project', 'Average', '', '', ''],
        ['Alex', '18', '17', '42', '=(B2+C2+D2)/3', '', '', ''],
        ['Maya', '16', '19', '45', '=(B3+C3+D3)/3', '', '', ''],
        ['Sam', '20', '18', '40', '=(B4+C4+D4)/3', '', '', ''],
      ],
      'run-plan': [
        ['Day', 'Distance km', 'Pace', 'Notes', '', '', '', ''],
        ['Mon', '5', '5:40', 'Easy', '', '', '', ''],
        ['Wed', '8', '5:20', 'Tempo', '', '', '', ''],
        ['Sat', '12', '5:50', 'Long', '', '', '', ''],
        ['Total', '=SUM(B2:B4)', '', '', '', '', '', ''],
      ],
      'decision-matrix': [
        ['Option', 'Impact', 'Effort', 'Score', '', '', '', ''],
        ['Option A', '5', '2', '=B2-C2', '', '', '', ''],
        ['Option B', '4', '1', '=B3-C3', '', '', '', ''],
        ['Option C', '3', '3', '=B4-C4', '', '', '', ''],
      ],
      'data-visualization': [
        ['Label', 'Value', 'Target', 'Gap', '', '', '', ''],
        ['Week 1', '12', '15', '=C2-B2', '', '', '', ''],
        ['Week 2', '18', '15', '=C3-B3', '', '', '', ''],
        ['Week 3', '14', '15', '=C4-B4', '', '', '', ''],
        ['Total', '=SUM(B2:B4)', '=SUM(C2:C4)', '=C5-B5', '', '', '', ''],
      ],
    }
    const starter = (sheets[appKind] || [
      ['Item', 'Value', 'Target', 'Difference', '', '', '', ''],
      ['A', '12', '15', '=C2-B2', '', '', '', ''],
      ['B', '18', '20', '=C3-B3', '', '', '', ''],
      ['C', '9', '12', '=C4-B4', '', '', '', ''],
      ['Total', '=SUM(B2:B4)', '=SUM(C2:C4)', '=C5-B5', '', '', '', ''],
    ]).map(row => [...row])
    while (starter.length < 14) starter.push(Array(8).fill(''))
    starter.forEach(row => { while (row.length < 8) row.push('') })
    return { cells: starter, selected: 'A1', chartColumn: 1 }
  }

  if (kind === 'presentation') {
    const decks: Record<string, Array<{ title: string; body: string }>> = {
      'pitch-deck': [
        { title: 'The problem', body: 'Name the painful, frequent problem.' },
        { title: 'The solution', body: 'Explain the simplest useful answer.' },
        { title: 'Why now', body: 'Evidence, timing and next ask.' },
      ],
      'lesson-slides': [
        { title: 'Learning goal', body: 'By the end, learners will be able to…' },
        { title: 'Key idea', body: 'Teach one clear concept with an example.' },
        { title: 'Practice', body: 'A short activity that proves understanding.' },
      ],
      'science-poster': [
        { title: 'Question', body: 'What are you investigating?' },
        { title: 'Method', body: 'How was evidence gathered?' },
        { title: 'Findings', body: 'What does the evidence support?' },
      ],
      'portfolio-builder': [
        { title: 'Selected work', body: 'Show the strongest piece first.' },
        { title: 'Process', body: 'What decisions shaped the result?' },
        { title: 'Reflection', body: 'What would you improve next?' },
      ],
    }
    const slides = (decks[appKind] || [
      { title: 'Untitled presentation', body: 'A clear idea, one slide at a time.' },
      { title: 'The important context', body: 'Add the evidence your audience needs.' },
    ]).map(slide => ({ id: crypto.randomUUID(), notes: '', ...slide }))
    return { slides, activeSlide: 0 }
  }

  if (kind === 'drawing') {
    return {
      strokes: [],
      layers: [{ id: 'base', name: 'Base', visible: true }, { id: 'details', name: 'Details', visible: true }],
      activeLayer: 'details',
      color: '#171819',
      size: 4,
      pages: ['comic-studio', 'comic-maker', 'manga-studio', 'graphic-novel', 'zine-maker', 'storyboard'].includes(appKind)
        ? [{ id: 'page-1', name: 'Page 1' }]
        : [],
      comicElements: [],
    }
  }

  if (kind === 'math') {
    const expression = appKind === 'geometry-studio' ? 'abs(x)' : appKind === 'calculus-lab' ? 'x^2' : appKind === 'probability-lab' ? 'exp(-x*x)' : 'sin(x)'
    return {
      expression,
      calculator: '',
      history: [],
      notes: appKind === 'formula-sheet'
        ? 'List formulas and explain when each one applies.'
        : 'Show each step and explain why it works.',
    }
  }

  if (kind === 'survey') {
    const surveys: Record<string, { title: string; description: string; questions: Array<{ prompt: string; type: 'short' | 'long' | 'choice'; options: string[] }> }> = {
      'interview-guide': {
        title: 'Interview guide',
        description: 'Useful prompts for a focused conversation.',
        questions: [
          { prompt: 'What were you trying to do?', type: 'long', options: [] },
          { prompt: 'Where did it break down?', type: 'long', options: [] },
          { prompt: 'What would a better outcome look like?', type: 'short', options: [] },
        ],
      },
      'feedback-form': {
        title: 'Feedback form',
        description: 'Collect specific, actionable feedback.',
        questions: [
          { prompt: 'What worked well?', type: 'long', options: [] },
          { prompt: 'What should improve next?', type: 'long', options: [] },
          { prompt: 'Overall clarity', type: 'choice', options: ['Excellent', 'Good', 'Needs work'] },
        ],
      },
      'quiz-builder': {
        title: 'Quiz',
        description: 'Check understanding with a short quiz.',
        questions: [
          { prompt: 'Key concept check', type: 'choice', options: ['Option A', 'Option B', 'Option C'] },
          { prompt: 'Explain your reasoning', type: 'long', options: [] },
        ],
      },
      'peer-review': {
        title: 'Peer review',
        description: 'Criteria-based review for shared work.',
        questions: [
          { prompt: 'What is strongest?', type: 'long', options: [] },
          { prompt: 'What is unclear?', type: 'long', options: [] },
          { prompt: 'Ready to share?', type: 'choice', options: ['Yes', 'Almost', 'Not yet'] },
        ],
      },
      'customer-interviews': {
        title: 'Customer interview',
        description: 'Jobs, pains and gains from real conversations.',
        questions: [
          { prompt: 'What job is the person trying to get done?', type: 'long', options: [] },
          { prompt: 'What is painful about current options?', type: 'long', options: [] },
          { prompt: 'What would success look like?', type: 'short', options: [] },
        ],
      },
    }
    const survey = surveys[appKind] || {
      title: 'Untitled survey',
      description: 'What do you need to learn?',
      questions: [
        { prompt: 'What is working well?', type: 'long', options: [] },
        { prompt: 'Which option fits best?', type: 'choice', options: ['Option A', 'Option B'] },
      ],
    }
    return {
      title: survey.title,
      description: survey.description,
      questions: survey.questions.map(question => ({ id: crypto.randomUUID(), ...question })),
    }
  }

  if (kind === 'board') {
    const boards: Record<string, string[]> = {
      'sprint-board': ['Backlog', 'This sprint', 'Doing', 'Review'],
      kanban: ['Ideas', 'Ready', 'Doing', 'Done'],
      roadmap: ['Now', 'Next', 'Later'],
      'bug-tracker': ['Reported', 'Triaged', 'Fixing', 'Verified'],
      'research-board': ['Sources', 'Insights', 'Open questions', 'Decisions'],
      'content-calendar': ['Ideas', 'Drafting', 'Scheduled', 'Published'],
      'event-planner': ['To arrange', 'Confirmed', 'Day-of', 'Done'],
      'game-strategy': ['Goals', 'Tactics', 'In play', 'Review'],
      checklist: ['To do', 'Doing', 'Done'],
      'swot-board': ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'],
      'practice-routine': ['Warmup', 'Focus', 'Cooldown'],
      'goal-tracker': ['This week', 'In progress', 'Won'],
      'homework-board': ['Due', 'Doing', 'Need help', 'Handed in'],
      'club-planner': ['Ideas', 'Planning', 'Running', 'Done'],
    }
    const names = boards[appKind] || ['To do', 'Doing', 'Done']
    return {
      columns: names.map((name, index) => ({
        id: crypto.randomUUID(),
        name,
        cards: index === 0 ? [{ id: crypto.randomUUID(), text: 'Define the next meaningful outcome' }] : [],
      })),
    }
  }

  if (kind === 'reader') {
    return {
      html: legacyContent ? `<p>${escapeHtml(legacyContent)}</p>` : '<h1>Untitled book</h1><h2>Chapter 1</h2><p>Begin the first chapter here.</p>',
      progress: 0,
      bookmarks: [],
      notes: [],
      readerMode: true,
    }
  }

  if (kind === 'notebook' && appKind === 'notebook') {
    return {
      title: 'Notebook',
      cells: [
        { id: 'today', kind: 'markdown', body: '# Today\nWhat are you working on?' },
        { id: 'open', kind: 'markdown', body: '## Open threads\n' },
        { id: 'next', kind: 'markdown', body: '## Next\n' },
      ],
    }
  }

  const starters: Record<string, string> = {
    'word-docs': '<h1>Untitled document</h1><p>Start a clean document with headings, lists and evidence.</p>',
    notebook: '<h1>Notebook</h1><h2>Today</h2><p>Capture the work in sections you can keep adding to.</p><h2>Open threads</h2><p></p><h2>Next</h2><p></p>',
    'lab-notebook': '<h1>Experiment title</h1><h2>Question</h2><p>What are you trying to find out?</p><h2>Method</h2><p>Record a reproducible method.</p><h2>Observations</h2><p>Add evidence as the work develops.</p><h2>Findings</h2><p>Explain what the evidence supports.</p>',
    'lab-report': '<h1>Lab report</h1><h2>Aim</h2><p></p><h2>Method</h2><p></p><h2>Results</h2><p></p><h2>Discussion</h2><p></p><h2>Conclusion</h2><p></p>',
    'business-planner': '<h1>Business idea</h1><h2>Problem</h2><p>What real problem are you solving?</p><h2>People</h2><p>Who experiences it?</p><h2>Evidence</h2><p>What have you learned so far?</p><h2>Model</h2><p>How could this become sustainable?</p><h2>Next milestone</h2><p>Choose one testable next move.</p>',
    'business-model': '<h1>Business model canvas</h1><h2>Value proposition</h2><p></p><h2>Customer segments</h2><p></p><h2>Channels</h2><p></p><h2>Revenue</h2><p></p><h2>Costs</h2><p></p>',
    'essay-studio': '<h1>Essay title</h1><h2>Thesis</h2><p></p><h2>Body</h2><p></p><h2>Evidence</h2><p></p><h2>Conclusion</h2><p></p>',
    'research-paper': '<h1>Research paper</h1><h2>Abstract</h2><p></p><h2>Introduction</h2><p></p><h2>Method</h2><p></p><h2>Results</h2><p></p><h2>Discussion</h2><p></p>',
    'script-writer': '<h1>Script</h1><h2>Scene 1</h2><p><strong>INT. PLACE - DAY</strong></p><p>Character actions and dialogue.</p>',
    'poetry-studio': '<h1>Poem title</h1><p>Line one<br>Line two<br>Line three</p>',
    journal: '<h1>Journal entry</h1><p>What happened, what it meant, what comes next.</p>',
    'lesson-planner': '<h1>Lesson plan</h1><h2>Objective</h2><p></p><h2>Activities</h2><p></p><h2>Materials</h2><p></p><h2>Assessment</h2><p></p>',
    'study-guide': '<h1>Study guide</h1><h2>Key ideas</h2><p></p><h2>Terms</h2><p></p><h2>Practice</h2><p></p>',
    'meeting-notes': '<h1>Meeting notes</h1><h2>Agenda</h2><p></p><h2>Decisions</h2><p></p><h2>Actions</h2><p></p>',
    'proposal-writer': '<h1>Proposal</h1><h2>Context</h2><p></p><h2>Recommendation</h2><p></p><h2>Risks</h2><p></p><h2>Next steps</h2><p></p>',
    'report-writer': '<h1>Report</h1><h2>Summary</h2><p></p><h2>Findings</h2><p></p><h2>Recommendations</h2><p></p>',
    'resume-builder': '<h1>Name</h1><h2>Profile</h2><p></p><h2>Experience</h2><p></p><h2>Projects</h2><p></p><h2>Skills</h2><p></p>',
    'letter-writer': '<p>Dear …,</p><p></p><p>Yours sincerely,</p>',
    'blog-draft': '<h1>Headline</h1><p>Lead paragraph.</p><h2>Section</h2><p></p>',
    newsletter: '<h1>Newsletter</h1><h2>Highlight</h2><p></p><h2>Updates</h2><p></p><h2>Call to action</h2><p></p>',
    documentation: '<h1>Documentation</h1><h2>Overview</h2><p></p><h2>How to use</h2><p></p><h2>Notes</h2><p></p>',
    'citation-manager': '<h1>Sources</h1><ul><li>Author. Title. Year. Notes.</li></ul>',
    'outline-builder': '<h1>Outline</h1><ol><li>Main point<ul><li>Support</li></ul></li></ol>',
    'flashcard-maker': '<h1>Flashcards</h1><h2>Card 1</h2><p><strong>Q:</strong> …</p><p><strong>A:</strong> …</p>',
    'glossary-builder': '<h1>Glossary</h1><p><strong>Term</strong> — definition and example.</p>',
    'reading-response': '<h1>Reading response</h1><h2>Passage</h2><p></p><h2>Interpretation</h2><p></p><h2>Questions</h2><p></p>',
    'chemistry-lab': '<h1>Chemistry lab</h1><h2>Reaction / investigation</h2><p></p><h2>Safety</h2><p></p><h2>Observations</h2><p></p><h2>Conclusion</h2><p></p>',
    'biology-lab': '<h1>Biology lab</h1><h2>Question</h2><p></p><h2>Method</h2><p></p><h2>Observations</h2><p></p><h2>Findings</h2><p></p>',
    'physics-lab': '<h1>Physics lab</h1><h2>Question</h2><p></p><h2>Variables</h2><p></p><h2>Data notes</h2><p></p><h2>Analysis</h2><p></p>',
    'earth-science': '<h1>Earth science investigation</h1><h2>Focus</h2><p></p><h2>Observations</h2><p></p><h2>Patterns</h2><p></p>',
    'astronomy-notebook': '<h1>Astronomy notes</h1><h2>Target</h2><p></p><h2>Conditions</h2><p></p><h2>Observations</h2><p></p>',
    'fieldwork-log': '<h1>Fieldwork log</h1><h2>Site</h2><p></p><h2>Measurements</h2><p></p><h2>Notes</h2><p></p>',
    'engineering-notebook': '<h1>Engineering notebook</h1><h2>Requirements</h2><p></p><h2>Design</h2><p></p><h2>Tests</h2><p></p><h2>Iterations</h2><p></p>',
    'circuit-lab': '<h1>Circuit lab</h1><h2>Goal</h2><p></p><h2>Schematic notes</h2><p></p><h2>Measurements</h2><p></p><h2>Fixes</h2><p></p>',
    'robotics-log': '<h1>Robotics log</h1><h2>Build notes</h2><p></p><h2>Code checks</h2><p></p><h2>Sensor tests</h2><p></p><h2>Next fix</h2><p></p>',
    'ai-eval-notebook': '<h1>AI evaluation</h1><h2>Task</h2><p></p><h2>Prompt / setup</h2><p></p><h2>Outputs</h2><p></p><h2>Rubric & score</h2><p></p>',
    'ml-notebook-doc': '<h1>ML project notes</h1><h2>Dataset</h2><p></p><h2>Model ideas</h2><p></p><h2>Metrics</h2><p></p><h2>Next experiment</h2><p></p>',
    'prompt-lab': '<h1>Prompt lab</h1><h2>Goal</h2><p></p><h2>Prompt draft</h2><p></p><h2>Evaluation notes</h2><p></p>',
    'product-spec': '<h1>Product spec</h1><h2>Problem</h2><p></p><h2>Users</h2><p></p><h2>Requirements</h2><p></p><h2>Acceptance criteria</h2><p></p>',
    'architecture-notes': '<h1>Architecture notes</h1><h2>Context</h2><p></p><h2>Options</h2><p></p><h2>Decision</h2><p></p>',
    'release-notes': '<h1>Release notes</h1><h2>Highlights</h2><p></p><h2>Fixes</h2><p></p><h2>Known issues</h2><p></p>',
    'vocab-builder': '<h1>Vocabulary</h1><p><strong>Word</strong> — meaning · example sentence</p>',
    'translation-pad': '<h1>Translation</h1><h2>Source</h2><p></p><h2>Translation</h2><p></p><h2>Notes</h2><p></p>',
    'debate-prep': '<h1>Debate prep</h1><h2>Claim</h2><p></p><h2>Evidence</h2><p></p><h2>Counters</h2><p></p>',
    'history-timeline': '<h1>Timeline</h1><ul><li>Date — event — significance</li></ul>',
    'source-analysis': '<h1>Source analysis</h1><h2>Source</h2><p></p><h2>Origin</h2><p></p><h2>Purpose</h2><p></p><h2>Value & limitations</h2><p></p>',
    'map-notes': '<h1>Map notes</h1><h2>Place</h2><p></p><h2>Patterns</h2><p></p><h2>Questions</h2><p></p>',
    'travel-planner': '<h1>Travel plan</h1><h2>Itinerary</h2><p></p><h2>Budget notes</h2><p></p><h2>Packing</h2><p></p>',
    'recipe-book': '<h1>Recipe</h1><h2>Ingredients</h2><p></p><h2>Steps</h2><p></p><h2>Tasting notes</h2><p></p>',
    'music-practice': '<h1>Practice log</h1><h2>Warmup</h2><p></p><h2>Repertoire</h2><p></p><h2>Reflection</h2><p></p>',
    songwriting: '<h1>Song draft</h1><h2>Structure</h2><p>Verse / Chorus / Bridge</p><h2>Lyrics</h2><p></p>',
    'photo-shotlist': '<h1>Shot list</h1><ul><li>Shot — location — note</li></ul>',
    'photo-critique': '<h1>Photo critique</h1><h2>Composition</h2><p></p><h2>Light</h2><p></p><h2>Next shot</h2><p></p>',
    'sports-playbook': '<h1>Playbook</h1><h2>Drill</h2><p></p><h2>Formation</h2><p></p><h2>Coaching notes</h2><p></p>',
    'animation-planner': '<h1>Animation plan</h1><h2>Beats</h2><p></p><h2>Timing</h2><p></p><h2>Key poses</h2><p></p>',
    'critique-sheet': '<h1>Critique</h1><h2>Strengths</h2><p></p><h2>Questions</h2><p></p><h2>Next revision</h2><p></p>',
    'hypothesis-builder': '<h1>Hypothesis</h1><h2>Question</h2><p></p><h2>Variables</h2><p></p><h2>Prediction</h2><p></p><h2>Test</h2><p></p>',
    'observation-journal': '<h1>Observation journal</h1><h2>Context</h2><p></p><h2>Notes</h2><p></p><h2>Patterns</h2><p></p>',
    'science-fair': '<h1>Science fair project</h1><h2>Question</h2><p></p><h2>Background</h2><p></p><h2>Method</h2><p></p><h2>Results plan</h2><p></p>',
    'lab-safety': '<h1>Lab safety plan</h1><h2>Hazards</h2><p></p><h2>PPE</h2><p></p><h2>Procedures</h2><p></p>',
    'worldbuilding': '<h1>Worldbuilding</h1><h2>Places</h2><p></p><h2>Rules</h2><p></p><h2>Cultures</h2><p></p>',
    'character-bible': '<h1>Character bible</h1><h2>Traits</h2><p></p><h2>Backstory</h2><p></p><h2>Arc</h2><p></p>',
    'scene-builder': '<h1>Scene</h1><h2>Setting</h2><p></p><h2>Conflict</h2><p></p><h2>Dialogue notes</h2><p></p>',
    'sound-design-notes': '<h1>Sound design</h1><h2>Cues</h2><p></p><h2>Textures</h2><p></p><h2>Timing</h2><p></p>',
    'reflection-log': '<h1>Reflection</h1><h2>What happened</h2><p></p><h2>What I learned</h2><p></p><h2>What next</h2><p></p>',
    'mentor-notes': '<h1>Mentor notes</h1><h2>Advice</h2><p></p><h2>Actions</h2><p></p><h2>Check-in</h2><p></p>',
    'collaboration-brief': '<h1>Collaboration brief</h1><h2>Shared goal</h2><p></p><h2>Roles</h2><p></p><h2>Constraints</h2><p></p><h2>Success criteria</h2><p></p>',
    notes: '<h1>Notes</h1><p>Capture the important thread while it is still clear.</p>',
  }

  const starter = starters[appKind]
    || (legacyContent ? `<p>${escapeHtml(legacyContent)}</p>` : '<h1>Untitled document</h1><p>Start writing here.</p>')

  return {
    html: starter,
    progress: 0,
    bookmarks: [],
    notes: [],
    readerMode: false,
  }
}

export function resolveWorkspaceKind(appKind: string): 'code' | 'spreadsheet' | 'presentation' | 'drawing' | 'math' | 'survey' | 'board' | 'reader' | 'notebook' | 'writing' | 'stocks' {
  if (appKind === 'stocks') return 'stocks'
  if ([
    'web-code', 'api-playground', 'game-prototype', 'web-prototype', 'algorithm-lab', 'data-script',
  ].includes(appKind)) return 'code'

  if ([
    'spreadsheet', 'data-visualization', 'budget-sheet', 'gradebook', 'stats-lab', 'experiment-tracker',
    'data-table', 'inventory', 'habit-tracker-sheet', 'training-log', 'nutrition-log', 'recipe-scaler',
    'market-research', 'kpi-dashboard', 'survey-results', 'timeline-sheet', 'run-plan', 'decision-matrix', 'okrs',
  ].includes(appKind) || appKind.endsWith('-sheet')) return 'spreadsheet'

  if ([
    'presentation', 'pitch-deck', 'lesson-slides', 'science-poster', 'portfolio-builder',
  ].includes(appKind) || appKind.endsWith('-deck') || appKind.endsWith('-slides')) return 'presentation'

  if ([
    'drawing', 'whiteboard', 'comic-studio', 'comic-maker', 'manga-studio', 'storyboard', 'character-design',
    'concept-art', 'illustration', 'pixel-art', 'logo-sketch', 'moodboard', 'ui-wireframe', 'ux-map',
    'collage-studio', 'color-study', 'set-design', 'fashion-sketch', 'art-journal', 'zine-maker', 'graphic-novel',
    'poster-design', 'typography-lab',
  ].includes(appKind) || appKind.includes('comic') || appKind.includes('sketch') || appKind.endsWith('-canvas')) return 'drawing'

  if ([
    'math-lab', 'algebra-lab', 'geometry-studio', 'calculus-lab', 'probability-lab', 'unit-converter',
  ].includes(appKind)) return 'math'

  if ([
    'survey', 'interview-guide', 'feedback-form', 'quiz-builder', 'peer-review', 'customer-interviews',
  ].includes(appKind) || appKind.endsWith('-form') || appKind.includes('quiz') || appKind.includes('survey')) return 'survey'

  if ([
    'project-board', 'sprint-board', 'kanban', 'roadmap', 'bug-tracker', 'research-board', 'content-calendar',
    'event-planner', 'game-strategy', 'club-planner', 'checklist', 'swot-board', 'practice-routine', 'goal-tracker',
  ].includes(appKind) || appKind.endsWith('-board') || appKind.includes('kanban') || appKind.includes('checklist')) return 'board'

  if (['reader', 'book-creator'].includes(appKind)) return 'reader'

  if ([
    'notebook', 'lab-notebook', 'chemistry-lab', 'biology-lab', 'physics-lab', 'earth-science', 'fieldwork-log',
    'engineering-notebook', 'circuit-lab', 'robotics-log', 'ai-eval-notebook', 'ml-notebook-doc',
    'hypothesis-builder', 'observation-journal', 'science-fair', 'map-notes',
  ].includes(appKind) || appKind.endsWith('-notebook') || appKind.endsWith('-lab')) return 'notebook'

  return 'writing'
}

export function parseWorkspace(project: Project): WorkspacePayload {
  try {
    const parsed = JSON.parse(project.content) as Partial<WorkspacePayload>
    if (parsed.schema === 'helios-workspace-v1' && parsed.data && typeof parsed.data === 'object') {
      return {
        schema: 'helios-workspace-v1',
        appKind: parsed.appKind || project.app_kind,
        data: parsed.data as Record<string, unknown>,
      }
    }
  } catch {}
  return {
    schema: 'helios-workspace-v1',
    appKind: project.app_kind,
    data: defaultData(project.app_kind, project.content),
  }
}

export function serializeWorkspace(payload: WorkspacePayload) {
  return JSON.stringify(payload)
}
