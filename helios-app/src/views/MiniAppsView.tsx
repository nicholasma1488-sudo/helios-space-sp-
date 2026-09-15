import { useMemo, useState } from 'react'
import { FilePlus2, Grid3X3, Search } from 'lucide-react'
import { AppIcon } from '../components/AppIcon'
import { useApp } from '../store/appStore'
import { openProjectWorkspace } from '../product/flow'
import {
  editionBlurb,
  editionFor,
  editionLabel,
  suiteAppsForEdition,
  suiteHomeTitle,
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

function openTopBarCreatePanel(app?: SuiteApp) {
  window.dispatchEvent(new CustomEvent('helios-open-create-panel', { detail: { appId: app?.id } }))
}

export function MiniAppsView() {
  const { state, dispatch } = useApp()
  const edition = editionFor(state.user?.plan)
  const apps = suiteAppsForEdition(edition)
  const [query, setQuery] = useState('')

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
        onClick={() => openTopBarCreatePanel()}
      >
        <span className="suite-hero-icon" aria-hidden="true"><Grid3X3 size={22} /></span>
        <span>
          <strong>Open Mini Apps from the top bar</strong>
          <small>Expands a half-screen panel — pick Docs, Sheets, Code, and the rest</small>
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
                onClick={() => openTopBarCreatePanel(app)}
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
              <span>Open Mini Apps from the top bar to create a file.</span>
              <button type="button" className="liquid-glass-btn is-primary" onClick={() => openTopBarCreatePanel()}>
                Open Mini Apps
              </button>
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
    </div>
  )
}
