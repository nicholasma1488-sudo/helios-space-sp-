import { useEffect, useMemo, useState } from 'react'
import {
  Bell, Check, ChevronRight, Circle, FolderGit2, MessageCircle, Plus, Radio,
  Sparkles, Sun, Trash2, Users,
} from 'lucide-react'
import { api, type ApiNotification, type LiveSession, type Post, type SolarSummary } from '../api'
import { NewProjectModal } from '../components/NewProjectModal'
import { getMiniApp, getSpaceDefinition } from '../product/catalog'
import { useApp } from '../store/appStore'
import './HomeView.css'

interface TodayTask { id: string; text: string; done: boolean }
const EMPTY_SOLAR: SolarSummary = { total: 0, identity: 'Dawn', next_threshold: 100, events: [] }
function localDayKey(date = new Date()) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

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
  const taskKey = useMemo(() => state.user?.id ? `helios-today-tasks-v2-${state.user.id}-${localDayKey()}` : '', [state.user?.id])
  const activeSpace = getSpaceDefinition(state.activeSpaceId)
  const recent = [...state.projects].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const completedTasks = tasks.filter(task => task.done).length
  const unread = notifications.filter(item => !item.read)

  useEffect(() => {
    if (!taskKey) return
    setTasksReady(false)
    try { const value = JSON.parse(localStorage.getItem(taskKey) || '[]'); setTasks(Array.isArray(value) ? value.filter(item => item && typeof item.text === 'string') : []) } catch { setTasks([]) }
    finally { setTasksReady(true) }
  }, [taskKey])
  useEffect(() => { if (taskKey && tasksReady) try { localStorage.setItem(taskKey, JSON.stringify(tasks)) } catch {} }, [taskKey, tasks, tasksReady])
  useEffect(() => {
    let cancelled = false
    setDataLoading(true)
    setDataError('')
    Promise.all([api.solar(), api.live.list(), api.notifications.list(), api.posts.list({ space_id: state.activeSpaceId, limit: 8 })]).then(([solarResult, liveResult, notificationResult, postResult]) => {
      if (cancelled) return
      setSolar(solarResult); setLive(liveResult.sessions); setNotifications(notificationResult.notifications); setActivity(postResult.posts)
    }).catch(err => {
      if (!cancelled) setDataError((err as Error).message || 'Could not load Home data')
    }).finally(() => { if (!cancelled) setDataLoading(false) })
    return () => { cancelled = true }
  }, [state.activeSpaceId])

  function addTask(event: React.FormEvent) { event.preventDefault(); const text = newTask.trim(); if (!text) return; setTasks(current => [...current, { id: crypto.randomUUID(), text, done: false }]); setNewTask('') }
  function openProject(projectId: number) { const project = state.projects.find(item => item.id === projectId); if (project) { dispatch({ type: 'SET_ACTIVE_SUBJECT', subjectId: project.space_id }); dispatch({ type: 'OPEN_CODE_EDITOR', projectId }) } }
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

  return <div className="home-page">
    {showNewProject && <NewProjectModal initialSpace={activeSpace.name} initialSpaceId={activeSpace.id} onClose={() => setShowNewProject(false)} />}

    {dataLoading && <HomeSkeleton />}
    {dataError && (
      <div role="alert" className="px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', color: 'var(--helios-danger)', fontSize: 13 }}>
        {dataError} <button type="button" onClick={() => window.location.reload()} style={{ marginLeft: 8, textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>Reload</button>
      </div>
    )}

    {!dataLoading && (
      <>
    <header className="home-heading"><div><span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span><h1>Welcome back, {state.user?.name.split(' ')[0]}.</h1><p>Resume the work that matters and stay close to useful activity.</p></div><div><button type="button" onClick={() => dispatch({ type: 'OPEN_SPACE', spaceId: activeSpace.id })}>{activeSpace.name} Space <ChevronRight size={13} /></button><button type="button" onClick={openHeliosBriefing}><Sparkles size={14} /> Helios briefing</button></div></header>

    <section className="home-resume"><header><div><span>CONTINUE / RESUME WORK</span><h2>Pick up the thread</h2></div><button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'projects' })}>All Projects <ChevronRight size={13} /></button></header><div>{recent.slice(0, 4).map(project => <button type="button" key={project.id} onClick={() => openProject(project.id)} style={{ '--home-accent': getSpaceDefinition(project.space_id).accent } as React.CSSProperties}><i><FolderGit2 size={19} /></i><span><small>{getSpaceDefinition(project.space_id).name} · {getMiniApp(project.app_kind).name}</small><strong>{project.name}</strong><p>Updated {new Date(project.updated_at).toLocaleString()}</p></span><ChevronRight size={15} /></button>)}{recent.length === 0 && <div className="home-no-project"><FolderGit2 size={20} /><span><strong>Your first Project begins inside a Space.</strong><small>Choose a contextual Mini App so the work stays connected.</small></span><button type="button" onClick={() => dispatch({ type: 'OPEN_SPACE', spaceId: activeSpace.id, tab: 'apps' })}>Open Mini Apps</button></div>}<button type="button" className="home-new-project" onClick={() => setShowNewProject(true)}><Plus size={18} /><span>New Project</span></button></div></section>

    <div className="home-dashboard">
      <section className="home-plan"><header><div><span>TODAY'S PLAN</span><h2>{completedTasks}/{tasks.length} complete</h2></div><Circle size={17} /></header><div className="home-task-list">{tasksReady && tasks.length === 0 && <div className="home-panel-empty"><Check size={19} /><strong>A clear start</strong><span>Add only the next useful actions for today.</span></div>}{tasks.map(task => <div key={task.id} className={task.done ? 'is-done' : ''}><button type="button" onClick={() => setTasks(current => current.map(item => item.id === task.id ? { ...item, done: !item.done } : item))}>{task.done && <Check size={12} />}</button><span>{task.text}</span><button type="button" onClick={() => setTasks(current => current.filter(item => item.id !== task.id))}><Trash2 size={12} /></button></div>)}</div><form onSubmit={addTask}><input value={newTask} maxLength={200} onChange={event => setNewTask(event.target.value)} placeholder="Add one useful next action" /><button type="submit" disabled={!newTask.trim()}><Plus size={14} /></button></form></section>

      <section className="home-space-activity"><header><div><span>CURRENT SPACE</span><h2>{activeSpace.name} activity</h2></div><button type="button" onClick={() => dispatch({ type: 'OPEN_SPACE', spaceId: activeSpace.id })}>Open Space</button></header><div>{activity.slice(0, 5).map(post => <article key={post.id}><span>{post.author_name.slice(0, 1)}</span><div><strong>{post.author_name}<small>{post.author_handle}</small></strong><p>{post.body}</p>{post.project_id && <button type="button" onClick={() => openProject(post.project_id!)}><FolderGit2 size={12} /> {post.project_name}</button>}</div></article>)}{activity.length === 0 && <div className="home-panel-empty"><Users size={19} /><strong>No recent activity yet</strong><span>Useful Project updates from this Space will appear here.</span></div>}</div></section>

      <aside className="home-right-rail"><section className="home-solar"><div><Sun size={17} /><span><small>SOLAR IDENTITY</small><strong>{solar.identity}</strong></span></div><b>{solar.total} Solar</b><p>{solar.next_threshold ? `${solar.next_threshold - solar.total} until your next identity` : 'Highest identity reached'}</p></section><section className="home-live"><header><span><i /> LIVE COLLABORATORS</span><button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'live' })}>See all</button></header><div>{live.slice(0, 4).map(session => <button type="button" key={session.id} onClick={() => dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: session.id })}><span>{session.owner_name.slice(0, 1)}</span><div><strong>{session.owner_name}</strong><small>{session.project_name} · {session.viewer_count} watching</small></div><Radio size={12} /></button>)}{live.length === 0 && <div className="home-compact-empty">No collaborators Live now.</div>}</div></section><section className="home-notifications"><header><span><Bell size={12} /> RELEVANT NOTIFICATIONS</span><b>{unread.length} unread</b></header><div>{notifications.slice(0, 5).map(item => <button type="button" key={item.id} className={item.read ? '' : 'is-unread'} onClick={() => void routeNotification(item)}><i>{item.kind.includes('chat') ? <MessageCircle size={12} /> : item.kind.includes('live') ? <Radio size={12} /> : <Sparkles size={12} />}</i><span><strong>{item.title}</strong><small>{item.detail}</small></span></button>)}{notifications.length === 0 && <div className="home-compact-empty">You are caught up.</div>}</div></section></aside>
    </div>
      </>
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
