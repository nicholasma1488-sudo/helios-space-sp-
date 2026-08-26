import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ChevronDown, Eye, FolderGit2, History, Lock, MessageCircle, Radio,
  Save, Send, Share2, Sparkles, UserPlus, Users, X,
} from 'lucide-react'
import {
  api, type Collaborator, type LiveEvent, type LiveSession, type Project,
  type ProjectComment, type ProjectVersion,
} from '../api'
import { PublishModal } from '../components/PublishModal'
import { getMiniApp, getSpaceDefinition } from '../product/catalog'
import { getSuiteApp } from '../product/miniApps'
import { useApp } from '../store/appStore'
import { CodeWorkspace } from './CodeWorkspace'
import { DrawingWorkspace, MathWorkspace, ProjectBoardWorkspace, SurveyWorkspace } from './CreativeWorkspaces'
import { NotebookWorkspace } from './NotebookWorkspace'
import { PresentationWorkspace, SpreadsheetWorkspace, WritingWorkspace } from './ProductivityWorkspaces'
import { StocksWorkspace } from './StocksWorkspace'
import { RepoBoundWorkspace } from './RepoFrame'
import { askHeliosWithContext, openOrCreateProjectChat, publishLiveReplay } from '../product/flow'
import { parseWorkspace, resolveWorkspaceKind, serializeWorkspace, type WorkspacePayload } from './workspaceData'
import './ProjectWorkspace.css'

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'
type SidePanel = 'comments' | 'versions' | 'collaborators' | 'permissions' | null

interface Props {
  activeProject: Project | null
  onProjectUpdate: (project: Project) => void
}

