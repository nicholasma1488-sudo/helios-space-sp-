import { useEffect, useState } from 'react'
import {
  ChevronLeft, ChevronRight, Home, MessageCircle, Sparkles, User, Zap,
} from 'lucide-react'

import { api } from '../api'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useApp, type NavView } from '../store/appStore'
import { AuthenticatedTopBar } from './AuthenticatedTopBar'
import { ErrorBoundary } from './ErrorBoundary'

interface NavItem { id: NavView; label: string; icon: React.ReactNode; shortLabel?: string }

const NAV: NavItem[] = [
  { id: 'lifestyle', label: 'Space', shortLabel: 'Space', icon: <Zap size={20} /> },
  { id: 'chat', label: 'Messages', shortLabel: 'Chat', icon: <MessageCircle size={20} /> },
  { id: 'home', label: 'Home', icon: <Home size={20} /> },
  { id: 'profile', label: 'Me', shortLabel: 'Me', icon: <User size={20} /> },
]

const RAIL_COLLAPSED_KEY = 'helios-rail-collapsed'

function readCollapsed(key: string) {
  try { return localStorage.getItem(key) === '1' } catch { return false }
}

function writeCollapsed(key: string, value: boolean) {
  try { localStorage.setItem(key, value ? '1' : '0') } catch { /* ignore */ }
}

