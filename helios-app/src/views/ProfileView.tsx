import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Award, BookOpen, ChevronRight, Download, FolderGit2, LogOut, MessageCircle,
  Brain, Check, Eye, EyeOff, ImagePlus, KeyRound, Languages, Monitor, Moon, Palette, Plus, Settings, Sparkles, Star, Sun, Trash2, Users, X,
} from 'lucide-react'
import { api, ApiError, type AiProviderId, type Post, type Project, type SolarSummary, type SpaceSummary, type UserAiSettings } from '../api'
import { NewProjectModal } from '../components/NewProjectModal'
import { getMiniApp, getSpaceDefinition } from '../product/catalog'
import { useApp } from '../store/appStore'
import type { ThemeMode } from '../store/appStore'
import { LANGUAGES, setLanguage, useLanguage, useLocale, useT, type Language } from '../i18n'
import { UserAvatar } from '../components/UserAvatar'
import { clearHeliosMemory, setHeliosMemory, setMemoryEnabled, useHeliosMemory } from '../lib/heliosMemory'
import { clearSessionClientState } from '../lib/sessionCleanup'
import './ProfileView.css'

type ProfileTab = 'Journey' | 'Projects' | 'Posts' | 'Spaces' | 'Settings'
const EMPTY_SOLAR: SolarSummary = { total: 0, identity: 'Dawn', next_threshold: 100, events: [] }

export function ProfileView() {
  const { state, dispatch } = useApp()
  const t = useT()
  const [creator, setCreator] = useState<{ id: number; name: string; handle: string } | null>(null)
  const [tab, setTab] = useState<ProfileTab>('Journey')
  const [solar, setSolar] = useState<SolarSummary>(EMPTY_SOLAR)
  const [posts, setPosts] = useState<Post[]>([])
  const [spaces, setSpaces] = useState<SpaceSummary[]>([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [exporting, setExporting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('helios-open-creator')
      sessionStorage.removeItem('helios-open-creator')
      if (raw) setCreator(JSON.parse(raw) as { id: number; name: string; handle: string })
      if (sessionStorage.getItem('helios-open-settings')) {
        sessionStorage.removeItem('helios-open-settings')
        setTab('Settings')
      }
    } catch {}
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError('')
    Promise.all([api.solar(), api.posts.list({ limit: 100 }), api.spaces.list()]).then(([solarResult, postResult, spaceResult]) => {
      if (cancelled) return
      setSolar(solarResult || EMPTY_SOLAR)
      const authorId = creator?.id && creator.id !== state.user?.id ? creator.id : state.user?.id
      setPosts((postResult?.posts || []).filter(post => post.author_id === authorId))
      setSpaces(spaceResult?.spaces || [])
    }).catch(err => {
      if (!cancelled) setLoadError((err as Error).message || t('Profile could not load'))
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [creator?.id, state.user?.id])

  const joinedSpaceIds = useMemo(() => new Set([...state.projects.map(project => project.space_id), ...posts.map(post => post.space_id)]), [posts, state.projects])
  const joinedSpaces = spaces.filter(space => joinedSpaceIds.has(space.id) || space.custom)
  const ownedProjects = state.projects.filter(project => project.user_id === state.user?.id)
  const contributions = state.projects.filter(project => project.user_id !== state.user?.id)
  const helpEvents = (solar.events || []).filter(event => event.source_type === 'help')
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
    if (!window.confirm(t('Delete “{name}”? Linked posts remain but their Project preview is removed.', { name: project.name }))) return
    setDeleting(project.id)
    try { await api.projects.remove(project.id); dispatch({ type: 'REMOVE_PROJECT', id: project.id }) }
    catch (reason) { dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (reason as Error).message, tone: 'warning' } }) }
    finally { setDeleting(null) }
  }
  async function logout() {
    try { await api.logout() } catch {}
    clearSessionClientState()
    dispatch({ type: 'RESET_SESSION' })
  }
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
      {creator && creator.id !== state.user.id && <div className="space-readonly-banner" style={{ padding: 10, textAlign: 'center' }}>{t('Viewing {name}’s public work.', { name: creator.name })} <button type="button" onClick={() => setCreator(null)}>{t('Back to your profile')}</button></div>}
      <header className="profile-hero">
        <div className="profile-avatar"><span>{user.name.slice(0, 1).toUpperCase()}</span><i /></div>
        <div className="profile-identity">
          <span>Helios</span>
          <h1>{user.name}</h1>
          <p>{user.handle}</p>
          <div>
            <b>{ownedProjects.length}<small>{t('Projects')}</small></b>
            <b>{posts.length}<small>{t('Posts')}</small></b>
            <b>{contributions.length + helpEvents.length}<small>{t('Collab')}</small></b>
          </div>
        </div>
        <div className="profile-solar-card">
          <div className="profile-solar-orbit" style={{ '--solar-progress': `${progress * 3.6}deg` } as React.CSSProperties}>
            <span><Sun size={20} /><strong>{solar.total}</strong><small>Solar</small></span>
          </div>
          <div>
            <span>{t('Current identity')}</span>
            <strong>{t(solar.identity)}</strong>
            <small>{solar.next_threshold ? t('{count} to go', { count: Math.max(0, solar.next_threshold - solar.total) }) : t('Top level reached')}</small>
          </div>
        </div>
      </header>
      {loading && <div className="profile-journey-empty" role="status">{t('Loading…')}</div>}
      {loadError && (
        <div className="profile-journey-empty" role="alert">
          {loadError}
          <button type="button" className="liquid-glass-btn" onClick={() => window.location.reload()}>{t('Reload')}</button>
        </div>
      )}
      <nav className="profile-tabs" aria-label={t('Profile sections')}>{(['Journey', 'Projects', 'Posts', 'Spaces', 'Settings'] as const).map(item => <button type="button" key={item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>{t(item)}</button>)}</nav>

      <main className="profile-content">
        {tab === 'Journey' && <JourneyTab solar={solar} projects={ownedProjects} posts={posts} joinedSpaces={joinedSpaces} contributions={contributions} onOpenProject={openProject} onTab={setTab} />}
        {tab === 'Projects' && <ProjectsTab projects={state.projects} deleting={deleting} onOpen={openProject} onDelete={project => void deleteProject(project)} onNew={() => setShowNewProject(true)} />}
        {tab === 'Posts' && <PostsTab posts={posts} onOpenProject={id => { const project = state.projects.find(item => item.id === id); if (project) openProject(project) }} />}
        {tab === 'Spaces' && <SpacesTab spaces={joinedSpaces} onOpen={id => dispatch({ type: 'OPEN_SPACE', spaceId: id })} />}
        {tab === 'Settings' && <SettingsTab theme={state.theme} reducedMotion={state.reducedMotion} exporting={exporting} onTheme={theme => dispatch({ type: 'SET_THEME', theme })} onMotion={() => dispatch({ type: 'SET_REDUCED_MOTION', val: !state.reducedMotion })} onExport={() => void downloadData()} onLogout={() => void logout()} />}
      </main>
    </div>
  )
}

