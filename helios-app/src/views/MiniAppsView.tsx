import { useMemo, useState } from 'react'
import { Clock3, FilePlus2, Lock, Search, Sparkles, X } from 'lucide-react'
import { useApp } from '../store/appStore'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { createSuiteProject, openProjectWorkspace } from '../product/flow'
import {
  editionBlurb,
  editionFor,
  editionKicker,
  editionLabel,
  nextSuiteFileName,
  paidEditionFor,
  spaceForSuiteApp,
  suiteAppUnlocked,
  suiteAppsForEdition,
  unlockLabel,
  type SuiteApp,
} from '../product/miniApps'
import './MiniAppsView.css'

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime()
  const minutes = Math.round(delta / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days}d ago`
  return new Date(value).toLocaleDateString()
}

export function MiniAppsView() {
  const { state, dispatch } = useApp()
  const edition = editionFor(state.user?.audience, state.user?.plan)
  const apps = suiteAppsForEdition(edition)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<SuiteApp | null>(null)
  const [creating, setCreating] = useState(false)
  const pickerRef = useFocusTrap<HTMLDivElement>(Boolean(active))

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return apps
    return apps.filter(app =>
      app.name.toLowerCase().includes(needle) ||
      app.description.toLowerCase().includes(needle),
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

  function goBilling() {
    try { sessionStorage.setItem('helios-open-settings', 'billing') } catch {}
    dispatch({ type: 'SET_VIEW', view: 'profile' })
  }

  function openApp(app: SuiteApp) {
    if (!suiteAppUnlocked(app, edition)) {
      goBilling()
      return
    }
    setActive(app)
  }

  async function openExisting(projectId: number) {
    try {
      await openProjectWorkspace(projectId, state.projects, dispatch)
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
        spaceId: spaceForSuiteApp(active, state.user?.audience),
        type: active.projectType,
        appKind: active.id,
      }, dispatch)
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' },
      })
    } finally {
      setCreating(false)
    }
  }

  const paid = paidEditionFor(edition)
  const canUpgrade = edition === 'child' || edition === 'adult'

  return (
    <div className="suite-view">
      <header className="suite-top">
        <div>
          <div className="suite-kicker"><Sparkles size={13} /> APPS</div>
          <h1>Microsoft 365-style workspaces.</h1>
          <p>{editionBlurb(edition)}</p>
        </div>
        <label className="suite-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search apps</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Word, Excel, slides…" />
        </label>
      </header>

      <div className="suite-welcome">
        <div>
          <small>{editionKicker(edition)}</small>
          <strong>You are on {editionLabel(edition)}</strong>
        </div>
        {canUpgrade && (
          <button type="button" onClick={goBilling}>
            Upgrade to {paid === 'alpha' ? 'Alpha' : 'Orbit'}
          </button>
        )}
      </div>

      <div className="suite-body">
        <section className="suite-apps" aria-labelledby="suite-apps-title">
          <header>
            <h2 id="suite-apps-title">{query ? 'Search results' : 'Apps'}</h2>
            <span>{filtered.length}</span>
          </header>
          <div className="suite-grid">
            {filtered.map(app => {
              const unlocked = suiteAppUnlocked(app, edition)
              return (
                <button
                  key={app.id}
                  type="button"
                  className={'suite-tile' + (unlocked ? '' : ' is-locked')}
                  onClick={() => openApp(app)}
                  aria-label={unlocked ? `Open ${app.name}` : unlockLabel(edition)}
                >
                  <span className="suite-tile-icon" style={{ background: app.color }}>
                    {unlocked ? app.letter : <Lock size={18} />}
                  </span>
                  <strong>{app.name}</strong>
                  <small>{unlocked ? app.description : unlockLabel(edition)}</small>
                </button>
              )
            })}
          </div>
          {filtered.length === 0 && (
            <div className="suite-empty">
              <Search size={22} />
              <strong>No app found</strong>
              <span>Try Word, Excel, PowerPoint, or OneNote.</span>
            </div>
          )}
        </section>

        <section className="suite-files" aria-labelledby="suite-recent-title">
          <header>
            <h2 id="suite-recent-title">Recent</h2>
            <span>Saved to your Projects</span>
          </header>
          {recent.length === 0 ? (
            <div className="suite-empty">
              <FilePlus2 size={22} />
              <strong>No files yet</strong>
              <span>Open Word, Excel or PowerPoint and start a real file.</span>
            </div>
          ) : (
            <div className="suite-file-list">
              {recent.map(project => {
                const app = apps.find(item => item.id === project.app_kind)
                return (
                  <button key={project.id} type="button" onClick={() => void openExisting(project.id)}>
                    <span style={{ background: app?.color || '#185ABD' }}>{app?.letter || 'W'}</span>
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

      {active && (
        <div
          className="suite-picker"
          role="dialog"
          aria-modal="true"
          aria-labelledby="suite-picker-title"
          onMouseDown={event => { if (event.target === event.currentTarget) setActive(null) }}
        >
          <div className="suite-picker-panel" ref={pickerRef}>
            <header>
              <span className="suite-tile-icon" style={{ background: active.color }}>{active.letter}</span>
              <div>
                <small>NEW OR OPEN</small>
                <h2 id="suite-picker-title">{active.name}</h2>
              </div>
              <button type="button" onClick={() => setActive(null)} aria-label="Close">
                <X size={16} />
              </button>
            </header>
            <p>{active.description}</p>
            <button type="button" className="suite-create" onClick={() => void createFile()} disabled={creating}>
              <FilePlus2 size={16} />
              {creating ? 'Creating…' : `Blank ${active.newName.toLowerCase()}`}
            </button>
            {activeFiles.length > 0 && (
              <div className="suite-file-list">
                {activeFiles.map(project => (
                  <button key={project.id} type="button" onClick={() => void openExisting(project.id)}>
                    <span style={{ background: active.color }}>{active.letter}</span>
                    <span>
                      <strong>{project.name}</strong>
                      <small><Clock3 size={11} /> {relativeTime(project.updated_at)}</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
