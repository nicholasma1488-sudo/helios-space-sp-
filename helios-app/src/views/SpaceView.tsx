import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bookmark, BookOpen, ChevronRight, Copy, FolderGit2, MessageCircle,
  Plus, Radio, Rocket, Send, Sparkles, Users,
} from 'lucide-react'
import { api, type Comment, type Conversation, type LiveSession, type Post, type Project } from '../api'
import { NewProjectModal } from '../components/NewProjectModal'
import { MINI_APP_CATALOG, getMiniApp, getSpaceDefinition, type MiniAppDefinition } from '../product/catalog'
import { categoryForSpace, openCreatorProfile, openOrCreateProjectChat, openProjectWorkspace } from '../product/flow'
import { useApp, type SpaceTab } from '../store/appStore'
import './SpaceView.css'

const TABS: Array<{ id: SpaceTab; label: string }> = [
  { id: 'feed', label: 'Feed' },
  { id: 'apps', label: 'Mini Apps' },
  { id: 'projects', label: 'Projects' },
  { id: 'chat', label: 'Chat' },
  { id: 'live', label: 'Live' },
  { id: 'members', label: 'Members' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'resources', label: 'Resources' },
  { id: 'helios', label: 'Helios AI' },
]

export function SpaceView() {
  const { state, dispatch } = useApp()
  const space = getSpaceDefinition(state.activeSpaceId)
  const miniApps = space.miniApps.map(getMiniApp)
  const projects = state.projects.filter(project => project.space_id === space.id)
  const [posts, setPosts] = useState<Post[]>([])
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [composer, setComposer] = useState('')
  const [linkedProjectId, setLinkedProjectId] = useState<number | null>(null)
  const [posting, setPosting] = useState(false)
  const [launchApp, setLaunchApp] = useState<MiniAppDefinition | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [postResult, liveResult] = await Promise.all([
        api.posts.list({ space_id: space.id, limit: 30 }),
        api.live.list(space.id),
      ])
      setPosts(postResult.posts)
      setLiveSessions(liveResult.sessions)
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: `Space activity could not load: ${(error as Error).message}`, tone: 'warning' } })
    } finally {
      setLoading(false)
    }
  }, [dispatch, space.id])

  useEffect(() => { void refresh() }, [refresh])

  const members = useMemo(() => {
    const unique = new Map<number, { id: number; name: string; handle: string }>()
    if (state.user) unique.set(state.user.id, { id: state.user.id, name: state.user.name, handle: state.user.handle })
    posts.forEach(post => {
      if (post.author_id) unique.set(post.author_id, { id: post.author_id, name: post.author_name, handle: post.author_handle })
    })
    return [...unique.values()]
  }, [posts, state.user])

  async function submitPost(event: React.FormEvent) {
    event.preventDefault()
    const body = composer.trim()
    if (!body || posting) return
    setPosting(true)
    try {
      const result = await api.posts.create({
        body,
        category: categoryForSpace(space.id),
        audience: 'public',
        project_id: linkedProjectId ?? undefined,
        space_id: space.id,
        post_type: `${space.id}-progress`,
      })
      setPosts(current => [result.post, ...current])
      setComposer('')
      setLinkedProjectId(null)
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: `Progress shared in ${space.name}`, tone: 'success' } })
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    } finally {
      setPosting(false)
    }
  }

  async function openProject(projectId: number) {
    try { await openProjectWorkspace(projectId, state.projects, dispatch) }
    catch (error) { dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } }) }
  }

  async function startLive(project: Project) {
    try {
      const result = await api.live.create({ project_id: project.id, title: `Building ${project.name} in ${space.name}`, audience: 'public' })
      dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: result.session.id })
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: `Could not go live: ${(error as Error).message}`, tone: 'warning' } })
    }
  }

  return (
    <div className="space-view" style={{ '--space-accent': space.accent } as React.CSSProperties}>
      {launchApp && (
        <NewProjectModal
          onClose={() => setLaunchApp(null)}
          initialSpace={space.name}
          initialSpaceId={space.id}
          initialType={launchApp.projectType}
          initialAppKind={launchApp.id}
          initialAppName={launchApp.name}
        />
      )}
      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} initialSpace={space.name} initialSpaceId={space.id} />
      )}

      <header className="space-hero">
        <div className="space-hero-orbit" aria-hidden="true"><i /><i /><span>{space.name.slice(0, 1)}</span></div>
        <div className="space-hero-copy">
          <span>{space.kind === 'subject' ? 'SUBJECT SPACE' : 'HOBBY SPACE'}</span>
          <h1>{space.name}</h1>
          <p>{space.description}</p>
        </div>
        <div className="space-hero-stats">
          <span><strong>{projects.length}</strong> Projects</span>
          <span><strong>{liveSessions.length}</strong> Live now</span>
          <span><strong>{members.length}</strong> Active people</span>
        </div>
        <div className="space-hero-actions">
          <button type="button" onClick={() => { dispatch({ type: 'SET_SPACE_TAB', tab: 'apps' }); setLaunchApp(miniApps[0]) }}><Plus size={15} /> Open {miniApps[0]?.shortName}</button>
          <button type="button" onClick={() => dispatch({ type: 'SET_SPACE_TAB', tab: 'chat' })}><MessageCircle size={15} /> Chat Hub</button>
          <button type="button" onClick={() => dispatch({ type: 'SET_SPACE_TAB', tab: 'live' })}><Radio size={15} /> View Live</button>
        </div>
      </header>

      <nav className="space-tabs" aria-label={`${space.name} sections`}>
        {TABS.map(tab => (
          <button type="button" key={tab.id} aria-current={state.activeSpaceTab === tab.id ? 'page' : undefined} onClick={() => dispatch({ type: 'SET_SPACE_TAB', tab: tab.id })} className={state.activeSpaceTab === tab.id ? 'is-active' : ''}>{tab.label}</button>
        ))}
      </nav>

      <main className="space-content">
        {state.activeSpaceTab === 'feed' && (
          <SpaceFeed
            spaceName={space.name}
            miniApps={miniApps}
            projects={projects}
            liveSessions={liveSessions}
            posts={posts}
            loading={loading}
            composer={composer}
            setComposer={setComposer}
            linkedProjectId={linkedProjectId}
            setLinkedProjectId={setLinkedProjectId}
            posting={posting}
            onSubmit={submitPost}
            onLaunch={setLaunchApp}
            onOpenProject={openProject}
            onOpenLive={sessionId => dispatch({ type: 'OPEN_LIVE_SESSION', sessionId })}
            onPostUpdate={updated => setPosts(current => current.map(post => post.id === updated.id ? updated : post))}
          />
        )}
        {state.activeSpaceTab === 'projects' && <ProjectsPanel projects={projects} sessions={liveSessions} onOpen={openProject} onNew={() => setShowNewProject(true)} onChat={project => void openOrCreateProjectChat(project, dispatch)} onLive={startLive} />}
        {state.activeSpaceTab === 'apps' && <MiniAppsPanel apps={miniApps} catalog={MINI_APP_CATALOG} projects={projects} sessions={liveSessions} onLaunch={setLaunchApp} onOpen={openProject} onLive={startLive} />}
        {state.activeSpaceTab === 'chat' && <SpaceChatPanel spaceId={space.id} projects={projects} onOpenProject={openProject} />}
        {state.activeSpaceTab === 'live' && <LivePanel sessions={liveSessions} projects={projects} onOpen={id => dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: id })} onStart={startLive} />}
        {state.activeSpaceTab === 'members' && <MembersPanel members={members} currentUserId={state.user?.id ?? 0} />}
        {state.activeSpaceTab === 'challenges' && <ChallengesPanel spaceName={space.name} apps={miniApps} onStart={setLaunchApp} />}
        {state.activeSpaceTab === 'resources' && <ResourcesPanel spaceName={space.name} />}
        {state.activeSpaceTab === 'helios' && <HeliosSpacePanel prompts={space.prompts} spaceName={space.name} onOpen={() => dispatch({ type: 'OPEN_HELIOS_PANEL' })} />}
      </main>
    </div>
  )
}

