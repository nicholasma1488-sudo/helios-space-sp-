import type { MiniAppCategoryId, MiniAppDefinition, MiniAppId } from './types'

export const MINI_APP_CATEGORIES: Array<{ id: MiniAppCategoryId; label: string }> = [
  { id: 'tools', label: 'Tools' },
  { id: 'study', label: 'Study' },
  { id: 'create', label: 'Create' },
  { id: 'focus', label: 'Focus' },
  { id: 'projects', label: 'Projects' },
]

export const UTILITY_MINI_APPS: MiniAppDefinition[] = [
  { id: 'calculator', name: 'Calculator', description: 'Scientific calculator with keyboard support and history.', category: 'tools', categoryLabel: 'Tools', accent: '#68b7ff', icon: 'calculator', heavy: false, keywords: ['math', 'scientific', 'numbers'] },
  { id: 'converter', name: 'Unit Converter', description: 'Convert length, mass, temperature, time, area and volume.', category: 'tools', categoryLabel: 'Tools', accent: '#79b5ff', icon: 'converter', heavy: false, keywords: ['units', 'metric', 'temperature'] },
  { id: 'notes', name: 'Notes', description: 'Create, edit, search and autosave notes inside Helios.', category: 'study', categoryLabel: 'Study', accent: '#4fc3f7', icon: 'notes', heavy: false, keywords: ['write', 'capture', 'memo'] },
  { id: 'todo', name: 'To-Do', description: 'Tasks with priority, due dates and filters.', category: 'focus', categoryLabel: 'Focus', accent: '#8576f5', icon: 'todo', heavy: false, keywords: ['tasks', 'checklist', 'plan'] },
  { id: 'timer', name: 'Timer', description: 'Countdown, stopwatch and useful presets.', category: 'focus', categoryLabel: 'Focus', accent: '#f2b84b', icon: 'timer', heavy: false, keywords: ['countdown', 'stopwatch'] },
  { id: 'pomodoro', name: 'Pomodoro', description: 'Focus and break sessions with a session counter.', category: 'focus', categoryLabel: 'Focus', accent: '#ff9b6a', icon: 'pomodoro', heavy: false, keywords: ['focus', 'study', 'break'] },
  { id: 'playground', name: 'Code Playground', description: 'Edit, run and save HTML, CSS and JavaScript sketches.', category: 'create', categoryLabel: 'Create', accent: '#4fc3f7', icon: 'code', heavy: true, keywords: ['code', 'html', 'javascript'] },
  { id: 'markdown', name: 'Markdown Editor', description: 'Write markdown with a live preview and save.', category: 'create', categoryLabel: 'Create', accent: '#b794ff', icon: 'markdown', heavy: true, keywords: ['md', 'docs', 'preview'] },
  { id: 'whiteboard', name: 'Whiteboard', description: 'Draw, type, place shapes, undo and clear.', category: 'create', categoryLabel: 'Create', accent: '#ff7eb6', icon: 'whiteboard', heavy: true, keywords: ['draw', 'sketch', 'shapes'] },
  { id: 'flashcards', name: 'Flashcards', description: 'Decks, cards, study mode and progress.', category: 'study', categoryLabel: 'Study', accent: '#74c0e8', icon: 'cards', heavy: true, keywords: ['revise', 'vocab', 'memory'] },
  { id: 'planner', name: 'Study Planner', description: 'Subjects, assignments, deadlines and progress.', category: 'study', categoryLabel: 'Study', accent: '#8fd0ff', icon: 'planner', heavy: false, keywords: ['homework', 'deadline', 'subject'] },
  { id: 'worldclock', name: 'World Clock', description: 'Keep several cities and timezones in view.', category: 'tools', categoryLabel: 'Tools', accent: '#6ed69a', icon: 'clock', heavy: false, keywords: ['timezone', 'cities'] },
  { id: 'json', name: 'JSON Formatter', description: 'Format, validate, minify and copy JSON.', category: 'tools', categoryLabel: 'Tools', accent: '#5ad0d4', icon: 'json', heavy: false, keywords: ['format', 'validate', 'minify'] },
  { id: 'color', name: 'Color Tool', description: 'Picker, HEX, RGB, HSL and palette generation.', category: 'create', categoryLabel: 'Create', accent: '#ff7eb6', icon: 'color', heavy: false, keywords: ['hex', 'rgb', 'palette'] },
  { id: 'project-hub', name: 'Project Workspace', description: 'Name, description, tasks, progress and collaborators.', category: 'projects', categoryLabel: 'Projects', accent: '#8576f5', icon: 'project', heavy: true, keywords: ['workspace', 'collaborate', 'progress'] },
  { id: 'habits', name: 'Habit Pulse', description: 'Small daily signals that stay visible over time.', category: 'focus', categoryLabel: 'Focus', accent: '#6ed69a', icon: 'habits', heavy: false, keywords: ['streak', 'daily'] },
  { id: 'decision', name: 'Decision Flip', description: 'Choose between good options without the spiral.', category: 'tools', categoryLabel: 'Tools', accent: '#f2b84b', icon: 'decision', heavy: false, keywords: ['choose', 'random'] },
]

export const LEARNING_SUBJECTS: Array<{
  id: string
  name: string
  description: string
  accent: string
  spaceId: string
  apps: MiniAppId[]
}> = [
  { id: 'math', name: 'Math', description: 'Calculate, convert and sketch the working.', accent: '#68b7ff', spaceId: 'maths', apps: ['calculator', 'converter', 'whiteboard', 'notes'] },
  { id: 'coding', name: 'Coding', description: 'Write, format and document software.', accent: '#4fc3f7', spaceId: 'coding', apps: ['playground', 'json', 'markdown', 'todo'] },
  { id: 'languages', name: 'Languages', description: 'Build vocabulary and keep study notes.', accent: '#b794ff', spaceId: 'languages', apps: ['flashcards', 'notes', 'markdown'] },
  { id: 'science', name: 'Science', description: 'Plan experiments and capture observations.', accent: '#6ed69a', spaceId: 'science', apps: ['planner', 'whiteboard', 'notes', 'converter'] },
  { id: 'general', name: 'General Learning', description: 'Focus, plan and keep the work moving.', accent: '#f2b84b', spaceId: 'english', apps: ['pomodoro', 'timer', 'planner', 'todo', 'project-hub'] },
]

export function getUtilityMiniApp(id: string): MiniAppDefinition | undefined {
  return UTILITY_MINI_APPS.find(app => app.id === id)
}

export function filterUtilityMiniApps(query: string, category: MiniAppCategoryId | 'all' = 'all') {
  const needle = query.trim().toLowerCase()
  return UTILITY_MINI_APPS.filter(app => {
    const matchesCategory = category === 'all' || app.category === category
    if (!matchesCategory) return false
    if (!needle) return true
    return (
      app.name.toLowerCase().includes(needle)
      || app.description.toLowerCase().includes(needle)
      || app.categoryLabel.toLowerCase().includes(needle)
      || app.keywords.some(keyword => keyword.includes(needle))
    )
  })
}
