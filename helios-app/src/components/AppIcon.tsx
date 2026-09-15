import {
  BookOpen, CalendarDays, CheckSquare, ClipboardList, Code2, FileText,
  Grid3X3, LayoutTemplate, ListTodo, Mail, PenLine, Presentation, Sheet, StickyNote,
} from 'lucide-react'
import type { SuiteApp } from '../product/miniApps'

export function AppIcon({ icon, size = 22 }: { icon: SuiteApp['icon']; size?: number }) {
  const props = { size }
  switch (icon) {
    case 'write': return <FileText {...props} />
    case 'sheet': return <Sheet {...props} />
    case 'notes': return <BookOpen {...props} />
    case 'tasks': return <CheckSquare {...props} />
    case 'code': return <Code2 {...props} />
    case 'slides': return <Presentation {...props} />
    case 'board': return <LayoutTemplate {...props} />
    case 'mail': return <Mail {...props} />
    case 'calendar': return <CalendarDays {...props} />
    case 'draw': return <PenLine {...props} />
    case 'read': return <BookOpen {...props} />
    case 'plan': return <ClipboardList {...props} />
    case 'list': return <ListTodo {...props} />
    case 'loop': return <StickyNote {...props} />
    default: return <Grid3X3 {...props} />
  }
}