function SpaceFeed({
  spaceName, miniApps, projects, liveSessions, posts, loading, composer, setComposer,
  linkedProjectId, setLinkedProjectId, posting, onSubmit, onLaunch, onOpenProject,
  onOpenLive, onPostUpdate,
}: {
  spaceName: string
  miniApps: MiniAppDefinition[]
  projects: Project[]
  liveSessions: LiveSession[]
  posts: Post[]
  loading: boolean
  composer: string
  setComposer: (value: string) => void
  linkedProjectId: number | null
  setLinkedProjectId: (value: number | null) => void
  posting: boolean
  onSubmit: (event: React.FormEvent) => void
  onLaunch: (app: MiniAppDefinition) => void
  onOpenProject: (id: number) => void
  onOpenLive: (id: number) => void
  onPostUpdate: (post: Post) => void
}) {
  return (
    <div className="space-feed-layout">
      <section className="space-feed-main">
        <div className="space-section-heading"><div><span>ACTIVE COMMUNITY</span><h2>{spaceName} Feed</h2></div><small>Work, feedback and meaningful progress</small></div>
        <form className="space-composer" onSubmit={onSubmit}>
          <div><Sparkles size={17} /><textarea value={composer} maxLength={2000} onChange={event => setComposer(event.target.value)} placeholder={`Share useful ${spaceName} progress, a question, result or project update…`} aria-label={`Post in ${spaceName}`} /></div>
          <footer>
            <label><FolderGit2 size={13} /><select value={linkedProjectId ?? ''} onChange={event => setLinkedProjectId(event.target.value ? Number(event.target.value) : null)} aria-label="Link project"><option value="">No linked project</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <button type="submit" disabled={!composer.trim() || posting}><Send size={14} /> {posting ? 'Sharing…' : 'Share progress'}</button>
          </footer>
        </form>
        {loading && <SpaceSkeleton />}
        {!loading && posts.length === 0 && <div className="space-empty"><MessageCircle size={23} /><strong>Start the useful conversation</strong><span>Share the first project update, question or finding in this Space.</span></div>}
        {!loading && posts.map(post => <SpacePostCard key={post.id} post={post} onOpenProject={onOpenProject} onUpdate={onPostUpdate} />)}
      </section>

      <aside className="space-feed-side">
        <section>
          <div className="side-section-heading"><h2>Start creating</h2><span>{miniApps.length} contextual tools</span></div>
          <div className="space-mini-list">{miniApps.slice(0, 5).map(app => <button type="button" key={app.id} onClick={() => onLaunch(app)} style={{ '--app-accent': app.accent } as React.CSSProperties}><i>{app.shortName.slice(0, 1)}</i><span><strong>{app.name}</strong><small>{app.description}</small></span><ChevronRight size={14} /></button>)}</div>
        </section>
        <section>
          <div className="side-section-heading"><h2>Recent Projects</h2><span>{projects.length}</span></div>
          {projects.slice(0, 4).map(project => <button type="button" className="space-project-row" key={project.id} onClick={() => onOpenProject(project.id)}><FolderGit2 size={15} /><span><strong>{project.name}</strong><small>{project.app_kind} · {new Date(project.updated_at).toLocaleDateString()}</small></span></button>)}
          {projects.length === 0 && <div className="side-empty">A Mini App will create the first durable Project here.</div>}
        </section>
        <section>
          <div className="side-section-heading"><h2>Live work</h2><span>{liveSessions.length} active</span></div>
          {liveSessions.slice(0, 3).map(session => <button type="button" className="space-live-row" key={session.id} onClick={() => onOpenLive(session.id)}><i><Radio size={13} /></i><span><strong>{session.title}</strong><small>{session.owner_name} · {session.viewer_count} watching</small></span></button>)}
          {liveSessions.length === 0 && <div className="side-empty">No one is Live in this Space yet.</div>}
        </section>
      </aside>
    </div>
  )
}

