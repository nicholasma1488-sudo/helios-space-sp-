import { useReducer, useEffect, useRef, useState } from 'react'
import { AppContext, reducer, INITIAL_STATE, useApp } from './store/appStore'
import type { User } from './api'
import { api } from './api'
import { AuthScreen } from './components/AuthScreen'
import { LandingPage } from './components/LandingPage'
import { GlobalShell } from './components/GlobalShell'
import { HeliosPanel } from './components/HeliosPanel'
import { CommandPalette } from './components/CommandPalette'
import { ShortcutsHelp } from './components/ShortcutsHelp'
import { ToastLayer } from './components/ToastLayer'
import { HomeView } from './views/HomeView'
import { ExploreView } from './views/ExploreView'
import { SpacesView } from './views/SpacesView'
import { SpaceView } from './views/SpaceView'
import { LifestyleView } from './views/LifestyleView'
import { LiveView } from './views/LiveView'
import { ChatView } from './views/ChatView'
import { ProfileView } from './views/ProfileView'
import { MiniAppsView } from './views/MiniAppsView'
import { ProjectWorkspace } from './workspaces/ProjectWorkspace'
import { isPayPath } from './product/pay'
import './App.css'

function MainContent() {
  const { state, dispatch } = useApp()
  const activeProject = state.projects.find(p => p.id === state.activeProjectId) ?? null

  if (state.codeEditorOpen && state.user) {
    return (
      <ProjectWorkspace
        activeProject={activeProject}
        onProjectUpdate={p => dispatch({ type: 'UPDATE_PROJECT', project: p })}
      />
    )
  }

  if (!state.user) return null

  let content: React.ReactNode
  switch (state.view) {
    case 'home':      content = <HomeView />; break
    case 'explore':   content = <ExploreView />; break
    case 'spaces':    content = <SpaceView />; break
    case 'lifestyle': content = <LifestyleView currentUser={state.user} />; break
    case 'apps':      content = <MiniAppsView />; break
    case 'live':      content = <LiveView />; break
    case 'chat':      content = <ChatView />; break
    case 'projects':  content = <SpacesView />; break
    case 'profile':   content = <ProfileView />; break
    default:          content = <HomeView />
  }
  return (
    <div
      key={state.view}
      className={'helios-view-frame ' + (state.viewDirection > 0 ? 'view-forward' : 'view-backward')}
    >
      {content}
    </div>
  )
}

