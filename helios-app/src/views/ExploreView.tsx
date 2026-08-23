import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookOpen, ChevronRight, Compass, FolderGit2, MessageCircle, Radio,
  Search, Sparkles, UserPlus,
} from 'lucide-react'
import { api, type ExploreResults, type Post, type Project } from '../api'
import { getMiniApp, getSpaceDefinition } from '../product/catalog'
import { useApp } from '../store/appStore'
import './ExploreView.css'

type ExploreTab = 'for-you' | 'projects' | 'studio' | 'live' | 'creators' | 'spaces'
const CATEGORIES = ['All', 'Coding', 'Math', 'Science', 'Art', 'Design', 'Writing', 'Games', 'Study', 'Technology']
const CATEGORY_SPACES: Record<string, string[]> = {
  Coding: ['coding', 'engineering', 'ai', 'robotics'],
  Math: ['maths'],
  Science: ['science', 'geography'],
  Art: ['art', 'photography'],
  Design: ['design'],
  Writing: ['english', 'languages', 'history', 'reading'],
  Games: ['gaming'],
  Study: ['english', 'maths', 'science', 'history', 'languages'],
  Technology: ['coding', 'ai', 'engineering', 'robotics'],
}
const EMPTY: ExploreResults = { projects: [], posts: [], live: [], creators: [], spaces: [] }