function SpacePostCard({ post, onOpenProject, onUpdate }: { post: Post; onOpenProject: (id: number) => void; onUpdate: (post: Post) => void }) {
  const { state, dispatch } = useApp()
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const reactionTotal = Object.values(post.reactions).reduce((sum, value) => sum + value, 0)

  async function react() {
    if (busy) return
    setBusy(true)
    try { onUpdate((await api.posts.react(post.id, '💡')).post) }
    catch (error) { dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } }) }
    finally { setBusy(false) }
  }

  async function save() {
    if (busy) return
    setBusy(true)
    try {
      const result = await api.posts.save(post.id, !post.is_saved)
      onUpdate({ ...post, is_saved: result.saved })
    } finally { setBusy(false) }
  }

  async function requestCollaboration() {
    if (!post.project_id) return
    try {
      await api.projects.requestCollaboration(post.project_id)
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: 'Collaboration request sent with the Project attached.', tone: 'success' } })
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    }
  }

  return (
    <article className="space-post-card" data-post-id={post.id}>
      <header><span className="space-avatar">{post.author_name.slice(0, 1).toUpperCase()}</span><div><strong>{post.author_name}</strong><small>{post.author_handle} · {new Date(post.created_at).toLocaleDateString()}</small></div>{post.author_id !== state.user?.id && <button type="button" onClick={() => { if (post.author_id) void api.follow(post.author_id) }}>Follow</button>}</header>
      <p>{post.body}</p>
      {post.media_url && <img src={post.media_url} alt="Shared progress" />}
      {post.project_id && post.project_name && (
        <div className="space-post-links">
          <button type="button" className="space-post-project" onClick={() => onOpenProject(post.project_id!)}><FolderGit2 size={15} /><span><small>{post.post_type === 'live-replay' ? 'LIVE REPLAY' : 'PROJECT'}</small><strong>{post.project_name}</strong></span><ChevronRight size={15} /></button>
          {post.project_app_kind && <button type="button" className="space-post-project" onClick={() => onOpenProject(post.project_id!)}><Rocket size={15} /><span><small>MINI APP</small><strong>{getMiniApp(post.project_app_kind).name}</strong></span></button>}
        </div>
      )}
      {post.author_id && post.author_id !== state.user?.id && <button type="button" className="space-post-project" onClick={() => openCreatorProfile({ id: post.author_id!, name: post.author_name, handle: post.author_handle }, dispatch)}>Creator page <ChevronRight size={13} /></button>}
      <div className="space-post-meta"><span>💡 {reactionTotal} useful reactions</span><button type="button" onClick={() => setCommentsOpen(value => !value)}>{post.comment_count} comments</button></div>
      <footer>
        <button type="button" aria-pressed={post.my_reactions.includes('💡')} onClick={() => void react()} disabled={busy}>💡 Useful</button>
        <button type="button" onClick={() => setCommentsOpen(value => !value)}><MessageCircle size={15} /> Comment</button>
        <button type="button" aria-pressed={post.is_saved} onClick={() => void save()} disabled={busy}><Bookmark size={15} fill={post.is_saved ? 'currentColor' : 'none'} /> {post.is_saved ? 'Saved' : 'Save'}</button>
        <button type="button" onClick={() => void navigator.clipboard.writeText(post.body)}><Copy size={14} /> Share</button>
        {post.project_id && post.author_id !== state.user?.id && <button type="button" onClick={() => void requestCollaboration()}><Users size={14} /> Collaborate</button>}
      </footer>
      {commentsOpen && <SpaceComments postId={post.id} onCountChange={delta => onUpdate({ ...post, comment_count: Math.max(0, post.comment_count + delta) })} />}
    </article>
  )
}

