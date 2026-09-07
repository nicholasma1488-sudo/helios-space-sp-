import { useMemo, useState } from 'react'
import {
  BookOpen, CheckSquare, Clock3, Code2, FilePlus2, FileText,
  Search, Sheet, Sparkles, X,
} from 'lucide-react'
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
  suiteAppsForEdition,
  suiteHomeTitle,
  suiteStarterWorkspace,
  type SuiteApp,
} from '../product/miniApps'
import './MiniAppsView.css'

function relativeTime(value: string) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days} 天前`
  return new Date(value).toLocaleDateString()
}

function AppIcon({ icon, size = 22 }: { icon: SuiteApp['icon']; size?: number }) {
  const props = { size }
  switch (icon) {
    case 'write': return <FileText {...props} />
    case 'sheet': return <Sheet {...props} />
    case 'notes': return <BookOpen {...props} />
    case 'tasks': return <CheckSquare {...props} />
    case 'code': return <Code2 {...props} />
    default: return <Sparkles {...props} />
  }
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
      setActive(null)
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
          <div className="suite-kicker"><Sparkles size={13} /> {editionKicker(edition)} · {editionLabel(edition)}</div>
          <h1>{suiteHomeTitle(edition)}</h1>
          <p>{editionBlurb(edition)}</p>
        </div>
        <label className="suite-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">搜索应用</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="搜 墨语 / 随身本 / 小墨…"
          />
        </label>
      </header>

      <div className="suite-welcome">
        <div>
          <small>Social Create</small>
          <strong>创作，然后分享到 Space</strong>
          <span>没有科目，没有 hobbies —— 五个工具就够。</span>
        </div>
        <button type="button" className="liquid-glass-btn is-primary" onClick={() => dispatch({ type: 'SET_VIEW', view: 'chat' })}>
          找 WorkBuddy
        </button>
      </div>

      <div className="suite-body">
        <section className="suite-apps" aria-labelledby="suite-apps-title">
          <header>
            <h2 id="suite-apps-title">{query ? '搜索结果' : 'Mini Apps'}</h2>
            <span>{filtered.length} 个</span>
          </header>
          <div className="suite-grid suite-grid-guides">
            {filtered.map(app => (
              <button
                key={app.id}
                type="button"
                className="suite-tile suite-tile-guide liquid-glass-btn"
                title={app.guideTip}
                onClick={() => setActive(app)}
                aria-label={`打开 ${app.name}（${app.guideName}）`}
              >
                <span className="suite-tile-icon" style={{ background: app.color }} aria-hidden="true">
                  <AppIcon icon={app.icon} />
                </span>
                <strong className="suite-tile-name">{app.name}</strong>
                <span className="suite-guide">
                  <span
                    className="suite-guide-avatar"
                    style={{ background: `${app.color}22`, color: app.color }}
                    aria-hidden="true"
                  >
                    {app.guideEmoji}
                  </span>
                  <span className="suite-guide-meta">
                    <b>{app.guideName}</b>
                    <small>{app.guideTip}</small>
                  </span>
                </span>
                <em className="suite-tile-desc">{app.description}</em>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="suite-empty">
              <Search size={22} />
              <strong>没有这个应用</strong>
              <span>试试：墨语、随身本、格间、今日事、搭子码</span>
            </div>
          )}
        </section>

        <section className="suite-files" aria-labelledby="suite-recent-title">
          <header>
            <h2 id="suite-recent-title">最近文件</h2>
            <span>也在 Home 里</span>
          </header>
          {recent.length === 0 ? (
            <div className="suite-empty">
              <FilePlus2 size={22} />
              <strong>还没有文件</strong>
              <span>点左边任一应用，新建就能用。</span>
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
              <span className="suite-tile-icon" style={{ background: active.color }} aria-hidden="true">
                <AppIcon icon={active.icon} />
              </span>
              <div>
                <small>{active.guideName} 说</small>
                <h2 id="suite-picker-title">{active.name}</h2>
              </div>
              <button type="button" onClick={() => setActive(null)} aria-label="关闭">
                <X size={16} />
              </button>
            </header>
            <div className="suite-picker-guide">
              <span className="suite-guide-avatar" style={{ background: `${active.color}22` }}>
                {active.guideEmoji}
              </span>
              <p>{active.guideTip} — {active.description}</p>
            </div>
            <button type="button" className="suite-create liquid-glass-btn is-primary" onClick={() => void createFile()} disabled={creating}>
              <FilePlus2 size={16} />
              {creating ? '创建中…' : `新建${active.newName}`}
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