function JourneyTab({ solar, projects, posts, joinedSpaces, contributions, onOpenProject, onTab }: { solar: SolarSummary; projects: Project[]; posts: Post[]; joinedSpaces: SpaceSummary[]; contributions: Project[]; onOpenProject: (project: Project) => void; onTab: (tab: ProfileTab) => void }) {
  const t = useT()
  const locale = useLocale()
  const current = [...projects].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
  const milestones = (solar.events || []).slice(0, 8)
  return <div className="profile-journey-grid"><section className="profile-current-work"><header><div><span>{t('CURRENT')}</span><h2>{t('Pick up where you left off')}</h2></div>{current && <button type="button" onClick={() => onOpenProject(current)}>{t('Continue')} <ChevronRight size={13} /></button>}</header>{current ? <button type="button" className="journey-project glass-lift" onClick={() => onOpenProject(current)} style={{ '--journey-accent': getSpaceDefinition(current.space_id).accent } as React.CSSProperties}><i><FolderGit2 size={22} /></i><span><small>{t(getSpaceDefinition(current.space_id).name)} · {getMiniApp(current.app_kind).name}</small><strong>{current.name}</strong><p>{t('Updated {time}', { time: new Date(current.updated_at).toLocaleString(locale) })}</p></span><ChevronRight size={17} /></button> : <JourneyEmpty text={t('Pick a tool in Create and start your first piece of work.')} />}</section><section className="profile-story"><header><div><span>{t('SOLAR STORY')}</span><h2>{t('Meaningful milestones')}</h2></div></header><div className="profile-milestone-list">{milestones.map(event => <article key={event.id}><i>{event.source_type === 'help' ? <Users size={13} /> : event.source_type === 'project' ? <FolderGit2 size={13} /> : <Star size={13} />}</i><div><strong>{t(event.reason)}</strong><small>{new Date(event.created_at).toLocaleDateString(locale)} · +{event.amount} Solar</small></div></article>)}{milestones.length === 0 && <JourneyEmpty text={t('Create, finish, publish, help or complete a challenge to begin your Solar story.')} />}</div></section><section className="profile-journey-stats"><button type="button" onClick={() => onTab('Projects')}><FolderGit2 size={18} /><strong>{projects.length}</strong><span>{t('Owned Projects')}</span></button><button type="button" onClick={() => onTab('Posts')}><MessageCircle size={18} /><strong>{posts.length}</strong><span>{t('Progress posts')}</span></button><button type="button" onClick={() => onTab('Spaces')}><BookOpen size={18} /><strong>{joinedSpaces.length}</strong><span>{t('Joined Spaces')}</span></button><div><Sparkles size={18} /><strong>{contributions.length}</strong><span>{t('Shared Projects')}</span></div></section><section className="profile-achievements"><header><div><span>{t('IDENTITIES, NOT LEADERBOARDS')}</span><h2>{t('Solar progression')}</h2></div></header><div>{['Dawn', 'Orbit', 'Radiant', 'Nova', 'Stellar', 'Helios'].map((identity, index) => { const unlocked = ['Dawn', 'Orbit', 'Radiant', 'Nova', 'Stellar', 'Helios'].indexOf(solar.identity) >= index; return <article key={identity} className={unlocked ? 'is-unlocked' : ''}><i>{unlocked ? <Award size={15} /> : <span>·</span>}</i><strong>{t(identity)}</strong><small>{[0, 100, 280, 600, 1200, 2400][index]} Solar</small></article> })}</div><p>{t('Solar recognizes genuine creation, learning, publishing and help. Clicking and compulsive leaderboards do not earn it.')}</p></section></div>
}

