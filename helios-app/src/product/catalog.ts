import type { Project } from '../api'

export type SpaceKind = 'subject' | 'hobby'

export interface SpaceDefinition {
  id: string
  name: string
  kind: SpaceKind
  description: string
  accent: string
  icon: string
  miniApps: string[]
  prompts: string[]
}

export interface MiniAppDefinition {
  id: string
  name: string
  shortName: string
  projectType: Project['type']
  description: string
  accent: string
  icon: string
  live: boolean
  category: string
}

export const MINI_APP_CATALOG: MiniAppDefinition[] = [
  { id: 'ai-eval-notebook', name: 'AI Evaluation Notebook', shortName: 'AI Eval', projectType: 'notebook', description: 'Prompts, outputs, rubrics and model evaluation notes.', accent: '#8576f5', icon: 'sparkles', live: true, category: 'Science & Labs' },
  { id: 'algebra-lab', name: 'Algebra Lab', shortName: 'Algebra', projectType: 'math', description: 'Equations, substitutions and step-by-step algebraic work.', accent: '#68b7ff', icon: 'math', live: true, category: 'Maths' },
  { id: 'algorithm-lab', name: 'Algorithm Lab', shortName: 'Algos', projectType: 'code', description: 'Implement algorithms and keep test notes nearby.', accent: '#3fb6ef', icon: 'code', live: true, category: 'Code & Build' },
  { id: 'api-playground', name: 'API Playground', shortName: 'API', projectType: 'code', description: 'Prototype endpoints, payloads and docs in code files.', accent: '#4fc3f7', icon: 'code', live: true, category: 'Code & Build' },
  { id: 'architecture-notes', name: 'Architecture Notes', shortName: 'Arch', projectType: 'doc', description: 'System diagrams notes, tradeoffs and decisions.', accent: '#68b7ff', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'biology-lab', name: 'Biology Lab', shortName: 'Bio', projectType: 'notebook', description: 'Specimens, methods, diagrams notes and result write-ups.', accent: '#6ed69a', icon: 'flask', live: true, category: 'Science & Labs' },
  { id: 'book-creator', name: 'Book Creator', shortName: 'Books', projectType: 'book', description: 'Structure chapters, front matter and reading progress for long-form work.', accent: '#e0a84d', icon: 'book', live: true, category: 'Reading & Books' },
  { id: 'budget-sheet', name: 'Budget Sheet', shortName: 'Budget', projectType: 'spreadsheet', description: 'Track income, expenses, categories and remaining balance.', accent: '#62d2a0', icon: 'sheet', live: true, category: 'Sheets & Data' },
  { id: 'bug-tracker', name: 'Bug Tracker', shortName: 'Bugs', projectType: 'board', description: 'Triage, fix and verify issues without losing context.', accent: '#5f78ff', icon: 'board', live: true, category: 'Boards & Planning' },
  { id: 'business-model', name: 'Business Model Canvas', shortName: 'BMC', projectType: 'doc', description: 'Value prop, customers, channels and cost structure.', accent: '#f2b84b', icon: 'business', live: true, category: 'Docs & Writing' },
  { id: 'business-planner', name: 'Business Planner', shortName: 'Planner', projectType: 'doc', description: 'Problem, customer, market, model, milestones and next decisions.', accent: '#f2b84b', icon: 'business', live: true, category: 'Docs & Writing' },
  { id: 'calculus-lab', name: 'Calculus Lab', shortName: 'Calculus', projectType: 'math', description: 'Derivatives, integrals and graph-based exploration.', accent: '#4f9dff', icon: 'math', live: true, category: 'Maths' },
  { id: 'character-design', name: 'Character Design', shortName: 'Chars', projectType: 'drawing', description: 'Explore silhouettes, expressions and costume ideas.', accent: '#ff7eb6', icon: 'palette', live: true, category: 'Art & Design' },
  { id: 'checklist', name: 'Checklist', shortName: 'Checks', projectType: 'board', description: 'Simple actionable checklists that stay project-backed.', accent: '#8576f5', icon: 'board', live: true, category: 'Boards & Planning' },
  { id: 'chemistry-lab', name: 'Chemistry Lab', shortName: 'Chem', projectType: 'notebook', description: 'Reactions, observations, safety notes and conclusions.', accent: '#5ad0d4', icon: 'flask', live: true, category: 'Science & Labs' },
  { id: 'circuit-lab', name: 'Circuit Lab', shortName: 'Circuits', projectType: 'notebook', description: 'Document circuits, measurements and troubleshooting.', accent: '#4fc3f7', icon: 'engineering', live: true, category: 'Science & Labs' },
  { id: 'citation-manager', name: 'Citation Manager', shortName: 'Citations', projectType: 'doc', description: 'Track sources, quotes and bibliography notes for papers.', accent: '#9aa8d8', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'color-study', name: 'Color Study', shortName: 'Color', projectType: 'drawing', description: 'Explore palettes, values and colour relationships.', accent: '#ff7eb6', icon: 'palette', live: true, category: 'Art & Design' },
  { id: 'comic-maker', name: 'Comic Maker', shortName: 'Comic', projectType: 'drawing', description: 'Make multi-panel comics with pages, speech and layout.', accent: '#ff8a65', icon: 'comic', live: true, category: 'Comics & Story' },
  { id: 'comic-studio', name: 'Comic Studio', shortName: 'Comics', projectType: 'drawing', description: 'Pages, panels, speech bubbles and visual story planning.', accent: '#ff9b6a', icon: 'comic', live: true, category: 'Comics & Story' },
  { id: 'concept-art', name: 'Concept Art', shortName: 'Concept', projectType: 'drawing', description: 'Explore worlds, props and visual direction quickly.', accent: '#ff6fa8', icon: 'palette', live: true, category: 'Art & Design' },
  { id: 'critique-sheet', name: 'Critique Sheet', shortName: 'Critique', projectType: 'doc', description: 'Structured feedback for art, writing or design work.', accent: '#d0a0ff', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'customer-interviews', name: 'Customer Interviews', shortName: 'Customers', projectType: 'survey', description: 'Capture jobs, pains, gains and interview insights.', accent: '#ff9b6a', icon: 'survey', live: true, category: 'Forms & Research' },
  { id: 'data-visualization', name: 'Data Visualization', shortName: 'Data Viz', projectType: 'spreadsheet', description: 'Turn structured data into clear charts and explanatory findings.', accent: '#68b7ff', icon: 'chart', live: true, category: 'Sheets & Data' },
  { id: 'debate-prep', name: 'Debate Prep', shortName: 'Debate', projectType: 'doc', description: 'Claims, evidence, counters and speaking notes.', accent: '#d7a86e', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'decision-matrix', name: 'Decision Matrix', shortName: 'Decide', projectType: 'spreadsheet', description: 'Score options against criteria and compare totals.', accent: '#6ed69a', icon: 'sheet', live: true, category: 'Sheets & Data' },
  { id: 'documentation', name: 'Docs Studio', shortName: 'Docs', projectType: 'writing', description: 'Product, API or classroom documentation that stays shareable.', accent: '#7aa7ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'drawing', name: 'Drawing Canvas', shortName: 'Drawing', projectType: 'drawing', description: 'A layered canvas with brush, colour, size and durable strokes.', accent: '#ff7eb6', icon: 'palette', live: true, category: 'Art & Design' },
  { id: 'earth-science', name: 'Earth Science Lab', shortName: 'Earth', projectType: 'notebook', description: 'Geology, weather and environment investigation logs.', accent: '#7bcf8a', icon: 'flask', live: true, category: 'Science & Labs' },
  { id: 'engineering-notebook', name: 'Engineering Notebook', shortName: 'Eng', projectType: 'notebook', description: 'Requirements, designs, tests and iteration records.', accent: '#68b7ff', icon: 'engineering', live: true, category: 'Science & Labs' },
  { id: 'essay-studio', name: 'Essay Studio', shortName: 'Essays', projectType: 'writing', description: 'Plan thesis, body paragraphs, evidence and conclusions.', accent: '#c3a4ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'experiment-tracker', name: 'Experiment Tracker', shortName: 'Trials', projectType: 'spreadsheet', description: 'Log trials, variables, measurements and outcomes.', accent: '#45b7b0', icon: 'sheet', live: true, category: 'Sheets & Data' },
  { id: 'fieldwork-log', name: 'Fieldwork Log', shortName: 'Field', projectType: 'notebook', description: 'Site notes, measurements, photos notes and findings.', accent: '#4fc3f7', icon: 'flask', live: true, category: 'Science & Labs' },
  { id: 'flashcard-maker', name: 'Flashcard Maker', shortName: 'Cards', projectType: 'doc', description: 'Create question/answer cards for revision and vocabulary.', accent: '#74c0e8', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'formula-sheet', name: 'Formula Sheet', shortName: 'Formulas', projectType: 'doc', description: 'Curate formulas with explanations and usage notes.', accent: '#8ec0ff', icon: 'notes', live: true, category: 'Maths' },
  { id: 'game-prototype', name: 'Game Prototype', shortName: 'Games', projectType: 'code', description: 'Build interactive game sketches with live preview.', accent: '#8576f5', icon: 'gaming', live: true, category: 'Code & Build' },
  { id: 'game-strategy', name: 'Game Strategy Board', shortName: 'Strategy', projectType: 'board', description: 'Goals, tactics and review notes for play sessions.', accent: '#8576f5', icon: 'board', live: true, category: 'Boards & Planning' },
  { id: 'geometry-studio', name: 'Geometry Studio', shortName: 'Geometry', projectType: 'math', description: 'Shapes, proofs, constructions and geometry notes.', accent: '#5aa8ff', icon: 'math', live: true, category: 'Maths' },
  { id: 'glossary-builder', name: 'Glossary Builder', shortName: 'Glossary', projectType: 'doc', description: 'Define terms, examples and subject-specific language.', accent: '#68b7ff', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'goal-tracker', name: 'Goal Tracker', shortName: 'Goals', projectType: 'board', description: 'Break goals into weekly moves and completed wins.', accent: '#8576f5', icon: 'board', live: true, category: 'Boards & Planning' },
  { id: 'gradebook', name: 'Gradebook', shortName: 'Grades', projectType: 'spreadsheet', description: 'Scores, averages and class tables you can actually mark in.', accent: '#107C41', icon: 'sheet', live: true, category: 'Sheets & Data' },
  { id: 'homework-board', name: 'Homework Board', shortName: 'Homework', projectType: 'board', description: 'Due, doing and handed-in columns for real school work.', accent: '#5C2D91', icon: 'board', live: true, category: 'Boards & Planning' },
  { id: 'graphic-novel', name: 'Graphic Novel Planner', shortName: 'GN', projectType: 'drawing', description: 'Chapters, arcs and page beats for long comics.', accent: '#ff8a65', icon: 'comic', live: true, category: 'Comics & Story' },
  { id: 'habit-tracker-sheet', name: 'Habit Tracker Sheet', shortName: 'Habits', projectType: 'spreadsheet', description: 'Daily/weekly habit completion tables and streak views.', accent: '#50c2a0', icon: 'sheet', live: true, category: 'Sheets & Data' },
  { id: 'history-timeline', name: 'History Timeline', shortName: 'History', projectType: 'doc', description: 'Chronology, sources and interpretive notes.', accent: '#d7a86e', icon: 'history', live: true, category: 'Docs & Writing' },
  { id: 'hypothesis-builder', name: 'Hypothesis Builder', shortName: 'Hypotheses', projectType: 'notebook', description: 'Question, variables, prediction and test design.', accent: '#5ad0d4', icon: 'flask', live: true, category: 'Science & Labs' },
  { id: 'illustration', name: 'Illustration Studio', shortName: 'Art', projectType: 'drawing', description: 'Finish illustrations with layers and durable strokes.', accent: '#ff7eb6', icon: 'palette', live: true, category: 'Art & Design' },
  { id: 'journal', name: 'Journal', shortName: 'Journal', projectType: 'doc', description: 'Private reflective writing with durable project history.', accent: '#7ec8ff', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'lab-notebook', name: 'Lab Notebook', shortName: 'Notebook', projectType: 'notebook', description: 'Experiment records, observations, methods, findings and reports.', accent: '#4fc3f7', icon: 'flask', live: true, category: 'Science & Labs' },
  { id: 'lesson-slides', name: 'Lesson Slides', shortName: 'Lessons', projectType: 'presentation', description: 'Teach one idea per slide with goals, examples and practice.', accent: '#C43E1C', icon: 'slides', live: true, category: 'Slides' },
  { id: 'lab-report', name: 'Lab Report', shortName: 'Lab Report', projectType: 'writing', description: 'Formal lab report sections ready to revise and share.', accent: '#6ed69a', icon: 'writing', live: true, category: 'Science & Labs' },
  { id: 'lab-safety', name: 'Lab Safety Plan', shortName: 'Safety', projectType: 'doc', description: 'Hazards, PPE, procedures and emergency notes.', accent: '#6ed69a', icon: 'notes', live: true, category: 'Science & Labs' },
  { id: 'manga-studio', name: 'Manga Studio', shortName: 'Manga', projectType: 'drawing', description: 'Panels, pacing and speech for long-form visual stories.', accent: '#ff7e8a', icon: 'comic', live: true, category: 'Comics & Story' },
  { id: 'map-notes', name: 'Map Notes', shortName: 'Maps', projectType: 'notebook', description: 'Place notes, patterns and geographic observations.', accent: '#6ed69a', icon: 'geography', live: true, category: 'Science & Labs' },
  { id: 'market-research', name: 'Market Research Sheet', shortName: 'Market', projectType: 'spreadsheet', description: 'Competitors, pricing, segments and opportunity tables.', accent: '#f0a95a', icon: 'sheet', live: true, category: 'Sheets & Data' },
  { id: 'math-lab', name: 'Maths Lab', shortName: 'Maths', projectType: 'math', description: 'Scientific calculation, formulas, graphing, statistics and geometry notes.', accent: '#68b7ff', icon: 'math', live: true, category: 'Maths' },
  { id: 'ml-notebook-doc', name: 'ML Project Notes', shortName: 'ML Notes', projectType: 'notebook', description: 'Dataset notes, model ideas, metrics and next experiments.', accent: '#8576f5', icon: 'sparkles', live: true, category: 'Science & Labs' },
  { id: 'moodboard', name: 'Moodboard', shortName: 'Mood', projectType: 'design', description: 'Collect visual references, notes and direction.', accent: '#b794ff', icon: 'whiteboard', live: true, category: 'Art & Design' },
  { id: 'music-practice', name: 'Music Practice Log', shortName: 'Music', projectType: 'doc', description: 'Warmups, repertoire, tempo goals and reflections.', accent: '#b794ff', icon: 'music', live: true, category: 'Docs & Writing' },
  { id: 'notebook', name: 'Notebook', shortName: 'OneNote', projectType: 'notebook', description: 'Sectioned notes you can keep editing like a real notebook.', accent: '#7719AA', icon: 'notes', live: true, category: 'Science & Labs' },
  { id: 'notes', name: 'Notes', shortName: 'Notes', projectType: 'doc', description: 'Fast, project-backed notes that remain shareable and searchable.', accent: '#4fc3f7', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'nutrition-log', name: 'Nutrition Log', shortName: 'Nutrition', projectType: 'spreadsheet', description: 'Meals, macros and daily totals in a simple sheet.', accent: '#61d0a8', icon: 'sheet', live: true, category: 'Sheets & Data' },
  { id: 'observation-journal', name: 'Observation Journal', shortName: 'Observe', projectType: 'notebook', description: 'Careful qualitative notes for science or design research.', accent: '#4fc3f7', icon: 'flask', live: true, category: 'Science & Labs' },
  { id: 'okrs', name: 'OKR Tracker', shortName: 'OKRs', projectType: 'spreadsheet', description: 'Objectives, key results and progress tracking.', accent: '#f0a95a', icon: 'sheet', live: true, category: 'Sheets & Data' },
  { id: 'outline-builder', name: 'Outline Builder', shortName: 'Outlines', projectType: 'doc', description: 'Hierarchical outlines before drafting long documents.', accent: '#86b0e0', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'photo-critique', name: 'Photo Critique', shortName: 'Photo', projectType: 'doc', description: 'Composition, light, subject and next-shot notes.', accent: '#5aa8ff', icon: 'camera', live: true, category: 'Docs & Writing' },
  { id: 'photo-shotlist', name: 'Photo Shot List', shortName: 'Shots', projectType: 'doc', description: 'Locations, shots, gear and story beats.', accent: '#68b7ff', icon: 'camera', live: true, category: 'Docs & Writing' },
  { id: 'physics-lab', name: 'Physics Lab', shortName: 'Physics', projectType: 'notebook', description: 'Force, motion, energy experiments with structured records.', accent: '#68b7ff', icon: 'flask', live: true, category: 'Science & Labs' },
  { id: 'pitch-deck', name: 'Pitch Deck', shortName: 'Pitch', projectType: 'presentation', description: 'Problem, solution, market and ask in slide form.', accent: '#f2b84b', icon: 'slides', live: true, category: 'Slides' },
  { id: 'poetry-studio', name: 'Poetry Studio', shortName: 'Poetry', projectType: 'writing', description: 'Draft stanzas, revise imagery and keep poetic notes together.', accent: '#e0a0ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'portfolio-builder', name: 'Portfolio Builder', shortName: 'Portfolio', projectType: 'presentation', description: 'Present selected works with captions and process notes.', accent: '#f2b84b', icon: 'slides', live: true, category: 'Slides' },
  { id: 'poster-design', name: 'Poster Design', shortName: 'Posters', projectType: 'design', description: 'Compose bold layouts for events, campaigns and shows.', accent: '#ff9b6a', icon: 'design', live: true, category: 'Art & Design' },
  { id: 'practice-routine', name: 'Practice Routine', shortName: 'Routine', projectType: 'board', description: 'Warmup, focus block and cooldown practice steps.', accent: '#8576f5', icon: 'board', live: true, category: 'Boards & Planning' },
  { id: 'presentation', name: 'Presentation', shortName: 'Slides', projectType: 'presentation', description: 'Slide thumbnails, editing, presenting and project sharing.', accent: '#f2b84b', icon: 'slides', live: true, category: 'Slides' },
  { id: 'probability-lab', name: 'Probability Lab', shortName: 'Chance', projectType: 'math', description: 'Probability models, sample spaces and outcome notes.', accent: '#6aa8f0', icon: 'math', live: true, category: 'Maths' },
  { id: 'product-spec', name: 'Product Spec', shortName: 'Spec', projectType: 'writing', description: 'Problem, users, requirements and acceptance criteria.', accent: '#b794ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'project-board', name: 'Project Board', shortName: 'Board', projectType: 'board', description: 'Plan work in To do, Doing and Done while keeping project context.', accent: '#8576f5', icon: 'board', live: true, category: 'Boards & Planning' },
  { id: 'prompt-lab', name: 'Prompt Lab', shortName: 'Prompts', projectType: 'doc', description: 'Draft, version and evaluate useful prompt designs.', accent: '#9a88ff', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'proposal-writer', name: 'Proposal Writer', shortName: 'Proposals', projectType: 'writing', description: 'Write clear briefs, scopes, risks and recommended next steps.', accent: '#a9a0ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'quiz-builder', name: 'Quiz Builder', shortName: 'Quiz', projectType: 'survey', description: 'Build quizzes with short, long and choice items.', accent: '#ff9b6a', icon: 'survey', live: true, category: 'Forms & Research' },
  { id: 'reader', name: 'Reader & Book Creator', shortName: 'Reader', projectType: 'book', description: 'Chapters, progress, bookmarks, notes, vocabulary and contextual Helios.', accent: '#f2b84b', icon: 'book', live: true, category: 'Reading & Books' },
  { id: 'reading-response', name: 'Reading Response', shortName: 'Response', projectType: 'writing', description: 'Respond to passages with evidence, interpretation and questions.', accent: '#c9a0ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'recipe-book', name: 'Recipe Book', shortName: 'Cook', projectType: 'doc', description: 'Ingredients, steps, tests and tasting notes.', accent: '#f2b84b', icon: 'cooking', live: true, category: 'Docs & Writing' },
  { id: 'recipe-scaler', name: 'Recipe Scaler', shortName: 'Recipes', projectType: 'spreadsheet', description: 'Scale ingredients, servings and prep quantities.', accent: '#f2b84b', icon: 'sheet', live: true, category: 'Sheets & Data' },
  { id: 'reflection-log', name: 'Reflection Log', shortName: 'Reflect', projectType: 'doc', description: 'What happened, what you learned, what next.', accent: '#7ec8ff', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'release-notes', name: 'Release Notes', shortName: 'Release', projectType: 'writing', description: 'Ship updates with highlights, fixes and known issues.', accent: '#4fc3f7', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'research-board', name: 'Research Board', shortName: 'Research', projectType: 'board', description: 'Organise sources, insights and open questions.', accent: '#8576f5', icon: 'board', live: true, category: 'Boards & Planning' },
  { id: 'research-paper', name: 'Research Paper', shortName: 'Paper', projectType: 'writing', description: 'Abstract, literature, method, results and discussion sections.', accent: '#9bb6ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'robotics-log', name: 'Robotics Log', shortName: 'Robots', projectType: 'notebook', description: 'Build notes, code checks, sensor tests and fixes.', accent: '#4fc3f7', icon: 'robotics', live: true, category: 'Science & Labs' },
  { id: 'run-plan', name: 'Run Plan', shortName: 'Runs', projectType: 'spreadsheet', description: 'Distance, pace, recovery and weekly load.', accent: '#6ed69a', icon: 'running', live: true, category: 'Sheets & Data' },
  { id: 'science-fair', name: 'Science Fair Project', shortName: 'Fair', projectType: 'notebook', description: 'Board-ready plan from question through results.', accent: '#4fc3f7', icon: 'flask', live: true, category: 'Science & Labs' },
  { id: 'science-poster', name: 'Science Poster', shortName: 'Poster', projectType: 'presentation', description: 'Hypothesis, method, results and conclusions on slides.', accent: '#6ed69a', icon: 'slides', live: true, category: 'Slides' },
  { id: 'script-writer', name: 'Script Writer', shortName: 'Scripts', projectType: 'writing', description: 'Scenes, dialogue and stage directions for stories or film.', accent: '#d6a3ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'songwriting', name: 'Songwriting Pad', shortName: 'Songs', projectType: 'writing', description: 'Lyrics, structure and arrangement ideas.', accent: '#c3a4ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'sound-design-notes', name: 'Sound Design Notes', shortName: 'Sound', projectType: 'doc', description: 'Cues, textures and timing notes for audio work.', accent: '#b794ff', icon: 'music', live: true, category: 'Docs & Writing' },
  { id: 'source-analysis', name: 'Source Analysis', shortName: 'Sources', projectType: 'writing', description: 'Evaluate provenance, bias and usefulness of sources.', accent: '#c99a68', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'sports-playbook', name: 'Sports Playbook', shortName: 'Plays', projectType: 'doc', description: 'Drills, formations and session plans.', accent: '#ff9b6a', icon: 'basketball', live: true, category: 'Docs & Writing' },
  { id: 'spreadsheet', name: 'Spreadsheet', shortName: 'Sheets', projectType: 'spreadsheet', description: 'Editable cells, formulas, tables, charts and data analysis.', accent: '#6ed69a', icon: 'sheet', live: true, category: 'Sheets & Data' },
  { id: 'sprint-board', name: 'Sprint Board', shortName: 'Sprint', projectType: 'board', description: 'Plan sprints with backlog, doing and review columns.', accent: '#8576f5', icon: 'board', live: true, category: 'Boards & Planning' },
  { id: 'stats-lab', name: 'Statistics Lab', shortName: 'Stats', projectType: 'spreadsheet', description: 'Descriptive stats, tables and simple analytical charts.', accent: '#4fc3a1', icon: 'chart', live: true, category: 'Sheets & Data' },
  { id: 'storyboard', name: 'Storyboard', shortName: 'Boards', projectType: 'drawing', description: 'Sequence visual moments for film, games or comics.', accent: '#ff9b6a', icon: 'comic', live: true, category: 'Comics & Story' },
  { id: 'study-guide', name: 'Study Guide Maker', shortName: 'Study', projectType: 'doc', description: 'Summaries, key terms, practice prompts and revision tracks.', accent: '#79c7f0', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'survey', name: 'Survey Builder', shortName: 'Survey', projectType: 'survey', description: 'Build questions, options and response-ready research forms.', accent: '#ff9b6a', icon: 'survey', live: true, category: 'Forms & Research' },
  { id: 'swot-board', name: 'SWOT Board', shortName: 'SWOT', projectType: 'board', description: 'Strengths, weaknesses, opportunities and threats.', accent: '#f2b84b', icon: 'board', live: true, category: 'Boards & Planning' },
  { id: 'training-log', name: 'Training Log', shortName: 'Training', projectType: 'spreadsheet', description: 'Sessions, metrics, load and recovery notes for practice.', accent: '#48b89a', icon: 'sheet', live: true, category: 'Sheets & Data' },
  { id: 'translation-pad', name: 'Translation Pad', shortName: 'Translate', projectType: 'writing', description: 'Source text, translation and revision notes.', accent: '#c3a4ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'travel-planner', name: 'Travel Planner', shortName: 'Travel', projectType: 'doc', description: 'Itinerary, budget notes and packing checklists.', accent: '#6ed69a', icon: 'travel', live: true, category: 'Docs & Writing' },
  { id: 'typography-lab', name: 'Typography Lab', shortName: 'Type', projectType: 'design', description: 'Practice hierarchy, spacing and type pairings.', accent: '#b794ff', icon: 'design', live: true, category: 'Art & Design' },
  { id: 'ui-wireframe', name: 'UI Wireframe', shortName: 'Wire', projectType: 'design', description: 'Sketch screens, flows and interface hierarchy.', accent: '#a88dff', icon: 'whiteboard', live: true, category: 'Art & Design' },
  { id: 'unit-converter', name: 'Unit Converter Notes', shortName: 'Units', projectType: 'math', description: 'Record conversions, formulas and worked examples.', accent: '#79b5ff', icon: 'math', live: true, category: 'Maths' },
  { id: 'ux-map', name: 'UX Journey Map', shortName: 'UX Map', projectType: 'design', description: 'Map user steps, pain points and opportunities.', accent: '#9b7dff', icon: 'whiteboard', live: true, category: 'Art & Design' },
  { id: 'vocab-builder', name: 'Vocabulary Builder', shortName: 'Vocab', projectType: 'doc', description: 'Words, meanings, examples and practice sentences.', accent: '#b794ff', icon: 'languages', live: true, category: 'Docs & Writing' },
  { id: 'web-code', name: 'Web Code Editor', shortName: 'Code', projectType: 'code', description: 'Files, tabs, Monaco editing, live preview, terminal and shareable versions.', accent: '#4fc3f7', icon: 'code', live: true, category: 'Code & Build' },
  { id: 'web-prototype', name: 'Web Prototype', shortName: 'Web', projectType: 'code', description: 'HTML/CSS/JS prototypes for product experiments.', accent: '#4fc3f7', icon: 'code', live: true, category: 'Code & Build' },
  { id: 'whiteboard', name: 'Whiteboard', shortName: 'Whiteboard', projectType: 'design', description: 'Sketch ideas, arrange notes and explain thinking together.', accent: '#b794ff', icon: 'whiteboard', live: true, category: 'Art & Design' },
  { id: 'word-docs', name: 'Word Documents', shortName: 'Word', projectType: 'writing', description: 'Create polished documents with headings, lists, tables and citations.', accent: '#8ea2ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'writing', name: 'Writing Studio', shortName: 'Writing', projectType: 'writing', description: 'A focused Word-style editor for essays, stories, scripts and research.', accent: '#b794ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'zine-maker', name: 'Zine Maker', shortName: 'Zines', projectType: 'drawing', description: 'Small-format page layouts for personal publications.', accent: '#ff9b6a', icon: 'comic', live: true, category: 'Comics & Story' },
  { id: 'lesson-planner', name: 'Lesson Planner', shortName: 'Lessons', projectType: 'doc', description: 'Objectives, activities, materials and assessment checkpoints.', accent: '#8fd0ff', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'meeting-notes', name: 'Meeting Notes', shortName: 'Meetings', projectType: 'doc', description: 'Capture agenda, decisions, owners and follow-up actions.', accent: '#6fb8e8', icon: 'notes', live: true, category: 'Docs & Writing' },
  { id: 'report-writer', name: 'Report Writer', shortName: 'Reports', projectType: 'writing', description: 'Structure findings, evidence, recommendations and appendices.', accent: '#8ea8ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'resume-builder', name: 'Resume Builder', shortName: 'Resume', projectType: 'writing', description: 'Profile, experience, skills and project highlights in one doc.', accent: '#b0b7ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'letter-writer', name: 'Letter Writer', shortName: 'Letters', projectType: 'writing', description: 'Formal and personal letters with salutations and sign-off.', accent: '#c0b5ff', icon: 'writing', live: true, category: 'Docs & Writing' },
  { id: 'blog-draft', name: 'Blog Draft', shortName: 'Blog', projectType: 'writing', description: 'Headline, lead, sections and publish-ready draft structure.', accent: '#d1a8ff', icon: 'writing', live: true, category: 'Docs & Writing' },
]

export const SUBJECTS: SpaceDefinition[] = [
  { id: 'coding', name: 'Coding', kind: 'subject', description: 'Build, run, explain and share software projects.', accent: '#4fc3f7', icon: 'code', miniApps: ['web-code', 'web-prototype', 'api-playground', 'algorithm-lab', 'project-board', 'bug-tracker', 'whiteboard', 'documentation', 'architecture-notes', 'release-notes', 'product-spec', 'sprint-board'], prompts: ['Review this code', 'Find a bug', 'Plan the next feature'] },
  { id: 'english', name: 'English', kind: 'subject', description: 'Write, revise, read and publish language work.', accent: '#b794ff', icon: 'writing', miniApps: ['writing', 'word-docs', 'essay-studio', 'reader', 'book-creator', 'poetry-studio', 'script-writer', 'presentation', 'outline-builder', 'reading-response', 'glossary-builder', 'flashcard-maker'], prompts: ['Improve this passage', 'Give paragraph feedback', 'Plan the next chapter'] },
  { id: 'maths', name: 'Maths', kind: 'subject', description: 'Explore problems, formulas, graphs and evidence.', accent: '#68b7ff', icon: 'math', miniApps: ['math-lab', 'algebra-lab', 'geometry-studio', 'calculus-lab', 'probability-lab', 'spreadsheet', 'stats-lab', 'whiteboard', 'formula-sheet', 'unit-converter', 'data-visualization', 'study-guide'], prompts: ['Explain this working', 'Check the formula', 'Show another method'] },
  { id: 'science', name: 'Science', kind: 'subject', description: 'Record experiments, analyse data and communicate findings.', accent: '#6ed69a', icon: 'flask', miniApps: ['lab-notebook', 'lab-report', 'hypothesis-builder', 'experiment-tracker', 'chemistry-lab', 'biology-lab', 'physics-lab', 'data-visualization', 'spreadsheet', 'survey', 'science-poster', 'science-fair', 'observation-journal', 'lab-safety'], prompts: ['Review the method', 'Analyse these results', 'Find weaknesses'] },
  { id: 'art', name: 'Art', kind: 'subject', description: 'Draw, storyboard, make comics and develop visual work.', accent: '#ff7eb6', icon: 'palette', miniApps: ['drawing', 'comic-studio', 'comic-maker', 'manga-studio', 'storyboard', 'character-design', 'concept-art', 'illustration', 'whiteboard', 'portfolio-builder', 'color-study', 'zine-maker', 'graphic-novel', 'critique-sheet'], prompts: ['Critique the composition', 'Suggest the next panel', 'Develop this visual story'] },
  { id: 'business', name: 'Business', kind: 'subject', description: 'Research markets, plan ventures and present decisions.', accent: '#f2b84b', icon: 'business', miniApps: ['business-planner', 'business-model', 'pitch-deck', 'spreadsheet', 'budget-sheet', 'market-research', 'survey', 'customer-interviews', 'project-board', 'presentation', 'okrs', 'decision-matrix', 'swot-board', 'proposal-writer'], prompts: ['Stress-test this idea', 'Summarize customer feedback', 'Plan the next milestone'] },
  { id: 'ai', name: 'AI', kind: 'subject', description: 'Understand models and build responsible AI projects.', accent: '#8576f5', icon: 'sparkles', miniApps: ['web-code', 'prompt-lab', 'ai-eval-notebook', 'ml-notebook-doc', 'data-visualization', 'lab-notebook', 'writing', 'product-spec', 'survey', 'whiteboard', 'project-board', 'documentation'], prompts: ['Explain this model', 'Check risks', 'Design an evaluation'] },
  { id: 'languages', name: 'Languages', kind: 'subject', description: 'Practise vocabulary, reading and written expression.', accent: '#b794ff', icon: 'languages', miniApps: ['writing', 'translation-pad', 'vocab-builder', 'reader', 'flashcard-maker', 'glossary-builder', 'notes', 'presentation', 'study-guide', 'reading-response', 'quiz-builder', 'journal'], prompts: ['Explain this phrase', 'Correct my writing', 'Make vocabulary notes'] },
  { id: 'history', name: 'History', kind: 'subject', description: 'Build arguments from sources, timelines and context.', accent: '#d7a86e', icon: 'history', miniApps: ['writing', 'source-analysis', 'history-timeline', 'reader', 'presentation', 'debate-prep', 'whiteboard', 'research-paper', 'citation-manager', 'outline-builder', 'notes', 'research-board'], prompts: ['Compare these sources', 'Challenge this argument', 'Build a timeline'] },
  { id: 'geography', name: 'Geography', kind: 'subject', description: 'Study places, systems, fieldwork and evidence.', accent: '#6ed69a', icon: 'geography', miniApps: ['map-notes', 'fieldwork-log', 'spreadsheet', 'data-visualization', 'presentation', 'lab-notebook', 'earth-science', 'survey', 'writing', 'whiteboard', 'travel-planner', 'observation-journal'], prompts: ['Analyse this fieldwork', 'Explain the pattern', 'Improve the report'] },
  { id: 'engineering', name: 'Engineering', kind: 'subject', description: 'Design, calculate, test and document working systems.', accent: '#68b7ff', icon: 'engineering', miniApps: ['engineering-notebook', 'web-code', 'math-lab', 'circuit-lab', 'lab-notebook', 'project-board', 'whiteboard', 'data-visualization', 'algorithm-lab', 'product-spec', 'bug-tracker', 'presentation'], prompts: ['Check this design', 'Find failure modes', 'Plan the test'] },
  { id: 'design', name: 'Design', kind: 'subject', description: 'Research, prototype and communicate useful experiences.', accent: '#ff9b6a', icon: 'design', miniApps: ['whiteboard', 'ui-wireframe', 'ux-map', 'drawing', 'moodboard', 'poster-design', 'presentation', 'survey', 'project-board', 'typography-lab', 'critique-sheet', 'portfolio-builder'], prompts: ['Critique the flow', 'Improve accessibility', 'Plan user research'] },
]

export const HOBBIES: SpaceDefinition[] = [
  { id: 'basketball', name: 'Basketball', kind: 'hobby', description: 'Practise skills, track sessions and share useful progress.', accent: '#ff9b6a', icon: 'basketball', miniApps: ['sports-playbook', 'training-log', 'spreadsheet', 'notes', 'presentation', 'project-board', 'practice-routine', 'goal-tracker', 'checklist', 'reflection-log'], prompts: ['Plan a practice', 'Review this session', 'Suggest one drill'] },
  { id: 'running', name: 'Running', kind: 'hobby', description: 'Record runs, training patterns and meaningful milestones.', accent: '#6ed69a', icon: 'running', miniApps: ['run-plan', 'training-log', 'spreadsheet', 'data-visualization', 'notes', 'goal-tracker', 'habit-tracker-sheet', 'reflection-log', 'presentation', 'checklist'], prompts: ['Review my training', 'Explain this pace', 'Plan recovery'] },
  { id: 'reading', name: 'Reading', kind: 'hobby', description: 'Read deeply, keep notes and share finished books.', accent: '#f2b84b', icon: 'book', miniApps: ['reader', 'book-creator', 'reading-response', 'notes', 'writing', 'journal', 'glossary-builder', 'citation-manager', 'flashcard-maker', 'outline-builder'], prompts: ['Summarize my notes', 'Explain this passage', 'Suggest a reflection'] },
  { id: 'music', name: 'Music', kind: 'hobby', description: 'Plan practice, write ideas and document performances.', accent: '#b794ff', icon: 'music', miniApps: ['music-practice', 'songwriting', 'notes', 'project-board', 'presentation', 'practice-routine', 'sound-design-notes', 'reflection-log', 'checklist', 'writing'], prompts: ['Plan a practice', 'Develop this lyric', 'Give arrangement ideas'] },
  { id: 'photography', name: 'Photography', kind: 'hobby', description: 'Plan shoots, review images and develop visual stories.', accent: '#68b7ff', icon: 'camera', miniApps: ['photo-shotlist', 'photo-critique', 'whiteboard', 'presentation', 'notes', 'moodboard', 'portfolio-builder', 'storyboard', 'project-board', 'critique-sheet'], prompts: ['Critique this concept', 'Plan the shot list', 'Improve the story'] },
  { id: 'gaming', name: 'Gaming', kind: 'hobby', description: 'Build, analyse and share meaningful game work.', accent: '#8576f5', icon: 'gaming', miniApps: ['game-prototype', 'web-code', 'game-strategy', 'project-board', 'notes', 'storyboard', 'character-design', 'bug-tracker', 'whiteboard', 'presentation'], prompts: ['Plan this build', 'Explain the mechanic', 'Review the strategy'] },
  { id: 'cooking', name: 'Cooking', kind: 'hobby', description: 'Develop recipes, record tests and share finished dishes.', accent: '#f2b84b', icon: 'cooking', miniApps: ['recipe-book', 'recipe-scaler', 'notes', 'spreadsheet', 'presentation', 'checklist', 'nutrition-log', 'project-board', 'survey', 'reflection-log'], prompts: ['Improve this recipe', 'Scale the ingredients', 'Plan the next test'] },
  { id: 'robotics', name: 'Robotics', kind: 'hobby', description: 'Code, test and document physical builds.', accent: '#4fc3f7', icon: 'robotics', miniApps: ['robotics-log', 'web-code', 'lab-notebook', 'math-lab', 'project-board', 'engineering-notebook', 'circuit-lab', 'bug-tracker', 'data-visualization', 'presentation'], prompts: ['Debug this behaviour', 'Plan the test', 'Check the wiring logic'] },
  { id: 'travel', name: 'Travel', kind: 'hobby', description: 'Research, plan and document meaningful journeys.', accent: '#6ed69a', icon: 'travel', miniApps: ['travel-planner', 'notes', 'spreadsheet', 'budget-sheet', 'presentation', 'reader', 'checklist', 'map-notes', 'journal', 'project-board'], prompts: ['Build an itinerary', 'Check the budget', 'Summarize the research'] },
]

export const ALL_SPACES = [...SUBJECTS, ...HOBBIES]
export const DEFAULT_SPACE_ID = 'coding'

export function getSpaceDefinition(id: string): SpaceDefinition {
  return ALL_SPACES.find(space => space.id === id) ?? {
    id,
    name: id.replace(/^custom-/, '').replace(/-/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
    kind: 'hobby',
    description: 'A personal Space for projects, progress and people around this interest.',
    accent: '#8576f5',
    icon: 'sparkles',
    miniApps: ['notes', 'project-board', 'whiteboard', 'writing', 'spreadsheet'],
    prompts: ['Plan the next step', 'Summarize progress', 'Give me ideas'],
  }
}

export function getMiniApp(id: string) {
  return MINI_APP_CATALOG.find(app => app.id === id) ?? MINI_APP_CATALOG[0]
}

export function listMiniAppsByCategory() {
  const groups = new Map<string, MiniAppDefinition[]>()
  for (const app of MINI_APP_CATALOG) {
    const list = groups.get(app.category) ?? []
    list.push(app)
    groups.set(app.category, list)
  }
  return [...groups.entries()].map(([category, apps]) => ({ category, apps }))
}

