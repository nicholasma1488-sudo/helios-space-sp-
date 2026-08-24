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
  spaceForSuiteApp,
  suiteAppUnlocked,
  suiteAppsForEdition,
  suiteHomeTitle,
  suiteStarterWorkspace,
  unlockLabel,
  WRITING_LIMITS,
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
  const edition = editionFor(state.user?.plan)
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
    dispatch({ type: 'OPEN_UPGRADE' })
  }

  function openApp(app: SuiteApp) {
    if (!suiteAppUnlocked(app, edition)) {
      goBilling()
      return
    }
    if (app.id === 'stocks') {
      const existing = state.projects
        .filter(project => project.app_kind === 'stocks')
        .sort((left, right) => +new Date(right.updated_at) - +new Date(left.updated_at))[0]
      if (existing) {
        void openExisting(existing.id)
        return
      }
      if (creating) return
      setCreating(true)
      void createSuiteProject({
        name: nextSuiteFileName(app.newName, state.projects, app.id),
        spaceId: spaceForSuiteApp(app),
        type: app.projectType,
        appKind: app.id,
        content: suiteStarterWorkspace(app),
      }, dispatch).catch(error => {
        dispatch({
          type: 'PUSH_TOAST',
          toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' },
        })
      }).finally(() => setCreating(false))
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
        spaceId: spaceForSuiteApp(active),
        type: active.projectType,
        appKind: active.id,
        content: suiteStarterWorkspace(active),
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

  const canUpgrade = edition === 'free'
  const writingUsed = state.projects.filter(project =>
    project.user_id === state.user?.id
    && (project.type === 'writing' || (project.type === 'doc' && project.app_kind !== 'stocks')),
  ).length
  const writingLimit = state.user?.usage?.documents.limit ?? WRITING_LIMITS[edition].documents
  const characterLimit = state.user?.usage?.characters.limit ?? WRITING_LIMITS[edition].characters

  return (
    <div className="suite-view">
      <header className="suite-top">
        <div>
          <div className="suite-kicker"><Sparkles size={13} /> {editionKicker(edition)}</div>
          <h1>{suiteHomeTitle(edition)}</h1>
          <p>{editionBlurb(edition)}</p>
        </div>
        <label className="suite-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search apps</span>
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Word, Excel, Stocks…" />
        </label>
      </header>

      <div className="suite-welcome">
        <div>
          <small>{editionKicker(edition)}</small>
          <strong>You are on {editionLabel(edition)}</strong>
          <span>
            {writingLimit == null
              ? `Writing documents unlimited · ${characterLimit.toLocaleString()} characters each`
              : `Writing ${writingUsed} / ${writingLimit} · ${characterLimit.toLocaleString()} characters each`}
          </span>
        </div>
        {canUpgrade && (
          <button type="button" onClick={goBilling}>
            Upgrade to Orbit
          </button>
        )}
      </div>

      <div className="suite-body">
        <section className="suite-apps" aria-labelledby="suite-apps-title">
          <header>
            <h2 id="suite-apps-title">{query ? 'Search results' : 'Apps'}</h2>
            <span>{filtered.length}</span>
          </header>
          {['core', 'orbit'].map(track => {
            const group = filtered.filter(app => app.track === track)
            if (group.length === 0) return null
            return (
              <div key={track} className="suite-group">
                <h3>{track === 'core' ? 'Included' : 'Orbit suite'}</h3>
                <div className="suite-grid">
                  {group.map(app => {
                    const unlocked = suiteAppUnlocked(app, edition)
                    return (
                      <button
                        key={app.id}
                        type="button"
                        className={'suite-tile' + (unlocked ? '' : ' is-locked')}
                        title={unlocked ? app.description : unlockLabel(edition)}
                        onClick={() => openApp(app)}
                        aria-label={unlocked ? `Open ${app.name}` : unlockLabel(edition)}
                      >
                        <span className="suite-tile-icon" style={{ background: app.color }}>
                          {unlocked ? app.letter : <Lock size={18} />}
                        </span>
                        <strong>{app.name}</strong>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
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