function ProjectsTab({ projects, deleting, onOpen, onDelete, onNew }: { projects: Project[]; deleting: number | null; onOpen: (project: Project) => void; onDelete: (project: Project) => void; onNew: () => void }) { const t = useT(); const locale = useLocale(); return <section className="profile-tab-section"><header><div><span>{t('FILES')}</span><h2>{t('Projects & collaboration')}</h2><p>{t('Your work shows up across Space, Messages, and Home.')}</p></div><button type="button" className="liquid-glass-btn is-primary" onClick={onNew}><Plus size={14} /> {t('New')}</button></header><div className="profile-project-grid">{projects.map(project => <article key={project.id} className="glass-lift"><div><i><FolderGit2 size={18} /></i><span>{project.can_manage ? t('Owned') : project.collaborator_role ? `${t('Collaborator')} · ${t(project.collaborator_role)}` : t('Shared')}</span></div><small>{t(getSpaceDefinition(project.space_id).name)} · {getMiniApp(project.app_kind).name}</small><h3>{project.name}</h3><p>{t(project.visibility)} · {t('Updated {time}', { time: new Date(project.updated_at).toLocaleDateString(locale) })}</p><footer><button type="button" onClick={() => onOpen(project)}>{t('Open')}</button>{project.can_manage && <button type="button" onClick={() => onDelete(project)} disabled={deleting === project.id} aria-label={t('Delete {name}', { name: project.name })}><Trash2 size={13} /></button>}</footer></article>)}{projects.length === 0 && <JourneyEmpty text={t('No projects yet. Pick a tool in Create to start.')} />}</div></section> }
function PostsTab({ posts, onOpenProject }: { posts: Post[]; onOpenProject: (id: number) => void }) { const t = useT(); const locale = useLocale(); return <section className="profile-tab-section"><header><div><span>{t('SPACE')}</span><h2>{t('Your posts')}</h2><p>{t('Progress and moments you have shared.')}</p></div></header><div className="profile-post-list">{posts.map(post => <article key={post.id} className="glass-lift"><header><span>{t(getSpaceDefinition(post.space_id).name)}</span><time>{new Date(post.created_at).toLocaleDateString(locale)}</time></header><p>{post.body}</p>{post.media_url && <img src={post.media_url} alt={t('Progress')} />}{post.project_id && <button type="button" onClick={() => onOpenProject(post.project_id!)}><FolderGit2 size={14} /> {post.project_name}<ChevronRight size={13} /></button>}<footer><span><Sparkles size={12} /> {Object.values(post.reactions || {}).reduce((sum, value) => sum + value, 0)}</span><span><MessageCircle size={12} /> {post.comment_count || 0}</span></footer></article>)}{posts.length === 0 && <JourneyEmpty text={t('Head to Space and share your first post.')} />}</div></section> }
function SpacesTab({ spaces, onOpen }: { spaces: SpaceSummary[]; onOpen: (id: string) => void }) { const t = useT(); return <section className="profile-tab-section"><header><div><span>{t('SPACES')}</span><h2>{t('Spaces you have joined')}</h2><p>{t('Traces of real collaboration.')}</p></div></header><div className="profile-space-grid">{spaces.map(space => { const definition = getSpaceDefinition(space.id); return <button type="button" key={space.id} className="glass-lift" onClick={() => onOpen(space.id)} style={{ '--profile-accent': definition.accent } as React.CSSProperties}><i>{space.name.slice(0, 1)}</i><span>{t(space.kind)}</span><h3>{t(space.name)}</h3><p>{t(definition.description)}</p><footer>{t('{count} Projects', { count: space.project_count })} · {t('{count} Live', { count: space.live_count })} <ChevronRight size={12} /></footer></button> })}{spaces.length === 0 && <JourneyEmpty text={t('After you create or post, your spaces will show up here.')} />}</div></section> }
const THEME_OPTIONS: { id: ThemeMode; label: string; hint: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', hint: 'Bright porcelain glass with warm terracotta.', icon: Sun },
  { id: 'dark', label: 'Dark', hint: 'Deep graphite glass, softened for long sessions.', icon: Moon },
  { id: 'system', label: 'System', hint: 'Follows your device appearance automatically.', icon: Monitor },
]

