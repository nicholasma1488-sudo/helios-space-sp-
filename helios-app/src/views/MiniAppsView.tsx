import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, CalendarDays, CheckSquare, ChevronLeft, ClipboardList, Clock3, Code2, FilePlus2, FileText,
  Grid3X3, LayoutTemplate, ListTodo, Mail, PenLine, Presentation, Search, Sheet, StickyNote, X,
} from 'lucide-react'
import { useApp } from '../store/appStore'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { createSuiteProject, openProjectWorkspace } from '../product/flow'
import {
  editionBlurb,
  editionFor,
  editionLabel,
  nextSuiteFileName,
  spaceForSuiteApp,
  suiteAppsForEdition,
  suiteHomeTitle,
  suiteStarterWorkspace,
  type SuiteApp,
} from '../product/miniApps'
import './MiniAppsView.css'

function relativeTime(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days}d ago`
  return new Date(value).toLocaleDateString()
}

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

type PickerState =
  | null
  | { mode: 'gallery' }
  | { mode: 'app'; app: SuiteApp }

export function MiniAppsView() {
  const { state, dispatch } = useApp()
  const edition = editionFor(state.user?.plan)
  const apps = suiteAppsForEdition(edition)
  const [query, setQuery] = useState('')
  const [picker, setPicker] = useState<PickerState>(null)
  const [creating, setCreating] = useState(false)
  const pickerOpen = Boolean(picker)
  const pickerRef = useFocusTrap<HTMLDivElement>(pickerOpen)

  useEffect(() => {
    if (!pickerOpen) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setPicker(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pickerOpen])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return apps
    return apps.filter(app =>
      [app.name, app.guideName, app.description, app.guideTip]
        .some(value => value.toLowerCase().includes(needle)),
    )
  }, [apps, query])

  const suiteIds = useMemo(() => new Set(apps.map(app => app.id)), [apps])
  const recent = useMemo(
    () => state.projects
      .filter(project => suiteIds.has(project.app_kind))
      .slice()
      .sort((left, right) => +new Date(right.updated_at) - +new Date(left.updated_at))
      .slice(0, 8),
    [state.projects, suiteIds],
  )

  const active = picker?.mode === 'app' ? picker.app : null
  const activeFiles = useMemo(
    () => active
      ? state.projects
        .filter(project => project.app_kind === active.id)
        .slice()
        .sort((left, right) => +new Date(right.updated_at) - +new Date(left.updated_at))
        .slice(0, 8)
      : [],
    [active, state.projects],
  )

  async function openExisting(projectId: number) {
    try {
      await openProjectWorkspace(projectId, state.projects, dispatch)
      setPicker(null)
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' },
      })
    }
  }

  async function createFile() {
    if (!active || creating) return
    setCreating(true)
    try {
      await createSuiteProject({
        name: nextSuiteFileName(active.newName, state.projects, active.id),
        spaceId: spaceForSuiteApp(active),
        type: active.projectType,
        appKind: active.id,
        content: suiteStarterWorkspace(active),
      }, dispatch)
      setPicker(null)
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' },
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="suite-view">
      <header className="suite-top">
        <div>
          <div className="suite-kicker">{editionLabel(edition)}</div>
          <h1>{suiteHomeTitle(edition)}</h1>
          <p>{editionBlurb(edition)}</p>
        </div>
        <label className="suite-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search apps</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search Docs / Sheets / Code…"
          />
        </label>
      </header>

      <button
        type="button"
        className="suite-hero-open liquid-glass-btn"
        onClick={() => setPicker({ mode: 'gallery' })}
      >
        <span className="suite-hero-icon" aria-hidden="true"><Grid3X3 size={22} /></span>
        <span>
          <strong>Choose a Mini App</strong>
          <small>Opens a window — pick Docs, Sheets, Code, and the rest</small>
        </span>
      </button>

      <div className="suite-body">
        <section className="suite-apps" aria-labelledby="suite-apps-title">
          <header>
            <h2 id="suite-apps-title">{query ? 'Search results' : 'Mini Apps'}</h2>
            <span>{filtered.length}</span>
          </header>
          <div className="suite-grid suite-grid-guides">
            {filtered.map(app => (
              <button
                key={app.id}
                type="button"
                className="suite-tile suite-tile-guide liquid-glass-btn"
                title={app.guideTip}
                onClick={() => setPicker({ mode: 'app', app })}
                aria-label={`Open ${app.name}`}
              >
                <span className="suite-tile-icon" style={{ background: app.color }} aria-hidden="true">
                  <AppIcon icon={app.icon} />
                </span>
                <strong className="suite-tile-name">{app.name}</strong>
                <span className="suite-guide">
                  <span className="suite-guide-meta">
                    <b>{app.guideTip}</b>
                    <small>{app.description}</small>
                  </span>
                </span>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="suite-empty">
              <Search size={22} />
              <strong>No matching app</strong>
              <span>Try Docs, Sheets, Slides, or Code</span>
            </div>
          )}
        </section>

        <section className="suite-files" aria-labelledby="suite-recent-title">
          <header>
            <h2 id="suite-recent-title">Recent files</h2>
            <span>Also on Home</span>
          </header>
          {recent.length === 0 ? (
            <div className="suite-empty">
              <FilePlus2 size={22} />
              <strong>No files yet</strong>
              <span>Choose a Mini App to create a file and start.</span>
            </div>
          ) : (
            <div className="suite-file-list">
              {recent.map(project => {
                const app = apps.find(item => item.id === project.app_kind)
                return (
                  <button key={project.id} type="button" onClick={() => void openExisting(project.id)}>
                    <span style={{ background: app?.color || 'var(--helios-accent)' }} aria-hidden="true">
                      {app ? <AppIcon icon={app.icon} size={16} /> : '·'}
                    </span>
                    <span>
                      <strong>{project.name}</strong>
                      <small>{app?.name || project.app_kind} · {relativeTime(project.updated_at)}</small>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {picker && (
        <div
          className="suite-picker"
          role="presentation"
          onMouseDown={event => { if (event.target === event.currentTarget) setPicker(null) }}
        >
          <div
            className="suite-picker-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="suite-picker-title"
            ref={pickerRef}
          >
            {picker.mode === 'gallery' ? (
              <>
                <header className="suite-picker-head">
                  <div>
                    <small>Create suite</small>
                    <h2 id="suite-picker-title">Pick a Mini App</h2>
                  </div>
                  <button type="button" onClick={() => setPicker(null)} aria-label="Close"><X size={16} /></button>
                </header>
                <p className="suite-picker-lead">Like choosing a model — select the tool, then make a new file or open a recent one.</p>
                <div className="suite-picker-gallery">
                  {apps.map(app => (
                    <button
                      key={app.id}
                      type="button"
                      className="suite-picker-card"
                      onClick={() => setPicker({ mode: 'app', app })}
                    >
                      <span className="suite-tile-icon" style={{ background: app.color }} aria-hidden="true">
                        <AppIcon icon={app.icon} size={20} />
                      </span>
                      <strong>{app.name}</strong>
                      <small>{app.guideTip}</small>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <header className="suite-picker-head">
                  <button
                    type="button"
                    className="suite-picker-back"
                    onClick={() => setPicker({ mode: 'gallery' })}
                    aria-label="Back to all Mini Apps"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="suite-tile-icon" style={{ background: picker.app.color }} aria-hidden="true">
                    <AppIcon icon={picker.app.icon} />
                  </span>
                  <div>
                    <small>{picker.app.guideTip}</small>
                    <h2 id="suite-picker-title">{picker.app.name}</h2>
                  </div>
                  <button type="button" onClick={() => setPicker(null)} aria-label="Close"><X size={16} /></button>
                </header>
                <p className="suite-picker-lead">{picker.app.description}</p>
                <button
                  type="button"
                  className="suite-create liquid-glass-btn is-primary"
                  onClick={() => void createFile()}
                  disabled={creating}
                >
                  <FilePlus2 size={16} />
                  {creating ? 'Creating…' : `New ${picker.app.newName}`}
                </button>
                {activeFiles.length > 0 && (
                  <div className="suite-file-list">
                    {activeFiles.map(project => (
                      <button key={project.id} type="button" onClick={() => void openExisting(project.id)}>
                        <span style={{ background: picker.app.color }}>{picker.app.letter}</span>
                        <span>
                          <strong>{project.name}</strong>
                          <small><Clock3 size={11} /> {relativeTime(project.updated_at)}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
