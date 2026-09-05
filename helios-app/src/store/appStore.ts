import { createContext, useContext } from 'react'
import type { Dispatch } from 'react'
import type { User, Project, SiteInfo } from '../api'
import type { Locale } from '../i18n'
import { normalizeLocale } from '../i18n'

// ── Preference persistence ────────────────────────────────────────────────────
// Only safe, non-sensitive UI prefs are persisted — never auth or project data.
const PREFS_KEY = 'helios-prefs-v1'

interface StoredPrefs {
  theme: ThemeMode
  reducedMotion: boolean
  locale: Locale
  activeSpaceId: string
  activeSubjectId?: string
}

function loadPrefs(): Partial<StoredPrefs> {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    return raw ? (JSON.parse(raw) as StoredPrefs) : {}
  } catch {
    return {}
  }
}

export function savePrefs(prefs: Partial<StoredPrefs>) {
  try {
    const existing = loadPrefs()
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...existing, ...prefs }))
  } catch {}
}

export type NavView = 'home' | 'explore' | 'spaces' | 'lifestyle' | 'apps' | 'live' | 'chat' | 'projects' | 'profile'
export type ThemeMode = 'dark' | 'high-contrast'
export type SpaceTab = 'feed' | 'projects' | 'apps' | 'live' | 'chat' | 'members' | 'challenges' | 'resources' | 'helios'

const NAV_ORDER: NavView[] = ['home', 'explore', 'spaces', 'lifestyle', 'apps', 'live', 'chat', 'projects', 'profile']

export interface ToastItem {
  id: string
  message: string
  tone: 'success' | 'info' | 'warning'
}

export interface NotificationItem {
  id: string
  kind: 'system' | 'info' | 'success' | 'warning'
  title: string
  detail: string
  ts: string
  read: boolean
}

export interface AppState {
  // Auth
  user: User | null
  authLoading: boolean
  aiEnabled: boolean
  siteInfo: SiteInfo | null

  // Navigation
  view: NavView
  viewDirection: -1 | 1
  activeSpaceId: string
  activeSpaceTab: SpaceTab
  activeLiveSessionId: number | null
  heliosPanelOpen: boolean
  notificationsOpen: boolean
  commandPaletteOpen: boolean
  shortcutsOpen: boolean

  // Projects (real data from API)
  projects: Project[]
  projectsLoading: boolean
  activeProjectId: number | null
  codeEditorOpen: boolean

  // Notifications
  notifications: NotificationItem[]

  // Toasts
  toasts: ToastItem[]

  // Chat unread badge (polled by GlobalShell)
  chatUnreadCount: number

  // Theme / accessibility / language
  theme: ThemeMode
  reducedMotion: boolean
  locale: Locale
}

type Action =
  | { type: 'SET_USER'; user: User | null }
  | { type: 'SET_AUTH_LOADING'; val: boolean }
  | { type: 'SET_SITE_INFO'; info: SiteInfo }
  | { type: 'SET_VIEW'; view: NavView }
  | { type: 'SET_ACTIVE_SUBJECT'; subjectId: string }
  | { type: 'OPEN_SPACE'; spaceId: string; tab?: SpaceTab }
  | { type: 'SET_SPACE_TAB'; tab: SpaceTab }
  | { type: 'OPEN_LIVE_SESSION'; sessionId: number }
  | { type: 'CLOSE_LIVE_SESSION' }
  | { type: 'TOGGLE_HELIOS_PANEL' }
  | { type: 'OPEN_HELIOS_PANEL' }
  | { type: 'CLOSE_HELIOS_PANEL' }
  | { type: 'TOGGLE_NOTIFICATIONS' }
  | { type: 'MARK_NOTIFICATIONS_READ' }
  | { type: 'ADD_NOTIFICATION'; item: NotificationItem }
  | { type: 'TOGGLE_COMMAND_PALETTE' }
  | { type: 'SET_COMMAND_PALETTE'; open: boolean }
  | { type: 'TOGGLE_SHORTCUTS' }
  | { type: 'SET_SHORTCUTS'; open: boolean }
  | { type: 'SET_PROJECTS'; projects: Project[] }
  | { type: 'ADD_PROJECT'; project: Project }
  | { type: 'UPDATE_PROJECT'; project: Project }
  | { type: 'REMOVE_PROJECT'; id: number }
  | { type: 'OPEN_CODE_EDITOR'; projectId: number }
  | { type: 'CLOSE_CODE_EDITOR' }
  | { type: 'PUSH_TOAST'; toast: ToastItem }
  | { type: 'DISMISS_TOAST'; id: string }
  | { type: 'SET_THEME'; theme: ThemeMode }
  | { type: 'SET_REDUCED_MOTION'; val: boolean }
  | { type: 'SET_LOCALE'; locale: Locale }
  | { type: 'RESET_SESSION' }
  | { type: 'SET_CHAT_UNREAD'; count: number }

// Boot with persisted prefs so theme / motion / last subject survive reload
const _prefs = loadPrefs()