export function ExploreView() {
  const { state, dispatch } = useApp()
  const [data, setData] = useState<ExploreResults>(EMPTY)
  const [tab, setTab] = useState<ExploreTab>('for-you')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await api.explore()) }
    catch (reason) { setError((reason as Error).message) }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])

  const needle = query.trim().toLowerCase()
  const projects = useMemo(() => {
    const allowed = CATEGORY_SPACES[category]
    return data.projects.filter(project =>
      (category === 'All' || (allowed || []).includes(project.space_id)) &&
      (!needle || `${project.name} ${project.owner_name} ${project.space_id} ${project.app_kind}`.toLowerCase().includes(needle)),
    )
  }, [data.projects, needle, category])
  const studioProjects = projects.filter(project => ['drawing', 'design', 'illustration', 'comic-studio', 'whiteboard', 'moodboard'].includes(project.app_kind) || project.type === 'drawing' || project.type === 'design')
  const posts = data.posts.filter(post => !needle || `${post.body} ${post.author_name} ${post.project_name || ''}`.toLowerCase().includes(needle))
  const live = data.live.filter(session => !needle || `${session.title} ${session.project_name} ${session.owner_name}`.toLowerCase().includes(needle))
  const creators = data.creators.filter(creator => !needle || `${creator.name} ${creator.handle}`.toLowerCase().includes(needle))
  const spaces = data.spaces.filter(space => !needle || space.name.toLowerCase().includes(needle))

  async function openProject(projectOrId: Project | number) {
    const id = typeof projectOrId === 'number' ? projectOrId : projectOrId.id
    let project = state.projects.find(item => item.id === id) ?? (typeof projectOrId === 'number' ? undefined : projectOrId)
    if (!project || project.content === undefined) {
      try { project = (await api.projects.get(id)).project }
      catch (reason) { dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (reason as Error).message, tone: 'warning' } }); return }
    }
    if (!state.projects.some(item => item.id === project!.id)) dispatch({ type: 'ADD_PROJECT', project })
    dispatch({ type: 'SET_ACTIVE_SUBJECT', subjectId: project.space_id })
    dispatch({ type: 'OPEN_CODE_EDITOR', projectId: project.id })
  }

  async function react(post: Post) {
    try {
      const result = await api.posts.react(post.id, '✨')
      setData(current => ({ ...current, posts: current.posts.map(item => item.id === post.id ? result.post : item) }))
    } catch (reason) { dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (reason as Error).message, tone: 'warning' } }) }
  }

  return (
    <div className="explore-page">
      <header className="explore-header">
        <div><span><Compass size={13} /> DISCOVER</span><h1>Find work worth entering.</h1><p>Projects, creators, mini apps, studio pieces, and live sessions — filtered to what you can actually open.</p></div>
        <label><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Projects, people, books, Live and Spaces" />{query && <button type="button" onClick={() => setQuery('')}>×</button>}</label>
      </header>
      <nav className="explore-tabs" aria-label="Explore sections">{([
        ['for-you', 'For you'], ['projects', 'Projects'], ['studio', 'Studio'], ['live', 'Live'], ['creators', 'Creators'], ['spaces', 'Communities'],
      ] as const).map(([id, label]) => <button type="button" key={id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>
      <div className="explore-tabs" aria-label="Categories" style={{ marginTop: -12 }}>
        {CATEGORIES.map(item => (
          <button type="button" key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>
        ))}
      </div>

      <main className="explore-content">
        {loading && <ExploreSkeleton />}
        {!loading && error && <section className="explore-status"><Compass size={25} /><h2>Discovery could not load</h2><p>{error}</p><button type="button" onClick={() => void load()}>Try again</button></section>}
        {!loading && !error && tab === 'for-you' && <>
          <ExploreSection title="Live work worth joining" eyebrow="HAPPENING NOW" action="See all Live" onAction={() => setTab('live')}><div className="explore-live-row">{live.slice(0, 4).map(session => <LiveDiscoveryCard key={session.id} session={session} onOpen={() => dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: session.id })} />)}{live.length === 0 && <ExploreInlineEmpty text="No permitted Live work is active right now." />}</div></ExploreSection>
          <ExploreSection title="Projects moving forward" eyebrow="RECENT SHARED WORK" action="Browse Projects" onAction={() => setTab('projects')}><div className="explore-project-grid">{projects.slice(0, 6).map(project => <ProjectDiscoveryCard key={project.id} project={project} onOpen={() => void openProject(project)} />)}{projects.length === 0 && <ExploreInlineEmpty text="Shared Projects will appear here when creators publish them." />}</div></ExploreSection>
          <div className="explore-feed-layout"><ExploreSection title="Progress with substance" eyebrow="FROM SPACE FEEDS"><div className="explore-post-list">{posts.slice(0, 8).map(post => <PostDiscoveryCard key={post.id} post={post} onReact={() => void react(post)} onOpenProject={id => void openProject(id)} />)}{posts.length === 0 && <ExploreInlineEmpty text="No permitted progress posts yet." />}</div></ExploreSection><aside><ExploreSection title="Active communities" eyebrow="SPACES"><div className="explore-space-list">{spaces.filter(space => space.project_count + space.post_count + space.live_count > 0).slice(0, 8).map(space => <SpaceDiscoveryRow key={space.id} space={space} onOpen={() => dispatch({ type: 'OPEN_SPACE', spaceId: space.id })} />)}</div></ExploreSection><ExploreSection title="Creators to follow" eyebrow="PEOPLE"><div className="explore-creator-list">{creators.slice(0, 6).map(creator => <CreatorRow key={creator.id} creator={creator} current={creator.id === state.user?.id} />)}</div></ExploreSection></aside></div>
        </>}
        {!loading && !error && tab === 'projects' && <ExploreSection title="Discover Projects" eyebrow={`${projects.length} PERMITTED RESULTS`}><div className="explore-project-grid wide">{projects.map(project => <ProjectDiscoveryCard key={project.id} project={project} onOpen={() => void openProject(project)} />)}{projects.length === 0 && <ExploreInlineEmpty text="No matching Projects." />}</div></ExploreSection>}
        {!loading && !error && tab === 'studio' && <ExploreSection title="Drawings, design and experiments" eyebrow="STUDIO" action="Open full Studio" onAction={() => dispatch({ type: 'SET_VIEW', view: 'creative' })}><div className="explore-book-grid">{studioProjects.map(project => <ProjectDiscoveryCard key={project.id} project={project} onOpen={() => void openProject(project)} book />)}{studioProjects.length === 0 && <ExploreInlineEmpty text="No matching visual work has been shared." />}</div></ExploreSection>}
        {!loading && !error && tab === 'live' && <ExploreSection title="Active collaborative sessions" eyebrow="OPEN THE ACTUAL PROJECT"><div className="explore-live-grid">{live.map(session => <LiveDiscoveryCard key={session.id} session={session} onOpen={() => dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: session.id })} />)}{live.length === 0 && <ExploreInlineEmpty text="No matching Live sessions." />}</div></ExploreSection>}
        {!loading && !error && tab === 'creators' && <ExploreSection title="Creators and learners" eyebrow="DISCOVERED THROUGH SHARED WORK"><div className="explore-creators-grid">{creators.map(creator => <CreatorCard key={creator.id} creator={creator} current={creator.id === state.user?.id} />)}{creators.length === 0 && <ExploreInlineEmpty text="No matching discoverable creators." />}</div></ExploreSection>}
        {!loading && !error && tab === 'spaces' && <ExploreSection title="Subject and Hobby communities" eyebrow="CONTEXT BEFORE CONTENT"><div className="explore-spaces-grid">{spaces.map(space => <SpaceDiscoveryCard key={space.id} space={space} onOpen={() => dispatch({ type: 'OPEN_SPACE', spaceId: space.id })} />)}{spaces.length === 0 && <ExploreInlineEmpty text="No matching Spaces." />}</div></ExploreSection>}
      </main>
    </div>
  )
}

