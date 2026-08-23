import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AtSign, Bot, ChevronRight, Download, File, FolderGit2, Hash, Image,
  MessageCircle, MoreHorizontal, Paperclip, Pin, Plus, Search, Send, Sparkles,
  Users, X,
} from 'lucide-react'
import { api, type ChatMessage, type Conversation, type LiveSession, type Project } from '../api'
import { getMiniApp, getSpaceDefinition } from '../product/catalog'
import { askHeliosWithContext, openLiveSession, openProjectWorkspace } from '../product/flow'
import { useApp } from '../store/appStore'
import './ChatView.css'

type PendingAttachment =
  | { type: 'project'; id: number; label: string }
  | { type: 'file'; file: { name: string; mime: string; size: number; data: string }; label: string }

const TAB_COPY: Array<{ id: Conversation['kind']; label: string; icon: React.ReactNode }> = [
  { id: 'project', label: 'Channels', icon: <Hash size={15} /> },
  { id: 'group', label: 'Groups', icon: <Users size={15} /> },
  { id: 'private', label: 'Private Chat', icon: <AtSign size={15} /> },
]

export function ChatView() {
  const { state, dispatch } = useApp()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [tab, setTab] = useState<Conversation['kind']>('project')
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<PendingAttachment | null>(null)
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [createKind, setCreateKind] = useState<Conversation['kind']>('project')
  const [showAttachments, setShowAttachments] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([])
  const fileInput = useRef<HTMLInputElement>(null)
  const messagesEnd = useRef<HTMLDivElement>(null)
  const initialSelectionDone = useRef(false)

  const loadConversations = useCallback(async () => {
    try {
      const result = await api.chat.list()
      setConversations(result.conversations)
      // Clear the global unread badge when user enters Chat Hub
      dispatch({ type: 'SET_CHAT_UNREAD', count: 0 })
      if (!initialSelectionDone.current) {
        initialSelectionDone.current = true
        const requested = Number(sessionStorage.getItem('helios-open-conversation') || 0)
        sessionStorage.removeItem('helios-open-conversation')
        const target = result.conversations.find(item => item.id === requested) ?? result.conversations.find(item => item.kind === 'project') ?? result.conversations[0]
        if (target) { setTab(target.kind); setActiveId(target.id) }
      }
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: `Chat Hub could not load: ${(error as Error).message}`, tone: 'warning' } })
    } finally { setLoading(false) }
  }, [dispatch])

  useEffect(() => { void loadConversations() }, [loadConversations])
  useEffect(() => { void api.live.list().then(result => setLiveSessions(result.sessions)).catch(() => {}) }, [])

  const active = conversations.find(item => item.id === activeId) ?? null
  const visibleConversations = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return conversations.filter(item => item.kind === tab && (!needle || `${item.title} ${item.project_name || ''} ${item.last_message || ''}`.toLowerCase().includes(needle)))
  }, [conversations, query, tab])

  const loadMessages = useCallback(async (conversationId: number, quiet = false) => {
    if (!quiet) setMessagesLoading(true)
    try {
      const result = await api.chat.messages(conversationId)
      if (activeId === conversationId || !activeId) setMessages(result.messages)
      await api.chat.read(conversationId)
      setConversations(current => current.map(item => item.id === conversationId ? { ...item, unread: 0 } : item))
    } catch (error) {
      if (!quiet) dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    } finally { if (!quiet) setMessagesLoading(false) }
  }, [activeId, dispatch])

  useEffect(() => {
    if (!activeId) { setMessages([]); return }
    void loadMessages(activeId)
    const tick = () => {
      if (document.visibilityState === 'hidden') return
      void loadMessages(activeId, true)
      void loadConversations()
    }
    const poll = window.setInterval(tick, 4500)
    return () => window.clearInterval(poll)
  }, [activeId, loadConversations, loadMessages])

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  function selectTab(next: Conversation['kind']) {
    setTab(next)
    const first = conversations.find(item => item.kind === next)
    setActiveId(first?.id ?? null)
    setShowAttachments(false)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!activeId || sending || (!draft.trim() && !pending)) return
    setSending(true)
    try {
      const data: Parameters<typeof api.chat.send>[1] = { body: draft.trim() }
      if (pending?.type === 'project') { data.attachment_type = 'project'; data.attachment_id = pending.id }
      if (pending?.type === 'file') { data.attachment_type = 'file'; data.file = pending.file }
      const result = await api.chat.send(activeId, data)
      setMessages(current => [...current, result.message])
      setDraft('')
      setPending(null)
      setShowAttachments(false)
      await loadConversations()
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: `Message not sent: ${(error as Error).message}`, tone: 'warning' } })
    } finally { setSending(false) }
  }

  async function chooseFile(file: globalThis.File | undefined) {
    if (!file) return
    if (file.size > 1_000_000) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: 'Chat file attachments are limited to 1 MB.', tone: 'warning' } })
      return
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    setPending({ type: 'file', label: file.name, file: { name: file.name, mime: file.type || 'application/octet-stream', size: file.size, data } })
    setShowAttachments(false)
  }

  async function pinMessage(message: ChatMessage) {
    if (!activeId) return
    const result = await api.chat.pin(activeId, message.id)
    setMessages(current => current.map(item => item.id === message.id ? { ...item, pinned: result.pinned } : item))
  }

  async function openProject(projectId: number) {
    try { await openProjectWorkspace(projectId, state.projects, dispatch) }
    catch (error) { dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } }) }
  }

  function toggleSelected(id: number) {
    setSelectedIds(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  function openCreate(kind: Conversation['kind']) { setCreateKind(kind); setShowNew(true) }

  function askHelios(action: 'summary' | 'reply' | 'selected') {
    if (!active) return
    const chosen = action === 'selected'
      ? messages.filter(message => selectedIds.includes(message.id))
      : messages.slice(-40)
    const contextMessages = chosen.map(message => ({ sender: message.sender_name, body: message.body, attachment_type: message.attachment_type }))
    askHeliosWithContext({
      conversation_id: active.id,
      conversation_title: active.title,
      conversation_kind: active.kind,
      project_id: active.project_id,
      project_name: active.project_name,
      app_kind: active.app_kind,
      space_id: active.space_id,
      messages: contextMessages,
      selected_content: action === 'selected' ? 'Selected messages' : 'Current permitted conversation',
    }, action === 'reply'
      ? 'Draft concise suggested replies to the open questions. Do not send anything.'
      : action === 'selected'
        ? 'Use only the selected messages. Summarize them, extract tasks, and draft a reply.'
        : 'Summarize unread and recent messages. Group them into questions, feedback, and tasks.', dispatch)
  }

  return (
    <div className="chat-hub">
      {showNew && <CreateConversationDialog kind={createKind} projects={state.projects} onClose={() => setShowNew(false)} onCreated={async id => { setShowNew(false); await loadConversations(); setActiveId(id); setTab(createKind) }} />}
      <input ref={fileInput} hidden type="file" onChange={event => { void chooseFile(event.target.files?.[0]); event.currentTarget.value = '' }} />

      <aside className="chat-hub-sidebar">
        <header><div><MessageCircle size={19} /><span><strong>Chat Hub</strong><small>Work stays connected</small></span></div><button type="button" onClick={() => openCreate(tab)} aria-label="New conversation"><Plus size={16} /></button></header>
        <label className="chat-hub-search"><Search size={14} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search conversations" /></label>
        <nav className="chat-kind-tabs" aria-label="Conversation types">{TAB_COPY.map(item => <button type="button" key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => selectTab(item.id)}>{item.icon}<span>{item.label}</span>{conversations.filter(conversation => conversation.kind === item.id).reduce((sum, conversation) => sum + conversation.unread, 0) > 0 && <b>{conversations.filter(conversation => conversation.kind === item.id).reduce((sum, conversation) => sum + conversation.unread, 0)}</b>}</button>)}</nav>
        <div className="chat-conversation-list">
          {loading && <><ConversationSkeleton /><ConversationSkeleton /><ConversationSkeleton /></>}
          {!loading && visibleConversations.map(conversation => <button type="button" key={conversation.id} className={activeId === conversation.id ? 'is-active' : ''} onClick={() => setActiveId(conversation.id)}><ConversationAvatar conversation={conversation} /><span><strong>{conversation.title}</strong><small>{conversation.last_message || (conversation.kind === 'project' ? 'Project discussion is ready' : 'Start the conversation')}</small></span><time>{conversation.last_message_at ? compactTime(conversation.last_message_at) : ''}</time>{conversation.unread > 0 && <b>{conversation.unread}</b>}</button>)}
          {!loading && visibleConversations.length === 0 && <div className="chat-list-empty"><span>{tab === 'project' ? <FolderGit2 size={21} /> : tab === 'group' ? <Users size={21} /> : <AtSign size={21} />}</span><strong>No {TAB_COPY.find(item => item.id === tab)?.label.toLowerCase()}</strong><p>{tab === 'project' ? 'Start a chat from a durable Project.' : 'Create a conversation using Helios handles.'}</p><button type="button" onClick={() => openCreate(tab)}><Plus size={13} /> Create one</button></div>}
        </div>
        <footer><Sparkles size={13} /><span><strong>Project-aware conversations</strong><small>Messages, files and work share one context.</small></span></footer>
      </aside>

      <main className="chat-thread">
        {!active && <ChatWelcome projects={state.projects} onCreate={openCreate} />}
        {active && <>
          <header className="chat-thread-header"><div><ConversationAvatar conversation={active} /><span><strong>{active.title}</strong><small>{active.kind === 'project' && active.project_name ? `${getSpaceDefinition(active.space_id || 'coding').name} · ${getMiniApp(active.app_kind || 'web-code').name} · ${messages.length} messages` : active.kind === 'group' ? 'Group conversation' : 'Private conversation'}</small></span></div><div>{active.project_id && <button type="button" onClick={() => void openProject(active.project_id!)}><FolderGit2 size={14} /> Open Project</button>}{selectedIds.length > 0 && <button type="button" onClick={() => askHelios('selected')}><Bot size={14} /> Message → Helios ({selectedIds.length})</button>}<button type="button" onClick={() => askHelios('summary')}><Bot size={14} /> Summarize</button><button type="button" onClick={() => askHelios('reply')}><Sparkles size={14} /> Draft replies</button><button type="button" aria-label="Conversation options"><MoreHorizontal size={16} /></button></div></header>
          {active.kind === 'project' && <ProjectChatContext conversation={active} project={state.projects.find(item => item.id === active.project_id) || null} live={liveSessions.find(item => item.project_id === active.project_id) || null} messages={messages.length} onOpenProject={id => void openProject(id)} onOpenLive={id => openLiveSession(id, dispatch)} onOpenMiniApp={() => { if (active.project_id) void openProject(active.project_id) }} />}

          {messages.some(message => message.pinned) && <section className="chat-pinned"><header><Pin size={12} /> Pinned context</header><div>{messages.filter(message => message.pinned).map(message => <button type="button" key={message.id} onClick={() => document.querySelector(`[data-message-id="${message.id}"]`)?.scrollIntoView({ behavior: 'smooth' })}><strong>{message.sender_name}</strong><span>{message.body || attachmentLabel(message)}</span></button>)}</div></section>}

          <div className="chat-message-log" role="log" aria-label={`${active.title} messages`}>
            {messagesLoading && <MessageSkeleton />}
            {!messagesLoading && messages.length === 0 && <div className="chat-thread-empty"><MessageCircle size={25} /><h2>Start with the work</h2><p>Ask a question, share a Project or file, and keep decisions attached to their context.</p></div>}
            {!messagesLoading && messages.map((message, index) => <ChatMessageRow key={message.id} message={message} compact={index > 0 && messages[index - 1].sender_id === message.sender_id} selected={selectedIds.includes(message.id)} onSelect={() => toggleSelected(message.id)} onPin={() => void pinMessage(message)} onOpenProject={id => void openProject(id)} />)}
            <div ref={messagesEnd} />
          </div>

          <form className="chat-composer" onSubmit={submit}>
            {pending && <div className="chat-pending-attachment">{pending.type === 'project' ? <FolderGit2 size={15} /> : <File size={15} />}<span><small>{pending.type === 'project' ? 'PROJECT' : 'FILE'}</small><strong>{pending.label}</strong></span><button type="button" onClick={() => setPending(null)}><X size={14} /></button></div>}
            {showAttachments && <div className="chat-attachment-menu"><header><strong>Share into this conversation</strong><button type="button" onClick={() => setShowAttachments(false)}><X size={13} /></button></header><button type="button" onClick={() => fileInput.current?.click()}><Paperclip size={15} /><span><strong>Upload a file</strong><small>Documents, images or project materials · up to 1 MB</small></span></button><p className="chat-attach-label">Shared Projects</p>{state.projects.slice(0, 6).map(project => <button type="button" key={project.id} onClick={() => { setPending({ type: 'project', id: project.id, label: project.name }); setShowAttachments(false) }}><FolderGit2 size={15} /><span><strong>{project.name}</strong><small>{getSpaceDefinition(project.space_id).name} · {getMiniApp(project.app_kind).name}</small></span></button>)}<p className="chat-attach-label">Shared Mini Apps</p>{state.projects.slice(0, 6).map(project => <button type="button" key={`app-${project.id}`} onClick={() => { setPending({ type: 'project', id: project.id, label: `${getMiniApp(project.app_kind).name} · ${project.name}` }); setShowAttachments(false) }}><Hash size={15} /><span><strong>{getMiniApp(project.app_kind).name}</strong><small>Opens the {project.name} workspace</small></span></button>)}</div>}
            <div className="chat-composer-box"><button type="button" className={showAttachments ? 'is-active' : ''} onClick={() => setShowAttachments(value => !value)} aria-label="Attach file or Project"><Plus size={17} /></button><textarea value={draft} maxLength={4000} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} placeholder={`Message ${active.title}…`} /><button type="submit" disabled={sending || (!draft.trim() && !pending)}><Send size={15} /></button></div>
            <small>Enter to send · Shift + Enter for a new line · significant Helios actions always require approval</small>
          </form>
        </>}
      </main>
    </div>
  )
}

