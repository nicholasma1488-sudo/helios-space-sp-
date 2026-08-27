import { useEffect, useMemo, useState } from 'react'
import {
  Bell, Check, ChevronRight, Circle, FolderGit2, Heart, MessageCircle, Plus,
  Radio, Sparkles, Sun, Trash2, Users,
} from 'lucide-react'
import { api, type ApiNotification, type LiveSession, type Post, type SolarSummary } from '../api'
import { SuiteAppIcon } from '../components/SuiteAppIcon'
import { NewProjectModal } from '../components/NewProjectModal'
import { getMiniApp, getSpaceDefinition } from '../product/catalog'
import { createSuiteProject, openProjectWorkspace } from '../product/flow'
import { getSuiteApp, nextSuiteFileName, spaceForSuiteApp, SUITE_APPS, suiteStarterWorkspace, type SuiteApp } from '../product/miniApps'
import { useApp } from '../store/appStore'
import './HomeView.css'

interface TodayTask { id: string; text: string; done: boolean }
const EMPTY_SOLAR: SolarSummary = { total: 0, identity: 'Dawn', next_threshold: 100, events: [] }
const CORE_APPS = SUITE_APPS.filter(app => app.track === 'core' || app.id === 'stocks')

function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || '?'
}

function relativeTime(value: string) {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'just now'
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.round(hours / 24)}d`
}

function reactionCount(post: Post) {
  return Object.values(post.reactions || {}).reduce((sum, value) => sum + value, 0)
}

export function HomeView() {
  const { state, dispatch } = useApp()
  const [tasks, setTasks] = useState<TodayTask[]>([])
  const [tasksReady, setTasksReady] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [solar, setSolar] = useState<SolarSummary>(EMPTY_SOLAR)
  const [live, setLive] = useState<LiveSession[]>([])
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [activity, setActivity] = useState<Post[]>([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState('')
  const [launching, setLaunching] = useState<string | null>(null)
  const firstName = state.user?.name.split(' ')[0] || 'there'
  const taskKey = useMemo(() => state.user?.id ? `helios-today-tasks-v2-${state.user.id}-${localDayKey()}` : '', [state.user?.id])
  const activeSpace = getSpaceDefinition(state.activeSpaceId)
  const recent = [...state.projects].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const completedTasks = tasks.filter(task => task.done).length
  const unread = notifications.filter(item => !item.read)
  const collaborators = useMemo(() => {
    const seen = new Map<string, { name: string; handle: string; live?: LiveSession }>()
    for (const session of live) {
      seen.set(session.owner_name, { name: session.owner_name, handle: session.project_name, live: session })
    }
    for (const post of activity) {
      if (!seen.has(post.author_name)) seen.set(post.author_name, { name: post.author_name, handle: post.author_handle })
    }
    return [...seen.values()].slice(0, 8)
  }, [live, activity])

  useEffect(() => {
    if (!taskKey) return
    setTasksReady(false)
    try {
      const value = JSON.parse(localStorage.getItem(taskKey) || '[]')
      setTasks(Array.isArray(value) ? value.filter(item => item && typeof item.text === 'string') : [])
    } catch {
      setTasks([])
    } finally {
      setTasksReady(true)
    }
  }, [taskKey])

  useEffect(() => {
    if (taskKey && tasksReady) try { localStorage.setItem(taskKey, JSON.stringify(tasks)) } catch {}
  }, [taskKey, tasks, tasksReady])

  useEffect(() => {
    let cancelled = false
    setDataLoading(true)
    setDataError('')
    Promise.all([
      api.solar(),
      api.live.list(),
      api.notifications.list(),
      api.posts.list({ space_id: state.activeSpaceId, limit: 10 }),
    ]).then(([solarResult, liveResult, notificationResult, postResult]) => {
      if (cancelled) return
      setSolar(solarResult)
      setLive(liveResult.sessions)
      setNotifications(notificationResult.notifications)
      setActivity(postResult.posts)
    }).catch(err => {
      if (!cancelled) setDataError((err as Error).message || 'Could not load Home data')
    }).finally(() => {
      if (!cancelled) setDataLoading(false)
    })
    return () => { cancelled = true }
  }, [state.activeSpaceId])

  function addTask(event: React.FormEvent) {
    event.preventDefault()
    const text = newTask.trim()
    if (!text) return
    setTasks(current => [...current, { id: crypto.randomUUID(), text, done: false }])
    setNewTask('')
  }

  function openProject(projectId: number) {
    const project = state.projects.find(item => item.id === projectId)
    if (project) {
      dispatch({ type: 'SET_ACTIVE_SUBJECT', subjectId: project.space_id })
      dispatch({ type: 'OPEN_CODE_EDITOR', projectId })
    }
  }

  async function routeNotification(item: ApiNotification) {
    if (!item.read) {
      await api.notifications.markRead([item.id]).catch(() => {})
      setNotifications(current => current.map(value => value.id === item.id ? { ...value, read: true } : value))
    }
    const id = Number(item.target_id)
    if (item.target_type === 'project' && id) openProject(id)
    else if (item.target_type === 'live' && id) dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: id })
    else if (item.target_type === 'conversation' && id) {
      sessionStorage.setItem('helios-open-conversation', String(id))
      dispatch({ type: 'SET_VIEW', view: 'chat' })
    }
    else if (item.target_type === 'post' && id) {
      sessionStorage.setItem('helios-open-post', String(id))
      dispatch({ type: 'SET_VIEW', view: 'lifestyle' })
    }
  }

  async function launchApp(app: SuiteApp) {
    if (launching) return
    const existing = state.projects
      .filter(project => project.app_kind === app.id)
      .sort((left, right) => +new Date(right.updated_at) - +new Date(left.updated_at))[0]
    if (existing) {
      await openProjectWorkspace(existing.id, state.projects, dispatch)
      return
    }
    setLaunching(app.id)
    try {
      await createSuiteProject({
        name: nextSuiteFileName(app.newName, state.projects, app.id),
        spaceId: spaceForSuiteApp(app),
        type: app.projectType,
        appKind: app.id,
        content: suiteStarterWorkspace(app),
      }, dispatch)
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' },
      })
    } finally {
      setLaunching(null)
    }
  }

  return (
    <div className="home-page">
      {showNewProject && <NewProjectModal initialSpace={activeSpace.name} initialSpaceId={activeSpace.id} onClose={() => setShowNewProject(false)} />}

      {dataLoading && <HomeSkeleton />}
      {dataError && (
        <div role="alert" className="home-alert">
          {dataError} <button type="button" onClick={() => window.location.reload()}>Reload</button>
        </div>
      )}

      {!dataLoading && (
        <>
          <header className="home-heading">
            <div>
              <span>Collaborate · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <h1>Welcome back, {firstName}.</h1>
              <p>People, live work, and the 365 suite — one place to collaborate.</p>
            </div>
            <div>
              <button type="button" className="is-primary" onClick={() => dispatch({ type: 'SET_VIEW', view: 'lifestyle' })}><Users size={14} /> Feed</button>
              <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'live' })}><Radio size={14} /> Go Live</button>
              <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'chat' })}><MessageCircle size={14} /> Chat</button>
            </div>
          </header>

          <section className="home-apps" aria-labelledby="home-apps-title">
            <header>
              <div>
                <span>THE SUITE</span>
                <h2 id="home-apps-title">Open an app</h2>
              </div>
              <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'apps' })}>All apps <ChevronRight size={13} /></button>
            </header>
            <div>
              {CORE_APPS.map(app => (
                <button type="button" key={app.id} onClick={() => void launchApp(app)} disabled={launching === app.id}>
                  <SuiteAppIcon app={app} size={52} />
                  <strong>{app.name}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="home-people" aria-labelledby="home-people-title">
            <header>
              <div>
                <span>COLLABORATE</span>
                <h2 id="home-people-title">People in the room</h2>
              </div>
              <button type="button" onClick={() => dispatch({ type: 'OPEN_SPACE', spaceId: activeSpace.id })}>{activeSpace.name} Space</button>
            </header>
            <div className="home-people-row">
              {collaborators.map(person => (
                <button
                  type="button"
                  key={person.name}
                  onClick={() => person.live ? dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: person.live.id }) : dispatch({ type: 'SET_VIEW', view: 'lifestyle' })}
                >
                  <b>{initials(person.name)}{person.live && <i />}</b>
                  <strong>{person.name.split(' ')[0]}</strong>
                  <small>{person.live ? 'Live now' : person.handle}</small>
                </button>
              ))}
              {collaborators.length === 0 && (
                <div className="home-people-empty">
                  <Users size={18} />
                  <span>No one is collaborating here yet. Post to the feed or start Live work.</span>
                </div>
              )}
            </div>
          </section>

          <div className="home-dashboard">
            <section className="home-feed" aria-labelledby="home-feed-title">
              <header>
                <div>
                  <span>SPACE FEED</span>
                  <h2 id="home-feed-title">What people are sharing</h2>
                </div>
                <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'lifestyle' })}>Open Feed</button>
              </header>
              <div>
                {activity.map(post => (
                  <article key={post.id}>
                    <span>{initials(post.author_name)}</span>
                    <div>
                      <strong>{post.author_name}<small>{post.author_handle} · {relativeTime(post.created_at)}</small></strong>
                      <p>{post.body}</p>
                      {post.project_id && (
                        <button type="button" onClick={() => openProject(post.project_id!)}>
                          {getSuiteApp(post.project_app_kind || '')
                            ? <SuiteAppIcon app={getSuiteApp(post.project_app_kind || '')!} size={18} />
                            : <FolderGit2 size={12} />}
                          {post.project_name}
                        </button>
                      )}
                      <footer>
                        <small><Heart size={12} /> {reactionCount(post)}</small>
                        <small><MessageCircle size={12} /> {post.comment_count}</small>
                      </footer>
                    </div>
                  </article>
                ))}
                {activity.length === 0 && (
                  <div className="home-panel-empty">
                    <Users size={22} />
                    <strong>The feed is waiting</strong>
                    <span>Share progress, mention a collaborator, or open a Live session.</span>
                    <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'lifestyle' })}>Write a post</button>
                  </div>
                )}
              </div>
            </section>

            <section className="home-resume">
              <header>
                <div>
                  <span>RECENT FILES</span>
                  <h2>Pick up together</h2>
                </div>
                <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'projects' })}>All Projects <ChevronRight size={13} /></button>
              </header>
              <div>
                {recent.slice(0, 4).map(project => {
                  const app = getSuiteApp(project.app_kind)
                  return (
                    <button type="button" key={project.id} onClick={() => openProject(project.id)} style={{ '--home-accent': getSpaceDefinition(project.space_id).accent } as React.CSSProperties}>
                      {app ? <SuiteAppIcon app={app} size={36} /> : <i><FolderGit2 size={19} /></i>}
                      <span>
                        <small>{getSpaceDefinition(project.space_id).name} · {getMiniApp(project.app_kind).name}</small>
                        <strong>{project.name}</strong>
                        <p>Updated {new Date(project.updated_at).toLocaleString()}</p>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  )
                })}
                {recent.length === 0 && (
                  <div className="home-no-project">
                    <FolderGit2 size={20} />
                    <span>
                      <strong>Start a shared file.</strong>
                      <small>Word, Excel, slides or notes stay connected to the people in this Space.</small>
                    </span>
                    <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'apps' })}>Open Apps</button>
                  </div>
                )}
                <button type="button" className="home-new-project" onClick={() => setShowNewProject(true)}>
                  <Plus size={18} />
                  <span>New Project</span>
                </button>
              </div>
            </section>

            <aside className="home-right-rail">
              <section className="home-live">
                <header>
                  <span><i /> LIVE COLLABORATORS</span>
                  <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'live' })}>See all</button>
                </header>
                <div>
                  {live.slice(0, 4).map(session => (
                    <button type="button" key={session.id} onClick={() => dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: session.id })}>
                      <span>{initials(session.owner_name)}</span>
                      <div>
                        <strong>{session.owner_name}</strong>
                        <small>{session.project_name} · {session.viewer_count} watching</small>
                      </div>
                      <Radio size={12} />
                    </button>
                  ))}
                  {live.length === 0 && <div className="home-compact-empty">Nobody is Live. Start a session and invite people in.</div>}
                </div>
              </section>

              <section className="home-plan">
                <header>
                  <div>
                    <span>TODAY</span>
                    <h2>{completedTasks}/{tasks.length} complete</h2>
                  </div>
                  <Circle size={17} />
                </header>
                <div className="home-task-list">
                  {tasksReady && tasks.length === 0 && (
                    <div className="home-panel-empty compact">
                      <Check size={18} />
                      <strong>A clear start</strong>
                      <span>Add the next useful action.</span>
                    </div>
                  )}
                  {tasks.map(task => (
                    <div key={task.id} className={task.done ? 'is-done' : ''}>
                      <button type="button" onClick={() => setTasks(current => current.map(item => item.id === task.id ? { ...item, done: !item.done } : item))}>
                        {task.done && <Check size={12} />}
                      </button>
                      <span>{task.text}</span>
                      <button type="button" onClick={() => setTasks(current => current.filter(item => item.id !== task.id))}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
                <form onSubmit={addTask}>
                  <input value={newTask} maxLength={200} onChange={event => setNewTask(event.target.value)} placeholder="Add one useful next action" />
                  <button type="submit" disabled={!newTask.trim()}><Plus size={14} /></button>
                </form>
              </section>

              <section className="home-solar">
                <div>
                  <Sun size={17} />
                  <span><small>SOLAR IDENTITY</small><strong>{solar.identity}</strong></span>
                </div>
                <b>{solar.total} Solar</b>
                <p>{solar.next_threshold ? `${solar.next_threshold - solar.total} until your next identity` : 'Highest identity reached'}</p>
              </section>

              <section className="home-notifications">
                <header>
                  <span><Bell size={12} /> NOTIFICATIONS</span>
                  <b>{unread.length} unread</b>
                </header>
                <div>
                  {notifications.slice(0, 5).map(item => (
                    <button type="button" key={item.id} className={item.read ? '' : 'is-unread'} onClick={() => void routeNotification(item)}>
                      <i>{item.kind.includes('chat') ? <MessageCircle size={12} /> : item.kind.includes('live') ? <Radio size={12} /> : <Sparkles size={12} />}</i>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </span>
                    </button>
                  ))}
                  {notifications.length === 0 && <div className="home-compact-empty">You are caught up.</div>}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="home-skeleton" role="status" aria-label="Loading Home">
      <div style={{ height: 110, borderRadius: 16, background: 'var(--helios-surface2)' }} />
      <div style={{ height: 120, borderRadius: 16, background: 'var(--helios-surface2)', marginTop: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
        <div style={{ height: 320, borderRadius: 16, background: 'var(--helios-surface2)' }} />
        <div style={{ height: 320, borderRadius: 16, background: 'var(--helios-surface2)' }} />
      </div>
    </div>
  )
}
