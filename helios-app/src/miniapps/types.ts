export type MiniAppId =
  | 'calculator'
  | 'converter'
  | 'notes'
  | 'todo'
  | 'timer'
  | 'pomodoro'
  | 'playground'
  | 'markdown'
  | 'whiteboard'
  | 'flashcards'
  | 'planner'
  | 'worldclock'
  | 'json'
  | 'color'
  | 'project-hub'
  | 'habits'
  | 'decision'

export type MiniAppCategoryId =
  | 'tools'
  | 'study'
  | 'create'
  | 'focus'
  | 'projects'

export interface MiniAppDefinition {
  id: MiniAppId
  name: string
  description: string
  category: MiniAppCategoryId
  categoryLabel: string
  accent: string
  icon: string
  heavy: boolean
  keywords: string[]
}

export interface MiniAppProps {
  accountId: number
  onToast: (message: string, tone?: 'success' | 'info' | 'warning') => void
  onOpenProject: (projectId: number) => void
  onCreateProject: () => void
}
