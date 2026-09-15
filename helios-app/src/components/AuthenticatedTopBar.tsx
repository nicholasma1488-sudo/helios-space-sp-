import { useEffect, useRef, useState } from 'react'
import {
  Bell, ChevronDown, ChevronUp, FolderGit2, Maximize2, MessageCircle, Minimize2, Radio, Search, Sparkles, User, Users, X,
} from 'lucide-react'
import { api, type ApiNotification, type SearchResults } from '../api'
import { useApp } from '../store/appStore'
import { useLocale, useT } from '../i18n'
import { TopBarCreatePanel, TopBarCreateTrigger } from './TopBarCreatePanel'
import { UserAvatar } from './UserAvatar'
import { setChromeFullscreen, useChromeFullscreen } from '../lib/heliosChrome'
import { clearSessionClientState } from '../lib/sessionCleanup'
import './AuthenticatedTopBar.css'

type OpenMenu = 'search' | 'notifications' | 'profile' | null

const EMPTY_RESULTS: SearchResults = { projects: [], people: [], posts: [], live: [], spaces: [] }
const TOPBAR_COLLAPSED_KEY = 'helios-topbar-collapsed'

function readCollapsed(key: string) {
  try { return localStorage.getItem(key) === '1' } catch { return false }
}

function writeCollapsed(key: string, value: boolean) {
  try { localStorage.setItem(key, value ? '1' : '0') } catch { /* ignore */ }
}