function CreateConversationDialog({ kind, projects, onClose, onCreated }: { kind: Conversation['kind']; projects: Project[]; onClose: () => void; onCreated: (id: number) => void }) {
  const [selectedKind, setSelectedKind] = useState(kind)
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0)
  const [handles, setHandles] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true); setError('')
    try {
      const result = await api.chat.create({ kind: selectedKind, title: title.trim() || undefined, project_id: selectedKind === 'project' ? projectId : undefined, member_handles: selectedKind === 'project' ? undefined : handles.split(',').map(item => item.trim()).filter(Boolean) })
      onCreated(result.conversation.id)
    } catch (reason) { setError((reason as Error).message) }
    finally { setSaving(false) }
  }
  return <div className="chat-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><form className="chat-dialog" onSubmit={submit}><header><div><small>CONNECTED CONVERSATIONS</small><h2>New Chat</h2></div><button type="button" onClick={onClose}><X size={16} /></button></header><div className="chat-dialog-kinds">{TAB_COPY.map(item => <button type="button" key={item.id} className={selectedKind === item.id ? 'is-active' : ''} onClick={() => setSelectedKind(item.id)}>{item.icon}{item.label}</button>)}</div>{selectedKind === 'project' ? <label><span>Project</span><select value={projectId} onChange={event => setProjectId(Number(event.target.value))}>{projects.map(project => <option key={project.id} value={project.id}>{project.name} · {getMiniApp(project.app_kind).name}</option>)}</select>{projects.length === 0 && <small>Create a Project before starting a Project Chat.</small>}</label> : <><label><span>{selectedKind === 'private' ? 'Conversation name' : 'Group name'}</span><input value={title} onChange={event => setTitle(event.target.value)} placeholder={selectedKind === 'private' ? 'Private chat' : 'Study group'} /></label><label><span>{selectedKind === 'private' ? 'Helios handle' : 'Member handles'}</span><input value={handles} onChange={event => setHandles(event.target.value)} placeholder={selectedKind === 'private' ? '@alex' : '@alex, @maya, @sam'} /><small>Only users with valid Helios handles are added.</small></label></>}{error && <div className="chat-dialog-error">{error}</div>}<footer><button type="button" onClick={onClose}>Cancel</button><button type="submit" disabled={saving || (selectedKind === 'project' && !projectId)}>{saving ? 'Creating…' : 'Create Chat'}</button></footer></form></div>
}