function ThemeSwatch({ scheme }: { scheme: 'light' | 'dark' | 'system' }) {
  return (
    <span className={'theme-swatch is-' + scheme} aria-hidden="true">
      <i className="theme-swatch-bar" />
      <i className="theme-swatch-card" />
      <i className="theme-swatch-card is-second" />
      <i className="theme-swatch-accent" />
    </span>
  )
}

const LANGUAGE_HINTS: Record<Language, string> = {
  en: 'Default. Menus, Mini Apps and Helios in English.',
  'zh-CN': '简体中文界面，Helios 也用简体中文回答。',
  'zh-TW': '繁體中文介面，Helios 也用繁體中文回答。',
}

function AvatarCard() {
  const { state, dispatch } = useApp()
  const t = useT()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const user = state.user
  if (!user) return null

  async function onFile(file: File | undefined) {
    if (!file) return
    setError('')
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      setError(t('Use a PNG, JPEG, WebP or GIF image.'))
      return
    }
    if (file.size > 80_000) {
      setError(t('Keep the avatar under 80 KB.'))
      return
    }
    setBusy(true)
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      const result = await api.updateMe({ avatar: data })
      dispatch({ type: 'SET_USER', user: result.user })
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      const result = await api.updateMe({ avatar: null })
      dispatch({ type: 'SET_USER', user: result.user })
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article>
      <h3><ImagePlus size={15} /> {t('Profile icon')}</h3>
      <div className="profile-setting-row">
        <span className="flex items-center gap-3">
          <UserAvatar name={user.name} src={user.avatar} size={48} />
          <span><strong>{user.name}</strong><small>{t('Initials are used until you upload a photo.')}</small></span>
        </span>
        <div className="flex gap-2">
          <label className="profile-export" style={{ cursor: busy ? 'wait' : 'pointer' }}>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden disabled={busy} onChange={event => { void onFile(event.target.files?.[0]); event.currentTarget.value = '' }} />
            {t('Upload')}
          </label>
          {user.avatar && <button type="button" className="profile-export" onClick={() => void remove()} disabled={busy}>{t('Remove')}</button>}
        </div>
      </div>
      {error && <p role="alert" style={{ color: 'var(--helios-danger)', fontSize: 12 }}>{error}</p>}
    </article>
  )
}