export function ProjectWorkspace({ activeProject, onProjectUpdate }: Props) {
  const { state, dispatch } = useApp()
  const [payload, setPayload] = useState<WorkspacePayload | null>(() => activeProject ? parseWorkspace(activeProject) : null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [saveError, setSaveError] = useState('')
  const [sidePanel, setSidePanel] = useState<SidePanel>(null)
  const [showPublish, setShowPublish] = useState(false)
  const [versions, setVersions] = useState<ProjectVersion[]>([])
  const [comments, setComments] = useState<ProjectComment[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [commentDraft, setCommentDraft] = useState('')
  const [inviteHandle, setInviteHandle] = useState('')
  const [inviteRole, setInviteRole] = useState<Collaborator['role']>('editor')
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null)
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([])
  const [liveDraft, setLiveDraft] = useState('')
  const [liveStarting, setLiveStarting] = useState(false)
  const [showLiveSetup, setShowLiveSetup] = useState(false)
  const [liveTitle, setLiveTitle] = useState(activeProject?.name ? `Building ${activeProject.name}` : 'Live work session')
  const [liveAudience, setLiveAudience] = useState<'public' | 'private'>('public')
  const [livePermissions, setLivePermissions] = useState({ comment: true, suggest: true, request_edit: true, voice: false })
  const payloadRef = useRef(payload)
  const projectRef = useRef(activeProject)
  const savedRef = useRef(activeProject?.content ?? '')
  const timerRef = useRef<number | null>(null)
  const cursorSentRef = useRef(0)
  const savingRef = useRef<Promise<Project | null>>(Promise.resolve(null))
  payloadRef.current = payload
  projectRef.current = activeProject
  const activeProjectId = activeProject?.id
  const liveSessionId = liveSession?.id
  const liveSessionStatus = liveSession?.status

  useEffect(() => {
    const nextProject = projectRef.current
    if (!nextProject) {
      setPayload(null)
      return
    }
    const next = parseWorkspace(nextProject)
    setPayload(next)
    payloadRef.current = next
    savedRef.current = nextProject.content
    setSaveState('saved')
    setSaveError('')
    setSidePanel(null)
    setLiveSession(null)
    setLiveEvents([])
    setLiveTitle(`Building ${nextProject.name}`)
  }, [activeProjectId])

  useEffect(() => {
    if (!activeProject || saveState !== 'saved' || activeProject.content === savedRef.current) return
    const next = parseWorkspace(activeProject)
    setPayload(next)
    payloadRef.current = next
    savedRef.current = activeProject.content
  }, [activeProject, saveState])

  const saveNow = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    const project = projectRef.current
    const current = payloadRef.current
    if (!project || !current || !project.can_edit) return project
    const content = serializeWorkspace(current)
    if (content === savedRef.current) {
      setSaveState('saved')
      return project
    }
    const task = async () => {
      setSaveState('saving')
      setSaveError('')
      try {
        const result = await api.projects.update(project.id, { content, app_kind: current.appKind })
        savedRef.current = result.project.content
        onProjectUpdate(result.project)
        setSaveState(serializeWorkspace(payloadRef.current ?? current) === result.project.content ? 'saved' : 'dirty')
        return result.project
      } catch (error) {
        setSaveState('error')
        setSaveError((error as Error).message)
        return null
      }
    }
    const queued = savingRef.current.then(task, task)
    savingRef.current = queued
    return queued
  }, [onProjectUpdate])

  function updateData(data: Record<string, unknown>) {
    if (!payload || !activeProject?.can_edit) return
    const next = { ...payload, data }
    payloadRef.current = next
    setPayload(next)
    setSaveState('dirty')
    setSaveError('')
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => { timerRef.current = null; void saveNow() }, 1200)
  }

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      const project = projectRef.current
      const current = payloadRef.current
      if (!project?.can_edit || !current) return
      const content = serializeWorkspace(current)
      if (content === savedRef.current) return
      void fetch(`/api/projects/${project.id}`, {
        method: 'PUT', credentials: 'same-origin', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, app_kind: current.appKind }),
      }).catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!activeProject) return
    let cancelled = false
    api.live.list(activeProject.space_id).then(result => {
      if (!cancelled) {
        const session = result.sessions.find(item => item.project_id === activeProject.id) ?? null
        setLiveSession(session)
        if (session) {
          setLiveTitle(session.title)
          setLiveAudience(session.audience === 'private' ? 'private' : 'public')
          setLivePermissions({ comment: session.permissions.comment !== false, suggest: session.permissions.suggest !== false, request_edit: session.permissions.request_edit !== false, voice: Boolean(session.permissions.voice) })
        }
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [activeProject])

  useEffect(() => {
    if (!liveSessionId || liveSessionStatus !== 'live') return
    const source = new EventSource(`/api/live/${liveSessionId}/events`)
    const kinds = ['comment', 'reaction', 'suggestion', 'collaboration_request', 'work', 'cursor', 'ended']
    const handlers = kinds.map(kind => {
      const handler = (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data) as LiveEvent
          setLiveEvents(current => {
            if (current.some(item => String(item.id) === String(parsed.id))) return current
            const withoutPreviousCursor = kind === 'cursor' ? current.filter(item => !(item.kind === 'cursor' && item.user_id === parsed.user_id)) : current
            return [...withoutPreviousCursor, parsed].slice(-150)
          })
          if (kind === 'ended') setLiveSession(current => current ? { ...current, status: 'ended' } : null)
        } catch {}
      }
      source.addEventListener(kind, handler as EventListener)
      return [kind, handler] as const
    })
    return () => {
      handlers.forEach(([kind, handler]) => source.removeEventListener(kind, handler as EventListener))
      source.close()
    }
  }, [liveSessionId, liveSessionStatus])

  if (!activeProject || !payload) {
    return <div className="project-workspace-empty"><FolderGit2 size={30} /><strong>Project unavailable</strong><button type="button" onClick={() => dispatch({ type: 'CLOSE_CODE_EDITOR' })}>Return</button></div>
  }

  const project = activeProject
  const workspacePayload = payload
  const app = getMiniApp(workspacePayload.appKind)
  const suiteApp = getSuiteApp(workspacePayload.appKind)
  const space = getSpaceDefinition(project.space_id)
  const saveLabel = saveState === 'saving' ? 'Saving…' : saveState === 'dirty' ? 'Unsaved changes' : saveState === 'error' ? 'Save failed' : 'Saved'
  const chromeName = suiteApp?.name || app.name
  const chromeColor = suiteApp?.color || app.accent

  async function close() {
    const saved = await saveNow()
    if (saved || !project.can_edit) dispatch({ type: 'CLOSE_CODE_EDITOR' })
  }

  async function loadPanel(panel: Exclude<SidePanel, null>) {
    setSidePanel(current => current === panel ? null : panel)
    if (sidePanel === panel) return
    try {
      if (panel === 'versions') setVersions((await api.projects.versions.list(project.id)).versions)
      if (panel === 'comments') setComments((await api.projects.comments.list(project.id)).comments)
      if (panel === 'collaborators') setCollaborators((await api.projects.collaborators.list(project.id)).collaborators)
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    }
  }

  async function checkpoint() {
    const saved = await saveNow()
    if (!saved) return
    const label = window.prompt('Checkpoint label', `Checkpoint ${new Date().toLocaleString()}`)?.trim()
    if (!label) return
    await api.projects.versions.create(project.id, label)
    setVersions((await api.projects.versions.list(project.id)).versions)
    dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: 'Version checkpoint created', tone: 'success' } })
  }

  async function restoreVersion(version: ProjectVersion) {
    if (!window.confirm(`Restore “${version.label}”? Current autosaved work remains in the previous checkpoint only if you saved one.`)) return
    const result = await api.projects.versions.restore(project.id, version.id)
    onProjectUpdate(result.project)
    const next = parseWorkspace(result.project)
    setPayload(next)
    payloadRef.current = next
    savedRef.current = result.project.content
    setSaveState('saved')
  }

  async function submitProjectComment(event: React.FormEvent) {
    event.preventDefault()
    const body = commentDraft.trim()
    if (!body) return
    const result = await api.projects.comments.create(project.id, body)
    setComments(current => [...current, result.comment])
    setCommentDraft('')
  }

  async function inviteCollaborator(event: React.FormEvent) {
    event.preventDefault()
    if (!inviteHandle.trim()) return
    try {
      const result = await api.projects.collaborators.invite(project.id, inviteHandle, inviteRole)
      setCollaborators(current => [...current.filter(item => item.user_id !== result.collaborator.user_id), result.collaborator])
      setInviteHandle('')
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    }
  }

  async function updateVisibility(visibility: Project['visibility']) {
    const result = await api.projects.update(project.id, { visibility })
    onProjectUpdate(result.project)
  }

  function askHelios(prompt?: string) {
    askHeliosWithContext({
      space_id: project.space_id,
      space_name: space.name,
      project_id: project.id,
      project_name: project.name,
      app_kind: workspacePayload.appKind,
      app_name: chromeName,
      live_status: liveSession?.status || 'offline',
    }, prompt || `Help with ${project.name} in ${chromeName}.`, dispatch)
  }

  function openLiveControls() {
    if (liveSession) {
      setLiveTitle(liveSession.title)
      setLiveAudience(liveSession.audience === 'private' ? 'private' : 'public')
      setLivePermissions({ comment: liveSession.permissions.comment !== false, suggest: liveSession.permissions.suggest !== false, request_edit: liveSession.permissions.request_edit !== false, voice: Boolean(liveSession.permissions.voice) })
    }
    setShowLiveSetup(true)
  }

  async function goLive() {
    setLiveStarting(true)
    try {
      await saveNow()
      const result = liveSession?.status === 'live'
        ? await api.live.update(liveSession.id, { audience: liveAudience, permissions: livePermissions })
        : await api.live.create({ project_id: project.id, title: liveTitle.trim() || `${project.name} · ${app.name}`, audience: liveAudience, permissions: livePermissions })
      setLiveSession(result.session)
      if (!liveSession || liveSession.status !== 'live') setLiveEvents([])
      setShowLiveSetup(false)
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    } finally { setLiveStarting(false) }
  }

  function broadcastCursor(event: React.PointerEvent<HTMLElement>) {
    if (!liveSession || liveSession.status !== 'live' || !project.can_edit) return
    const now = performance.now()
    if (now - cursorSentRef.current < 90) return
    cursorSentRef.current = now
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 100
    const y = ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 100
    void api.live.event(liveSession.id, 'cursor', { x, y }).catch(() => {})
  }

  async function sendLiveComment(event: React.FormEvent) {
    event.preventDefault()
    if (!liveSession || !liveDraft.trim()) return
    const result = await api.live.event(liveSession.id, 'comment', { text: liveDraft.trim() })
    setLiveEvents(current => current.some(item => String(item.id) === String(result.event.id)) ? current : [...current, result.event])
    setLiveDraft('')
  }

  async function endLive() {
    if (!liveSession || !window.confirm('End this Live workspace? The session remains discoverable in Feed.')) return
    await api.live.end(liveSession.id)
    const ended = { ...liveSession, status: 'ended' as const }
    setLiveSession(ended)
    try { await publishLiveReplay(ended, project, dispatch) } catch {}
  }

  const collaboratorCursors = liveEvents.filter(event => event.kind === 'cursor' && event.user_id !== state.user?.id)

  return (
    <div className={'project-workspace' + (liveSession?.status === 'live' ? ' is-live' : '') + (suiteApp ? ' is-suite' : '')} style={{ '--workspace-accent': chromeColor } as React.CSSProperties}>
      <header className="project-shell-header">
        <button type="button" className="project-close" onClick={() => void close()} aria-label="Save and close Project"><X size={17} /></button>
        <div className="project-shell-identity"><i>{suiteApp?.letter || app.shortName.slice(0, 1)}</i><span><small>{chromeName}{liveSession?.status === 'live' ? ' · LIVE' : suiteApp ? '' : ` · ${space.name}`}</small><strong>{project.name}</strong></span>{!suiteApp && <span className="repo-branch">main</span>}<ChevronDown size={13} /></div>
        <span className={'project-save-state state-' + saveState} role="status"><i />{saveLabel}</span>
        <div className="project-shell-actions">
          <button type="button" onClick={() => void saveNow()} disabled={!project.can_edit || saveState === 'saving'}><Save size={14} /><span>Save</span></button>
          <button type="button" onClick={() => setShowPublish(true)}><Share2 size={14} /><span>Share</span></button>
          <button type="button" onClick={() => void openOrCreateProjectChat(project, dispatch)}><MessageCircle size={14} /><span>Project Chat</span></button>
          <button type="button" onClick={() => void loadPanel('comments')} className={sidePanel === 'comments' ? 'is-active' : ''}><MessageCircle size={14} /><span>Comments</span></button>
          <button type="button" onClick={() => void loadPanel('collaborators')} className={sidePanel === 'collaborators' ? 'is-active' : ''}><Users size={14} /><span>People</span></button>
          <button type="button" onClick={() => void loadPanel('versions')} className={sidePanel === 'versions' ? 'is-active' : ''}><History size={14} /><span>History</span></button>
          <button type="button" onClick={() => void loadPanel('permissions')} className={sidePanel === 'permissions' ? 'is-active' : ''}><Lock size={14} /><span>Access</span></button>
          <button type="button" onClick={() => askHelios()} className="project-helios"><Sparkles size={14} /><span>Helios</span></button>
          {app.live && project.can_edit && <button type="button" className={'project-go-live' + (liveSession?.status === 'live' ? ' is-live' : '')} onClick={openLiveControls} disabled={liveStarting}><Radio size={14} /><span>{liveSession?.status === 'live' ? 'Live controls' : liveStarting ? 'Starting…' : 'Go Live'}</span></button>}
        </div>
      </header>

      {saveError && <div className="project-save-error">{saveError}<button type="button" onClick={() => void saveNow()}>Retry</button></div>}
      {!project.can_edit && <div className="project-readonly-banner"><Eye size={13} /> You can view this shared Project. Editing requires collaborator permission.</div>}

      <main className="project-workspace-main" onPointerMove={broadcastCursor}>
        <WorkspaceEditor project={project} payload={workspacePayload} canEdit={project.can_edit} onChange={updateData} onCheckpoint={() => void checkpoint()} onAskHelios={askHelios} />
        <div className="workspace-collaborator-cursors" aria-hidden="true">{collaboratorCursors.map(cursor => <span key={cursor.user_id} style={{ left: `${Number(cursor.payload.x)}%`, top: `${Number(cursor.payload.y)}%` }}><i />{String(cursor.payload.author_name || 'Collaborator')}</span>)}</div>
        {sidePanel && (
          <aside className="project-side-panel" aria-label={`${sidePanel} panel`}>
            <header><div><small>PROJECT</small><strong>{panelTitle(sidePanel)}</strong></div><button type="button" onClick={() => setSidePanel(null)} aria-label="Close panel"><X size={15} /></button></header>
            {sidePanel === 'comments' && <ProjectComments comments={comments} draft={commentDraft} setDraft={setCommentDraft} onSubmit={submitProjectComment} />}
            {sidePanel === 'versions' && <VersionHistory versions={versions} onCheckpoint={() => void checkpoint()} onRestore={version => void restoreVersion(version)} />}
            {sidePanel === 'collaborators' && <CollaboratorsPanel collaborators={collaborators} canManage={project.can_manage} handle={inviteHandle} setHandle={setInviteHandle} role={inviteRole} setRole={setInviteRole} onInvite={inviteCollaborator} />}
            {sidePanel === 'permissions' && <PermissionsPanel project={project} onChange={visibility => void updateVisibility(visibility)} />}
          </aside>
        )}
        {liveSession?.status === 'live' && (
          <aside className="live-workspace-drawer" aria-label="Live workspace">
            <header><div><span><i /> LIVE</span><strong>{liveSession.title}</strong><small>{liveSession.viewer_count} watching · Creator {state.user?.name} · {app.name}</small></div><div>{liveSession.can_manage && <button type="button" onClick={() => void endLive()}>End Live</button>}<button type="button" onClick={() => dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: liveSession.id })}>View Live</button></div></header>
            <div className="live-event-stream">{liveEvents.filter(event => !['work', 'cursor'].includes(event.kind)).length === 0 && <div className="live-quiet"><Radio size={19} /><span>The work is live. Comments and suggestions will appear here.</span></div>}{liveEvents.filter(event => !['work', 'cursor'].includes(event.kind)).map(event => <article key={event.id} className={`live-event-${event.kind}`}><span>{String(event.payload.author_name || '?').slice(0, 1)}</span><div><strong>{String(event.payload.author_name || 'Viewer')}<small>{event.kind.replace('_', ' ')}</small></strong><p>{String(event.payload.text || '')}</p></div></article>)}{liveEvents.some(event => event.kind === 'work') && <div className="live-work-signal"><Sparkles size={12} /> Project changes are streaming to viewers</div>}</div>
            <form onSubmit={sendLiveComment}><input value={liveDraft} maxLength={2000} onChange={event => setLiveDraft(event.target.value)} placeholder="Add a live note for viewers…" /><button type="submit" disabled={!liveDraft.trim()}><Send size={14} /></button></form>
          </aside>
        )}
      </main>

      {showPublish && <PublishModal project={project} onClose={() => setShowPublish(false)} />}
      {showLiveSetup && <LiveSetupDialog title={liveTitle} setTitle={setLiveTitle} audience={liveAudience} setAudience={setLiveAudience} permissions={livePermissions} setPermissions={setLivePermissions} active={liveSession?.status === 'live'} saving={liveStarting} onClose={() => setShowLiveSetup(false)} onSave={() => void goLive()} />}
    </div>
  )
}

