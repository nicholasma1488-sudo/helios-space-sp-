import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ChevronRight, Code2, Eye, FolderGit2, Hand, MessageCircle,
  Mic, Radio, Search, Send, Sparkles, Users, X,
} from 'lucide-react'
import { api, type LiveEvent, type LiveSession, type Project } from '../api'
import { getMiniApp, getSpaceDefinition, SUBJECTS } from '../product/catalog'
import { askHeliosWithContext, openOrCreateProjectChat, publishLiveReplay } from '../product/flow'
import { useApp } from '../store/appStore'
import { parseWorkspace } from '../workspaces/workspaceData'
import './LiveView.css'

type LiveBundle = { session: LiveSession; project: Project; events: LiveEvent[] }

export function LiveView() {
  const { state, dispatch } = useApp()
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [spaceFilter, setSpaceFilter] = useState('all')
  const [bundle, setBundle] = useState<LiveBundle | null>(null)
  const [sessionError, setSessionError] = useState('')
  const refreshTimer = useRef<number | null>(null)
  const activeSessionId = bundle?.session.id
  const activeSessionStatus = bundle?.session.status

  const loadSessions = useCallback(async () => {
    setLoading(true)
    try { setSessions((await api.live.list()).sessions) }
    catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: `Live sessions could not load: ${(error as Error).message}`, tone: 'warning' } })
    } finally { setLoading(false) }
  }, [dispatch])

  useEffect(() => { void loadSessions() }, [loadSessions])

  useEffect(() => {
    if (!state.activeLiveSessionId) {
      setBundle(null)
      setSessionError('')
      return
    }
    let cancelled = false
    setSessionError('')
    api.live.get(state.activeLiveSessionId)
      .then(result => { if (!cancelled) setBundle(result) })
      .catch(error => { if (!cancelled) setSessionError((error as Error).message) })
    return () => { cancelled = true }
  }, [state.activeLiveSessionId])

  useEffect(() => {
    if (!activeSessionId || activeSessionStatus !== 'live') return
    const source = new EventSource(`/api/live/${activeSessionId}/events`)
    const kinds = ['comment', 'reaction', 'suggestion', 'collaboration_request', 'work', 'cursor', 'ended']
    const handlers = kinds.map(kind => {
      const handler = (message: MessageEvent) => {
        try {
          const event = JSON.parse(message.data) as LiveEvent
          setBundle(current => {
            if (!current || current.session.id !== activeSessionId) return current
            const events = current.events.some(item => String(item.id) === String(event.id))
              ? current.events
              : [...(kind === 'cursor' ? current.events.filter(item => !(item.kind === 'cursor' && item.user_id === event.user_id)) : current.events), event].slice(-180)
            const project = kind === 'work' && typeof event.payload.content === 'string'
              ? { ...current.project, content: event.payload.content, updated_at: String(event.payload.updated_at || current.project.updated_at) }
              : current.project
            const nextSession = kind === 'ended' ? { ...current.session, status: 'ended' } : current.session
            return { ...current, project, events, session: nextSession }
          })
          if (kind === 'work') {
            if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current)
            refreshTimer.current = window.setTimeout(() => {
              void api.live.get(activeSessionId).then(result => setBundle(current => current?.session.id === activeSessionId ? { ...current, project: result.project } : current)).catch(() => {})
            }, 500)
          }
        } catch {}
      }
      source.addEventListener(kind, handler as EventListener)
      return [kind, handler] as const
    })
    return () => {
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current)
      handlers.forEach(([kind, handler]) => source.removeEventListener(kind, handler as EventListener))
      source.close()
    }
  }, [activeSessionId, activeSessionStatus])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return sessions.filter(session => {
      if (spaceFilter !== 'all' && session.space_id !== spaceFilter) return false
      return !needle || `${session.title} ${session.project_name} ${session.owner_name} ${session.space_id}`.toLowerCase().includes(needle)
    })
  }, [query, sessions, spaceFilter])

  async function openProject(project: Project) {
    const existing = state.projects.find(item => item.id === project.id)
    if (!existing) dispatch({ type: 'ADD_PROJECT', project })
    dispatch({ type: 'SET_ACTIVE_SUBJECT', subjectId: project.space_id })
    dispatch({ type: 'OPEN_CODE_EDITOR', projectId: project.id })
  }

  if (state.activeLiveSessionId) {
    return (
      <div className="live-page live-session-page">
        <button type="button" className="live-back" onClick={() => dispatch({ type: 'CLOSE_LIVE_SESSION' })}><ArrowLeft size={15} /> All Live work</button>
        {sessionError && <div className="live-session-error"><X size={18} /><strong>Session unavailable</strong><span>{sessionError}</span><button type="button" onClick={() => dispatch({ type: 'CLOSE_LIVE_SESSION' })}>Return to Live</button></div>}
        {!sessionError && !bundle && <LiveSessionSkeleton />}
        {bundle && <LiveRoom bundle={bundle} setBundle={setBundle} onOpenProject={() => void openProject(bundle.project)} />}
      </div>
    )
  }

  return (
    <div className="live-page live-discovery-page">
      <header className="live-discovery-hero">
        <div><span><i /> WORK HAPPENING NOW</span><h1>Live collaborative work</h1><p>Watch a real Project change, offer specific help, or request to collaborate. Live is a working session—not a passive video stream.</p></div>
        <div className="live-hero-orbit" aria-hidden="true"><Radio size={28} /><i /><i /></div>
      </header>

      <div className="live-discovery-tools">
        <label><Search size={15} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search live creators, Projects or Spaces" /></label>
        <div className="live-space-filters">
          <button type="button" className={spaceFilter === 'all' ? 'is-active' : ''} onClick={() => setSpaceFilter('all')}>All Spaces</button>
          {SUBJECTS.slice(0, 8).map(space => <button type="button" key={space.id} className={spaceFilter === space.id ? 'is-active' : ''} onClick={() => setSpaceFilter(space.id)}>{space.name}</button>)}
        </div>
      </div>

      {loading && <div className="live-session-grid"><LiveCardSkeleton /><LiveCardSkeleton /><LiveCardSkeleton /></div>}
      {!loading && filtered.length > 0 && <div className="live-session-grid">{filtered.map(session => <LiveCard key={session.id} session={session} onOpen={() => dispatch({ type: 'OPEN_LIVE_SESSION', sessionId: session.id })} />)}</div>}
      {!loading && filtered.length === 0 && (
        <section className="live-empty-state"><Radio size={30} /><h2>No matching Live work</h2><p>Open one of your Projects and choose Go Live from its common project shell.</p><button type="button" onClick={() => dispatch({ type: 'SET_VIEW', view: 'projects' })}>Choose a Project <ChevronRight size={14} /></button></section>
      )}
    </div>
  )
}