function MemoryCard() {
  const t = useT()
  const memory = useHeliosMemory()
  const [draft, setDraft] = useState('')
  return (
    <article>
      <h3><Brain size={15} /> {t('Helios memory')}</h3>
      <div className="profile-setting-row">
        <span><strong>{t('Remember useful context')}</strong><small>{t('Stored only on this device. You can inspect and clear it anytime.')}</small></span>
        <button type="button" className={'profile-switch' + (memory.enabled ? ' is-active' : '')} onClick={() => setMemoryEnabled(!memory.enabled)} aria-pressed={memory.enabled}><i /></button>
      </div>
      {memory.enabled && (
        <>
          <form className="flex gap-2 mt-3" onSubmit={event => { event.preventDefault(); if (!draft.trim()) return; setHeliosMemory({ notes: [...memory.notes, draft.trim()] }); setDraft('') }}>
            <input value={draft} onChange={event => setDraft(event.target.value)} maxLength={280} placeholder={t('Add a note Helios should remember…')} className="flex-1" style={{ padding: '8px 10px', border: '1px solid var(--helios-border)', borderRadius: 10, background: 'var(--helios-surface2)', color: 'var(--helios-text)' }} />
            <button type="submit" className="profile-export" disabled={!draft.trim()}>{t('Add')}</button>
          </form>
          <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {memory.notes.map((note, index) => (
              <li key={note + index} className="flex items-start justify-between gap-2" style={{ fontSize: 13 }}>
                <span>{note}</span>
                <button type="button" onClick={() => setHeliosMemory({ notes: memory.notes.filter((_, i) => i !== index) })} aria-label={t('Remove note')} style={{ background: 'none', border: 'none', color: 'var(--helios-muted)', cursor: 'pointer' }}><X size={13} /></button>
              </li>
            ))}
          </ul>
          {memory.summary && (
            <details style={{ marginTop: 10, fontSize: 12, color: 'var(--helios-muted)' }}>
              <summary>{t('Recent summary')}</summary>
              <pre style={{ whiteSpace: 'pre-wrap', font: 'inherit', margin: '8px 0 0' }}>{memory.summary}</pre>
            </details>
          )}
          <button type="button" className="profile-export" style={{ marginTop: 10 }} onClick={() => clearHeliosMemory()}>{t('Clear memory')}</button>
        </>
      )}
    </article>
  )
}

function LanguageCard() {
  const t = useT()
  const language = useLanguage()
  return (
    <article>
      <h3><Languages size={15} /> {t('Language')}</h3>
      <div className="profile-theme-buttons profile-language-buttons" role="radiogroup" aria-label={t('Language')}>
        {LANGUAGES.map(option => {
          const active = language === option.id
          return (
            <button type="button" key={option.id} role="radio" aria-checked={active} className={active ? 'is-active' : ''} onClick={() => setLanguage(option.id)} lang={option.id}>
              <span className="language-swatch" aria-hidden="true">{option.id === 'en' ? 'Aa' : option.id === 'zh-CN' ? '简' : '繁'}</span>
              <span><strong>{option.native}{option.id === 'en' ? ` · ${t('Default')}` : ''}</strong><small>{LANGUAGE_HINTS[option.id]}</small></span>
            </button>
          )
        })}
      </div>
    </article>
  )
}

