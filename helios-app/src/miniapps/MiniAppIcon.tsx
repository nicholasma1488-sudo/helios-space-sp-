import type { ReactNode } from 'react'
import {
  Calculator, Clock3, Code2, FileJson, FolderGit2, Highlighter,
  Languages, Palette, PenLine, Shuffle, StickyNote, Sun,
  TimerReset, ListTodo, Activity, Ruler,
} from 'lucide-react'

const ICONS: Record<string, ReactNode> = {
  calculator: <Calculator size={20} />,
  converter: <Ruler size={20} />,
  notes: <StickyNote size={20} />,
  todo: <ListTodo size={20} />,
  timer: <Clock3 size={20} />,
  pomodoro: <TimerReset size={20} />,
  code: <Code2 size={20} />,
  markdown: <Highlighter size={20} />,
  whiteboard: <PenLine size={20} />,
  cards: <Languages size={20} />,
  planner: <Sun size={20} />,
  clock: <Clock3 size={20} />,
  json: <FileJson size={20} />,
  color: <Palette size={20} />,
  project: <FolderGit2 size={20} />,
  habits: <Activity size={20} />,
  decision: <Shuffle size={20} />,
}

export function MiniAppIcon({ name }: { name: string }) {
  return <>{ICONS[name] ?? <StickyNote size={20} />}</>
}