function RailBtn({
  icon, label, active, onClick, badge,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick: () => void
  badge?: number
}) {
  const [hover, setHover] = useState(false)
  return (
    <div className="relative" style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
        className={`helios-rail-btn liquid-glass-btn w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer ${active ? 'helios-rail-btn-active' : ''}`}
        style={{
          background: active ? 'var(--helios-accent)' : 'transparent',
          color: active ? 'var(--helios-on-accent)' : 'var(--helios-muted)',
          border: 'none',
          transition: 'background var(--dur-quick) var(--ease-move), color var(--dur-quick) var(--ease-move), transform var(--dur-instant)',
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        {active && <span className="helios-rail-indicator" aria-hidden="true" />}
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white flex items-center justify-center" style={{ fontSize: 9, background: 'var(--helios-danger)', pointerEvents: 'none' }}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>
      {hover && (
        <div aria-hidden="true" style={{
          position: 'absolute', left: '100%', top: '50%', zIndex: 100, display: 'flex',
          alignItems: 'center', marginLeft: 10, padding: '6px 10px', border: '1px solid var(--helios-border)',
          borderRadius: 'var(--radius-sm)', background: 'var(--helios-surface3)', color: 'var(--helios-text)',
          boxShadow: '0 4px 16px rgba(0,0,0,.3)', fontSize: 12, whiteSpace: 'nowrap', pointerEvents: 'none',
          transform: 'translateY(-50%)', animation: 'helios-fade-in var(--dur-quick) var(--ease-enter)',
        }}>{label}</div>
      )}
    </div>
  )
}

function HeliosFloatingButton() {
  const { state, dispatch } = useApp()
  return (
    <button
      type="button"
      className={'helios-floating-agent' + (state.heliosPanelOpen ? ' is-open' : '')}
      onClick={() => dispatch({ type: 'TOGGLE_HELIOS_PANEL' })}
      aria-label={state.heliosPanelOpen ? 'Close Helios assistant' : 'Open Helios assistant'}
      aria-pressed={state.heliosPanelOpen}
      title="Ask Helios (⌘J)"
    >
      <span aria-hidden="true"><Sparkles size={18} /></span>
      <i aria-hidden="true" />
    </button>
  )
}

export function GlobalShell({ children }: { children: React.ReactNode }) {
  const { state, dispatch } = useApp()
  const isMobile = useIsMobile()
  const [railCollapsed, setRailCollapsed] = useState(() => readCollapsed(RAIL_COLLAPSED_KEY))
  const [railPeek, setRailPeek] = useState(false)

  function setRailCollapsedPersist(next: boolean) {
    setRailCollapsed(next)
    writeCollapsed(RAIL_COLLAPSED_KEY, next)
    if (!next) setRailPeek(false)
  }

  useEffect(() => {
    if (!state.user) return
    let mounted = true
    const poll = () => {
      api.chat.list().then(result => {
        if (!mounted) return
        const unread = result.conversations.reduce((sum, c) => sum + (c.unread || 0), 0)
        dispatch({ type: 'SET_CHAT_UNREAD', count: unread })
      }).catch(() => {})
    }
    poll()
    const timer = setInterval(poll, 30000)
    return () => { mounted = false; clearInterval(timer) }
  }, [state.user, dispatch])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!event.metaKey && !event.ctrlKey) return
      const key = event.key.toLowerCase()
      if (key === 'k') { event.preventDefault(); dispatch({ type: 'TOGGLE_COMMAND_PALETTE' }) }
      if (key === 'j') { event.preventDefault(); dispatch({ type: 'TOGGLE_HELIOS_PANEL' }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch])

  if (isMobile) {
    if (state.codeEditorOpen) {
      return (
        <div className="helios-shell helios-mobile-workspace-shell flex flex-col h-screen w-screen overflow-hidden" style={{ background: 'var(--helios-bg)', color: 'var(--helios-text)' }}>
          <div id="main-content" className="helios-main flex flex-1 min-h-0 overflow-hidden relative" role="main" tabIndex={-1}>
            {children}
            <HeliosFloatingButton />
          </div>
        </div>
      )
    }
    return (
      <div className="helios-shell flex flex-col h-screen w-screen overflow-hidden" style={{ background: 'var(--helios-bg)', color: 'var(--helios-text)' }}>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AuthenticatedTopBar compact />
        <div id="main-content" className="helios-main flex flex-1 overflow-hidden relative" role="main" tabIndex={-1}>
          {children}
          <HeliosFloatingButton />
        </div>
        <nav className="helios-mobile-nav flex items-stretch overflow-x-auto border-t" style={{ flexShrink: 0, borderColor: 'var(--helios-border)', background: 'var(--helios-surface)', paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Main navigation">
          {NAV.map(item => {
            const active = state.view === item.id && !state.codeEditorOpen
            return (
              <button key={item.id} type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: item.id })} aria-label={item.id === 'chat' && state.chatUnreadCount > 0 ? `${item.label} (${state.chatUnreadCount} unread)` : item.label} aria-current={active ? 'page' : undefined} className={'helios-mobile-nav-item flex flex-col items-center justify-center gap-0.5 cursor-pointer' + (active ? ' is-active' : '')} style={{ flex: '1 0 62px', background: 'none', border: 'none', color: active ? 'var(--helios-accent)' : 'var(--helios-muted)', minHeight: 56, padding: '6px 0', position: 'relative' }}>
                {item.icon}
                {item.id === 'chat' && state.chatUnreadCount > 0 && (
                  <span style={{ position: 'absolute', top: 6, right: '50%', marginRight: -18, background: 'var(--helios-danger)', color: '#fff', borderRadius: 999, fontSize: 8, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', pointerEvents: 'none' }}>
                    {state.chatUnreadCount > 9 ? '9+' : state.chatUnreadCount}
                  </span>
                )}
                <span style={{ fontSize: 9, fontWeight: active ? 650 : 400 }}>{item.shortLabel ?? item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    )
  }

  return (
    <div
      className={'helios-shell flex h-screen w-screen overflow-hidden' + (railCollapsed ? ' is-rail-collapsed' : '')}
      style={{ background: 'var(--helios-bg)', color: 'var(--helios-text)' }}
      data-rail-collapsed={railCollapsed ? '1' : '0'}
    >
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <nav
        className={'helios-side-rail flex flex-col items-center gap-0.5 py-3 px-2 border-r' + (railCollapsed ? ' is-collapsed' : '')}
        style={{
          width: railCollapsed ? 8 : 72,
          flexShrink: 0,
          borderColor: 'var(--helios-border)',
          background: 'var(--helios-surface)',
          overflow: 'hidden',
          padding: railCollapsed ? 0 : undefined,
          borderRightWidth: railCollapsed ? 0 : undefined,
          transition: 'width 280ms var(--ease-enter, ease), padding 280ms ease',
        }}
        aria-label="Main navigation"
        aria-hidden={railCollapsed || undefined}
      >
        {!railCollapsed && (
          <>
            <div className="flex flex-col gap-0.5 w-full items-center">
              {NAV.map(item => (
                <RailBtn key={item.id} icon={item.icon} label={item.label} active={state.view === item.id && !state.codeEditorOpen} onClick={() => dispatch({ type: 'SET_VIEW', view: item.id })} badge={item.id === 'chat' ? state.chatUnreadCount : undefined} />
              ))}
            </div>
            <div className="flex-1" aria-hidden="true" />
            <button
              type="button"
              className="helios-rail-collapse-btn"
              onClick={() => setRailCollapsedPersist(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="helios-rail-space-context" title={`Current Space: ${state.activeSpaceId}`} aria-hidden="true"><span>✦</span><i /></div>
          </>
        )}
      </nav>
      {railCollapsed && (
        <div
          className={'helios-rail-peek-zone' + (railPeek ? ' is-visible' : '')}
          onMouseEnter={() => setRailPeek(true)}
          onMouseLeave={() => setRailPeek(false)}
        >
          <button
            type="button"
            className="helios-chrome-peek-arrow helios-rail-peek-arrow"
            onClick={() => setRailCollapsedPersist(false)}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      <div className="helios-internal-frame flex flex-col flex-1 min-w-0 overflow-hidden">
        <AuthenticatedTopBar />
        <div id="main-content" className="helios-main flex flex-1 min-h-0 overflow-hidden relative" role="main" tabIndex={-1}>
          <ErrorBoundary>{children}</ErrorBoundary>
          <HeliosFloatingButton />
        </div>
      </div>
    </div>
  )
}
