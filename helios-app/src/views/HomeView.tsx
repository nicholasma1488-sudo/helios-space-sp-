import { useEffect, useMemo, useState } from 'react'
import { Bell, FolderGit2, Plus, Radio, Sparkles } from 'lucide-react'
import { api, type ApiNotification, type LiveSession, type Post, type SolarSummary } from '../api'
import { NewProjectModal } from '../components/NewProjectModal'
import { AnimatedButton, SpaceBackground, StatusState, UserAvatar, XPBar, previousSolarThreshold } from '../components/ui/primitives'
import { getMiniApp, getSpaceDefinition } from '../product/catalog'
import { useApp } from '../store/appStore'
import './HomeView.css'

type FeedTab = 'trending' | 'following' | 'recent' | 'saved'
const EMPTY_SOLAR: SolarSummary = { total: 0, identity: 'Dawn', next_threshold: 100, events: [] }
function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function HomeView() {
  const { state, dispatch } = useApp()
  const [tab, setTab] = useState<FeedTab>('trending')
  const [posts, setPosts] = useState<Post[]>([])
  const [solar, setSolar] = useState<SolarSummary>(EMPTY_SOLAR)
  const [live, setLive] = useState<LiveSession[]>([])
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const activeSpace = getSpaceDefinition(state.activeSpaceId)
  const recent = [...state.projects].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const unread = notifications.filter(item => !item.read)
  const firstName = state.user?.name.split(' ')[0] ?? 'there'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    const filters = tab === 'saved'
      ? { saved: true, limit: 12 }
      : tab === 'following'
        ? { following: true, limit: 12 }
        : tab === 'recent'
          ? { space_id: state.activeSpaceId, limit: 12 }
          : { limit: 12 }
    Promise.all([
      api.posts.list(filters),
      api.solar(),
      api.live.list(),
      api.notifications.list(),
    ]).then(([postResult, solarResult, liveResult, notificationResult]) => {
      if (cancelled) return
      setPosts(postResult.posts)
      setSolar(solarResult)
      setLive(liveResult.sessions)
      setNotifications(notificationResult.notifications)
    }).catch(reason => {
      if (!cancelled) setError((reason as Error).message || 'Home could not load')
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tab, state.activeSpaceId])

  function openProject(projectId: number) {
    const project = state.projects.find(item => item.id === projectId)
    if (project) {
      dispatch({ type: 'SET_ACTIVE_SUBJECT', subjectId: project.space_id })
      dispatch({ type: 'OPEN_CODE_EDITOR', projectId })
    }
  }

  async function react(post: Post) {
    try {
      const result = await api.posts.react(post.id, '✨')
      setPosts(current => current.map(item => item.id === post.id ? result.post : item))
    } catch (reason) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (reason as Error).message, tone: 'warning' } })
    }
  }

  return (
    <div className="home-page home-os">
      <SpaceBackground />
      {showNewProject && <NewProjectModal initialSpace={activeSpace.name} initialSpaceId={activeSpace.id} onClose={() => setShowNewProject(false)} />}
      <header className="home-os-hero">
        <div>
          <span className="os-kicker">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <h1>Welcome back, {firstName}.</h1>
          <p>The orbit is live. Resume work, follow people, or open a Mini App.</p>
        </div>
        <XPBar total={solar.total} identity={solar.identity} nextThreshold={solar.next_threshold} previousThreshold={previousSolarThreshold(solar.identity)} />
      </header>

      <section className="home-os-resume">
        <header>
          <h2>Continue</h2>
          <AnimatedButton onClick={() => setShowNewProject(true)}><Plus size={15} /> New project</AnimatedButton>
        </header>
        <div>
          {recent.slice(0, 4).map(project => (
            <button key={project.id} type="button" onClick={() => openProject(project.id)} style={{ '--home-accent': getSpaceDefinition(project.space_id).accent } as React.CSSProperties}>
              <UserAvatar name={project.name} size={40} />
              <span>
                <small>{getSpaceDefinition(project.space_id).name} · {getMiniApp(project.app_kind).shortName}</small>
                <strong>{project.name}</strong>
              </span>
            </button>
          ))}
          {recent.length === 0 && (
            <div className="home-os-empty">
              <strong>Your first project starts here.</strong>
              <AnimatedButton primary onClick={() => setShowNewProject(true)}>Create project</AnimatedButton>
            </div>
          )}
        </div>
      </section>

      <div className="home-os-body">
        <section className="home-os-feed">
          <nav aria-label="Feed">
            {([
              ['trending', 'Trending'],
              ['following', 'Following'],
              ['recent', 'Recent'],
              ['saved', 'Saved'],
            ] as const).map(([id, label]) => (
              <button key={id} type="button" className={tab === id ? 'is-on' : ''} onClick={() => setTab(id)}>{label}</button>
            ))}
          </nav>
          {loading && <StatusState kind="loading" title="Loading feed" />}
          {error && <StatusState kind="error" title="Feed unavailable" detail={error} />}
          {!loading && !error && posts.length === 0 && (
            <StatusState kind="empty" title={tab === 'following' ? 'Follow creators to fill this stream' : 'Nothing here yet'} detail="Share a project update or explore public work." />
          )}
          {!loading && posts.map(post => (
            <article key={post.id} className="home-os-post">
              <UserAvatar name={post.author_name} />
              <div>
                <header>
                  <strong>{post.author_name}</strong>
                  <small>{post.author_handle} · {getSpaceDefinition(post.space_id).name}</small>
                </header>
                <p>{post.body}</p>
                {post.media_url && <img src={post.media_url} alt="" />}
                {post.project_id && (
                  <button type="button" onClick={() => openProject(post.project_id!)}>
                    <FolderGit2 size={14} /> {post.project_name}
                  </button>
                )}
                <footer>
                  <button type="button" onClick={() => void react(post)} aria-pressed={post.my_reactions.includes('✨')}>
                    <Sparkles size={14} /> {Object.values(post.reactions).reduce((sum, value) => sum + value, 0)}
                  </button>
                  <span>{post.comment_count} comments</span>
                </footer>
              </div>
            </article>
          ))}
        </section>
        <aside>
          <section>
            <header><Radio size={14} /> Live now</header>
            {live.slice(0, 4).map(session => (
              <button key={session.id} type="button" onClick={() => dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: session.id })}>
                <span>{session.owner_name}</span>
                <small>{session.project_name} · {session.viewer_count}</small>
              </button>
            ))}
            {live.length === 0 && <p>No live sessions. Presence appears when someone uses Go Live.</p>}
          </section>
          <section>
            <header><Bell size={14} /> Notifications {unread.length > 0 && <b>{unread.length}</b>}</header>
            {notifications.slice(0, 5).map(item => (
              <p key={item.id}><strong>{item.title}</strong><br />{item.detail}</p>
            ))}
            {notifications.length === 0 && <p>You’re caught up.</p>}
          </section>
          <TodayTasks userId={state.user?.id} />
        </aside>
      </div>
    </div>
  )
}