function WorkspaceEditor({ project, payload, canEdit, onChange, onCheckpoint, onAskHelios }: { project: Project; payload: WorkspacePayload; canEdit: boolean; onChange: (data: Record<string, unknown>) => void; onCheckpoint: () => void; onAskHelios: (prompt?: string) => void }) {
  const props = { data: payload.data, onChange: canEdit ? onChange : () => {}, onAskHelios }
  const kind = resolveWorkspaceKind(payload.appKind)
  let editor: React.ReactNode
  if (kind === 'code') editor = <CodeWorkspace {...props} onCheckpoint={onCheckpoint} project={project} canEdit={canEdit} />
  else if (kind === 'notebook') editor = <RepoBoundWorkspace project={project} canEdit={canEdit} kind="notebook" data={payload.data} onChange={props.onChange}><NotebookWorkspace {...props} /></RepoBoundWorkspace>
  else if (kind === 'spreadsheet') editor = <RepoBoundWorkspace project={project} canEdit={canEdit} kind="spreadsheet" data={payload.data} onChange={props.onChange}><SpreadsheetWorkspace {...props} /></RepoBoundWorkspace>
  else if (kind === 'presentation') editor = <PresentationWorkspace {...props} />
  else if (kind === 'drawing') editor = <DrawingWorkspace {...props} appKind={payload.appKind} />
  else if (kind === 'math') editor = <MathWorkspace {...props} />
  else if (kind === 'survey') editor = <SurveyWorkspace {...props} />
  else if (kind === 'board') editor = <ProjectBoardWorkspace {...props} />
  else if (kind === 'writing') editor = <RepoBoundWorkspace project={project} canEdit={canEdit} kind="writing" data={payload.data} onChange={props.onChange}><WritingWorkspace {...props} /></RepoBoundWorkspace>
  else if (kind === 'stocks') editor = <StocksWorkspace data={payload.data} onChange={props.onChange} />
  else editor = <WritingWorkspace {...props} />
  return <div className={'workspace-editor-host' + (!canEdit ? ' is-readonly' : '')}>{editor}</div>
}