function SpaceComments({ postId, onCountChange }: { postId: number; onCountChange: (delta: number) => void }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [draft, setDraft] = useState('')
  useEffect(() => { void api.posts.comments.list(postId).then(result => setComments(result.comments)) }, [postId])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    const result = await api.posts.comments.create(postId, body)
    setComments(current => [...current, result.comment])
    setDraft('')
    onCountChange(1)
  }
  return <section className="space-comments">{comments.map(comment => <article key={comment.id}><span>{comment.author_name.slice(0, 1)}</span><div><strong>{comment.author_name}</strong><p>{comment.body}</p></div></article>)}<form onSubmit={submit}><input value={draft} maxLength={600} onChange={event => setDraft(event.target.value)} placeholder="Add useful feedback…" aria-label="Comment" /><button type="submit" disabled={!draft.trim()}><Send size={13} /></button></form></section>
}

function ProjectsPanel({ projects, sessions, onOpen, onNew, onChat, onLive }: {
  projects: Project[]
  sessions: LiveSession[]
  onOpen: (id: number) => void
  onNew: () => void
  onChat: (project: Project) => void
  onLive: (project: Project) => void
}) {
  return (
    <section className="space-panel">
      <div className="space-panel-heading">
        <div><span>DURABLE WORK</span><h2>Projects</h2><p>Each Project stays connected to its Mini App, Chat, Live session and Feed posts.</p></div>
        <button type="button" onClick={onNew}><Plus size={15} /> New Project</button>
      </div>
      <div className="space-project-grid">
        {projects.map(project => {
          const live = sessions.find(session => session.project_id === project.id && session.status === 'live')
          const app = getMiniApp(project.app_kind)
          return (
            <article key={project.id} className="space-project-card">
              <button type="button" onClick={() => onOpen(project.id)}>
                <i><FolderGit2 size={19} /></i>
                <span>{app.name}{live ? ' · LIVE' : ''}</span>
                <strong>{project.name}</strong>
                <small>{project.visibility} · Updated {new Date(project.updated_at).toLocaleDateString()}{project.collaborator_role ? ` · ${project.collaborator_role}` : ''}</small>
              </button>
              <footer>
                <button type="button" onClick={() => onOpen(project.id)}>Open</button>
                <button type="button" onClick={() => onChat(project)}>Project Chat</button>
                {project.can_edit && <button type="button" onClick={() => onLive(project)}>{live ? 'View Live' : 'Go Live'}</button>}
              </footer>
            </article>
          )
        })}
        {projects.length === 0 && <div className="space-empty wide"><FolderGit2 size={25} /><strong>No Projects in this Space</strong><span>Start from a Mini App workspace so the work stays connected.</span></div>}
      </div>
    </section>
  )
}