function ProjectChatContext({ conversation, project, live, messages, onOpenProject, onOpenLive, onOpenMiniApp }: {
  conversation: Conversation
  project: Project | null
  live: LiveSession | null
  messages: number
  onOpenProject: (id: number) => void
  onOpenLive: (id: number) => void
  onOpenMiniApp: () => void
}) {
  const app = getMiniApp(conversation.app_kind || project?.app_kind || 'web-code')
  return (
    <section className="project-chat-context">
      <div><small>PROJECT CHAT</small><strong>{conversation.project_name || conversation.title}</strong><span>{messages} messages · {app.name}{live?.status === 'live' ? ' · LIVE' : ''}</span></div>
      <div>
        {conversation.project_id && <button type="button" onClick={() => onOpenProject(conversation.project_id!)}>Open Project</button>}
        <button type="button" onClick={onOpenMiniApp}>Open Mini App</button>
        {live && <button type="button" onClick={() => onOpenLive(live.id)}>{live.status === 'live' ? 'Watch Live' : 'Replay Live'}</button>}
      </div>
    </section>
  )
}

function ChatMessageRow({ message, compact, selected, onSelect, onPin, onOpenProject }: { message: ChatMessage; compact: boolean; selected: boolean; onSelect: () => void; onPin: () => void; onOpenProject: (id: number) => void }) {
  return <article className={'chat-message-row' + (message.mine ? ' is-mine' : '') + (compact ? ' is-compact' : '') + (selected ? ' is-selected' : '')} data-message-id={message.id}><button type="button" className="chat-select-message" aria-pressed={selected} onClick={onSelect} aria-label="Select message for Helios" /><span className="chat-message-avatar">{compact ? '' : message.sender_name.slice(0, 1)}</span><div className="chat-message-content">{!compact && <header><strong>{message.sender_name}</strong><small>{message.sender_handle}</small><time>{new Date(message.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></header>}{message.body && <p>{message.body}</p>}{message.attachment && <RichAttachment message={message} onOpenProject={onOpenProject} />}<button type="button" className={'chat-pin-message' + (message.pinned ? ' is-pinned' : '')} onClick={onPin} aria-label={message.pinned ? 'Unpin message' : 'Pin message'}><Pin size={11} fill={message.pinned ? 'currentColor' : 'none'} /></button></div></article>
}

function RichAttachment({ message, onOpenProject }: { message: ChatMessage; onOpenProject: (id: number) => void }) {
  const attachment = message.attachment || {}
  if (message.attachment_type === 'project') {
    const projectId = Number(attachment.id || message.attachment_id)
    const app = getMiniApp(String(attachment.app_kind || 'web-code'))
    const space = getSpaceDefinition(String(attachment.space_id || 'coding'))
    return <button type="button" className="chat-project-attachment" onClick={() => onOpenProject(projectId)}><i><FolderGit2 size={19} /></i><span><small>HELIO​S PROJECT · {space.name}</small><strong>{String(attachment.name || 'Shared Project')}</strong><b>{app.name} · Open actual work <ChevronRight size={12} /></b></span></button>
  }
  if (message.attachment_type === 'file') {
    const data = String(attachment.data || '')
    const mime = String(attachment.mime || '')
    const isImage = mime.startsWith('image/')
    return <div className="chat-file-attachment">{isImage ? <img src={data} alt={String(attachment.name || 'Shared image')} /> : <i><File size={20} /></i>}<span><small>{isImage ? 'IMAGE' : 'FILE'} · {formatBytes(Number(attachment.size || 0))}</small><strong>{String(attachment.name || 'Shared file')}</strong></span><a href={data} download={String(attachment.name || 'download')} aria-label="Download file"><Download size={15} /></a></div>
  }
  if (message.attachment_type === 'post') return <div className="chat-post-attachment"><Image size={17} /><span><small>LIFESTYLE PROGRESS</small><strong>{String(attachment.body || 'Shared progress post')}</strong></span></div>
  return null
}

function ConversationAvatar({ conversation }: { conversation: Conversation }) {
  return <span className={`chat-conversation-avatar kind-${conversation.kind}`}>{conversation.kind === 'project' ? <FolderGit2 size={15} /> : conversation.kind === 'group' ? <Hash size={15} /> : <AtSign size={15} />}</span>
}

function ChatWelcome({ projects, onCreate }: { projects: Project[]; onCreate: (kind: Conversation['kind']) => void }) {
  return <div className="chat-welcome"><div className="chat-welcome-orbit"><MessageCircle size={27} /><i /><i /></div><span>YOUR CONVERSATIONS, ATTACHED TO THE WORK</span><h1>Build together without losing context.</h1><p>Keep Project decisions, files, Writing, code, drawings and progress updates connected as rich previews—not raw links.</p><div><button type="button" onClick={() => onCreate('project')} disabled={projects.length === 0}><FolderGit2 size={15} /> Start Project Chat</button><button type="button" onClick={() => onCreate('group')}><Users size={15} /> Create Group</button><button type="button" onClick={() => onCreate('private')}><AtSign size={15} /> Private Chat</button></div>{projects.length === 0 && <small>Create your first Project to unlock a connected Project Chat.</small>}</div>
}

function attachmentLabel(message: ChatMessage) { return message.attachment_type === 'project' ? 'Shared a Project' : message.attachment_type === 'file' ? 'Shared a file' : 'Shared progress' }
function compactTime(value: string) { const date = new Date(value); const today = new Date(); return date.toDateString() === today.toDateString() ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString([], { month: 'short', day: 'numeric' }) }
function formatBytes(size: number) { return size > 999_999 ? `${(size / 1_000_000).toFixed(1)} MB` : size > 999 ? `${Math.round(size / 1000)} KB` : `${size} B` }
function ConversationSkeleton() { return <div className="chat-conversation-skeleton"><i /><span><b /><b /></span></div> }
function MessageSkeleton() { return <div className="chat-message-skeleton"><i /><span><b /><b /><b /></span></div> }