function LiveCard({ session, onOpen }: { session: LiveSession; onOpen: () => void }) {
  const space = getSpaceDefinition(session.space_id)
  const app = getMiniApp(session.app_kind)
  return <button type="button" className="live-session-card" onClick={onOpen} style={{ '--live-accent': space.accent } as React.CSSProperties}>
    <div className="live-card-preview"><span><i /> LIVE</span><div><Code2 size={26} /><small>{app.name}</small></div><b>{session.viewer_count} watching</b></div>
    <div className="live-card-copy"><span>{space.name} · {app.shortName}</span><h2>{session.title}</h2><p><strong>{session.owner_name}</strong> is building {session.project_name}</p><footer><span><Users size={13} /> {session.viewer_count}</span><b>Join workspace <ChevronRight size={13} /></b></footer></div>
  </button>
}

function LiveRoom({ bundle, setBundle, onOpenProject }: { bundle: LiveBundle; setBundle: React.Dispatch<React.SetStateAction<LiveBundle | null>>; onOpenProject: () => void }) {
  const { dispatch } = useApp()
  const { session, project, events } = bundle
  const [draft, setDraft] = useState('')
  const [kind, setKind] = useState<'comment' | 'suggestion' | 'collaboration_request'>('comment')
  const [sending, setSending] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)
  const space = getSpaceDefinition(session.space_id)
  const app = getMiniApp(session.app_kind)
  const visibleEvents = events.filter(event => !['work', 'cursor'].includes(event.kind))
  const cursors = events.filter(event => event.kind === 'cursor')
  const recentWork = [...events].reverse().find(event => event.kind === 'work')

  useEffect(() => { feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' }) }, [visibleEvents.length])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const text = draft.trim()
    if (!text || sending || session.status !== 'live') return
    setSending(true)
    try {
      const result = await api.live.event(session.id, kind, { text })
      setBundle(current => current && !current.events.some(item => String(item.id) === String(result.event.id)) ? { ...current, events: [...current.events, result.event] } : current)
      setDraft('')
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    } finally { setSending(false) }
  }

  async function endSession() {
    if (!window.confirm('End this Live workspace? It will remain discoverable in Feed.')) return
    await api.live.end(session.id)
    const ended = { ...session, status: 'ended' as const }
    setBundle(current => current ? { ...current, session: ended } : current)
    try { await publishLiveReplay(ended, project, dispatch) } catch {}
  }

  return (
    <div className="live-room" style={{ '--live-accent': space.accent } as React.CSSProperties}>
      <header className="live-room-header">
        <div className="live-room-identity"><span><i /> {session.status === 'live' ? 'LIVE' : 'SESSION REPLAY'}</span><h1>{session.title}</h1><p>{session.owner_name} · {space.name} · {app.name}</p></div>
        <div className="live-room-actions"><span><Eye size={14} /> {session.viewer_count} watching</span>{session.permissions.voice && <span><Mic size={14} /> Voice on</span>}<button type="button" onClick={onOpenProject}><FolderGit2 size={14} /> Open Project</button><button type="button" onClick={() => void openOrCreateProjectChat(project, dispatch)}>Project Chat</button><button type="button" onClick={() => askHeliosWithContext({ project_id: project.id, project_name: project.name, space_id: session.space_id, app_kind: session.app_kind, live_session_id: session.id, selected_content: 'Live Project' }, 'Summarize what is changing in this Live Project and suggest the next useful comment.', dispatch)}><Sparkles size={14} /> Ask Helios</button><button type="button" onClick={() => { void navigator.clipboard.writeText(`${session.title} is Live in Helios Space`); dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: 'Live session copied to share', tone: 'success' } }) }}>Share</button>{session.can_manage && session.status === 'live' && <button type="button" className="end-live" onClick={() => void endSession()}>End Live</button>}</div>
      </header>

      <div className="live-room-grid">
        <section className="live-work-stage">
          <div className="live-stage-bar"><div><span className="live-owner-avatar">{session.owner_name.slice(0, 1)}</span><strong>{project.name}</strong><small>Editing in {app.name}</small></div><span className={recentWork ? 'is-updating' : ''}><Sparkles size={13} /> {recentWork ? `Updated ${new Date(recentWork.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for changes'}</span></div>
          <ProjectLivePreview project={project} />
          <div className="live-viewer-cursors" aria-hidden="true">{cursors.map(cursor => <span key={cursor.user_id} style={{ left: `${Number(cursor.payload.x)}%`, top: `${Number(cursor.payload.y)}%` }}><i />{String(cursor.payload.author_name || 'Collaborator')}</span>)}</div>
          <div className="live-stage-footer"><span><Radio size={13} /> Changes stream here from the durable Project</span><button type="button" onClick={onOpenProject}>View project details <ChevronRight size={13} /></button></div>
        </section>

        <aside className="live-discussion">
          <header><div><strong>Live Comments</strong><span>{visibleEvents.length} contributions · {cursors.length + 1} viewers</span></div><span className="live-presence">{[session.owner_name, ...cursors.map(item => String(item.payload.author_name || 'Viewer'))].slice(0, 5).map(name => <i key={name} title={name} />)} watching</span></header>
          <div className="live-event-feed" ref={feedRef}>
            {visibleEvents.length === 0 && <div className="live-discussion-empty"><MessageCircle size={22} /><strong>Help move the work forward</strong><span>Ask a question, leave a specific suggestion, or request to edit.</span></div>}
            {visibleEvents.map(event => <article key={event.id} className={`live-message kind-${event.kind}`}><span>{String(event.payload.author_name || '?').slice(0, 1)}</span><div><header><strong>{String(event.payload.author_name || 'Viewer')}</strong><b>{event.kind.replace('_', ' ')}</b><time>{new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></header><p>{String(event.payload.text || '')}</p></div></article>)}
          </div>
          {session.status === 'live' ? <form className="live-message-composer" onSubmit={submit}><div className="live-message-kinds"><button type="button" className={kind === 'comment' ? 'is-active' : ''} onClick={() => setKind('comment')}><MessageCircle size={12} /> Comment</button><button type="button" className={kind === 'suggestion' ? 'is-active' : ''} disabled={session.permissions.suggest === false} onClick={() => setKind('suggestion')}><Sparkles size={12} /> Suggest</button><button type="button" className={kind === 'collaboration_request' ? 'is-active' : ''} disabled={session.permissions.request_edit === false} onClick={() => setKind('collaboration_request')}><Hand size={12} /> Request edit</button></div><div><textarea value={draft} maxLength={800} onChange={event => setDraft(event.target.value)} placeholder={kind === 'comment' ? 'Add a useful live comment…' : kind === 'suggestion' ? 'Suggest a concrete improvement…' : 'Explain how you would collaborate…'} /><button type="submit" disabled={!draft.trim() || sending}><Send size={14} /></button></div></form> : <div className="live-replay-note"><Radio size={14} /> This session ended. Its Project and discussion remain connected.</div>}
        </aside>
      </div>
    </div>
  )
}

function ProjectLivePreview({ project }: { project: Project }) {
  const payload = parseWorkspace(project)
  if (payload.appKind === 'web-code') {
    const fileRecord = payload.data.files && typeof payload.data.files === 'object' && !Array.isArray(payload.data.files) ? payload.data.files as Record<string, string> : {}
    const names = Object.keys(fileRecord)
    const selectedName = String(payload.data.activeFile || names[0] || '')
    return <div className="live-code-preview"><aside>{names.slice(0, 6).map(name => <span key={name}>⌁ {name}</span>)}</aside><pre><code>{fileRecord[selectedName] || '// The creator has not written code yet.'}</code></pre></div>
  }
  if (payload.appKind === 'writing' || payload.appKind === 'reader' || payload.appKind === 'book-creator') {
    const html = String(payload.data.html || '')
    return <div className="live-document-preview"><div dangerouslySetInnerHTML={{ __html: html }} />{!html && <p>Start of a new document…</p>}</div>
  }
  if (payload.appKind === 'spreadsheet' || payload.appKind === 'data-visualization') {
    const cells = Array.isArray(payload.data.cells) ? payload.data.cells as string[][] : []
    return <div className="live-sheet-preview">{Array.from({ length: 30 }, (_, index) => { const row = Math.floor(index / 6); const column = index % 6; const col = String.fromCharCode(65 + column); return <span key={`${col}${row + 1}`}><small>{col}{row + 1}</small>{cells[row]?.[column] || ''}</span> })}</div>
  }
  if (payload.appKind === 'presentation') {
    const slides = Array.isArray(payload.data.slides) ? payload.data.slides as Array<{ title?: string; body?: string }> : []
    const current = slides[Number(payload.data.activeSlide || 0)] ?? slides[0]
    return <div className="live-slide-preview"><small>SLIDE {Number(payload.data.activeSlide || 0) + 1}</small><h2>{current?.title || 'Untitled presentation'}</h2><p>{current?.body || 'The creator is shaping this slide.'}</p></div>
  }
  return <div className="live-generic-preview"><Sparkles size={30} /><h2>{project.name}</h2><p>{getMiniApp(payload.appKind).description}</p><span>Live Project data updates in realtime</span></div>
}

function LiveCardSkeleton() { return <div className="live-card-skeleton"><i /><i /><i /><i /></div> }
function LiveSessionSkeleton() { return <div className="live-room live-room-skeleton"><i /><div><span /><span /></div></div> }