function MiniAppsPanel({ apps, catalog, projects, sessions, onLaunch, onOpen, onLive }: {
  apps: MiniAppDefinition[]
  catalog: MiniAppDefinition[]
  projects: Project[]
  sessions: LiveSession[]
  onLaunch: (app: MiniAppDefinition) => void
  onOpen: (id: number) => void
  onLive: (project: Project) => void
}) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<'space' | 'all'>('space')
  const source = scope === 'space' ? apps : catalog
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return source
    return source.filter(app =>
      app.name.toLowerCase().includes(needle)
      || app.shortName.toLowerCase().includes(needle)
      || app.description.toLowerCase().includes(needle)
      || app.category.toLowerCase().includes(needle)
      || app.id.toLowerCase().includes(needle),
    )
  }, [query, source])
  const grouped = useMemo(() => {
    const map = new Map<string, MiniAppDefinition[]>()
    for (const app of filtered) {
      const list = map.get(app.category) ?? []
      list.push(app)
      map.set(app.category, list)
    }
    return [...map.entries()]
  }, [filtered])
  const coreWorkspaces = useMemo(
    () => ['web-code', 'lab-notebook', 'data-visualization', 'writing']
      .map(id => catalog.find(app => app.id === id))
      .filter((app): app is MiniAppDefinition => Boolean(app)),
    [catalog],
  )

  return (
    <section className="space-panel">
      <div className="space-panel-heading">
        <div>
          <span>CONTEXTUAL CAPABILITIES</span>
          <h2>Mini App Workspaces</h2>
          <p>Every Mini App is a Project workspace. Start from Code Editor, Notebook, Data Viz or Writing — then keep editing, collaborating and going Live from the same Project.</p>
        </div>
        <div className="space-apps-toolbar">
          <div className="workspace-mode-switch space-apps-scope">
            <button type="button" className={scope === 'space' ? 'is-active' : ''} onClick={() => setScope('space')}>This Space · {apps.length}</button>
            <button type="button" className={scope === 'all' ? 'is-active' : ''} onClick={() => setScope('all')}>All apps · {catalog.length}</button>
          </div>
          <label className="space-apps-search">
            <span className="sr-only">Search mini apps</span>
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search word, comic, lab, sheet…" />
          </label>
        </div>
      </div>
      {!query && (
        <div className="core-workspace-row" aria-label="Core workspaces">
          {coreWorkspaces.map(app => {
            const appProjects = projects.filter(project => project.app_kind === app.id)
            return (
              <button
                type="button"
                key={app.id}
                className="core-workspace-chip"
                style={{ '--app-accent': app.accent } as React.CSSProperties}
                onClick={() => appProjects[0] ? onOpen(appProjects[0].id) : onLaunch(app)}
              >
                <strong>{app.shortName}</strong>
                <span>{appProjects[0] ? `Open ${appProjects[0].name}` : 'Create Project'}</span>
              </button>
            )
          })}
        </div>
      )}
      {grouped.map(([category, categoryApps]) => (
        <div key={category} className="space-app-category">
          <div className="side-section-heading"><h2>{category}</h2><span>{categoryApps.length}</span></div>
          <div className="context-app-grid">
            {categoryApps.map(app => {
              const appProjects = projects.filter(project => project.app_kind === app.id)
              const live = sessions.find(session => appProjects.some(project => project.id === session.project_id) && session.status === 'live')
              return (
                <article key={app.id} className="mini-app-workspace-card" style={{ '--app-accent': app.accent } as React.CSSProperties}>
                  <i>{app.shortName.slice(0, 1)}</i>
                  <span>{live ? <b><Radio size={10} /> LIVE NOW</b> : app.live && <b><Radio size={10} /> LIVE READY</b>}</span>
                  <h3>{app.name}</h3>
                  <p>{app.description}</p>
                  {appProjects.length > 0 && (
                    <ul className="mini-app-project-list">
                      {appProjects.slice(0, 3).map(project => (
                        <li key={project.id}>
                          <button type="button" onClick={() => onOpen(project.id)}><FolderGit2 size={12} /> {project.name}</button>
                          {project.can_edit && <button type="button" onClick={() => onLive(project)}>Go Live</button>}
                        </li>
                      ))}
                    </ul>
                  )}
                  <footer>
                    {appProjects[0] && <button type="button" onClick={() => onOpen(appProjects[0].id)}>Open workspace</button>}
                    <button type="button" onClick={() => onLaunch(app)}>Create Project <Rocket size={14} /></button>
                  </footer>
                </article>
              )
            })}
          </div>
        </div>
      ))}
      {filtered.length === 0 && (
        <div className="space-empty wide">
          <Rocket size={25} />
          <strong>No mini apps match</strong>
          <span>Try “comic”, “sheet”, “lab” or “word”.</span>
        </div>
      )}
    </section>
  )
}

