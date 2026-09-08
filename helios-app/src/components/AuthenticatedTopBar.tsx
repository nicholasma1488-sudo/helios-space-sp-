import { useEffect, useRef, useState } from 'react'
import {
  Bell, FolderGit2, MessageCircle, Radio, Search, Sparkles, User, Users, X,
} from 'lucide-react'
import { api, type ApiNotification, type SearchResults } from '../api'
import { getSpaceDefinition } from '../product/catalog'
import { useApp } from '../store/appStore'
import './AuthenticatedTopBar.css'

type OpenMenu = 'search' | 'notifications' | 'profile' | null

const EMPTY_RESULTS: SearchResults = { projects: [], people: [], posts: [], live: [], spaces: [] }

export function AuthenticatedTopBar({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useApp()
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [searching, setSearching] = useState(false)
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const rootRef = useRef<HTMLElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const activeSpace = getSpaceDefinition(state.activeSpaceId)
  const unread = notifications.filter(item => !item.read).length

  useEffect(() => {
    let cancelled = false
    api.notifications.list()
      .then(notificationResult => {
        if (cancelled) return
        setNotifications(notificationResult.notifications)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    window.addEventListener('pointerdown', closeOnOutside)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutside)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  useEffect(() => {
    if (openMenu === 'search') window.setTimeout(() => searchRef.current?.focus(), 80)
  }, [openMenu])

  useEffect(() => {
    const normalized = query.trim()
    if (normalized.length < 2) {
      setResults(EMPTY_RESULTS)
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = window.setTimeout(() => {
      api.search(normalized)
        .then(data => { if (!cancelled) setResults(data) })
        .catch(() => { if (!cancelled) setResults(EMPTY_RESULTS) })
        .finally(() => { if (!cancelled) setSearching(false) })
    }, 240)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [query])

  function toggle(menu: Exclude<OpenMenu, null>) {
    setOpenMenu(current => current === menu ? null : menu)
  }

  function openSpace(spaceId: string) {
    dispatch({ type: 'OPEN_SPACE', spaceId })
    setOpenMenu(null)
  }

  async function openProject(projectId: number) {
    let project = state.projects.find(item => item.id === projectId)
    if (!project) {
      try {
        project = (await api.projects.get(projectId)).project
        dispatch({ type: 'ADD_PROJECT', project })
      } catch {
        dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: 'This project is no longer available.', tone: 'warning' } })
        return
      }
    }
    dispatch({ type: 'SET_ACTIVE_SUBJECT', subjectId: project.space_id })
    dispatch({ type: 'OPEN_CODE_EDITOR', projectId })
    setOpenMenu(null)
  }

  function openConversation(id: number) {
    sessionStorage.setItem('helios-open-conversation', String(id))
    dispatch({ type: 'SET_VIEW', view: 'chat' })
    setOpenMenu(null)
  }

  async function routeNotification(item: ApiNotification) {
    if (!item.read) {
      await api.notifications.markRead([item.id]).catch(() => {})
      setNotifications(current => current.map(notification => notification.id === item.id ? { ...notification, read: true } : notification))
    }
    const id = Number(item.target_id)
    if (item.target_type === 'project' && id) await openProject(id)
    else if (item.target_type === 'live' && id) dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: id })
    else if (item.target_type === 'conversation' && id) openConversation(id)
    else if (item.target_type === 'post' && id) {
      sessionStorage.setItem('helios-open-post', String(id))
      dispatch({ type: 'SET_VIEW', view: 'lifestyle' })
    }
    setOpenMenu(null)
  }

  async function signOut() {
    try {
      await api.logout()
      dispatch({ type: 'RESET_SESSION' })
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: `Sign out failed: ${(error as Error).message}`, tone: 'warning' } })
    }
  }

  const searchCount = results.projects.length + results.people.length + results.posts.length + results.live.length + results.spaces.length

  return (
    <header className={'authenticated-topbar' + (compact ? ' is-compact' : '')} ref={rootRef}>
      <div className="topbar-brand-cluster">
        <button type="button" className="topbar-brand" onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })} aria-label="Helios Space home">
          <span>✦</span><strong>helios<span>space</span></strong>
        </button>
      </div>

      <nav className="topbar-context-nav" aria-label="Space">
        <button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'apps' })} aria-label="Open Create suite">
          <span className="topbar-space-brand" style={{ fontWeight: 700, letterSpacing: '-0.02em' }}>Space</span>
          <span style={{ color: 'var(--helios-muted)', fontSize: 12 }}>Social collaboration</span>
          <span className="topbar-context-chip" style={{ '--space-accent': activeSpace.accent } as React.CSSProperties}>
            <i />{activeSpace.name}
          </span>
        </button>
      </nav>

      <div className="topbar-actions">
        <button type="button" onClick={() => toggle('search')} aria-label="Search Helios Space" aria-expanded={openMenu === 'search'}><Search size={17} /><span>Search</span></button>
        <button type="button" onClick={() => toggle('notifications')} aria-label={unread ? `${unread} unread notifications` : 'Notifications'} aria-expanded={openMenu === 'notifications'} className="topbar-notification-button">
          <Bell size={17} />{unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}
        </button>
        <button type="button" className="topbar-profile-button" onClick={() => toggle('profile')} aria-label="Account menu" aria-expanded={openMenu === 'profile'}>
          {(state.user?.name || '?')[0].toUpperCase()}
        </button>
      </div>

      

      

      {openMenu === 'search' && (
        <div className="topbar-popover topbar-search-popover" role="dialog" aria-label="Global search">
          <div className="global-search-input"><Search size={17} /><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Spaces, people, Projects and shared work" aria-label="Search" /><button type="button" onClick={() => setOpenMenu(null)} aria-label="Close search"><X size={15} /></button></div>
          <div className="global-search-results" aria-live="polite">
            {query.trim().length < 2 && <SearchEmpty icon={<Sparkles size={19} />} text="Search only returns work you are allowed to discover." />}
            {query.trim().length >= 2 && searching && <SearchEmpty icon={<Sparkles size={19} />} text="Searching…" />}
            {query.trim().length >= 2 && !searching && searchCount === 0 && <SearchEmpty icon={<Search size={19} />} text="No permitted results found." />}
            {results.spaces.length > 0 && <ResultGroup title="Spaces">{results.spaces.map(space => <button key={space.id} onClick={() => openSpace(space.id)}><Users size={14} /><span><strong>{space.name}</strong><small>{space.kind}</small></span></button>)}</ResultGroup>}
            {results.projects.length > 0 && <ResultGroup title="Projects">{results.projects.map(project => <button key={project.id} onClick={() => void openProject(project.id)}><FolderGit2 size={14} /><span><strong>{project.name}</strong><small>{project.space_id} · {project.app_kind}</small></span></button>)}</ResultGroup>}
            {results.live.length > 0 && <ResultGroup title="Live now">{results.live.map(session => <button key={session.id} onClick={() => { dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: session.id }); setOpenMenu(null) }}><Radio size={14} /><span><strong>{session.title}</strong><small>{session.owner_name} · {session.viewer_count} watching</small></span></button>)}</ResultGroup>}
            {results.people.length > 0 && <ResultGroup title="People">{results.people.map(person => <button key={person.id} onClick={() => { dispatch({ type: 'SET_VIEW', view: 'apps' }); setOpenMenu(null) }}><User size={14} /><span><strong>{person.name}</strong><small>{person.handle}</small></span></button>)}</ResultGroup>}
            {results.posts.length > 0 && <ResultGroup title="Progress">{results.posts.map(post => <button key={post.id} onClick={() => { sessionStorage.setItem('helios-open-post', String(post.id)); dispatch({ type: 'SET_VIEW', view: 'lifestyle' }); setOpenMenu(null) }}><MessageCircle size={14} /><span><strong>{post.author_name}</strong><small>{post.body.slice(0, 90)}</small></span></button>)}</ResultGroup>}
          </div>
        </div>
      )}

      {openMenu === 'notifications' && (
        <div className="topbar-popover notifications-popover" role="dialog" aria-label="Notifications">
          <header><div><strong>Notifications</strong><small>{unread ? `${unread} unread` : 'You are caught up'}</small></div>{unread > 0 && <button type="button" onClick={() => { void api.notifications.markRead(); setNotifications(current => current.map(item => ({ ...item, read: true }))) }}>Mark all read</button>}</header>
          <div>
            {notifications.map(item => <button type="button" key={item.id} className={item.read ? '' : 'is-unread'} onClick={() => void routeNotification(item)}><i>{item.kind === 'chat_message' ? <MessageCircle size={14} /> : item.kind.includes('live') ? <Radio size={14} /> : <Sparkles size={14} />}</i><span><strong>{item.title}</strong><small>{item.detail}</small><time>{new Date(item.created_at).toLocaleDateString()}</time></span></button>)}
            {notifications.length === 0 && <SearchEmpty icon={<Bell size={19} />} text="Useful project, message and Live updates will appear here." />}
          </div>
        </div>
      )}

      {openMenu === 'profile' && (
        <div className="topbar-popover profile-popover" role="menu" aria-label="Account">
          <div className="profile-popover-user"><span>{(state.user?.name || '?')[0].toUpperCase()}</span><div><strong>{state.user?.name}</strong><small>{state.user?.handle}</small></div></div>
          <button type="button" role="menuitem" onClick={() => { dispatch({ type: 'SET_VIEW', view: 'profile' }); setOpenMenu(null) }}><User size={15} /> Creator profile</button>
          <button type="button" role="menuitem" onClick={() => { dispatch({ type: 'OPEN_HELIOS_PANEL' }); setOpenMenu(null) }}><Sparkles size={15} /> Ask Helios</button>
          <button type="button" role="menuitem" onClick={() => void signOut()}><span>↪</span> Sign out</button>
        </div>
      )}
    </header>
  )
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="search-result-group"><h3>{title}</h3>{children}</section>
}

function SearchEmpty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="topbar-empty">{icon}<span>{text}</span></div>
}