function AppInner() {
  const { state, dispatch } = useApp()
  // Controls whether the visitor is looking at the marketing landing page
  // or the auth form. Starts on the landing page for logged-out visitors;
  // CTA buttons on the landing page set this to 'auth'.
  const [authMode, setAuthMode] = useState<'landing' | 'auth'>('landing')
  const [authDefaultTab, setAuthDefaultTab] = useState<'login' | 'register'>('register')
  const [path, setPath] = useState(window.location.pathname)
  const previousUserId = useRef<number | null>(state.user?.id ?? null)
  const onPayPage = isPayPath(path)

  useEffect(() => {
    const sync = () => setPath(window.location.pathname)
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  useEffect(() => {
    const currentUserId = state.user?.id ?? null
    if (previousUserId.current !== null && currentUserId === null) {
      setAuthMode('landing')
      setAuthDefaultTab('register')
    }
    previousUserId.current = currentUserId
  }, [state.user])

  // Dynamic document title per view
  useEffect(() => {
    const VIEW_TITLES: Record<string, string> = {
      home: 'Home',
      explore: 'Explore',
      spaces: 'Spaces',
      lifestyle: 'Lifestyle',
      apps: 'Mini Apps',
      live: 'Live',
      chat: 'Chat Hub',
      projects: 'Projects',
      profile: 'Profile',
    }
    if (!state.user) {
      document.title = 'Helios Space'
      return
    }
    if (state.codeEditorOpen) {
      const proj = state.projects.find(p => p.id === state.activeProjectId)
      document.title = proj ? `${proj.name} — Helios Space` : 'Editor — Helios Space'
      return
    }
    const label = VIEW_TITLES[state.view] ?? 'Helios Space'
    document.title = `${label} — Helios Space`
  }, [state.user, state.view, state.codeEditorOpen, state.activeProjectId, state.projects])

  // Load site info + check auth on mount
  useEffect(() => {
    let cancelled = false
    api.site()
      .then(info => { if (!cancelled) dispatch({ type: 'SET_SITE_INFO', info }) })
      .catch(() => {})

    api.session()
      .then(r => {
        if (cancelled) return
        if (!r.user) {
          dispatch({ type: 'SET_USER', user: null })
          return
        }
        dispatch({ type: 'SET_USER', user: r.user })
        api.projects.list()
          .then(projects => { if (!cancelled) dispatch({ type: 'SET_PROJECTS', projects: projects.projects }) })
          .catch(err => {
            if (!cancelled) dispatch({
              type: 'PUSH_TOAST',
              toast: { id: Date.now().toString(), message: `Projects could not be loaded: ${(err as Error).message}`, tone: 'warning' },
            })
          })
      })
      .catch(() => { if (!cancelled) dispatch({ type: 'SET_USER', user: null }) })

    return () => { cancelled = true }
  }, [dispatch])

  // Sync theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

  // Sync reduced-motion to document
  useEffect(() => {
    document.documentElement.setAttribute('data-reduced-motion', state.reducedMotion ? 'true' : 'false')
    if (state.reducedMotion) document.documentElement.classList.add('motion-reduced')
    else document.documentElement.classList.remove('motion-reduced')
  }, [state.reducedMotion])

  useEffect(() => {
    if (!onPayPage) return
    window.history.replaceState({}, '', '/')
    setPath('/')
  }, [onPayPage])

  // Respect OS reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) dispatch({ type: 'SET_REDUCED_MOTION', val: true })
    const h = (e: MediaQueryListEvent) => dispatch({ type: 'SET_REDUCED_MOTION', val: e.matches })
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [dispatch])

  // Auth loading splash
  if (state.authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--helios-bg)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #7c6af7, #4fc3f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 22, animation: 'pulse-fade 1.5s ease-in-out infinite' }}>
          ✦
        </div>
        <style>{`@keyframes pulse-fade { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:1;transform:scale(1)} }`}</style>
      </div>
    )
  }

  // Not logged in — show auth screen
  if (!state.user) {
    if (authMode === 'landing') {
      return (
        <LandingPage
          onGetStarted={() => { setAuthDefaultTab('register'); setAuthMode('auth') }}
          onSignIn={() => { setAuthDefaultTab('login'); setAuthMode('auth') }}
        />
      )
    }
    return (
      <AuthScreen
        defaultMode={authDefaultTab}
        onBack={() => setAuthMode('landing')}
        onAuth={(user: User) => {
          dispatch({ type: 'SET_USER', user })
          api.projects.list()
            .then(r => dispatch({ type: 'SET_PROJECTS', projects: r.projects }))
            .catch(err => dispatch({
              type: 'PUSH_TOAST',
              toast: { id: Date.now().toString(), message: `Projects could not be loaded: ${(err as Error).message}`, tone: 'warning' },
            }))
        }}
      />
    )
  }

  const activeProject = state.projects.find(p => p.id === state.activeProjectId) ?? null

  return (
    <>
      <GlobalShell>
        <MainContent />
        {state.heliosPanelOpen && (
          <HeliosPanel
            onClose={() => dispatch({ type: 'CLOSE_HELIOS_PANEL' })}
            activeProject={activeProject}
            aiEnabled={state.aiEnabled}
            spaceId={state.activeSpaceId}
            currentView={state.codeEditorOpen ? 'project-workspace' : state.view}
            onProjectContentChange={(projectId, content) => {
              const project = state.projects.find(p => p.id === projectId)
              if (project) dispatch({ type: 'UPDATE_PROJECT', project: { ...project, content } })
            }}
          />
        )}
      </GlobalShell>
      <CommandPalette />
      <ToastLayer />
      <ShortcutsHelp />
    </>
  )
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <AppInner />
    </AppContext.Provider>
  )
}