function TodayTasks({ userId }: { userId?: number }) {
  const key = useMemo(() => userId ? `helios-today-tasks-v2-${userId}-${localDayKey()}` : '', [userId])
  const [tasks, setTasks] = useState<Array<{ id: string; text: string; done: boolean }>>([])
  const [draft, setDraft] = useState('')
  useEffect(() => {
    if (!key) return
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]')
      setTasks(Array.isArray(value) ? value : [])
    } catch { setTasks([]) }
  }, [key])
  useEffect(() => { if (key) try { localStorage.setItem(key, JSON.stringify(tasks)) } catch {} }, [key, tasks])
  return (
    <section>
      <header>Today</header>
      {tasks.map(task => (
        <label key={task.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input type="checkbox" checked={task.done} onChange={() => setTasks(current => current.map(item => item.id === task.id ? { ...item, done: !item.done } : item))} />
          <span style={{ textDecoration: task.done ? 'line-through' : 'none' }}>{task.text}</span>
        </label>
      ))}
      <form onSubmit={event => {
        event.preventDefault()
        if (!draft.trim()) return
        setTasks(current => [...current, { id: crypto.randomUUID(), text: draft.trim(), done: false }])
        setDraft('')
      }}>
        <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Add a next action" aria-label="New task" />
      </form>
    </section>
  )
}