function SpaceChatPanel({ spaceId, projects, onOpenProject }: { spaceId: string; projects: Project[]; onOpenProject: (id: number) => void }) {
  const { dispatch } = useApp()
  const [conversations, setConversations] = useState<Conversation[]>([])
  useEffect(() => { void api.chat.list().then(result => setConversations(result.conversations.filter(item => item.space_id === spaceId || (item.project_id && projects.some(project => project.id === item.project_id))))) }, [projects, spaceId])
  const projectChats = conversations.filter(item => item.kind === 'project')
  const groups = conversations.filter(item => item.kind === 'group')
  const privates = conversations.filter(item => item.kind === 'private')
  return (
    <section className="space-panel">
      <div className="space-panel-heading">
        <div><span>SPACE CONVERSATIONS</span><h2>Chat Hub</h2><p>Project Chat stays bound to the work. Group and Private chats stay in the same visual system.</p></div>
        <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'chat' })}><MessageCircle size={15} /> Open full Chat Hub</button>
      </div>
      <div className="space-chat-columns">
        <ChatKindColumn title="Project Chat" detail="Bound to a Project, collaborators and Mini App" items={projectChats} empty="Open a Project and start its chat." onOpen={id => { sessionStorage.setItem('helios-open-conversation', String(id)); dispatch({ type: 'SET_VIEW', view: 'chat' }) }} extra={item => item.project_id ? <button type="button" onClick={() => onOpenProject(item.project_id!)}>Open Project</button> : null} />
        <ChatKindColumn title="Group Chat" detail="Several people, one thread" items={groups} empty="Create a group from Chat Hub." onOpen={id => { sessionStorage.setItem('helios-open-conversation', String(id)); dispatch({ type: 'SET_VIEW', view: 'chat' }) }} />
        <ChatKindColumn title="Private Chat" detail="Two people" items={privates} empty="Start a private chat from Chat Hub." onOpen={id => { sessionStorage.setItem('helios-open-conversation', String(id)); dispatch({ type: 'SET_VIEW', view: 'chat' }) }} />
      </div>
    </section>
  )
}

function ChatKindColumn({ title, detail, items, empty, onOpen, extra }: {
  title: string
  detail: string
  items: Conversation[]
  empty: string
  onOpen: (id: number) => void
  extra?: (item: Conversation) => React.ReactNode
}) {
  return (
    <section className="space-chat-column">
      <header><strong>{title}</strong><small>{detail}</small></header>
      {items.map(item => (
        <article key={item.id}>
          <button type="button" onClick={() => onOpen(item.id)}>
            <strong>{item.title}</strong>
            <small>{item.last_message || 'No messages yet'}{item.unread ? ` · ${item.unread} unread` : ''}</small>
          </button>
          {extra?.(item)}
        </article>
      ))}
      {items.length === 0 && <p>{empty}</p>}
    </section>
  )
}

