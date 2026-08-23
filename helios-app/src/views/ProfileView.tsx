import { useEffect, useMemo, useState } from 'react'
import {
  Award, BookOpen, ChevronRight, Download, FolderGit2, LogOut, MessageCircle,
  Moon, Plus, Settings, Sparkles, Star, Sun, Trash2, Users,
} from 'lucide-react'
import { api, type Post, type Project, type SolarSummary, type SpaceSummary } from '../api'
import { NewProjectModal } from '../components/NewProjectModal'
import { getMiniApp, getSpaceDefinition } from '../product/catalog'
import { PLAN_PRICE_RMB, planLabel } from '../product/audience'
import { useApp } from '../store/appStore'
import './ProfileView.css'

type ProfileTab = 'Journey' | 'Projects' | 'Posts' | 'Spaces' | 'Settings'
const EMPTY_SOLAR: SolarSummary = { total: 0, identity: 'Dawn', next_threshold: 100, events: [] }

export function ProfileView() {
  const { state, dispatch } = useApp()
  const [creator, setCreator] = useState<{ id: number; name: string; handle: string } | null>(null)
  const [tab, setTab] = useState<ProfileTab>('Journey')
  const [solar, setSolar] = useState<SolarSummary>(EMPTY_SOLAR)
  const [posts, setPosts] = useState<Post[]>([])
  const [spaces, setSpaces] = useState<SpaceSummary[]>([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('helios-open-creator')
      sessionStorage.removeItem('helios-open-creator')
      if (raw) setCreator(JSON.parse(raw) as { id: number; name: string; handle: string })
    } catch {}
  }, [])

  useEffect(() => {
    let cancelled = false
    Promise.all([api.solar(), api.posts.list({ limit: 100 }), api.spaces.list()]).then(([solarResult, postResult, spaceResult]) => {
      if (cancelled) return
      setSolar(solarResult)
      const authorId = creator?.id && creator.id !== state.user?.id ? creator.id : state.user?.id
      setPosts(postResult.posts.filter(post => post.author_id === authorId))
      setSpaces(spaceResult.spaces)
    }).catch(() => {})
    return () => { cancelled = true }
  }, [creator?.id, state.user?.id])

  const joinedSpaceIds = useMemo(() => new Set([...state.projects.map(project => project.space_id), ...posts.map(post => post.space_id)]), [posts, state.projects])
  const joinedSpaces = spaces.filter(space => joinedSpaceIds.has(space.id) || space.custom)
  const ownedProjects = state.projects.filter(project => project.user_id === state.user?.id)
  const contributions = state.projects.filter(project => project.user_id !== state.user?.id)
  const helpEvents = solar.events.filter(event => event.source_type === 'help')
  const previousThreshold = solar.identity === 'Dawn' ? 0 : solar.identity === 'Orbit' ? 100 : solar.identity === 'Radiant' ? 280 : solar.identity === 'Nova' ? 600 : solar.identity === 'Stellar' ? 1200 : 2400
  const progress = solar.next_threshold ? Math.max(0, Math.min(100, ((solar.total - previousThreshold) / (solar.next_threshold - previousThreshold)) * 100)) : 100

  if (!state.user) return null
  const user = creator && creator.id !== state.user.id
    ? { ...state.user, id: creator.id, name: creator.name, handle: creator.handle, email: '' }
    : state.user

  function openProject(project: Project) {
    dispatch({ type: 'SET_ACTIVE_SUBJECT', subjectId: project.space_id })
    dispatch({ type: 'OPEN_CODE_EDITOR', projectId: project.id })
  }
  async function deleteProject(project: Project) {
    if (!window.confirm(`Delete “${project.name}”? Linked posts remain but their Project preview is removed.`)) return
    setDeleting(project.id)
    try { await api.projects.remove(project.id); dispatch({ type: 'REMOVE_PROJECT', id: project.id }) }
    catch (reason) { dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (reason as Error).message, tone: 'warning' } }) }
    finally { setDeleting(null) }
  }
  async function logout() { try { await api.logout(); dispatch({ type: 'RESET_SESSION' }) } catch {} }
  async function downloadData() {
    setExporting(true)
    try {
      const data = await api.exportData()
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a'); link.href = url; link.download = `helios-data-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url)
    } catch (reason) { dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (reason as Error).message, tone: 'warning' } }) }
    finally { setExporting(false) }
  }

  return (
    <div className="profile-page">
      {showNewProject && <NewProjectModal initialSpaceId={state.activeSpaceId} initialSpace={getSpaceDefinition(state.activeSpaceId).name} onClose={() => setShowNewProject(false)} />}
      {creator && creator.id !== state.user.id && <div className="space-readonly-banner" style={{ padding: 10, textAlign: 'center' }}>Viewing {creator.name}'s public work. <button type="button" onClick={() => setCreator(null)}>Back to your profile</button></div>}
      <header className="profile-hero">
        <div className="profile-avatar"><span>{user.name.slice(0, 1).toUpperCase()}</span><i /></div>
        <div className="profile-identity"><span>CREATOR · {(state.user.account_kind === 'adult' ? 'ADULT' : state.user.account_kind === 'student' ? 'STUDENT' : 'MEMBER')} · {planLabel(state.user.plan_id).toUpperCase()}</span><h1>{user.name}</h1><p>{user.handle} · Building across {joinedSpaces.length || 1} Space{joinedSpaces.length === 1 ? '' : 's'}</p><div><b>{ownedProjects.length}<small>Projects</small></b><b>{posts.length}<small>Progress posts</small></b><b>{contributions.length + helpEvents.length}<small>Contributions</small></b></div></div>
        <div className="profile-solar-card"><div className="profile-solar-orbit" style={{ '--solar-progress': `${progress * 3.6}deg` } as React.CSSProperties}><span><Sun size={20} /><strong>{solar.total}</strong><small>Solar</small></span></div><div><span>CURRENT IDENTITY</span><strong>{solar.identity}</strong><small>{solar.next_threshold ? `${solar.next_threshold - solar.total} Solar until the next identity` : 'Highest Solar identity reached'}</small></div></div>
      </header>
      <nav className="profile-tabs" aria-label="Profile sections">{(['Journey', 'Projects', 'Posts', 'Spaces', 'Settings'] as const).map(item => <button type="button" key={item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>{item}</button>)}</nav>

      <main className="profile-content">
        {tab === 'Journey' && <JourneyTab solar={solar} projects={ownedProjects} posts={posts} joinedSpaces={joinedSpaces} contributions={contributions} onOpenProject={openProject} onTab={setTab} />}
        {tab === 'Projects' && <ProjectsTab projects={state.projects} deleting={deleting} onOpen={openProject} onDelete={project => void deleteProject(project)} onNew={() => setShowNewProject(true)} />}
        {tab === 'Posts' && <PostsTab posts={posts} onOpenProject={id => { const project = state.projects.find(item => item.id === id); if (project) openProject(project) }} />}
        {tab === 'Spaces' && <SpacesTab spaces={joinedSpaces} onOpen={id => dispatch({ type: 'OPEN_SPACE', spaceId: id })} />}
        {tab === 'Settings' && <SettingsTab theme={state.theme} reducedMotion={state.reducedMotion} exporting={exporting} accountKind={state.user.account_kind || ''} dateOfBirth={state.user.date_of_birth || ''} planId={state.user.plan_id || 'free'} planExpiresAt={state.user.plan_expires_at} onTheme={theme => dispatch({ type: 'SET_THEME', theme })} onMotion={() => dispatch({ type: 'SET_REDUCED_MOTION', val: !state.reducedMotion })} onExport={() => void downloadData()} onLogout={() => void logout()} onChoosePlan={() => dispatch({ type: 'SET_PLAN_OPEN', open: true })} />}
      </main>
    </div>
  )
}

function JourneyTab({ solar, projects, posts, joinedSpaces, contributions, onOpenProject, onTab }: { solar: SolarSummary; projects: Project[]; posts: Post[]; joinedSpaces: SpaceSummary[]; contributions: Project[]; onOpenProject: (project: Project) => void; onTab: (tab: ProfileTab) => void }) {
  const current = [...projects].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
  const milestones = solar.events.slice(0, 8)
  return <div className="profile-journey-grid"><section className="profile-current-work"><header><div><span>CURRENT WORK</span><h2>Keep the thread moving</h2></div>{current && <button type="button" onClick={() => onOpenProject(current)}>Resume <ChevronRight size={13} /></button>}</header>{current ? <button type="button" className="journey-project" onClick={() => onOpenProject(current)} style={{ '--journey-accent': getSpaceDefinition(current.space_id).accent } as React.CSSProperties}><i><FolderGit2 size={22} /></i><span><small>{getSpaceDefinition(current.space_id).name} · {getMiniApp(current.app_kind).name}</small><strong>{current.name}</strong><p>Updated {new Date(current.updated_at).toLocaleString()}</p></span><ChevronRight size={17} /></button> : <JourneyEmpty text="Start in a Space Mini App to create durable work." />}</section><section className="profile-story"><header><div><span>SOLAR STORY</span><h2>Meaningful milestones</h2></div></header><div className="profile-milestone-list">{milestones.map(event => <article key={event.id}><i>{event.source_type === 'help' ? <Users size={13} /> : event.source_type === 'project' ? <FolderGit2 size={13} /> : <Star size={13} />}</i><div><strong>{event.reason}</strong><small>{new Date(event.created_at).toLocaleDateString()} · +{event.amount} Solar</small></div></article>)}{milestones.length === 0 && <JourneyEmpty text="Create, finish, publish, help or complete a challenge to begin your Solar story." />}</div></section><section className="profile-journey-stats"><button type="button" onClick={() => onTab('Projects')}><FolderGit2 size={18} /><strong>{projects.length}</strong><span>Owned Projects</span></button><button type="button" onClick={() => onTab('Posts')}><MessageCircle size={18} /><strong>{posts.length}</strong><span>Progress posts</span></button><button type="button" onClick={() => onTab('Spaces')}><BookOpen size={18} /><strong>{joinedSpaces.length}</strong><span>Joined Spaces</span></button><div><Sparkles size={18} /><strong>{contributions.length}</strong><span>Shared Projects</span></div></section><section className="profile-achievements"><header><div><span>IDENTITIES, NOT LEADERBOARDS</span><h2>Solar progression</h2></div></header><div>{['Dawn', 'Orbit', 'Radiant', 'Nova', 'Stellar', 'Helios'].map((identity, index) => { const unlocked = ['Dawn', 'Orbit', 'Radiant', 'Nova', 'Stellar', 'Helios'].indexOf(solar.identity) >= index; return <article key={identity} className={unlocked ? 'is-unlocked' : ''}><i>{unlocked ? <Award size={15} /> : <span>·</span>}</i><strong>{identity}</strong><small>{[0, 100, 280, 600, 1200, 2400][index]} Solar</small></article> })}</div><p>Solar recognizes genuine creation, learning, publishing and help. Clicking and compulsive leaderboards do not earn it.</p></section></div>
}

function ProjectsTab({ projects, deleting, onOpen, onDelete, onNew }: { projects: Project[]; deleting: number | null; onOpen: (project: Project) => void; onDelete: (project: Project) => void; onNew: () => void }) { return <section className="profile-tab-section"><header><div><span>DURABLE PORTFOLIO</span><h2>Projects and contributions</h2><p>The same work stays connected in Space feeds, Lifestyle, Chat, Live and Helios.</p></div><button type="button" onClick={onNew}><Plus size={14} /> New Project</button></header><div className="profile-project-grid">{projects.map(project => <article key={project.id}><div><i><FolderGit2 size={18} /></i><span>{project.can_manage ? 'Owned' : project.collaborator_role ? `Collaborator · ${project.collaborator_role}` : 'Shared'}</span></div><small>{getSpaceDefinition(project.space_id).name} · {getMiniApp(project.app_kind).name}</small><h3>{project.name}</h3><p>{project.visibility} · Updated {new Date(project.updated_at).toLocaleDateString()}</p><footer><button type="button" onClick={() => onOpen(project)}>Open actual Project</button>{project.can_manage && <button type="button" onClick={() => onDelete(project)} disabled={deleting === project.id} aria-label={`Delete ${project.name}`}><Trash2 size={13} /></button>}</footer></article>)}{projects.length === 0 && <JourneyEmpty text="No Projects yet. Open a Subject or Hobby Space to start." />}</div></section> }
function PostsTab({ posts, onOpenProject }: { posts: Post[]; onOpenProject: (id: number) => void }) { return <section className="profile-tab-section"><header><div><span>PROGRESS, NOT APPEARANCE</span><h2>Lifestyle and Space posts</h2><p>Your meaningful progress across school, creative work and hobbies.</p></div></header><div className="profile-post-list">{posts.map(post => <article key={post.id}><header><span>{getSpaceDefinition(post.space_id).name}</span><time>{new Date(post.created_at).toLocaleDateString()}</time></header><p>{post.body}</p>{post.media_url && <img src={post.media_url} alt="Progress" />}{post.project_id && <button type="button" onClick={() => onOpenProject(post.project_id!)}><FolderGit2 size={14} /> {post.project_name}<ChevronRight size={13} /></button>}<footer><span><Sparkles size={12} /> {Object.values(post.reactions).reduce((sum, value) => sum + value, 0)}</span><span><MessageCircle size={12} /> {post.comment_count}</span></footer></article>)}{posts.length === 0 && <JourneyEmpty text="Share a genuine accomplishment from Lifestyle or a Space feed." />}</div></section> }
function SpacesTab({ spaces, onOpen }: { spaces: SpaceSummary[]; onOpen: (id: string) => void }) { return <section className="profile-tab-section"><header><div><span>WHERE YOUR WORK LIVES</span><h2>Joined Spaces and interests</h2><p>Subjects and Hobbies become part of your creator/student journey through real work.</p></div></header><div className="profile-space-grid">{spaces.map(space => { const definition = getSpaceDefinition(space.id); return <button type="button" key={space.id} onClick={() => onOpen(space.id)} style={{ '--profile-accent': definition.accent } as React.CSSProperties}><i>{space.name.slice(0, 1)}</i><span>{space.kind}</span><h3>{space.name}</h3><p>{definition.description}</p><footer>{space.project_count} Projects · {space.live_count} Live <ChevronRight size={12} /></footer></button> })}{spaces.length === 0 && <JourneyEmpty text="Choose a Space from Subjects or Hobbies and begin meaningful work." />}</div></section> }
function SettingsTab({ theme, reducedMotion, exporting, accountKind, dateOfBirth, planId, planExpiresAt, onTheme, onMotion, onExport, onLogout, onChoosePlan }: { theme: string; reducedMotion: boolean; exporting: boolean; accountKind: string; dateOfBirth: string; planId: string; planExpiresAt?: string | null; onTheme: (theme: 'dark' | 'high-contrast') => void; onMotion: () => void; onExport: () => void; onLogout: () => void; onChoosePlan: () => void }) { return <section className="profile-settings"><header><span>ACCOUNT & ACCESSIBILITY</span><h2>Settings</h2></header><article><h3><Users size={15} /> Age and plan</h3><p>Date of birth decides student or adult. Students can use Free or Alpha. Adults can use Free or Orbit Plan. Paid plans are ¥{PLAN_PRICE_RMB}/month.</p><div className="profile-setting-row"><span><strong>{accountKind === 'adult' ? 'Detected as adult' : accountKind === 'student' ? 'Detected as student' : 'Date of birth needed'}</strong><small>{dateOfBirth ? `Born ${dateOfBirth}` : 'Add a date of birth to choose a plan.'} · Current plan: {planLabel(planId as 'free' | 'orbit' | 'alpha')}{planId !== 'free' && planExpiresAt ? ` until ${new Date(planExpiresAt).toLocaleDateString()}` : ''}</small></span><button type="button" className="profile-export" onClick={onChoosePlan}>Choose plan</button></div></article><article><h3><Moon size={15} /> Appearance</h3><div className="profile-theme-buttons"><button type="button" className={theme === 'dark' ? 'is-active' : ''} onClick={() => onTheme('dark')}>Dark</button><button type="button" className={theme === 'high-contrast' ? 'is-active' : ''} onClick={() => onTheme('high-contrast')}>High contrast</button></div></article><article><h3><Settings size={15} /> Accessibility</h3><div className="profile-setting-row"><span><strong>Reduce motion</strong><small>Minimize spatial and realtime transitions.</small></span><button type="button" className={'profile-switch' + (reducedMotion ? ' is-active' : '')} onClick={onMotion} aria-pressed={reducedMotion}><i /></button></div></article><article><h3><Download size={15} /> Your Helios data</h3><p>Download account, Projects and social records currently included in your export.</p><button type="button" className="profile-export" onClick={onExport} disabled={exporting}><Download size={13} /> {exporting ? 'Preparing…' : 'Download JSON export'}</button></article><button type="button" className="profile-logout" onClick={onLogout}><LogOut size={14} /> Sign out</button></section> }
function JourneyEmpty({ text }: { text: string }) { return <div className="profile-journey-empty"><Sparkles size={18} /><span>{text}</span></div> }