export const INITIAL_STATE: AppState = {
  user: null,
  authLoading: true,
  aiEnabled: false,
  siteInfo: null,
  view: 'home',
  viewDirection: 1,
  activeSpaceId: _prefs.activeSpaceId ?? _prefs.activeSubjectId ?? 'coding',
  activeSpaceTab: 'feed',
  activeLiveSessionId: null,
  heliosPanelOpen: false,
  notificationsOpen: false,
  commandPaletteOpen: false,
  shortcutsOpen: false,
  projects: [],
  projectsLoading: false,
  activeProjectId: null,
  codeEditorOpen: false,
  notifications: [],
  toasts: [],
  theme: _prefs.theme ?? 'dark',
  reducedMotion: _prefs.reducedMotion ?? false,
  locale: normalizeLocale(_prefs.locale),
  chatUnreadCount: 0,
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      if (!action.user) {
        return {
          ...state,
          user: null,
          authLoading: false,
          projects: [],
          activeProjectId: null,
          codeEditorOpen: false,
          heliosPanelOpen: false,
          notificationsOpen: false,
          commandPaletteOpen: false,
          shortcutsOpen: false,
          notifications: [],
          toasts: [],
          view: 'home',
        }
      }
      return {
        ...state,
        user: action.user,
        authLoading: false,
        ...(state.user && state.user.id !== action.user.id
          ? { projects: [], activeProjectId: null, codeEditorOpen: false, notifications: [], toasts: [], view: 'home' as const }
          : {}),
      }
    case 'SET_AUTH_LOADING':
      return { ...state, authLoading: action.val }
    case 'SET_SITE_INFO':
      return { ...state, siteInfo: action.info, aiEnabled: action.info.ai_enabled }
  case 'SET_VIEW': {
    const currentIndex = NAV_ORDER.indexOf(state.view)
    const nextIndex = NAV_ORDER.indexOf(action.view)
    return {
      ...state,
      view: action.view,
      viewDirection: nextIndex < currentIndex ? -1 : 1,
      codeEditorOpen: false,
      activeLiveSessionId: action.view === 'live' ? state.activeLiveSessionId : null,
      commandPaletteOpen: false,
    }
  }
  case 'SET_ACTIVE_SUBJECT':
    savePrefs({ activeSpaceId: action.subjectId })
    return { ...state, activeSpaceId: action.subjectId }
  case 'OPEN_SPACE':
    savePrefs({ activeSpaceId: action.spaceId })
    return {
      ...state,
      activeSpaceId: action.spaceId,
      activeSpaceTab: action.tab ?? 'feed',
      view: 'spaces',
      viewDirection: state.view === 'spaces' ? state.viewDirection : 1,
      codeEditorOpen: false,
      activeLiveSessionId: null,
      commandPaletteOpen: false,
    }
  case 'SET_SPACE_TAB':
    return { ...state, activeSpaceTab: action.tab }
  case 'OPEN_LIVE_SESSION':
    return { ...state, view: 'live', activeLiveSessionId: action.sessionId, codeEditorOpen: false }
    case 'CLOSE_LIVE_SESSION':
      return { ...state, activeLiveSessionId: null }
    case 'SET_CHAT_UNREAD':
      return { ...state, chatUnreadCount: action.count }
  case 'TOGGLE_HELIOS_PANEL':
      return { ...state, heliosPanelOpen: !state.heliosPanelOpen }
    case 'OPEN_HELIOS_PANEL':
      return { ...state, heliosPanelOpen: true }
    case 'CLOSE_HELIOS_PANEL':
      return { ...state, heliosPanelOpen: false }
    case 'TOGGLE_NOTIFICATIONS':
      return { ...state, notificationsOpen: !state.notificationsOpen }
    case 'MARK_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) }
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.item, ...state.notifications] }
    case 'TOGGLE_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: !state.commandPaletteOpen }
    case 'SET_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: action.open }
    case 'TOGGLE_SHORTCUTS':
      return { ...state, shortcutsOpen: !state.shortcutsOpen }
    case 'SET_SHORTCUTS':
      return { ...state, shortcutsOpen: action.open }
    case 'SET_PROJECTS':
      return { ...state, projects: action.projects }
    case 'ADD_PROJECT':
      return { ...state, projects: [action.project, ...state.projects] }
    case 'UPDATE_PROJECT':
      return { ...state, projects: state.projects.map(p => p.id === action.project.id ? action.project : p) }
    case 'REMOVE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.id),
        ...(state.activeProjectId === action.id ? { activeProjectId: null, codeEditorOpen: false } : {}),
      }
    case 'OPEN_CODE_EDITOR':
      return { ...state, codeEditorOpen: true, activeProjectId: action.projectId, activeLiveSessionId: null }
    case 'CLOSE_CODE_EDITOR':
      return { ...state, codeEditorOpen: false }
    case 'PUSH_TOAST':
      return { ...state, toasts: [...state.toasts, action.toast] }
    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }
    case 'SET_THEME':
      savePrefs({ theme: action.theme })
      return { ...state, theme: action.theme }
    case 'SET_REDUCED_MOTION':
      savePrefs({ reducedMotion: action.val })
      return { ...state, reducedMotion: action.val }
    case 'SET_LOCALE':
      savePrefs({ locale: action.locale })
      return { ...state, locale: action.locale }
    case 'RESET_SESSION':
      return {
        ...INITIAL_STATE,
        authLoading: false,
        theme: state.theme,
        reducedMotion: state.reducedMotion,
        locale: state.locale,
        activeSpaceId: state.activeSpaceId,
      }
    default:
      return state
  }
}

export const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppContext.Provider')
  return ctx
}