export function AuthenticatedTopBar({ compact = false }: { compact?: boolean }) {
  const { state, dispatch } = useApp()
  const t = useT()
  const locale = useLocale()
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createAppId, setCreateAppId] = useState<string | null>(null)
  const [chromeFullscreen] = useChromeFullscreen()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)
  const [searching, setSearching] = useState(false)
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [topbarCollapsed, setTopbarCollapsed] = useState(() => readCollapsed(TOPBAR_COLLAPSED_KEY))
  const [topbarPeek, setTopbarPeek] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const unread = notifications.filter(item => !item.read).length

  function setTopbarCollapsedPersist(next: boolean) {
    setTopbarCollapsed(next)
    writeCollapsed(TOPBAR_COLLAPSED_KEY, next)
    if (!next) setTopbarPeek(false)
    if (next) {
      setOpenMenu(null)
      setCreateOpen(false)
    }
  }

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
    function onOpenCreate(event: Event) {
      const detail = (event as CustomEvent<{ appId?: string }>).detail
      setTopbarCollapsedPersist(false)
      setOpenMenu(null)
      setCreateAppId(detail?.appId || null)
      setCreateOpen(true)
    }
    window.addEventListener('helios-open-create-panel', onOpenCreate)
    return () => window.removeEventListener('helios-open-create-panel', onOpenCreate)
  }, [])

  useEffect(() => {
    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node) && !(event.target as HTMLElement)?.closest?.('.topbar-create-panel, .topbar-create-scrim')) {
        setOpenMenu(null)
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (createOpen) setCreateOpen(false)
        else setOpenMenu(null)
      }
    }
    window.addEventListener('pointerdown', closeOnOutside)
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('pointerdown', closeOnOutside)
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [createOpen])

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
    setCreateOpen(false)
    setOpenMenu(current => current === menu ? null : menu)
  }

  function toggleCreate() {
    setOpenMenu(null)
    setCreateAppId(null)
    setCreateOpen(current => !current)
  }

  function closeCreate() {
    setCreateOpen(false)
    setCreateAppId(null)
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
        dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: t('This project is no longer available.'), tone: 'warning' } })
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
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: t('Sign out failed: {error}', { error: (error as Error).message }), tone: 'warning' } })
    } finally {
      clearSessionClientState()
      dispatch({ type: 'RESET_SESSION' })
    }
  }

  const searchCount = results.projects.length + results.people.length + results.posts.length + results.live.length + results.spaces.length

  if (topbarCollapsed) {
    return (
      <div
        className={'authenticated-topbar-peek-zone' + (topbarPeek ? ' is-visible' : '') + (compact ? ' is-compact' : '')}
        onMouseEnter={() => setTopbarPeek(true)}
        onMouseLeave={() => setTopbarPeek(false)}
      >
        <button
          type="button"
          className="helios-chrome-peek-arrow helios-topbar-peek-arrow"
          onClick={() => setTopbarCollapsedPersist(false)}
          aria-label={t('Expand top bar')}
          title={t('Expand top bar')}
        >
          <ChevronDown size={16} />
        </button>
      </div>
    )
  }

  return (
    <header className={'authenticated-topbar' + (compact ? ' is-compact' : '') + (createOpen ? ' is-create-open' : '')} ref={rootRef}>
      <div className="topbar-brand-cluster">
        <button type="button" className="topbar-brand" onClick={() => dispatch({ type: 'SET_VIEW', view: 'home' })} aria-label={t('Helios Space home')}>
          <span>✦</span><strong>helios<span>space</span></strong>
        </button>
        <button
          type="button"
          className="helios-topbar-collapse-btn"
          onClick={() => setTopbarCollapsedPersist(true)}
          aria-label={t('Collapse top bar')}
          title={t('Collapse top bar')}
        >
          <ChevronUp size={15} />
        </button>
      </div>

      <nav className="topbar-context-nav" aria-label={t('Mini Apps')}>
        <TopBarCreateTrigger
          open={createOpen}
          onToggle={toggleCreate}
          label={t('Mini App')}
        />
      </nav>

      <div className="topbar-actions">
        <button type="button" onClick={() => toggle('search')} aria-label={t('Search Helios Space')} aria-expanded={openMenu === 'search'}><Search size={17} /><span>{t('Search')}</span></button>
        <button type="button" onClick={() => toggle('notifications')} aria-label={unread ? t('{count} unread notifications', { count: unread }) : t('Notifications')} aria-expanded={openMenu === 'notifications'} className="topbar-notification-button">
          <Bell size={17} />{unread > 0 && <b>{unread > 9 ? '9+' : unread}</b>}
        </button>
        <button type="button" className="topbar-profile-button" onClick={() => toggle('profile')} aria-label={t('Account menu')} aria-expanded={openMenu === 'profile'}>
          <UserAvatar name={state.user?.name || '?'} src={state.user?.avatar} size={28} />
        </button>
      </div>

      <TopBarCreatePanel open={createOpen} onClose={closeCreate} initialAppId={createAppId} />

      {openMenu === 'search' && (
        <div className="topbar-popover topbar-search-popover" role="dialog" aria-label={t('Global search')}>
          <div className="global-search-input"><Search size={17} /><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} placeholder={t('Search Spaces, people, Projects and shared work')} aria-label={t('Search')} /><button type="button" onClick={() => setOpenMenu(null)} aria-label={t('Close search')}><X size={15} /></button></div>
          <div className="global-search-results" aria-live="polite">
            {query.trim().length < 2 && <SearchEmpty icon={<Sparkles size={19} />} text={t('Search only returns work you are allowed to discover.')} />}
            {query.trim().length >= 2 && searching && <SearchEmpty icon={<Sparkles size={19} />} text={t('Searching…')} />}
            {query.trim().length >= 2 && !searching && searchCount === 0 && <SearchEmpty icon={<Search size={19} />} text={t('No permitted results found.')} />}
            {results.spaces.length > 0 && <ResultGroup title={t('Spaces')}>{results.spaces.map(space => <button key={space.id} onClick={() => openSpace(space.id)}><Users size={14} /><span><strong>{space.name}</strong><small>{space.kind}</small></span></button>)}</ResultGroup>}
            {results.projects.length > 0 && <ResultGroup title={t('Projects')}>{results.projects.map(project => <button key={project.id} onClick={() => void openProject(project.id)}><FolderGit2 size={14} /><span><strong>{project.name}</strong><small>{project.space_id} · {project.app_kind}</small></span></button>)}</ResultGroup>}
            {results.live.length > 0 && <ResultGroup title={t('Live now')}>{results.live.map(session => <button key={session.id} onClick={() => { dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: session.id }); setOpenMenu(null) }}><Radio size={14} /><span><strong>{session.title}</strong><small>{session.owner_name} · {t('{count} watching', { count: session.viewer_count })}</small></span></button>)}</ResultGroup>}
            {results.people.length > 0 && <ResultGroup title={t('People')}>{results.people.map(person => <button key={person.id} onClick={() => { dispatch({ type: 'SET_VIEW', view: 'apps' }); setOpenMenu(null) }}><User size={14} /><span><strong>{person.name}</strong><small>{person.handle}</small></span></button>)}</ResultGroup>}
            {results.posts.length > 0 && <ResultGroup title={t('Progress')}>{results.posts.map(post => <button key={post.id} onClick={() => { sessionStorage.setItem('helios-open-post', String(post.id)); dispatch({ type: 'SET_VIEW', view: 'lifestyle' }); setOpenMenu(null) }}><MessageCircle size={14} /><span><strong>{post.author_name}</strong><small>{post.body.slice(0, 90)}</small></span></button>)}</ResultGroup>}
          </div>
        </div>
      )}

      {openMenu === 'notifications' && (
        <div className="topbar-popover notifications-popover" role="dialog" aria-label={t('Notifications')}>
          <header><div><strong>{t('Notifications')}</strong><small>{unread ? t('{count} unread', { count: unread }) : t('You are caught up')}</small></div>{unread > 0 && <button type="button" onClick={() => { void api.notifications.markRead(); setNotifications(current => current.map(item => ({ ...item, read: true }))) }}>{t('Mark all read')}</button>}</header>
          <div>
            {notifications.map(item => <button type="button" key={item.id} className={item.read ? '' : 'is-unread'} onClick={() => void routeNotification(item)}><i>{item.kind === 'chat_message' ? <MessageCircle size={14} /> : item.kind.includes('live') ? <Radio size={14} /> : <Sparkles size={14} />}</i><span><strong>{item.title}</strong><small>{item.detail}</small><time>{new Date(item.created_at).toLocaleDateString(locale)}</time></span></button>)}
            {notifications.length === 0 && <SearchEmpty icon={<Bell size={19} />} text={t('Useful project, message and Live updates will appear here.')} />}
          </div>
        </div>
      )}

      {openMenu === 'profile' && (
        <div className="topbar-popover profile-popover" role="menu" aria-label={t('Account')}>
          <div className="profile-popover-user"><UserAvatar name={state.user?.name || '?'} src={state.user?.avatar} size={36} /><div><strong>{state.user?.name}</strong><small>{state.user?.handle}</small></div></div>
          <button type="button" role="menuitem" onClick={() => { dispatch({ type: 'SET_VIEW', view: 'profile' }); setOpenMenu(null) }}><User size={15} /> {t('Creator profile')}</button>
          <button type="button" role="menuitem" onClick={() => { setChromeFullscreen(!chromeFullscreen); setOpenMenu(null) }}>
            {chromeFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />} {chromeFullscreen ? t('Exit full screen') : t('Full screen')}
          </button>
          <button type="button" role="menuitem" onClick={() => { dispatch({ type: 'OPEN_HELIOS_PANEL' }); setOpenMenu(null) }}><Sparkles size={15} /> {t('Ask Helios')}</button>
          <button type="button" role="menuitem" onClick={() => void signOut()}><span>↪</span> {t('Sign out')}</button>
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
