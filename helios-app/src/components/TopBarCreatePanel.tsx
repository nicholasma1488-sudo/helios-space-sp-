import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronDown, ChevronUp, Clock3, FilePlus2, Sparkles, X } from 'lucide-react'
import { api } from '../api'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { createSuiteProject, openProjectWorkspace } from '../product/flow'
import {
  editionFor,
  nextSuiteFileName,
  spaceForSuiteApp,
  suiteAppsForEdition,
  suiteStarterWorkspace,
  type SuiteApp,
} from '../product/miniApps'
import { useApp } from '../store/appStore'
import { AppIcon } from './AppIcon'
import './TopBarCreatePanel.css'

type PanelView =
  | { mode: 'gallery' }
  | { mode: 'app'; app: SuiteApp }

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

interface Props {
  open: boolean
  onClose: () => void
  initialAppId?: string | null
}

export function TopBarCreatePanel({ open, onClose, initialAppId = null }: Props) {
  const { state, dispatch } = useApp()
  const apps = suiteAppsForEdition(editionFor(state.user?.plan))
  const [view, setView] = useState<PanelView>({ mode: 'gallery' })
  const [creating, setCreating] = useState(false)
  const [entered, setEntered] = useState(false)
  const [patchProjectId, setPatchProjectId] = useState<number | null>(null)
  const [patchInstruction, setPatchInstruction] = useState('')
  const [patching, setPatching] = useState(false)
  const panelRef = useFocusTrap<HTMLDivElement>(open)

  useEffect(() => {
    if (!open) {
      setEntered(false)
      setView({ mode: 'gallery' })
      setPatchProjectId(null)
      setPatchInstruction('')
      return
    }
    const matched = initialAppId ? apps.find(app => app.id === initialAppId) : null
    setView(matched ? { mode: 'app', app: matched } : { mode: 'gallery' })
    const frame = window.requestAnimationFrame(() => setEntered(true))
    return () => window.cancelAnimationFrame(frame)
    // intentionally depend on open + initialAppId only; apps catalog is stable by id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialAppId])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const active = view.mode === 'app' ? view.app : null
  const activeFiles = useMemo(
    () => active
      ? state.projects
        .filter(project => project.app_kind === active.id)
        .slice()
        .sort((left, right) => +new Date(right.updated_at) - +new Date(left.updated_at))
        .slice(0, 6)
      : [],
    [active, state.projects],
  )

  useEffect(() => {
    if (view.mode !== 'app') {
      setPatchProjectId(null)
      setPatchInstruction('')
      return
    }
    setPatchProjectId(current => {
      if (current && activeFiles.some(project => project.id === current)) return current
      return activeFiles[0]?.id ?? null
    })
  }, [view, activeFiles])

  async function openExisting(projectId: number) {
    setPatchProjectId(projectId)
    try {
      await openProjectWorkspace(projectId, state.projects, dispatch)
      onClose()
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' },
      })
    }
  }

  async function applyHeliosPatch(event: React.FormEvent) {
    event.preventDefault()
    if (!patchProjectId || !patchInstruction.trim() || patching) return
    setPatching(true)
    try {
      await api.heliosPatch(patchProjectId, patchInstruction.trim())
      setPatchInstruction('')
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: 'Helios patch applied', tone: 'success' },
      })
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' },
      })
    } finally {
      setPatching(false)
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
      onClose()
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' },
      })
    } finally {
      setCreating(false)
    }
  }

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className={'topbar-create-scrim' + (entered ? ' is-open' : '')}
        aria-label="Close Mini Apps"
        onClick={onClose}
      />
      <section
        className={'topbar-create-panel' + (entered ? ' is-open' : '')}
        id="topbar-create-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="topbar-create-title"
        ref={panelRef}
      >
        <div className="topbar-create-glow" aria-hidden="true" />
        <div className="topbar-create-inner">
          {view.mode === 'gallery' ? (
            <>
              <header className="topbar-create-head">
                <div>
                  <small>Tools</small>
                  <h2 id="topbar-create-title">Mini Apps</h2>
                </div>
                <button type="button" onClick={onClose} aria-label="Close"><X size={16} /></button>
              </header>
              <p className="topbar-create-lead">
                Pick a tool the way you pick a model — then make a file or open one you already started.
              </p>
              <div className="topbar-create-gallery">
                {apps.map((app, index) => (
                  <button
                    key={app.id}
                    type="button"
                    className="topbar-create-card"
                    style={{ '--stagger': `${40 + index * 28}ms`, '--accent': app.color } as React.CSSProperties}
                    onClick={() => setView({ mode: 'app', app })}
                  >
                    <span className="topbar-create-card-icon" aria-hidden="true">
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
              <header className="topbar-create-head">
                <button
                  type="button"
                  className="topbar-create-back"
                  onClick={() => setView({ mode: 'gallery' })}
                  aria-label="Back to all Mini Apps"
                >
                  <ChevronLeft size={16} />
                </button>
                <span
                  className="topbar-create-card-icon is-large"
                  style={{ background: view.app.color }}
                  aria-hidden="true"
                >
                  <AppIcon icon={view.app.icon} size={22} />
                </span>
                <div>
                  <small>{view.app.guideTip}</small>
                  <h2 id="topbar-create-title">{view.app.name}</h2>
                </div>
                <button type="button" onClick={onClose} aria-label="Close"><X size={16} /></button>
              </header>
              <p className="topbar-create-lead">{view.app.description}</p>
              <button
                type="button"
                className="topbar-create-new liquid-glass-btn is-primary"
                onClick={() => void createFile()}
                disabled={creating}
              >
                <FilePlus2 size={16} />
                {creating ? 'Creating…' : `New ${view.app.newName}`}
              </button>
              {activeFiles.length > 0 && (
                <>
                  <div className="topbar-create-files">
                    {activeFiles.map((project, index) => (
                      <button
                        key={project.id}
                        type="button"
                        className={patchProjectId === project.id ? 'is-selected' : ''}
                        style={{ '--stagger': `${60 + index * 35}ms` } as React.CSSProperties}
                        title="Select for Helios patch · double-click to open"
                        onClick={() => setPatchProjectId(project.id)}
                        onDoubleClick={() => void openExisting(project.id)}
                      >
                        <span style={{ background: view.app.color }}>{view.app.letter}</span>
                        <span>
                          <strong>{project.name}</strong>
                          <small><Clock3 size={11} /> {relativeTime(project.updated_at)}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  {patchProjectId && (
                    <form className="topbar-helios-patch" onSubmit={event => void applyHeliosPatch(event)}>
                      <Sparkles size={14} />
                      <input
                        value={patchInstruction}
                        onChange={event => setPatchInstruction(event.target.value)}
                        placeholder="Tell Helios what to change…"
                        aria-label="Helios patch instruction"
                        maxLength={500}
                      />
                      <button type="submit" disabled={patching || !patchInstruction.trim()}>
                        {patching ? 'Applying…' : 'Apply'}
                      </button>
                    </form>
                  )}
                  <button
                    type="button"
                    className="topbar-create-open-selected"
                    disabled={!patchProjectId}
                    onClick={() => patchProjectId && void openExisting(patchProjectId)}
                  >
                    Open selected
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}

export function TopBarCreateTrigger({
  open,
  onToggle,
  label,
  chip,
  accent,
}: {
  open: boolean
  onToggle: () => void
  label: string
  chip: string
  accent: string
}) {
  return (
    <button
      type="button"
      className={'topbar-create-trigger' + (open ? ' is-open' : '')}
      aria-expanded={open}
      aria-controls="topbar-create-panel"
      aria-label={open ? 'Close Mini App panel' : 'Open Mini App panel'}
      onClick={onToggle}
    >
      <span className="topbar-create-trigger-label">{label || 'Mini App'}</span>
      <span className="topbar-create-trigger-chevron" aria-hidden="true">
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </span>
      {chip ? (
        <span className="topbar-context-chip" style={{ '--space-accent': accent } as React.CSSProperties}>
          <i />{chip}
        </span>
      ) : null}
    </button>
  )
}