function LiveSetupDialog({ title, setTitle, audience, setAudience, permissions, setPermissions, active, saving, onClose, onSave }: {
  title: string
  setTitle: (value: string) => void
  audience: 'public' | 'private'
  setAudience: (value: 'public' | 'private') => void
  permissions: { comment: boolean; suggest: boolean; request_edit: boolean; voice: boolean }
  setPermissions: React.Dispatch<React.SetStateAction<{ comment: boolean; suggest: boolean; request_edit: boolean; voice: boolean }>>
  active: boolean
  saving: boolean
  onClose: () => void
  onSave: () => void
}) {
  const options: Array<[keyof typeof permissions, string, string]> = [
    ['comment', 'Comment', 'Viewers can join the live discussion.'],
    ['suggest', 'Suggest', 'Viewers can offer concrete improvements.'],
    ['request_edit', 'Request edit', 'Viewers may ask to become a collaborator.'],
    ['voice', 'Voice discussion', 'Show that optional voice discussion is available.'],
  ]
  return <div className="live-setup-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="live-setup-dialog" role="dialog" aria-modal="true" aria-label="Go Live controls"><header><div><span><i /> {active ? 'LIVE CONTROLS' : 'TURN THIS PROJECT INTO LIVE WORK'}</span><h2>{active ? 'Control the session' : 'Go Live with the actual Project'}</h2><p>Work changes stream from this Mini App. This is not a normal video livestream.</p></div><button type="button" onClick={onClose}><X size={16} /></button></header><label><span>Session title</span><input value={title} maxLength={140} onChange={event => setTitle(event.target.value)} disabled={active} /></label><div className="live-audience-options"><button type="button" className={audience === 'public' ? 'is-active' : ''} onClick={() => setAudience('public')}><Eye size={15} /><span><strong>Discoverable</strong><small>Authenticated people can find this session.</small></span></button><button type="button" className={audience === 'private' ? 'is-active' : ''} onClick={() => setAudience('private')}><Lock size={15} /><span><strong>Invited access</strong><small>Only Project collaborators can watch.</small></span></button></div><div className="live-permission-options">{options.map(([key, label, detail]) => <label key={key}><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={permissions[key]} onChange={() => setPermissions(current => ({ ...current, [key]: !current[key] }))} /></label>)}</div><footer><button type="button" onClick={onClose}>Cancel</button><button type="button" onClick={onSave} disabled={saving || !title.trim()}><Radio size={14} /> {saving ? 'Saving…' : active ? 'Update controls' : 'Expand into Live'}</button></footer></section></div>
}

