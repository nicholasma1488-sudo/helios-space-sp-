import { useEffect, useMemo, useState } from 'react'
import {
  Bell, Check, Circle, FolderGit2, MessageCircle, Plus, Radio, Sparkles,
  Trash2, UserPlus, Users,
} from 'lucide-react'
import { api, type ApiNotification, type LiveSession, type Post } from '../api'
import { NewProjectModal } from '../components/NewProjectModal'
import { getSuiteApp } from '../product/miniApps'
import { useApp } from '../store/appStore'
import './HomeView.css'

interface TodayTask { id: string; text: string; done: boolean }

function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function HomeView() {
  const { state, dispatch } = useApp()
  const [tasks, setTasks] = useState<TodayTask[]>([])
  const [tasksReady, setTasksReady] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [live, setLive] = useState<LiveSession[]>([])
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [activity, setActivity] = useState<Post[]>([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const taskKey = useMemo(
    () => (state.user?.id ? `helios-today-tasks-v3-${state.user.id}-${dayKey()}` : ''),
    [state.user?.id],
  )
  const recent = useMemo(
    () => [...state.projects].sort((a, b) => +new Date(b.updated_at) - +new Date(a.updated_at)),
    [state.projects],
  )
  const unread = notifications.filter(item => !item.read)
  const doneCount = tasks.filter(task => task.done).length
  const firstName = state.user?.name?.split(' ')[0] || 'friend'

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
    if (taskKey && tasksReady) {
      try { localStorage.setItem(taskKey, JSON.stringify(tasks)) } catch { /* ignore */ }
    }
  }, [taskKey, tasks, tasksReady])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    Promise.all([
      api.live.list(),
      api.notifications.list(),
      api.posts.list({ limit: 6 }),
    ]).then(([liveResult, notificationResult, postResult]) => {
      if (cancelled) return
      setLive(liveResult.sessions || [])
      setNotifications(notificationResult.notifications || [])
      setActivity(postResult.posts || [])
    }).catch(err => {
      if (!cancelled) setError((err as Error).message || 'Home could not load')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  function addTask(event: React.FormEvent) {
    event.preventDefault()
    const text = newTask.trim()
    if (!text) return
    setTasks(current => [...current, { id: crypto.randomUUID(), text, done: false }])
    setNewTask('')
  }

  function openProject(projectId: number) {
    const project = state.projects.find(item => item.id === projectId)
    if (!project) return
    dispatch({ type: 'SET_ACTIVE_SUBJECT', subjectId: project.space_id })
    dispatch({ type: 'OPEN_CODE_EDITOR', projectId })
  }

  async function openNotification(item: ApiNotification) {
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
    } else if (item.target_type === 'post' && id) {
      sessionStorage.setItem('helios-open-post', String(id))
      dispatch({ type: 'SET_VIEW', view: 'lifestyle' })
    }
  }

  function askHeliosAbout(projectId: number) {
    const project = state.projects.find(item => item.id === projectId)
    if (!project) return
    sessionStorage.setItem('helios-workspace-context', JSON.stringify({
      project_id: project.id,
      project_name: project.name,
      app_kind: project.app_kind,
      selected_content: (project.content || '').slice(0, 4000),
    }))
    sessionStorage.setItem('helios-pending-prompt', `Explain what is in "${project.name}" in plain language, without opening the file.`)
    dispatch({ type: 'OPEN_HELIOS_PANEL' })
  }

  return (
    <div className="home-page home-simple">
      {showNewProject && <NewProjectModal onClose={() => setShowNewProject(false)} />}

      {loading && <div className="home-skeleton" role="status" aria-label="Loading" />}
      {error && (
        <div role="alert" className="home-error">
          {error}
          <button type="button" onClick={() => window.location.reload()}>Reload</button>
        </div>
      )}

      {!loading && (
        <>
          <header className="home-hero">
            <div>
              <span>{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              <h1>Hi, {firstName}</h1>
              <p>See what your buddies are doing, or create something and push it forward together.</p>
            </div>
            <div className="home-hero-actions">
              <button
                type="button"
                className="home-btn-primary liquid-glass-btn is-primary"
                onClick={() => window.dispatchEvent(new CustomEvent('helios-open-create-panel'))}
              >
                <Plus size={16} /> Continue
              </button>
            </div>
          </header>

          <section className="home-section" aria-labelledby="home-files-title">
            <header>
              <div>
                <span>Files / Projects</span>
                <h2 id="home-files-title">Recently in progress</h2>
              </div>
              <button type="button" onClick={() => setShowNewProject(true)}><Plus size={14} /> New file</button>
            </header>
            <div className="home-file-grid">
              {recent.slice(0, 8).map(project => {
                const app = getSuiteApp(project.app_kind)
                return (
                  <article key={project.id} className="home-file-card glass-lift">
                    <button type="button" className="home-file-main" onClick={() => openProject(project.id)}>
                      <i style={{ background: app?.color || 'var(--helios-accent)' }}>{app?.letter || '·'}</i>
                      <span>
                        <small>{app?.name || 'File'}</small>
                        <strong>{project.name}</strong>
                        <p>Updated {new Date(project.updated_at).toLocaleString()}</p>
                      </span>
                    </button>
                    <div className="home-file-actions">
                      <button type="button" onClick={() => openProject(project.id)}>
                        <FolderGit2 size={14} /> Open
                      </button>
                      <button type="button" onClick={() => askHeliosAbout(project.id)}>
                        <Sparkles size={14} /> Preview
                      </button>
                      <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'chat' })}>
                        <UserPlus size={14} /> Invite
                      </button>
                    </div>
                  </article>
                )
              })}
              {recent.length === 0 && (
                <div className="home-empty">
                  <FolderGit2 size={22} />
                  <strong>No files yet</strong>
                  <span>Pick a Mini App, then share it to Space when you are done.</span>
                  <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('helios-open-create-panel'))}>Open Mini App</button>
                </div>
              )}
            </div>
          </section>

          <div className="home-columns">
            <section className="home-section" aria-labelledby="home-tasks-title">
              <header>
                <div>
                  <span>Today</span>
                  <h2 id="home-tasks-title">{doneCount}/{tasks.length} done</h2>
                </div>
                <Circle size={16} />
              </header>
              <div className="home-task-list">
                {tasksReady && tasks.length === 0 && (
                  <div className="home-empty compact">
                    <Check size={18} />
                    <strong>Nothing on the list yet</strong>
                    <span>Add one thing you need to do today.</span>
                  </div>
                )}
                {tasks.map(task => (
                  <div key={task.id} className={task.done ? 'is-done' : ''}>
                    <button
                      type="button"
                      aria-label={task.done ? 'Mark as not done' : 'Mark as done'}
                      onClick={() => setTasks(current => current.map(item => item.id === task.id ? { ...item, done: !item.done } : item))}
                    >
                      {task.done && <Check size={12} />}
                    </button>
                    <span>{task.text}</span>
                    <button type="button" aria-label="Delete" onClick={() => setTasks(current => current.filter(item => item.id !== task.id))}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <form onSubmit={addTask} className="home-task-form">
                <input value={newTask} maxLength={200} onChange={event => setNewTask(event.target.value)} placeholder="Add a task for today" />
                <button type="submit" disabled={!newTask.trim()}><Plus size={14} /></button>
              </form>
            </section>

            <section className="home-section" aria-labelledby="home-buddies-title">
              <header>
                <div>
                  <span>WorkBuddies</span>
                  <h2 id="home-buddies-title">People you work with</h2>
                </div>
                <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'lifestyle' })}>See updates</button>
              </header>
              <div className="home-buddy-list">
                {live.slice(0, 5).map(session => (
                  <button key={session.id} type="button" onClick={() => dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: session.id })}>
                    <span className="home-buddy-avatar">{session.owner_name.slice(0, 1)}</span>
                    <span>
                      <strong>{session.owner_name}</strong>
                      <small><Radio size={11} /> Live now · {session.project_name}</small>
                    </span>
                  </button>
                ))}
                {activity.slice(0, 4).map(post => (
                  <button
                    key={`post-${post.id}`}
                    type="button"
                    onClick={() => {
                      sessionStorage.setItem('helios-open-post', String(post.id))
                      dispatch({ type: 'SET_VIEW', view: 'lifestyle' })
                    }}
                  >
                    <span className="home-buddy-avatar">{post.author_name.slice(0, 1)}</span>
                    <span>
                      <strong>{post.author_name}</strong>
                      <small>{post.body.slice(0, 60)}</small>
                    </span>
                  </button>
                ))}
                {live.length === 0 && activity.length === 0 && (
                  <div className="home-empty compact">
                    <Users size={18} />
                    <strong>No WorkBuddy activity yet</strong>
                    <span>Post on Space, or invite a friend to collaborate.</span>
                  </div>
                )}
              </div>
            </section>

            <section className="home-section" aria-labelledby="home-notes-title">
              <header>
                <div>
                  <span>Alerts</span>
                  <h2 id="home-notes-title">{unread.length} unread</h2>
                </div>
                <Bell size={16} />
              </header>
              <div className="home-note-list">
                {notifications.slice(0, 6).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={item.read ? '' : 'is-unread'}
                    onClick={() => void openNotification(item)}
                  >
                    <i>{item.kind.includes('chat') ? <MessageCircle size={12} /> : item.kind.includes('live') ? <Radio size={12} /> : <Sparkles size={12} />}</i>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.detail}</small>
                    </span>
                  </button>
                ))}
                {notifications.length === 0 && (
                  <div className="home-empty compact">You are caught up on alerts.</div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}
