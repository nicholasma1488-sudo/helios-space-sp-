import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent, type LazyExoticComponent } from 'react'
import { Grid3X3, Sparkles } from 'lucide-react'
import { NewProjectModal } from '../components/NewProjectModal'
import { useApp } from '../store/appStore'
import { filterUtilityMiniApps, getUtilityMiniApp, UTILITY_MINI_APPS } from './catalog'
import { consumeOpenMiniApp } from './launch'
import { MiniAppCategory } from './MiniAppCategory'
import { MiniAppErrorBoundary } from './MiniAppErrorBoundary'
import { MiniAppFavorites } from './MiniAppFavorites'
import { MiniAppGrid } from './MiniAppGrid'
import { MiniAppRecent } from './MiniAppRecent'
import { MiniAppSearch } from './MiniAppSearch'
import { MiniAppShell } from './MiniAppShell'
import { MiniAppLoading } from './MiniAppStates'
import { useAccountState } from './persistence'
import type { MiniAppCategoryId, MiniAppId, MiniAppProps } from './types'

const APP_LOADERS: Record<MiniAppId, () => Promise<{ default: ComponentType<MiniAppProps> }>> = {
  calculator: () => import('./apps/CalculatorApp'),
  converter: () => import('./apps/UnitConverterApp'),
  notes: () => import('./apps/NotesApp'),
  todo: () => import('./apps/TodoApp'),
  timer: () => import('./apps/TimerApp'),
  pomodoro: () => import('./apps/PomodoroApp'),
  playground: () => import('./apps/CodePlaygroundApp'),
  markdown: () => import('./apps/MarkdownEditorApp'),
  whiteboard: () => import('./apps/WhiteboardApp'),
  flashcards: () => import('./apps/FlashcardsApp'),
  planner: () => import('./apps/StudyPlannerApp'),
  worldclock: () => import('./apps/WorldClockApp'),
  json: () => import('./apps/JsonFormatterApp'),
  color: () => import('./apps/ColorToolApp'),
  'project-hub': () => import('./apps/ProjectHubApp'),
  habits: () => import('./apps/HabitsApp'),
  decision: () => import('./apps/DecisionApp'),
}

const LazyApps = Object.fromEntries(
  Object.entries(APP_LOADERS).map(([id, loader]) => [id, lazy(loader)]),
) as Record<MiniAppId, LazyExoticComponent<ComponentType<MiniAppProps>>>

export function MiniAppLauncher() {
  const { state, dispatch } = useApp()
  const accountId = state.user?.id ?? 0
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<MiniAppCategoryId | 'all'>('all')
  const [activeApp, setActiveApp] = useState<MiniAppId | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [fullscreen, setFullscreen] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [favorites, setFavorites] = useAccountState<MiniAppId[]>(accountId, 'favorites', ['pomodoro', 'notes'])
  const [recent, setRecent] = useAccountState<MiniAppId[]>(accountId, 'recent', [])
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => filterUtilityMiniApps(query, category), [query, category])
  const counts = useMemo(() => {
    const next: Record<string, number> = { all: UTILITY_MINI_APPS.length }
    for (const app of UTILITY_MINI_APPS) next[app.category] = (next[app.category] ?? 0) + 1
    return next
  }, [])

  useEffect(() => {
    const requested = consumeOpenMiniApp()
    if (requested && getUtilityMiniApp(requested)) openApp(requested)
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, category])

  useEffect(() => {
    if (!activeApp) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeApp()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeApp])

  function openApp(id: MiniAppId) {
    setActiveApp(id)
    setFullscreen(false)
    setRecent(current => [id, ...current.filter(item => item !== id)].slice(0, 8))
  }

  function closeApp() {
    setActiveApp(null)
    setFullscreen(false)
  }

  function toggleFavorite(id: MiniAppId) {
    setFavorites(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  function handleGridKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!filtered.length) return
    const columns = window.innerWidth >= 1100 ? 4 : window.innerWidth >= 780 ? 3 : window.innerWidth >= 560 ? 2 : 1
    let next = selectedIndex
    if (event.key === 'ArrowRight') next = Math.min(filtered.length - 1, selectedIndex + 1)
    else if (event.key === 'ArrowLeft') next = Math.max(0, selectedIndex - 1)
    else if (event.key === 'ArrowDown') next = Math.min(filtered.length - 1, selectedIndex + columns)
    else if (event.key === 'ArrowUp') next = Math.max(0, selectedIndex - columns)
    else if (event.key === 'Enter') {
      event.preventDefault()
      openApp(filtered[selectedIndex].id)
      return
    } else {
      return
    }
    event.preventDefault()
    setSelectedIndex(next)
  }

  const definition = activeApp ? getUtilityMiniApp(activeApp) : undefined
  const Active = activeApp ? LazyApps[activeApp] : null
  const appProps: MiniAppProps = {
    accountId,
    onToast: (message, tone = 'info') => dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message, tone } }),
    onOpenProject: projectId => dispatch({ type: 'OPEN_CODE_EDITOR', projectId }),
    onCreateProject: () => setShowNewProject(true),
  }

  return (
    <div className="mini-apps-view">
      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} />}
      <header className="mini-apps-header">
        <div>
          <div className="mini-apps-kicker"><Sparkles size={13} /> HELIOS MINI APPS</div>
          <h1>Native tools for the work in front of you.</h1>
          <p>Open a focused app without leaving Helios Space. Heavier tools load only when you launch them.</p>
        </div>
        <MiniAppSearch value={query} onChange={setQuery} inputRef={searchRef} />
      </header>

      <div className="mini-apps-scroll">
        <MiniAppCategory value={category} counts={counts} onChange={setCategory} />
        {!query && category === 'all' && <MiniAppFavorites ids={favorites} onOpen={openApp} />}
        {!query && category === 'all' && <MiniAppRecent ids={recent} onOpen={openApp} />}

        <section className="mini-app-section" aria-labelledby="all-apps-title">
          <div className="mini-app-section-title">
            <h2 id="all-apps-title">{query ? 'Search results' : 'App shelf'}</h2>
            <span>{filtered.length} available</span>
          </div>
          <div onKeyDown={handleGridKey} tabIndex={0} aria-label="Mini app grid">
            <MiniAppGrid
              apps={filtered}
              favorites={favorites}
              selectedId={filtered[selectedIndex]?.id}
              onOpen={openApp}
              onToggleFavorite={toggleFavorite}
            />
          </div>
        </section>

        <section className="mini-app-promise">
          <div className="mini-app-promise-orbit"><Grid3X3 size={22} /></div>
          <div>
            <span>BUILT INTO YOUR SPACE</span>
            <h2>Useful by default. Quiet when you do not need it.</h2>
          </div>
          <p>Utility apps keep local state per account. Project Workspace uses your real Helios projects.</p>
        </section>
      </div>

      {activeApp && definition && Active && (
        <MiniAppShell
          app={definition}
          favorite={favorites.includes(activeApp)}
          fullscreen={fullscreen}
          onBack={closeApp}
          onMinimize={closeApp}
          onToggleFavorite={() => toggleFavorite(activeApp)}
          onToggleFullscreen={() => setFullscreen(value => !value)}
        >
          <MiniAppErrorBoundary resetKey={activeApp}>
            <Suspense fallback={<MiniAppLoading label={'Loading ' + definition.name} />}>
              <Active {...appProps} />
            </Suspense>
          </MiniAppErrorBoundary>
        </MiniAppShell>
      )}
    </div>
  )
}