function panelTitle(panel: Exclude<SidePanel, null>) {
  return ({ comments: 'Comments', versions: 'Version History', collaborators: 'Collaborators', permissions: 'Share & Permissions' })[panel]
}

function ProjectComments({ comments, draft, setDraft, onSubmit }: { comments: ProjectComment[]; draft: string; setDraft: (value: string) => void; onSubmit: (event: React.FormEvent) => void }) {
  return <div className="project-comments-panel"><div>{comments.map(comment => <article key={comment.id}><span>{comment.author_name.slice(0, 1)}</span><div><strong>{comment.author_name}<time>{new Date(comment.created_at).toLocaleDateString()}</time></strong><p>{comment.body}</p></div></article>)}{comments.length === 0 && <PanelEmpty icon={<MessageCircle size={21} />} text="Feedback and decisions stay connected to this Project." />}</div><form onSubmit={onSubmit}><textarea value={draft} maxLength={600} onChange={event => setDraft(event.target.value)} placeholder="Add project feedback…" /><button type="submit" disabled={!draft.trim()}><Send size={13} /> Comment</button></form></div>
}

function VersionHistory({ versions, onCheckpoint, onRestore }: { versions: ProjectVersion[]; onCheckpoint: () => void; onRestore: (version: ProjectVersion) => void }) {
  return <div className="version-panel"><button type="button" className="create-checkpoint" onClick={onCheckpoint}><History size={14} /> Create checkpoint</button><div>{versions.map((version, index) => <article key={version.id}><i /><span><strong>{version.label}</strong><small>{version.author_name} · {new Date(version.created_at).toLocaleString()}</small></span>{index > 0 && <button type="button" onClick={() => onRestore(version)}>Restore</button>}</article>)}{versions.length === 0 && <PanelEmpty icon={<History size={21} />} text="Create a named checkpoint before a significant change." />}</div></div>
}