function SettingsTab({ theme, reducedMotion, exporting, onTheme, onMotion, onExport, onLogout }: { theme: ThemeMode; reducedMotion: boolean; exporting: boolean; onTheme: (theme: ThemeMode) => void; onMotion: () => void; onExport: () => void; onLogout: () => void }) {
  const t = useT()
  return (
    <section className="profile-settings">
      <header><span>{t('ACCOUNT & ACCESSIBILITY')}</span><h2>{t('Settings')}</h2></header>
      <AvatarCard />
      <LanguageCard />
      <MemoryCard />
      <article>
        <h3><Palette size={15} /> {t('Appearance')}</h3>
        <div className="profile-theme-buttons" role="radiogroup" aria-label={t('Theme')}>
          {THEME_OPTIONS.map(option => {
            const Icon = option.icon
            const active = theme === option.id
            return (
              <button type="button" key={option.id} role="radio" aria-checked={active} className={active ? 'is-active' : ''} onClick={() => onTheme(option.id)}>
                <ThemeSwatch scheme={option.id} />
                <span><strong><Icon size={12} /> {t(option.label)}</strong><small>{t(option.hint)}</small></span>
              </button>
            )
          })}
        </div>
      </article>
      <AiProviderCard />
      <article>
        <h3><Settings size={15} /> {t('Accessibility')}</h3>
        <div className="profile-setting-row">
          <span><strong>{t('Reduce motion')}</strong><small>{t('Minimize spatial and realtime transitions.')}</small></span>
          <button type="button" className={'profile-switch' + (reducedMotion ? ' is-active' : '')} onClick={onMotion} aria-pressed={reducedMotion}><i /></button>
        </div>
      </article>
      <article>
        <h3><Download size={15} /> {t('Your Helios data')}</h3>
        <p>{t('Download account, Projects and social records currently included in your export.')}</p>
        <button type="button" className="profile-export" onClick={onExport} disabled={exporting}><Download size={13} /> {exporting ? t('Preparing…') : t('Download JSON export')}</button>
      </article>
      <button type="button" className="profile-logout" onClick={onLogout}><LogOut size={14} /> {t('Sign out')}</button>
    </section>
  )
}
const PROVIDER_ORDER: AiProviderId[] = ['groq', 'openai', 'gemini', 'deepseek', 'openrouter', 'ollama', 'custom']
const PROVIDER_KEY_HINT: Record<AiProviderId, string> = {
  groq: 'console.groq.com → API Keys (free tier)',
  openai: 'platform.openai.com → API keys',
  gemini: 'aistudio.google.com → Get API key (free tier)',
  deepseek: 'platform.deepseek.com → API keys',
  openrouter: 'openrouter.ai → Keys (has free routes)',
  ollama: 'Any value works, e.g. "ollama". Host must be reachable from the internet.',
  custom: 'Any OpenAI-compatible /v1/chat/completions endpoint.',
}