function LivePanel({ sessions, projects, onOpen, onStart }: { sessions: LiveSession[]; projects: Project[]; onOpen: (id: number) => void; onStart: (project: Project) => void }) {
  return <section className="space-panel"><div className="space-panel-heading"><div><span>WORK HAPPENING NOW</span><h2>Live collaborative work</h2><p>Live opens the actual Project—not a detached video stream.</p></div></div><div className="space-live-grid">{sessions.map(session => <button type="button" key={session.id} onClick={() => onOpen(session.id)}><span><i /> LIVE · {session.viewer_count} watching</span><h3>{session.title}</h3><p>{session.owner_name} is working in {session.project_name}</p><b>Join workspace <ChevronRight size={13} /></b></button>)}{projects.map(project => <article key={project.id}><Radio size={20} /><h3>Go Live with {project.name}</h3><p>Share the changing work and receive comments or suggestions.</p><button type="button" onClick={() => onStart(project)}>Go Live</button></article>)}{sessions.length === 0 && projects.length === 0 && <div className="space-empty wide"><Radio size={25} /><strong>No Live work yet</strong><span>Create a Project, then Go Live from its common shell.</span></div>}</div></section>
}

function MembersPanel({ members, currentUserId }: { members: Array<{ id: number; name: string; handle: string }>; currentUserId: number }) {
  return <section className="space-panel"><div className="space-panel-heading"><div><span>PEOPLE AROUND THE WORK</span><h2>Active members</h2><p>Creators are surfaced through useful contributions, not a compulsive leaderboard.</p></div></div><div className="space-member-grid">{members.map(member => <article key={member.id}><span>{member.name.slice(0, 1)}</span><div><strong>{member.name}</strong><small>{member.handle}{member.id === currentUserId ? ' · You' : ''}</small></div>{member.id !== currentUserId && <button type="button" onClick={() => void api.follow(member.id)}>Follow work</button>}</article>)}</div></section>
}

function ChallengesPanel({ spaceName, apps, onStart }: { spaceName: string; apps: MiniAppDefinition[]; onStart: (app: MiniAppDefinition) => void }) {
  const challenges = [
    ['Make one honest first draft', 'Create work before optimizing it.', apps[0]],
    ['Explain the difficult part', 'Publish a useful project-backed reflection.', apps[Math.min(1, apps.length - 1)]],
    ['Help another creator', 'Leave specific feedback that moves work forward.', apps[0]],
  ] as const
  return <section className="space-panel"><div className="space-panel-heading"><div><span>MEANINGFUL MOMENTUM</span><h2>{spaceName} Challenges</h2><p>Solar recognises completion and helping—not empty clicks.</p></div></div><div className="challenge-grid">{challenges.map(([title, detail, app], index) => <article key={title}><span>0{index + 1}</span><h3>{title}</h3><p>{detail}</p><small>+ Solar after genuine completion</small><button type="button" onClick={() => onStart(app)}>Start with {app.shortName}</button></article>)}</div></section>
}

function ResourcesPanel({ spaceName }: { spaceName: string }) {
  return <section className="space-panel"><div className="space-panel-heading"><div><span>KEEP CONTEXT CLOSE</span><h2>{spaceName} Resources</h2><p>Project notes, shared explanations and community findings stay near the work.</p></div></div><div className="resource-grid"><article><BookOpen size={20} /><h3>Project-backed notes</h3><p>Open Notes or Reader to create a durable resource others can reference.</p></article><article><MessageCircle size={20} /><h3>Useful discussions</h3><p>Comments and Project Chats preserve decisions beside their source.</p></article><article><Radio size={20} /><h3>Live session history</h3><p>Ended sessions retain their event history as a practical replay artifact.</p></article></div></section>
}

function HeliosSpacePanel({ prompts, spaceName, onOpen }: { prompts: string[]; spaceName: string; onOpen: () => void }) {
  return <section className="space-panel helios-space-panel"><div><span className="helios-space-orb"><Sparkles size={27} /></span><small>CONTEXT: {spaceName.toUpperCase()}</small><h2>Helios understands where you are.</h2><p>Open the side panel with this Space, its active Project, Mini App and selected work in the context packet.</p><div>{prompts.map(prompt => <button type="button" key={prompt} onClick={() => { sessionStorage.setItem('helios-pending-prompt', prompt); onOpen() }}>{prompt}<ChevronRight size={13} /></button>)}</div><button type="button" className="helios-open-button" onClick={onOpen}><Sparkles size={15} /> Open Helios</button></div></section>
}

function SpaceSkeleton() {
  return <div className="space-skeleton" aria-label="Loading Space activity"><i /><i /><i /></div>
}
