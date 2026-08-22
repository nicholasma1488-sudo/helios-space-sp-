import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Bell, BookOpen, Check, ChevronRight, Circle, Compass, FolderGit2, GraduationCap,
  Grid3X3, Home, MessageCircle, Plus, Radio, Sparkles, Sun, Trash2, User, Users,
} from 'lucide-react'
import { api, type ApiNotification, type LiveSession, type Post, type SolarSummary } from '../api'
import { NewProjectModal } from '../components/NewProjectModal'
import { getMiniApp, getSpaceDefinition } from '../product/catalog'
import { LEARNING_SUBJECTS, getUtilityMiniApp, loadRecent, loadStreak, requestOpenMiniApp } from '../miniapps'
import { MiniAppIcon } from '../miniapps/MiniAppIcon'
import { useApp, type NavView } from '../store/appStore'
import './HomeView.css'

interface TodayTask { id: string; text: string; done: boolean }
const EMPTY_SOLAR: SolarSummary = { total: 0, identity: 'Dawn', next_threshold: 100, events: [] }
function localDayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

const HOME_NAV: Array<{ id: NavView; label: string; icon: ReactNode }> = [
  { id: 'home', label: 'Home', icon: <Home size={15} /> },
  { id: 'explore', label: 'Discover', icon: <Compass size={15} /> },
  { id: 'apps', label: 'Mini Apps', icon: <Grid3X3 size={15} /> },
  { id: 'projects', label: 'Projects', icon: <FolderGit2 size={15} /> },
  { id: 'learn', label: 'Learn', icon: <GraduationCap size={15} /> },
  { id: 'chat', label: 'Chat', icon: <MessageCircle size={15} /> },
  { id: 'profile', label: 'Profile', icon: <User size={15} /> },
]

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
  const [streak, setStreak] = useState(1)
  const [recentApps, setRecentApps] = useState(loadRecent(state.user?.id ?? 0))
  const taskKey = useMemo(() => state.user?.id ? `helios-today-tasks-v2-${state.user.id}-${localDayKey()}` : '', [state.user?.id])
  const activeSpace = getSpaceDefinition(state.activeSpaceId)
  const recent = [...state.projects].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const completedTasks = tasks.filter(task => task.done).length
  const unread = notifications.filter(item => !item.read)
  const learning = LEARNING_SUBJECTS.find(item => item.spaceId === activeSpace.id) ?? LEARNING_SUBJECTS[0]

  useEffect(() => {
    if (!taskKey) return
    setTasksReady(false)
    try { const value = JSON.parse(localStorage.getItem(taskKey) || '[]'); setTasks(Array.isArray(value) ? value.filter(item => item && typeof item.text === 'string') : []) } catch { setTasks([]) }
    finally { setTasksReady(true) }
  }, [taskKey])
  useEffect(() => { if (taskKey && tasksReady) try { localStorage.setItem(taskKey, JSON.stringify(tasks)) } catch {} }, [taskKey, tasks, tasksReady])
  useEffect(() => {
    if (state.user) {
      setStreak(loadStreak(state.user.id))
      setRecentApps(loadRecent(state.user.id))
    }
  }, [state.user, state.view])
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    setDataLoading(true)
    setDataError('')
    Promise.all([api.solar(), api.live.list(), api.notifications.list(), api.posts.list({ space_id: state.activeSpaceId, limit: 8 })]).then(([solarResult, liveResult, notificationResult, postResult]) => {
      if (cancelled) return
      setSolar(solarResult); setLive(liveResult.sessions); setNotifications(notificationResult.notifications); setActivity(postResult.posts)
    }).catch(err => {
      if (!cancelled) setDataError((err as Error).message || 'Could not load Home data')
    }).finally(() => { if (!cancelled) setDataLoading(false) })
    return () => { cancelled = true; controller.abort() }
  }, [state.activeSpaceId])

  function addTask(event: React.FormEvent) { event.preventDefault(); const text = newTask.trim(); if (!text) return; setTasks(current => [...current, { id: crypto.randomUUID(), text, done: false }]); setNewTask('') }
  function openProject(projectId: number) { const project = state.projects.find(item => item.id === projectId); if (project) { dispatch({ type: 'SET_ACTIVE_SUBJECT', subjectId: project.space_id }); dispatch({ type: 'OPEN_CODE_EDITOR', projectId }) } }
  function openApp(id: Parameters<typeof requestOpenMiniApp>[0]) {
    requestOpenMiniApp(id)
    dispatch({ type: 'SET_VIEW', view: 'apps' })
  }
  async function routeNotification(item: ApiNotification) {
    if (!item.read) { await api.notifications.markRead([item.id]).catch(() => {}); setNotifications(current => current.map(value => value.id === item.id ? { ...value, read: true } : value)) }
    const id = Number(item.target_id)
    if (item.target_type === 'project' && id) openProject(id)
    else if (item.target_type === 'live' && id) dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: id })
    else if (item.target_type === 'conversation' && id) { sessionStorage.setItem('helios-open-conversation', String(id)); dispatch({ type: 'SET_VIEW', view: 'chat' }) }
    else if (item.target_type === 'post' && id) { sessionStorage.setItem('helios-open-post', String(id)); dispatch({ type: 'SET_VIEW', view: 'lifestyle' }) }
  }
  function openHeliosBriefing() {
    sessionStorage.setItem('helios-workspace-context', JSON.stringify({ space_id: activeSpace.id, space_name: activeSpace.name, selected_content: `Today tasks: ${tasks.map(task => `${task.done ? 'done' : 'open'}: ${task.text}`).join('; ') || 'none'}. Unread notifications: ${unread.length}. Active live sessions: ${live.length}.` }))
    sessionStorage.setItem('helios-pending-prompt', 'Give me a compact, useful briefing for today. Prioritize one next action and avoid analytics clutter.')
    dispatch({ type: 'OPEN_HELIOS_PANEL' })
  }

  return <div className="home-page home-space-2">
    {showNewProject && <NewProjectModal initialSpace={activeSpace.name} initialSpaceId={activeSpace.id} onClose={() => setShowNewProject(false)} />}

    {dataLoading && <HomeSkeleton />}
    {dataError && (
      <div role="alert" className="px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', color: 'var(--helios-danger)', fontSize: 13 }}>
        {dataError} <button type="button" onClick={() => window.location.reload()} style={{ marginLeft: 8, textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Reload</button>
      </div>
    )}

    {!dataLoading && (
      <div className="home-space-layout">
        <aside className="home-left-rail" aria-label="Space destinations">
          {HOME_NAV.map(item => (
            <button key={item.id} type="button" className={state.view === item.id ? 'is-on' : ''} onClick={() => dispatch({ type: 'SET_VIEW', view: item.id })}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </aside>

        <div className="home-center">
          <header className="home-heading">
            <div>
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <h1>Welcome back, {state.user?.name.split(' ')[0]}.</h1>
              <p>You are inside Helios Space. Resume work, open a Mini App, or share useful progress.</p>
            </div>
            <div>
              <button type="button" onClick={() => dispatch({ type: 'OPEN_SPACE', spaceId: activeSpace.id })}>{activeSpace.name} Space <ChevronRight size={13} /></button>
              <button type="button" onClick={openHeliosBriefing}><Sparkles size={14} /> Helios briefing</button>
            </div>
          </header>

          {recentApps.length > 0 && (
            <section className="home-recent-apps">
              <header><div><span>RECENT APPS</span><h2>Jump back in</h2></div><button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'apps' })}>All Mini Apps <ChevronRight size={13} /></button></header>
              <div>
                {recentApps.slice(0, 6).map(id => {
                  const app = getUtilityMiniApp(id)
                  if (!app) return null
                  return (
                    <button type="button" key={id} onClick={() => openApp(id)} style={{ '--home-accent': app.accent } as React.CSSProperties}>
                      <i><MiniAppIcon name={app.icon} /></i>
                      <span>{app.name}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <section className="home-resume">
            <header><div><span>RECENT PROJECTS</span><h2>Pick up the thread</h2></div><button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'projects' })}>All Projects <ChevronRight size={13} /></button></header>
            <div>
              {recent.slice(0, 4).map(project => (
                <button type="button" key={project.id} onClick={() => openProject(project.id)} style={{ '--home-accent': getSpaceDefinition(project.space_id).accent } as React.CSSProperties}>
                  <i><FolderGit2 size={19} /></i>
                  <span>
                    <small>{getSpaceDefinition(project.space_id).name} · {getMiniApp(project.app_kind).name}</small>
                    <strong>{project.name}</strong>
                    <p>Updated {new Date(project.updated_at).toLocaleString()}</p>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
              {recent.length === 0 && (
                <div className="home-no-project">
                  <FolderGit2 size={20} />
                  <span><strong>Your first Project begins inside a Space.</strong><small>Choose a contextual Mini App so the work stays connected.</small></span>
                  <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'apps' })}>Open Mini Apps</button>
                </div>
              )}
              <button type="button" className="home-new-project" onClick={() => setShowNewProject(true)}><Plus size={18} /><span>New Project</span></button>
            </div>
          </section>

          <div className="home-dashboard">
            <section className="home-plan">
              <header><div><span>ACTIVE TASKS</span><h2>{completedTasks}/{tasks.length} complete</h2></div><Circle size={17} /></header>
              <div className="home-task-list">
                {tasksReady && tasks.length === 0 && <div className="home-panel-empty"><Check size={19} /><strong>A clear start</strong><span>Add only the next useful actions for today.</span></div>}
                {tasks.map(task => (
                  <div key={task.id} className={task.done ? 'is-done' : ''}>
                    <button type="button" onClick={() => setTasks(current => current.map(item => item.id === task.id ? { ...item, done: !item.done } : item))}>{task.done && <Check size={12} />}</button>
                    <span>{task.text}</span>
                    <button type="button" onClick={() => setTasks(current => current.filter(item => item.id !== task.id))}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              <form onSubmit={addTask}><input value={newTask} maxLength={200} onChange={event => setNewTask(event.target.value)} placeholder="Add one useful next action" /><button type="submit" disabled={!newTask.trim()}><Plus size={14} /></button></form>
            </section>

            <section className="home-space-activity">
              <header><div><span>SOCIAL FEED</span><h2>{activeSpace.name} activity</h2></div><button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'lifestyle' })}>Open feed</button></header>
              <div>
                {activity.slice(0, 5).map(post => (
                  <article key={post.id}>
                    <span>{post.author_name.slice(0, 1)}</span>
                    <div>
                      <strong>{post.author_name}<small>{post.author_handle}</small></strong>
                      <p>{post.body}</p>
                      {post.project_id && <button type="button" onClick={() => openProject(post.project_id!)}><FolderGit2 size={12} /> {post.project_name}</button>}
                    </div>
                  </article>
                ))}
                {activity.length === 0 && <div className="home-panel-empty"><Users size={19} /><strong>No recent activity yet</strong><span>Useful Project updates from this Space will appear here.</span></div>}
              </div>
            </section>
          </div>
        </div>

        <aside className="home-right-rail">
          <section className="home-solar">
            <div><Sun size={17} /><span><small>XP / SOLAR</small><strong>{solar.identity}</strong></span></div>
            <b>{solar.total} Solar</b>
            <p>{solar.next_threshold ? `${solar.next_threshold - solar.total} until your next identity` : 'Highest identity reached'}</p>
          </section>
          <section className="home-streak">
            <strong>{streak} day streak</strong>
            <p>Showing up in Helios keeps the orbit warm.</p>
          </section>
          <section className="home-learning">
            <header><span><BookOpen size={12} /> LEARNING</span><button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'learn' })}>Learn</button></header>
            <p>{learning.name}: {learning.apps.length} connected Mini Apps</p>
            <div>
              {learning.apps.slice(0, 3).map(id => {
                const app = getUtilityMiniApp(id)
                return app ? <button type="button" key={id} onClick={() => openApp(id)}>{app.name}</button> : null
              })}
            </div>
          </section>
          <section className="home-live">
            <header><span><i /> COLLABORATORS</span><button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'live' })}>See all</button></header>
            <div>
              {live.slice(0, 4).map(session => (
                <button type="button" key={session.id} onClick={() => dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: session.id })}>
                  <span>{session.owner_name.slice(0, 1)}</span>
                  <div><strong>{session.owner_name}</strong><small>{session.project_name} · {session.viewer_count} watching</small></div>
                  <Radio size={12} />
                </button>
              ))}
              {live.length === 0 && <div className="home-compact-empty">No collaborators Live now.</div>}
            </div>
          </section>
          <section className="home-notifications">
            <header><span><Bell size={12} /> UPCOMING / ALERTS</span><b>{unread.length} unread</b></header>
            <div>
              {notifications.slice(0, 5).map(item => (
                <button type="button" key={item.id} className={item.read ? '' : 'is-unread'} onClick={() => void routeNotification(item)}>
                  <i>{item.kind.includes('chat') ? <MessageCircle size={12} /> : item.kind.includes('live') ? <Radio size={12} /> : <Sparkles size={12} />}</i>
                  <span><strong>{item.title}</strong><small>{item.detail}</small></span>
                </button>
              ))}
              {notifications.length === 0 && <div className="home-compact-empty">You are caught up.</div>}
            </div>
          </section>
        </aside>
      </div>
    )}
  </div>
}

function HomeSkeleton() {
  return (
    <div className="home-skeleton" role="status" aria-label="Loading Home">
      <div style={{ height: 80, borderRadius: 16, background: 'var(--helios-surface2)' }} />
      <div style={{ height: 200, borderRadius: 16, background: 'var(--helios-surface2)', marginTop: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
        <div style={{ height: 320, borderRadius: 16, background: 'var(--helios-surface2)' }} />
        <div style={{ height: 320, borderRadius: 16, background: 'var(--helios-surface2)' }} />
      </div>
    </div>
  )
}