function AiProviderCard() {
  const t = useT()
  const [settings, setSettings] = useState<UserAiSettings | null>(null)
  const [provider, setProvider] = useState<AiProviderId>('groq')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [busy, setBusy] = useState<'save' | 'test' | 'remove' | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.ai.get()
      setSettings(data)
      if (data.configured) {
        setProvider(data.provider)
        setBaseUrl(data.base_url)
        setModel(data.model)
      } else {
        const preset = data.presets.groq
        setProvider('groq'); setBaseUrl(preset.base_url); setModel(preset.model)
      }
    } catch (error) {
      setNotice({ tone: 'error', text: (error as Error).message })
    }
  }, [])
  useEffect(() => { void load() }, [load])

  const pickProvider = (id: AiProviderId) => {
    setProvider(id)
    const preset = settings?.presets[id]
    if (preset) { setBaseUrl(preset.base_url); setModel(preset.model) }
    setNotice(null)
  }

  const describeError = (error: unknown) => {
    if (error instanceof ApiError) return error.detail ? `${error.message} — ${error.detail}` : error.message
    return (error as Error).message
  }

  const save = async () => {
    setBusy('save'); setNotice(null)
    try {
      const data = await api.ai.save({ provider, api_key: apiKey || undefined, base_url: baseUrl, model })
      setSettings(data); setApiKey(''); setEditing(false)
      window.dispatchEvent(new CustomEvent('helios-ai-settings-changed'))
      setNotice({ tone: 'ok', text: t('Saved. Helios now uses your {provider} key.', { provider: data.presets[data.provider]?.label ?? t('custom') }) })
    } catch (error) { setNotice({ tone: 'error', text: describeError(error) }) }
    finally { setBusy(null) }
  }

  const test = async () => {
    setBusy('test'); setNotice(null)
    try {
      const result = await api.ai.test({ api_key: apiKey || undefined, base_url: baseUrl, model })
      setNotice({ tone: 'ok', text: t('Connected · {model} replied “{reply}”', { model: result.model, reply: result.reply }) })
    } catch (error) { setNotice({ tone: 'error', text: describeError(error) }) }
    finally { setBusy(null) }
  }

  const remove = async () => {
    setBusy('remove'); setNotice(null)
    try {
      const data = await api.ai.remove()
      setSettings(data); setApiKey(''); setEditing(false)
      window.dispatchEvent(new CustomEvent('helios-ai-settings-changed'))
      const preset = data.presets.groq
      setProvider('groq'); setBaseUrl(preset.base_url); setModel(preset.model)
      setNotice({ tone: 'ok', text: t('Back on the Helios default provider.') })
    } catch (error) { setNotice({ tone: 'error', text: describeError(error) }) }
    finally { setBusy(null) }
  }

  const siteLabel = settings
    ? settings.site_default.kind === 'local' ? t('Helios local helper (rules only)')
      : settings.site_default.kind === 'ollama' ? `Helios Ollama · ${settings.site_default.model}`
      : `${t('Helios default')} · ${settings.site_default.model}`
    : '…'
  const showForm = editing || !settings?.configured
  const canSubmit = Boolean(baseUrl.trim() && model.trim() && (apiKey.trim() || settings?.configured))

  return (
    <article className="ai-provider-card">
      <h3><KeyRound size={15} /> {t('AI provider')}</h3>
      <div className="ai-provider-status">
        <span className={'ai-provider-dot' + (settings?.configured ? ' is-own' : '')} />
        <div>
          <strong>{settings?.configured ? `${t('Your key')} · ${settings.presets[settings.provider]?.label ?? t('Custom')} · ${settings.model}` : t('Using {provider}', { provider: siteLabel })}</strong>
          <small>{settings?.configured ? `${t('Key')} ${settings.key_preview} · ${settings.base_url}` : t('Add your own key to pick the model Helios answers with. Keys are encrypted and never shown again in full.')}</small>
        </div>
        {settings?.configured && !editing && (
          <div className="ai-provider-actions">
            <button type="button" className="liquid-glass-btn" onClick={() => { setEditing(true); setNotice(null) }}>{t('Change')}</button>
            <button type="button" className="liquid-glass-btn" onClick={() => void remove()} disabled={busy !== null}>{busy === 'remove' ? t('Removing…') : t('Use Helios default')}</button>
          </div>
        )}
      </div>

      {showForm && (
        <div className="ai-provider-form">
          <div className="ai-provider-presets" role="radiogroup" aria-label={t('Provider')}>
            {PROVIDER_ORDER.map(id => (
              <button type="button" key={id} role="radio" aria-checked={provider === id} className={provider === id ? 'is-active' : ''} onClick={() => pickProvider(id)}>
                {settings?.presets[id]?.label ?? id}
              </button>
            ))}
          </div>
          <label className="helios-field">
            <span>{t('API key')}</span>
            <div className="ai-provider-key">
              <input className="helios-input" type={showKey ? 'text' : 'password'} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={settings?.configured ? t('Leave blank to keep {preview}', { preview: settings.key_preview }) : t('Paste your key')} autoComplete="off" spellCheck={false} />
              <button type="button" onClick={() => setShowKey(v => !v)} aria-label={showKey ? t('Hide key') : t('Show key')}>{showKey ? <EyeOff size={14} /> : <Eye size={14} />}</button>
            </div>
            <small>{t(PROVIDER_KEY_HINT[provider])}</small>
          </label>
          <div className="ai-provider-grid">
            <label className="helios-field"><span>{t('Base URL')}</span><input className="helios-input" value={baseUrl} onChange={e => setBaseUrl(e.target.value)} placeholder="https://api.example.com" spellCheck={false} /></label>
            <label className="helios-field"><span>{t('Model')}</span><input className="helios-input" value={model} onChange={e => setModel(e.target.value)} placeholder="model-name" spellCheck={false} /></label>
          </div>
          <div className="ai-provider-actions">
            <button type="button" className="liquid-glass-btn is-primary" onClick={() => void save()} disabled={busy !== null || !canSubmit}>{busy === 'save' ? t('Saving…') : <><Check size={13} /> {t('Save & use my key')}</>}</button>
            <button type="button" className="liquid-glass-btn" onClick={() => void test()} disabled={busy !== null || !canSubmit}>{busy === 'test' ? t('Testing…') : t('Test connection')}</button>
            {settings?.configured && <button type="button" className="liquid-glass-btn" onClick={() => { setEditing(false); setApiKey(''); setNotice(null); void load() }}><X size={13} /> {t('Cancel')}</button>}
          </div>
        </div>
      )}
      {notice && <p className={'ai-provider-notice is-' + notice.tone} role="status">{notice.text}</p>}
    </article>
  )
}

function JourneyEmpty({ text }: { text: string }) { return <div className="profile-journey-empty"><Sparkles size={18} /><span>{text}</span></div> }
