import type { ReactNode } from 'react'
import type { SuiteApp } from '../product/miniApps'
import './SuiteAppIcon.css'

type IconApp = Pick<SuiteApp, 'id' | 'name' | 'color'>

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      {children}
    </svg>
  )
}

const GLYPHS: Record<string, ReactNode> = {
  'word-docs': (
    <Glyph>
      <rect x="5" y="3.5" width="14" height="17" rx="2" fill="currentColor" opacity=".22" />
      <path d="M8 3.5h8a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 9h7M8.5 12.2h7M8.5 15.4h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Glyph>
  ),
  spreadsheet: (
    <Glyph>
      <rect x="4" y="4" width="16" height="16" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 9.2h16M4 14.8h16M9.2 4v16M14.8 4v16" stroke="currentColor" strokeWidth="1.4" />
      <rect x="4" y="4" width="16" height="5.2" rx="2.2" fill="currentColor" opacity=".28" />
    </Glyph>
  ),
  presentation: (
    <Glyph>
      <rect x="3.5" y="5" width="17" height="12" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 17v3.2M8.5 20.2h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 9.2 15 11l-5 1.8V9.2Z" fill="currentColor" />
    </Glyph>
  ),
  notebook: (
    <Glyph>
      <rect x="6" y="3.5" width="13" height="17" rx="1.8" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.8 7h4M4.8 10.5h4M4.8 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10 8.5h6.5M10 12h6.5M10 15.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </Glyph>
  ),
  stocks: (
    <Glyph>
      <path d="M4 16.5 8.2 12l3.2 3.1L20 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 7.5H20V12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 19.5h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Glyph>
  ),
  'essay-studio': (
    <Glyph>
      <path d="M6 4.5h8.5L18 8v11.5H6V4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14.4 4.6V8H18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 12h7M8.5 15h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Glyph>
  ),
  gradebook: (
    <Glyph>
      <rect x="4" y="4.5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 9h16M9 4.5v15" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11.6 12.2 13.2 14l3.2-3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Glyph>
  ),
  'lesson-slides': (
    <Glyph>
      <rect x="6.5" y="4" width="13" height="10" rx="1.6" fill="currentColor" opacity=".22" />
      <rect x="4.5" y="7" width="13" height="10" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.5 11h7M7.5 13.6h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </Glyph>
  ),
  'lab-notebook': (
    <Glyph>
      <path d="M8.2 10.2c0-2.3 1.6-4.2 3.8-4.2s3.8 1.9 3.8 4.2c1.4.4 2.4 1.6 2.4 3.1 0 1.8-1.5 3.2-3.4 3.2H9.2c-1.9 0-3.4-1.4-3.4-3.2 0-1.5 1-2.7 2.4-3.1Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 19.6h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Glyph>
  ),
  'quiz-builder': (
    <Glyph>
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 9.2h8M8 12.6h8M8 16h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="9.2" r=".7" fill="currentColor" />
      <circle cx="8" cy="12.6" r=".7" fill="currentColor" />
    </Glyph>
  ),
  'flashcard-maker': (
    <Glyph>
      <rect x="7" y="5" width="12" height="9" rx="1.6" fill="currentColor" opacity=".22" />
      <rect x="5" y="8.5" width="12" height="9" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.6 12.4h6.8M7.6 15h4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </Glyph>
  ),
  reader: (
    <Glyph>
      <path d="M12 7.2c-1.6-1.4-4-2-6.4-1.2v11c2.5-.7 4.8 0 6.4 1.4 1.6-1.4 3.9-2.1 6.4-1.4v-11c-2.4-.8-4.8-.2-6.4 1.2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 7.4v10.8" stroke="currentColor" strokeWidth="1.5" />
    </Glyph>
  ),
  'math-lab': (
    <Glyph>
      <path d="M5.5 8.5 8 16.5 10.2 11l2 4.2 2.4-7.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.2 14.8h3.6M18 13v3.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </Glyph>
  ),
  'homework-board': (
    <Glyph>
      <rect x="5" y="6" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 6V4.4h6V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8.4 11.2 10.2 13l3.6-3.8M8.4 16.2h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Glyph>
  ),
  'study-guide': (
    <Glyph>
      <path d="M7 19V6.5A2 2 0 0 1 9 4.5h8.5v14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 19c1.6-1.2 3.4-1.2 5 0s3.4 1.2 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.2 9h5M10.2 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </Glyph>
  ),
  documentation: (
    <Glyph>
      <rect x="4.5" y="6.5" width="11" height="13" rx="1.6" fill="currentColor" opacity=".2" />
      <rect x="8" y="4.5" width="11" height="13" rx="1.6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10.4 8.6h6M10.4 11.4h6M10.4 14.2h3.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </Glyph>
  ),
  'budget-sheet': (
    <Glyph>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8.2v7.6M10.2 9.6c.6-.6 1.4-.9 2.2-.8 1.4.1 2.2 1 2.2 2.1 0 2.4-4.8 1.6-4.8 4 0 1.1.9 2 2.4 2.1 1 0 1.8-.3 2.4-.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Glyph>
  ),
  'pitch-deck': (
    <Glyph>
      <rect x="3.8" y="5.2" width="16.4" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 13.2V11m3.2 2.2V9.4m3.2 3.8V8.2m3.2 5V10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8 18.8h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Glyph>
  ),
  'meeting-notes': (
    <Glyph>
      <rect x="5" y="5.5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 4.2v3M16 4.2v3M5 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.4 13.4h3M8.4 16h5.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </Glyph>
  ),
  'proposal-writer': (
    <Glyph>
      <path d="M6.5 4.5h8L18 8.2v11.3H6.5V4.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14.4 4.6v3.6H18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 14.2 10.7 16l3.6-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Glyph>
  ),
  'product-spec': (
    <Glyph>
      <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 8.4h8M8 11.6h8M8 14.8h5.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="16.2" cy="16.4" r="1.3" fill="currentColor" />
    </Glyph>
  ),
  okrs: (
    <Glyph>
      <circle cx="12" cy="12" r="7.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </Glyph>
  ),
  'project-board': (
    <Glyph>
      <rect x="3.8" y="5" width="4.6" height="14" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="9.7" y="5" width="4.6" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="15.6" y="5" width="4.6" height="11.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
    </Glyph>
  ),
  'business-planner': (
    <Glyph>
      <path d="M8 10V8.2A4 4 0 0 1 16 8.2V10" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4.5" y="10" width="15" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 13.6h15" stroke="currentColor" strokeWidth="1.4" />
    </Glyph>
  ),
  'report-writer': (
    <Glyph>
      <path d="M6.2 16.8V11m3.8 5.8V8.4m3.8 8.4V10m3.8 6.8V6.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 19.2h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </Glyph>
  ),
}

function FallbackGlyph({ letter }: { letter: string }) {
  return <span className="suite-app-icon-letter">{letter}</span>
}

export function SuiteAppIcon({
  app,
  size = 48,
  className = '',
}: {
  app: IconApp
  size?: number
  className?: string
}) {
  const glyph = GLYPHS[app.id] ?? <FallbackGlyph letter={app.name.slice(0, 1)} />
  return (
    <span
      className={`suite-app-icon ${className}`.trim()}
      style={{ width: size, height: size, background: app.color, ['--icon-color' as string]: app.color }}
      aria-hidden="true"
    >
      {glyph}
    </span>
  )
}
