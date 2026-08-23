import { lazy, Suspense, useReducer, useEffect, useRef, useState } from 'react'
import { AppContext, reducer, INITIAL_STATE, useApp } from './store/appStore'
import type { User } from './api'
import { api } from './api'
import { AuthScreen } from './components/AuthScreen'
import { GlobalShell } from './components/GlobalShell'
import { HeliosPanel } from './components/HeliosPanel'
import { CommandPalette } from './components/CommandPalette'
import { ShortcutsHelp } from './components/ShortcutsHelp'
import { ToastLayer } from './components/ToastLayer'
import { HomeView } from './views/HomeView'
import './App.css'

const LandingPage = lazy(() => import('./components/LandingPage').then(m => ({ default: m.LandingPage })))
const ExploreView = lazy(() => import('./views/ExploreView').then(m => ({ default: m.ExploreView })))
const SpacesView = lazy(() => import('./views/SpacesView').then(m => ({ default: m.SpacesView })))
const SpaceView = lazy(() => import('./views/SpaceView').then(m => ({ default: m.SpaceView })))
const LifestyleView = lazy(() => import('./views/LifestyleView').then(m => ({ default: m.LifestyleView })))
const LiveView = lazy(() => import('./views/LiveView').then(m => ({ default: m.LiveView })))
const ChatView = lazy(() => import('./views/ChatView').then(m => ({ default: m.ChatView })))
const ProfileView = lazy(() => import('./views/ProfileView').then(m => ({ default: m.ProfileView })))
const MiniAppsView = lazy(() => import('./views/MiniAppsView').then(m => ({ default: m.MiniAppsView })))
const CreateView = lazy(() => import('./views/CreateView').then(m => ({ default: m.CreateView })))
const LearnView = lazy(() => import('./views/LearnView').then(m => ({ default: m.LearnView })))
const CreativeView = lazy(() => import('./views/CreativeView').then(m => ({ default: m.CreativeView })))
const ProjectWorkspace = lazy(() => import('./workspaces/ProjectWorkspace').then(m => ({ default: m.ProjectWorkspace })))

function ViewFallback() {
  return (
    <div className="os-page" role="status" aria-label="Loading">
      <div className="os-skeleton" style={{ height: 72, marginBottom: 20 }} />
      <div className="os-skeleton" style={{ height: 240 }} />
    </div>
  )
}

function MainContent() {
  const { state, dispatch } = useApp()
  const activeProject = state.projects.find(p => p.id === state.activeProjectId) ?? null

  if (state.codeEditorOpen && state.user) {
    return (
      <Suspense fallback={<ViewFallback />}>
        <ProjectWorkspace
          activeProject={activeProject}
          onProjectUpdate={p => dispatch({ type: 'UPDATE_PROJECT', project: p })}
        />
      </Suspense>
    )
  }

  if (!state.user) return null

  let content: React.ReactNode
  switch (state.view) {
    case 'home':      content = <HomeView />; break
    case 'explore':   content = <ExploreView />; break
    case 'create':    content = <CreateView />; break
    case 'projects':  content = <SpacesView />; break
    case 'miniapps':  content = <MiniAppsView />; break
    case 'chat':      content = <ChatView />; break
    case 'learn':     content = <LearnView />; break
    case 'creative':  content = <CreativeView />; break
    case 'spaces':    content = <SpaceView />; break
    case 'lifestyle': content = <LifestyleView currentUser={state.user} />; break
    case 'live':      content = <LiveView />; break
    case 'profile':   content = <ProfileView />; break
    default:          content = <HomeView />
  }
  return (
    <div
      key={state.view}
      className={'helios-view-frame ' + (state.viewDirection > 0 ? 'view-forward' : 'view-backward')}
    >
      <Suspense fallback={<ViewFallback />}>{content}</Suspense>
    </div>
  )
}

function AppInner() {
  const { state, dispatch } = useApp()
  const [authMode, setAuthMode] = useState<'landing' | 'auth'>('landing')
  const [authDefaultTab, setAuthDefaultTab] = useState<'login' | 'register'>('register')
  const previousUserId = useRef<number | null>(state.user?.id ?? null)

  useEffect(() => {
    const currentUserId = state.user?.id ?? null
    if (previousUserId.current !== null && currentUserId === null) {
      setAuthMode('landing')
      setAuthDefaultTab('register')
    }
    previousUserId.current = currentUserId
  }, [state.user])

  useEffect(() => {
    const VIEW_TITLES: Record<string, string> = {
      home: 'Home',
      explore: 'Explore',
      create: 'Create',
      projects: 'Projects',
      miniapps: 'Mini Apps',
      chat: 'Chat',
      learn: 'Learn',
      creative: 'Studio',
      spaces: 'Space',
      lifestyle: 'Feed',
      live: 'Live',
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

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-reduced-motion', state.reducedMotion ? 'true' : 'false')
    if (state.reducedMotion) document.documentElement.classList.add('motion-reduced')
    else document.documentElement.classList.remove('motion-reduced')
  }, [state.reducedMotion])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) dispatch({ type: 'SET_REDUCED_MOTION', val: true })
    const h = (e: MediaQueryListEvent) => dispatch({ type: 'SET_REDUCED_MOTION', val: e.matches })
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [dispatch])

  if (state.authLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--helios-bg)' }}>
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,.55), transparent 28%), radial-gradient(circle at 50% 50%, #8ea0ff 0%, #4a5cff 48%, #1b2248 100%)',
            boxShadow: '0 0 28px rgba(94,231,255,.25)',
            animation: 'pulse-fade 1.5s ease-in-out infinite',
          }}
        />
        <span className="sr-only">Loading Helios Space</span>
        <style>{`@keyframes pulse-fade { 0%,100%{opacity:.4;transform:scale(.9)} 50%{opacity:1;transform:scale(1)} }`}</style>
      </div>
    )
  }

  if (!state.user) {
    if (authMode === 'landing') {
      return (
        <Suspense fallback={<ViewFallback />}>
          <LandingPage
            onGetStarted={() => { setAuthDefaultTab('register'); setAuthMode('auth') }}
            onSignIn={() => { setAuthDefaultTab('login'); setAuthMode('auth') }}
          />
        </Suspense>
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