function ExploreSection({ title, eyebrow, action, onAction, children }: { title: string; eyebrow: string; action?: string; onAction?: () => void; children: React.ReactNode }) { return <section className="explore-section"><header><div><span>{eyebrow}</span><h2>{title}</h2></div>{action && <button type="button" onClick={onAction}>{action} <ChevronRight size={13} /></button>}</header>{children}</section> }
function ProjectDiscoveryCard({ project, onOpen, book = false }: { project: Project; onOpen: () => void; book?: boolean }) { const space = getSpaceDefinition(project.space_id); const app = getMiniApp(project.app_kind); return <button type="button" className={'explore-project-card' + (book ? ' is-book' : '')} onClick={onOpen} style={{ '--explore-accent': space.accent } as React.CSSProperties}><div>{book ? <BookOpen size={24} /> : <FolderGit2 size={24} />}<span>{app.shortName}</span></div><small>{space.name} · {project.visibility}</small><h3>{project.name}</h3><p>by {project.owner_name || 'You'} {project.owner_handle}</p><footer><span>{app.name}</span><b>Open Project <ChevronRight size={12} /></b></footer></button> }
function LiveDiscoveryCard({ session, onOpen }: { session: ExploreResults['live'][number]; onOpen: () => void }) { const space = getSpaceDefinition(session.space_id); return <button type="button" className="explore-live-card" onClick={onOpen} style={{ '--explore-accent': space.accent } as React.CSSProperties}><span><i /> LIVE · {session.viewer_count}</span><Radio size={22} /><h3>{session.title}</h3><p>{session.owner_name} · {space.name}</p><b>Join actual workspace <ChevronRight size={12} /></b></button> }
function PostDiscoveryCard({ post, onReact, onOpenProject }: { post: Post; onReact: () => void; onOpenProject: (id: number) => void }) { const reactions = Object.values(post.reactions).reduce((sum, value) => sum + value, 0); return <article className="explore-post"><header><span>{post.author_name.slice(0, 1)}</span><div><strong>{post.author_name}</strong><small>{post.author_handle} · {getSpaceDefinition(post.space_id).name}</small></div></header><p>{post.body}</p>{post.media_url && <img src={post.media_url} alt="Shared progress" />}{post.project_id && <button type="button" className="explore-post-project" onClick={() => onOpenProject(post.project_id!)}><FolderGit2 size={14} /><span><small>PROJECT-BACKED</small><strong>{post.project_name}</strong></span><ChevronRight size={13} /></button>}<footer><button type="button" onClick={onReact} aria-pressed={post.my_reactions.includes('✨')}><Sparkles size={13} /> {reactions}</button><span><MessageCircle size={13} /> {post.comment_count}</span></footer></article> }
function SpaceDiscoveryRow({ space, onOpen }: { space: ExploreResults['spaces'][number]; onOpen: () => void }) { return <button type="button" onClick={onOpen}><i style={{ background: getSpaceDefinition(space.id).accent }}>{space.name.slice(0, 1)}</i><span><strong>{space.name}</strong><small>{space.project_count} Projects · {space.live_count} Live</small></span><ChevronRight size={13} /></button> }
function SpaceDiscoveryCard({ space, onOpen }: { space: ExploreResults['spaces'][number]; onOpen: () => void }) { const definition = getSpaceDefinition(space.id); return <button type="button" className="explore-space-card" onClick={onOpen} style={{ '--explore-accent': definition.accent } as React.CSSProperties}><i>{space.name.slice(0, 1)}</i><span>{space.kind} Space</span><h3>{space.name}</h3><p>{definition.description}</p><footer><b>{space.project_count} Projects</b><b>{space.post_count} posts</b><b>{space.live_count} Live</b></footer></button> }
function CreatorRow({ creator, current }: { creator: ExploreResults['creators'][number]; current: boolean }) {
  const { dispatch } = useApp()
  return <div><span>{creator.name.slice(0, 1)}</span><div><strong>{creator.name}</strong><small>{creator.handle} · {creator.project_count} Projects</small></div>{!current && <button type="button" onClick={() => void api.follow(creator.id)}><UserPlus size={12} /></button>}<button type="button" onClick={() => { sessionStorage.setItem('helios-open-creator', JSON.stringify({ id: creator.id, name: creator.name, handle: creator.handle })); dispatch({ type: 'SET_VIEW', view: 'profile' }) }}>Profile</button></div>
}
function CreatorCard({ creator, current }: { creator: ExploreResults['creators'][number]; current: boolean }) { return <article className="explore-creator-card"><span>{creator.name.slice(0, 1)}</span><h3>{creator.name}</h3><p>{creator.handle}</p><div><b>{creator.project_count}<small>Projects</small></b><b>{creator.post_count}<small>Posts</small></b></div>{!current ? <button type="button" onClick={() => void api.follow(creator.id)}><UserPlus size={13} /> Follow work</button> : <em>Your profile</em>}</article> }
function ExploreInlineEmpty({ text }: { text: string }) { return <div className="explore-inline-empty"><Sparkles size={18} /><span>{text}</span></div> }
function ExploreSkeleton() { return <div className="explore-skeleton"><i /><div>{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div></div> }
