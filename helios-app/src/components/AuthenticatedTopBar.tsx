import { useEffect, useRef, useState } from 'react'
import {
  Bell, BookOpen, ChevronDown, Compass, Dumbbell, FolderGit2, MessageCircle,
  Plus, Radio, Search, Sparkles, User, Users, X,
} from 'lucide-react'
import { api, type ApiNotification, type SearchResults, type SpaceSummary } from '../api'
import { HOBBIES, SUBJECTS, getSpaceDefinition } from '../product/catalog'
import { useApp } from '../store/appStore'
import './AuthenticatedTopBar.css'

type OpenMenu = 'subjects' | 'hobbies' | 'search' | 'notifications' | 'profile' | null

const EMPTY_RESULTS: SearchResults = { projects: [], people: [], posts: [], live: [], spaces: [] }

export function AuthenticatedTopBar({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useApp()
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [searching, setSearching] = useState(false)
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [customSpaces, setCustomSpaces] = useState<SpaceSummary[]>([])
  const [customHobby, setCustomHobby] = useState('')
  const [addingHobby, setAddingHobby] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const activeSpace = getSpaceDefinition(state.activeSpaceId)
  const unread = notifications.filter(item => !item.read).length

  useEffect(() => {
    let cancelled = false
    Promise.all([api.spaces.list(), api.notifications.list()])
      .then(([spaces, notificationResult]) => {
        if (cancelled) return
        setCustomSpaces(spaces.spaces.filter(space => space.custom))
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

  async function addCustomHobby(event: React.FormEvent) {
    event.preventDefault()
    const name = customHobby.trim()
    if (!name || addingHobby) return
    setAddingHobby(true)
    try {
      const result = await api.spaces.create(name)
      setCustomSpaces(current => [...current, result.space])
      setCustomHobby('')
      openSpace(result.space.id)
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    } finally {
      setAddingHobby(false)
    }
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
  const showUpgrade = state.user?.plan !== 'orbit' && state.user?.plan_selected !== false

  return (
    <header className={'authenticated-topbar' + (compact ? ' is-compact' : '') + (showUpgrade ? ' has-upgrade' : '')} ref={rootRef}>
      <div className="topbar-brand-cluster">
        <button type="button" className="topbar-brand" onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })} aria-label="Helios Space home">
          <span>✦</span><strong>helios<span>space</span></strong>
        </button>
        {showUpgrade && (
          <button type="button" className="topbar-upgrade-btn" onClick={() => dispatch({ type: 'OPEN_UPGRADE' })}>
            <Sparkles size={13} /> Upgrade
          </button>
        )}
      </div>

      <nav className="topbar-context-nav" aria-label="Subject and hobby navigation">
        <button type="button" className={openMenu === 'subjects' ? 'is-open' : ''} onClick={() => toggle('subjects')} aria-expanded={openMenu === 'subjects'}>
          <BookOpen size={15} /><span>Subjects</span><ChevronDown size={13} />
        </button>
        <button type="button" className={openMenu === 'hobbies' ? 'is-open' : ''} onClick={() => toggle('hobbies')} aria-expanded={openMenu === 'hobbies'}>
          <Dumbbell size={15} /><span>Hobbies</span><ChevronDown size={13} />
        </button>
        <span className="topbar-context-chip" style={{ '--space-accent': activeSpace.accent } as React.CSSProperties}>
          <i />{activeSpace.name}
        </span>
      </nav>

      <nav className="topbar-destination-nav" aria-label="Fast destinations">
        <button type="button" className={state.view === 'explore' ? 'is-active' : ''} onClick={() => dispatch({ type: 'SET_VIEW', view: 'explore' })}><Compass size={15} /><span>Explore</span></button>
        <button type="button" className={state.view === 'live' ? 'is-active' : ''} onClick={() => dispatch({ type: 'SET_VIEW', view: 'live' })}><Radio size={15} /><span>Live</span></button>
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

      {openMenu === 'subjects' && (
        <div className="topbar-mega-menu" role="menu" aria-label="Subjects">
          <div className="mega-menu-heading"><span><BookOpen size={16} /> Subjects</span><small>Choose a Space and keep its context as you move.</small></div>
          <div className="mega-space-grid">
            {SUBJECTS.map(space => (
              <button type="button" role="menuitem" key={space.id} onClick={() => openSpace(space.id)} className={state.activeSpaceId === space.id ? 'is-active' : ''} style={{ '--space-accent': space.accent } as React.CSSProperties}>
                <i>{space.name.slice(0, 1)}</i><span><strong>{space.name}</strong><small>{space.description}</small></span>
              </button>
            ))}
          </div>
        </div>
      )}

      {openMenu === 'hobbies' && (
        <div className="topbar-mega-menu hobbies-menu" role="menu" aria-label="Hobbies">
          <div className="mega-menu-heading"><span><Dumbbell size={16} /> Hobbies</span><small>Meaningful practice belongs beside school and creative work.</small></div>
          <div className="mega-space-grid hobby-grid">
            {[...HOBBIES, ...customSpaces.map(space => getSpaceDefinition(space.id))].map(space => (
              <button type="button" role="menuitem" key={space.id} onClick={() => openSpace(space.id)} className={state.activeSpaceId === space.id ? 'is-active' : ''} style={{ '--space-accent': space.accent } as React.CSSProperties}>
                <i>{space.name.slice(0, 1)}</i><span><strong>{space.name}</strong><small>{space.description}</small></span>
              </button>
            ))}
          </div>
          <form className="custom-hobby-form" onSubmit={addCustomHobby}>
            <Plus size={15} /><label htmlFor="custom-hobby">Custom hobby</label>
            <input id="custom-hobby" value={customHobby} maxLength={60} onChange={event => setCustomHobby(event.target.value)} placeholder="e.g. Woodworking" />
            <button type="submit" disabled={!customHobby.trim() || addingHobby}>{addingHobby ? 'Adding…' : 'Add Space'}</button>
          </form>
        </div>
      )}

      {openMenu === 'search' && (
        <div className="topbar-popover topbar-search-popover" role="dialog" aria-label="Global search">
          <div className="global-search-input"><Search size={17} /><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Spaces, people, Projects and shared work" aria-label="Search" /><button type="button" onClick={() => setOpenMenu(null)} aria-label="Close search"><X size={15} /></button></div>
          <div className="global-search-results" aria-live="polite">
            {query.trim().length < 2 && <SearchEmpty icon={<Sparkles size={19} />} text="Search only returns work you are allowed to discover." />}
            {query.trim().length >= 2 && searching && <SearchEmpty icon={<Sparkles size={19} />} text="Searching your permitted orbit…" />}
            {query.trim().length >= 2 && !searching && searchCount === 0 && <SearchEmpty icon={<Search size={19} />} text="No permitted results found." />}
            {results.spaces.length > 0 && <ResultGroup title="Spaces">{results.spaces.map(space => <button key={space.id} onClick={() => openSpace(space.id)}><Users size={14} /><span><strong>{space.name}</strong><small>{space.kind}</small></span></button>)}</ResultGroup>}
            {results.projects.length > 0 && <ResultGroup title="Projects">{results.projects.map(project => <button key={project.id} onClick={() => void openProject(project.id)}><FolderGit2 size={14} /><span><strong>{project.name}</strong><small>{project.space_id} · {project.app_kind}</small></span></button>)}</ResultGroup>}
            {results.live.length > 0 && <ResultGroup title="Live now">{results.live.map(session => <button key={session.id} onClick={() => { dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: session.id }); setOpenMenu(null) }}><Radio size={14} /><span><strong>{session.title}</strong><small>{session.owner_name} · {session.viewer_count} watching</small></span></button>)}</ResultGroup>}
            {results.people.length > 0 && <ResultGroup title="People">{results.people.map(person => <button key={person.id} onClick={() => { dispatch({ type: 'SET_VIEW', view: 'explore' }); setOpenMenu(null) }}><User size={14} /><span><strong>{person.name}</strong><small>{person.handle}</small></span></button>)}</ResultGroup>}
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

      {showUpgrade && (
        <div className="topbar-upgrade-banner">
          <strong>Orbit 福利</strong>
          <div>
            <span>不限文稿数量</span>
            <span>每篇 50 万字</span>
            <span>完整 Mini Apps</span>
            <span>Stocks</span>
            <span>学校与工作套件</span>
            <span>优先 Helios</span>
            <span>Stripe 银行卡</span>
          </div>
          <button type="button" onClick={() => dispatch({ type: 'OPEN_UPGRADE' })}>升级到 Orbit</button>
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