function CollaboratorsPanel({ collaborators, canManage, handle, setHandle, role, setRole, onInvite }: { collaborators: Collaborator[]; canManage: boolean; handle: string; setHandle: (value: string) => void; role: Collaborator['role']; setRole: (value: Collaborator['role']) => void; onInvite: (event: React.FormEvent) => void }) {
  return <div className="collaborators-panel">{canManage && <form onSubmit={onInvite}><UserPlus size={15} /><input value={handle} onChange={event => setHandle(event.target.value)} placeholder="@handle" aria-label="Collaborator handle" /><select value={role} onChange={event => setRole(event.target.value)}><option value="viewer">Can view</option><option value="commenter">Can comment</option><option value="editor">Can edit</option></select><button type="submit" disabled={!handle.trim()}>Invite</button></form>}<div>{collaborators.map(person => <article key={person.user_id}><span>{person.name.slice(0, 1)}</span><div><strong>{person.name}</strong><small>{person.handle}</small></div><b>{person.role}</b></article>)}{collaborators.length === 0 && <PanelEmpty icon={<Users size={21} />} text="Invite a collaborator by Helios handle. Access is enforced by the Project API." />}</div></div>
}

function PermissionsPanel({ project, onChange }: { project: Project; onChange: (visibility: Project['visibility']) => void }) {
  return <div className="permissions-panel"><section><Lock size={17} /><div><strong>Project visibility</strong><p>Publishing a project-backed post lets permitted viewers open the actual Project.</p></div></section>{(['private', 'space', 'public'] as const).map(visibility => <button type="button" key={visibility} aria-pressed={project.visibility === visibility} onClick={() => onChange(visibility)} disabled={!project.can_manage}><span>{visibility === 'private' ? <Lock size={14} /> : visibility === 'space' ? <Users size={14} /> : <Eye size={14} />}</span><div><strong>{visibility === 'private' ? 'Private' : visibility === 'space' ? 'Space members' : 'Public & discoverable'}</strong><small>{visibility === 'private' ? 'Only you and invited collaborators' : visibility === 'space' ? 'People in the current Space can view' : 'Any authenticated user may discover and view'}</small></div><i>{project.visibility === visibility ? '✓' : ''}</i></button>)}</div>
}

function PanelEmpty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="project-panel-empty">{icon}<span>{text}</span></div>
}
