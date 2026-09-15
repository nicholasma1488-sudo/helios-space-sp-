import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AtSign, Bot, Check, ChevronRight, Download, File, FolderGit2, Image,
  MessageCircle, Paperclip, Pencil, Pin, Plus, Search, Send, Sparkles,
  UserPlus, Users, X,
} from 'lucide-react'
import { api, type ChatMessage, type Conversation, type ConversationMember, type LiveSession, type Project } from '../api'
import { UserAvatar } from '../components/UserAvatar'
import { getMiniApp, getSpaceDefinition } from '../product/catalog'
import { askHeliosWithContext, openLiveSession, openProjectWorkspace } from '../product/flow'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useApp } from '../store/appStore'
import { getLocale, t, useLocale, useT } from '../i18n'
import './ChatView.css'

type PendingAttachment =
  | { type: 'project'; id: number; label: string }
  | { type: 'file'; file: { name: string; mime: string; size: number; data: string }; label: string }

type FriendStatus = 'none' | 'friends' | 'outgoing' | 'incoming'
type PeopleResult = { id: number; name: string; handle: string; friend_status: FriendStatus }
type FriendRequestRow = { id: number; user_id: number; name: string; handle: string; created_at: string }
type ChatFilter = 'all' | Conversation['kind']
type ChatPane = 'chats' | 'people'

const TAB_COPY: Array<{ id: Conversation['kind']; label: string; icon: React.ReactNode }> = [
  { id: 'private', label: 'Private Chat', icon: <AtSign size={15} /> },
  { id: 'group', label: 'Groups', icon: <Users size={15} /> },
  { id: 'project', label: 'Project Chats', icon: <FolderGit2 size={15} /> },
]

const FILTERS: Array<{ id: ChatFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'private', label: 'Private Chat' },
  { id: 'group', label: 'Groups' },
  { id: 'project', label: 'Project Chats' },
]

export function ChatView() {
  const { state, dispatch } = useApp()
  const t = useT()
  const locale = useLocale()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [pane, setPane] = useState<ChatPane>('chats')
  const [tab, setTab] = useState<ChatFilter>('all')
  const [selecting, setSelecting] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [query, setQuery] = useState('')
  const [peopleQuery, setPeopleQuery] = useState('')
  const [peopleResults, setPeopleResults] = useState<PeopleResult[]>([])
  const [peopleSearching, setPeopleSearching] = useState(false)
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestRow[]>([])
  const [friendBusyId, setFriendBusyId] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [pending, setPending] = useState<PendingAttachment[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [members, setMembers] = useState<ConversationMember[]>([])
  const [showMembers, setShowMembers] = useState(false)
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
  const attachPanelRef = useFocusTrap<HTMLDivElement>(showAttachments)
  const initialSelectionDone = useRef(false)
  const activeIdRef = useRef<number | null>(null)
  const peopleSearchId = useRef(0)
  activeIdRef.current = activeId

  useEffect(() => {
    if (!showAttachments) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setShowAttachments(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showAttachments])

  useEffect(() => {
    setShowAttachments(false)
    setSelecting(false)
    setSelectedIds([])
    setShowMembers(false)
  }, [activeId])

  const loadConversations = useCallback(async () => {
    try {
      const result = await api.chat.list()
      setConversations(result.conversations || [])
      // Clear the global unread badge when user enters Chat Hub
      dispatch({ type: 'SET_CHAT_UNREAD', count: 0 })
      if (!initialSelectionDone.current) {
        initialSelectionDone.current = true
        const requested = Number(sessionStorage.getItem('helios-open-conversation') || 0)
        sessionStorage.removeItem('helios-open-conversation')
        const target = result.conversations.find(item => item.id === requested) ?? result.conversations.find(item => item.kind === 'project') ?? result.conversations[0]
        if (target) setActiveId(target.id)
      }
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: t('Chat Hub could not load: {error}', { error: (error as Error).message }), tone: 'warning' } })
    } finally { setLoading(false) }
  }, [dispatch])

  useEffect(() => { void loadConversations() }, [loadConversations])

  const loadFriendRequests = useCallback(async () => {
    try {
      const result = await api.friends.requests()
      setIncomingRequests(result.incoming || [])
    } catch {
      setIncomingRequests([])
    }
  }, [])

  useEffect(() => { void loadFriendRequests() }, [loadFriendRequests])

  useEffect(() => {
    const needle = peopleQuery.trim()
    if (needle.length < 1) {
      setPeopleResults([])
      setPeopleSearching(false)
      return
    }
    const id = ++peopleSearchId.current
    setPeopleSearching(true)
    const timeout = window.setTimeout(() => {
      void api.users.search(needle).then(result => {
        if (id !== peopleSearchId.current) return
        setPeopleResults(result.people || [])
      }).catch(() => {
        if (id !== peopleSearchId.current) return
        setPeopleResults([])
      }).finally(() => {
        if (id === peopleSearchId.current) setPeopleSearching(false)
      })
    }, 220)
    return () => window.clearTimeout(timeout)
  }, [peopleQuery])

  useEffect(() => {
    let cancelled = false
    void api.live.list().then(result => {
      if (!cancelled) setLiveSessions(result.sessions || [])
    }).catch(() => {
      if (!cancelled) setLiveSessions([])
    })
    return () => { cancelled = true }
  }, [])

  function patchPersonStatus(userId: number, status: FriendStatus) {
    setPeopleResults(current => current.map(person => person.id === userId ? { ...person, friend_status: status } : person))
  }

  async function sendFriendRequest(person: PeopleResult) {
    if (friendBusyId !== null) return
    setFriendBusyId(person.id)
    try {
      await api.friends.request({ user_id: person.id })
      patchPersonStatus(person.id, 'outgoing')
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: t('Friend request sent to {name}', { name: person.name }), tone: 'success' } })
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    } finally {
      setFriendBusyId(null)
    }
  }

  async function respondFriendRequest(requestId: number, decision: 'accept' | 'decline', userId?: number) {
    if (friendBusyId !== null) return
    setFriendBusyId(requestId)
    try {
      await api.friends.respond(requestId, decision)
      setIncomingRequests(current => current.filter(item => item.id !== requestId))
      if (userId) patchPersonStatus(userId, decision === 'accept' ? 'friends' : 'none')
      dispatch({
        type: 'PUSH_TOAST',
        toast: {
          id: String(Date.now()),
          message: decision === 'accept' ? t('Friend request accepted') : t('Friend request declined'),
          tone: decision === 'accept' ? 'success' : 'info',
        },
      })
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    } finally {
      setFriendBusyId(null)
    }
  }

  async function acceptIncomingFromSearch(person: PeopleResult) {
    const match = incomingRequests.find(item => item.user_id === person.id)
    if (match) {
      await respondFriendRequest(match.id, 'accept', person.id)
      return
    }
    try {
      const result = await api.friends.requests()
      setIncomingRequests(result.incoming || [])
      const found = (result.incoming || []).find(item => item.user_id === person.id)
      if (found) await respondFriendRequest(found.id, 'accept', person.id)
      else dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: t('Incoming request not found. Refresh and try again.'), tone: 'warning' } })
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    }
  }

  const active = conversations.find(item => item.id === activeId) ?? null
  const visibleConversations = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return conversations
      .filter(item => (tab === 'all' || item.kind === tab) && (!needle || `${item.title} ${item.project_name || ''} ${item.last_message || ''}`.toLowerCase().includes(needle)))
      .slice()
      .sort((a, b) => String(b.last_message_at || b.created_at || '').localeCompare(String(a.last_message_at || a.created_at || '')))
  }, [conversations, query, tab])

  function unreadOf(kind?: Conversation['kind']) {
    return conversations.filter(item => !kind || item.kind === kind).reduce((sum, item) => sum + item.unread, 0)
  }

  const loadMessages = useCallback(async (conversationId: number, quiet = false) => {
    if (!quiet) setMessagesLoading(true)
    try {
      const result = await api.chat.messages(conversationId)
      setMessages(current => {
        if (activeIdRef.current !== conversationId) return current
        return result.messages || []
      })
      // Only mark read / clear badge for the still-active conversation.
      if (activeIdRef.current === conversationId) {
        await api.chat.read(conversationId)
        setConversations(current => current.map(item => item.id === conversationId ? { ...item, unread: 0 } : item))
      }
    } catch (error) {
      if (!quiet) dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    } finally { if (!quiet) setMessagesLoading(false) }
  }, [dispatch])

  useEffect(() => {
    if (!activeId) { setMessages([]); return }
    let cancelled = false
    void (async () => {
      if (!cancelled) await loadMessages(activeId)
    })()
    const poll = window.setInterval(() => {
      if (cancelled) return
      void loadMessages(activeId, true)
      void loadConversations()
    }, 8000)
    return () => {
      cancelled = true
      window.clearInterval(poll)
    }
  }, [activeId, loadConversations, loadMessages])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: state.reducedMotion ? 'auto' : 'smooth' })
  }, [messages.length, state.reducedMotion])

  useEffect(() => {
    if (!activeId) {
      setMembers([])
      setShowMembers(false)
      return
    }
    let cancelled = false
    async function loadMembers(id: number) {
      try {
        const result = await api.chat.members(id)
        if (!cancelled) setMembers(result.members || [])
      } catch {
        if (!cancelled) setMembers([])
      }
    }
    void loadMembers(activeId)
    const poll = window.setInterval(() => { void loadMembers(activeId) }, 8000)
    return () => {
      cancelled = true
      window.clearInterval(poll)
    }
  }, [activeId])

  function selectTab(next: ChatFilter) {
    setTab(next)
    setShowAttachments(false)
    if (next !== 'all' && active && active.kind !== next) {
      const first = conversations.find(item => item.kind === next)
      setActiveId(first?.id ?? null)
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!activeId || sending || (!draft.trim() && pending.length === 0)) return
    setSending(true)
    try {
      const queue = pending.length ? pending : [null]
      let first = true
      for (const item of queue) {
        const data: Parameters<typeof api.chat.send>[1] = { body: first ? draft.trim() : '' }
        if (item?.type === 'project') { data.attachment_type = 'project'; data.attachment_id = item.id }
        if (item?.type === 'file') { data.attachment_type = 'file'; data.file = item.file }
        if (!data.body && !data.attachment_type) continue
        setUploadProgress(item ? t('Sending {name}…', { name: item.label }) : t('Sending…'))
        const result = await api.chat.send(activeId, data)
        setMessages(current => [...current, result.message])
        first = false
      }
      setDraft('')
      setPending([])
      setShowAttachments(false)
      await loadConversations()
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: t('Message not sent: {error}', { error: (error as Error).message }), tone: 'warning' } })
    } finally {
      setSending(false)
      setUploadProgress('')
    }
  }

  async function chooseFile(file: globalThis.File | undefined) {
    if (!file) return
    if (file.size > 1_000_000) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: t('Chat file attachments are limited to 1 MB.'), tone: 'warning' } })
      return
    }
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    let skipped = false
    setPending(current => {
      if (current.length >= 8) {
        skipped = true
        return current
      }
      return [...current, { type: 'file', label: file.name, file: { name: file.name, mime: file.type || 'application/octet-stream', size: file.size, data } }]
    })
    if (skipped) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: t('Too many attachments (max 8).'), tone: 'warning' } })
      return
    }
    setShowAttachments(false)
  }

  async function chooseFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) await chooseFile(file)
  }

  function hasFileDrag(event: React.DragEvent) {
    return Array.from(event.dataTransfer.types).includes('Files')
  }

  function onComposerDragOver(event: React.DragEvent) {
    if (!hasFileDrag(event)) return
    event.preventDefault()
    setDragOver(true)
  }

  function onComposerDragLeave(event: React.DragEvent) {
    if (event.currentTarget.contains(event.relatedTarget as Node)) return
    setDragOver(false)
  }

  function onComposerDrop(event: React.DragEvent) {
    if (!hasFileDrag(event) || !activeId) return
    event.preventDefault()
    setDragOver(false)
    void chooseFiles(event.dataTransfer.files)
  }

  async function editMessage(message: ChatMessage, body: string) {
    if (!activeId) return
    try {
      const result = await api.chat.edit(activeId, message.id, body)
      setMessages(current => current.map(item => item.id === message.id ? result.message : item))
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: t('Could not save edit: {error}', { error: (error as Error).message }), tone: 'warning' } })
      throw error
    }
  }

  async function leaveConversation() {
    if (!active || active.kind === 'project') return
    if (!window.confirm(t('Leave this conversation? You will stop receiving new messages.'))) return
    try {
      await api.chat.leave(active.id)
      setActiveId(null)
      setShowMembers(false)
      await loadConversations()
    } catch (error) {
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } })
    }
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
      selected_content: action === 'selected' ? t('Selected messages') : t('Current permitted conversation'),
    }, action === 'reply'
      ? t('Draft concise suggested replies to the open questions. Do not send anything.')
      : action === 'selected'
        ? t('Use only the selected messages. Summarize them, extract tasks, and draft a reply.')
        : t('Summarize unread and recent messages. Group them into questions, feedback, and tasks.'), dispatch)
  }

  return (
    <div className="chat-hub">
      {showNew && <CreateConversationDialog kind={createKind} projects={state.projects} onClose={() => setShowNew(false)} onCreated={async id => { setShowNew(false); await loadConversations(); setActiveId(id); setTab(createKind) }} />}
      <input ref={fileInput} hidden type="file" multiple accept="image/*,.pdf,.txt,.md,.csv,.json,application/pdf,text/plain,text/markdown" onChange={event => { if (event.target.files) void chooseFiles(event.target.files); event.currentTarget.value = '' }} />

      <aside className="chat-hub-sidebar">
        <header>
          <div>
            <MessageCircle size={18} />
            <span><strong>{t('Messages')}</strong></span>
          </div>
          <button type="button" onClick={() => openCreate(tab === 'all' ? 'private' : tab)} aria-label={t('New conversation')}><Plus size={16} /></button>
        </header>
        <nav className="chat-hub-panes" aria-label={t('Messages')}>
          <button type="button" className={pane === 'chats' ? 'is-active' : ''} onClick={() => setPane('chats')}>
            {t('Chats')}{unreadOf() > 0 && <b>{unreadOf()}</b>}
          </button>
          <button type="button" className={pane === 'people' ? 'is-active' : ''} onClick={() => setPane('people')}>
            {t('People')}{incomingRequests.length > 0 && <b>{incomingRequests.length}</b>}
          </button>
        </nav>

        {pane === 'people' && (
          <div className="chat-people-pane">
            <label className="chat-hub-search"><UserPlus size={14} /><input value={peopleQuery} onChange={event => setPeopleQuery(event.target.value)} placeholder={t('Search username')} aria-label={t('Search username')} /></label>
            {incomingRequests.length > 0 && (
              <section className="chat-friend-requests" aria-label={t('Friend requests')}>
                <header><UserPlus size={12} /><span>{t('Friend requests')}</span><b>{incomingRequests.length}</b></header>
                <div>
                  {incomingRequests.map(request => (
                    <div key={request.id} className="chat-people-row">
                      <UserAvatar name={request.name} size={40} />
                      <span className="chat-people-meta">
                        <strong>{request.name}</strong>
                        <small>{request.handle}</small>
                      </span>
                      <button type="button" className="chat-friend-action is-accept" disabled={friendBusyId === request.id} onClick={() => void respondFriendRequest(request.id, 'accept', request.user_id)}>
                        {t('Accept')}
                      </button>
                      <button type="button" className="chat-friend-action is-decline" disabled={friendBusyId === request.id} onClick={() => void respondFriendRequest(request.id, 'decline', request.user_id)}>
                        {t('Decline')}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <div className="chat-people-results" aria-live="polite">
              {peopleSearching && <div className="chat-people-empty">{t('Searching…')}</div>}
              {!peopleSearching && peopleResults.length === 0 && peopleQuery.trim() && <div className="chat-people-empty">{t('No people found')}</div>}
              {!peopleSearching && !peopleQuery.trim() && peopleResults.length === 0 && incomingRequests.length === 0 && (
                <div className="chat-people-empty">{t('Search a Helios handle to add a friend.')}</div>
              )}
              {!peopleSearching && peopleResults.map(person => (
                <div key={person.id} className="chat-people-row">
                  <UserAvatar name={person.name} size={40} />
                  <span className="chat-people-meta">
                    <strong>{person.name}</strong>
                    <small>{person.handle}</small>
                  </span>
                  {person.friend_status === 'friends' && <span className="chat-friend-badge">{t('Friends')}</span>}
                  {person.friend_status === 'outgoing' && <span className="chat-friend-badge is-pending">{t('Pending')}</span>}
                  {person.friend_status === 'incoming' && (
                    <button type="button" className="chat-friend-action is-accept" disabled={friendBusyId !== null} onClick={() => void acceptIncomingFromSearch(person)}>
                      <Check size={12} /> {t('Accept')}
                    </button>
                  )}
                  {person.friend_status === 'none' && (
                    <button type="button" className="chat-friend-action" disabled={friendBusyId === person.id} onClick={() => void sendFriendRequest(person)}>
                      <UserPlus size={12} /> {t('Add friend')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {pane === 'chats' && (
          <>
            <label className="chat-hub-search"><Search size={14} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t('Search')} /></label>
            <nav className="chat-kind-tabs" aria-label={t('Conversation types')}>
              {FILTERS.map(item => {
                const count = item.id === 'all' ? unreadOf() : unreadOf(item.id)
                return (
                  <button type="button" key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => selectTab(item.id)}>
                    {t(item.label)}{count > 0 && <b>{count}</b>}
                  </button>
                )
              })}
            </nav>
            <div className="chat-conversation-list">
              {loading && <><ConversationSkeleton /><ConversationSkeleton /><ConversationSkeleton /></>}
              {!loading && visibleConversations.map(conversation => (
                <button type="button" key={conversation.id} className={activeId === conversation.id ? 'is-active' : ''} onClick={() => setActiveId(conversation.id)}>
                  <ConversationAvatar conversation={conversation} />
                  <span>
                    <strong>{conversation.title}</strong>
                    <small>{conversation.last_message || (conversation.kind === 'project' ? t('Project discussion is ready') : t('Start the conversation'))}</small>
                  </span>
                  <time>{conversation.last_message_at ? compactTime(conversation.last_message_at, locale) : ''}</time>
                  {conversation.unread > 0 && <b>{conversation.unread > 99 ? '99+' : conversation.unread}</b>}
                </button>
              ))}
              {!loading && visibleConversations.length === 0 && (
                <div className="chat-list-empty">
                  <span>{tab === 'project' ? <FolderGit2 size={21} /> : tab === 'group' ? <Users size={21} /> : <MessageCircle size={21} />}</span>
                  <strong>{tab === 'project' ? t('No project chats') : tab === 'group' ? t('No groups') : tab === 'private' ? t('No private chats') : t('No conversations yet')}</strong>
                  <p>{tab === 'project' ? t('Start a chat from a durable Project.') : t('Create a conversation using Helios handles.')}</p>
                  <button type="button" onClick={() => openCreate(tab === 'all' ? 'private' : tab)}><Plus size={13} /> {t('Create one')}</button>
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      <main
        className={'chat-thread' + (dragOver ? ' is-dragover' : '')}
        onDragEnter={onComposerDragOver}
        onDragOver={onComposerDragOver}
        onDragLeave={onComposerDragLeave}
        onDrop={onComposerDrop}
      >
        {!active && <ChatWelcome projects={state.projects} onCreate={openCreate} />}
        {active && <>
          <header className="chat-thread-header">
            <div>
              <button type="button" className="chat-thread-back" onClick={() => { setActiveId(null); setShowMembers(false) }} aria-label={t('Back to conversations')}>‹</button>
              <ConversationAvatar conversation={active} size={36} />
              <span>
                <strong>{active.title}</strong>
                <small>{active.kind === 'project' && active.project_name ? `${t(getSpaceDefinition(active.space_id || 'coding').name)} · ${getMiniApp(active.app_kind || 'web-code').name} · ${t('{count} messages', { count: messages.length })}` : active.kind === 'group' ? t('Group conversation') : t('Private conversation')}</small>
              </span>
            </div>
            <div className="chat-thread-actions">
              {selecting ? (
                <>
                  {selectedIds.length > 0 && <button type="button" onClick={() => askHelios('selected')}><Bot size={14} /> {t('Helios ({count})', { count: selectedIds.length })}</button>}
                  <button type="button" onClick={() => { setSelecting(false); setSelectedIds([]) }}>{t('Done')}</button>
                </>
              ) : (
                <>
                  {active.project_id && <button type="button" onClick={() => void openProject(active.project_id!)} aria-label={t('Open Project')}><FolderGit2 size={15} /></button>}
                  <button type="button" aria-expanded={showMembers} aria-controls="chat-members-panel" aria-label={t('Conversation members')} onClick={() => setShowMembers(value => !value)}>
                    <Users size={16} />
                  </button>
                </>
              )}
            </div>
          </header>
          {showMembers && (
            <section id="chat-members-panel" className="chat-members-panel" aria-label={t('Members')}>
              <header>
                <strong>{t('Members')} · {members.length}</strong>
                <button type="button" onClick={() => setShowMembers(false)} aria-label={t('Close members')}><X size={14} /></button>
              </header>
              <ul>
                {members.map(member => (
                  <li key={member.id}>
                    <UserAvatar name={member.name} src={member.avatar} size={28} />
                    <span>
                      <strong>{member.name}{member.owner ? ` · ${t('Owner')}` : ''}</strong>
                      <small>{member.handle}{member.last_read_at ? ` · ${t('Last read {time}', { time: compactTime(member.last_read_at, locale) })}` : ` · ${t('Not yet read')}`}</small>
                    </span>
                  </li>
                ))}
                {members.length === 0 && <li className="chat-members-empty">{t('Members are loading…')}</li>}
              </ul>
              <div className="chat-members-tools">
                <button type="button" onClick={() => { setShowMembers(false); askHelios('summary') }}><Bot size={13} /> {t('Summarize')}</button>
                <button type="button" onClick={() => { setShowMembers(false); askHelios('reply') }}><Sparkles size={13} /> {t('Draft replies')}</button>
                <button type="button" onClick={() => { setSelecting(true); setShowMembers(false) }}>{t('Select')}</button>
              </div>
              {active.kind !== 'project' && (
                <button type="button" className="chat-leave-btn" onClick={() => void leaveConversation()}>{t('Leave conversation')}</button>
              )}
            </section>
          )}
          {active.kind === 'project' && <ProjectChatContext conversation={active} project={state.projects.find(item => item.id === active.project_id) || null} live={liveSessions.find(item => item.project_id === active.project_id) || null} messages={messages.length} onOpenProject={id => void openProject(id)} onOpenLive={id => openLiveSession(id, dispatch)} onOpenMiniApp={() => { if (active.project_id) void openProject(active.project_id) }} />}

          {messages.some(message => message.pinned) && <section className="chat-pinned"><header><Pin size={12} /> {t('Pinned context')}</header><div>{messages.filter(message => message.pinned).map(message => <button type="button" key={message.id} onClick={() => document.querySelector(`[data-message-id="${message.id}"]`)?.scrollIntoView({ behavior: 'smooth' })}><strong>{message.sender_name}</strong><span>{message.body || attachmentLabel(message)}</span></button>)}</div></section>}

          <div className="chat-message-log" role="log" aria-label={t('{title} messages', { title: active.title })}>
            {messagesLoading && <MessageSkeleton />}
            {!messagesLoading && messages.length === 0 && <div className="chat-thread-empty"><MessageCircle size={25} /><h2>{t('Say something…')}</h2><p>{t('Messages, files and work share one context.')}</p></div>}
            {!messagesLoading && messages.map((message, index) => <ChatMessageRow key={message.id} message={message} compact={index > 0 && messages[index - 1].sender_id === message.sender_id} selecting={selecting} selected={selectedIds.includes(message.id)} onSelect={() => toggleSelected(message.id)} onPin={() => void pinMessage(message)} onEdit={editMessage} onOpenProject={id => void openProject(id)} />)}
            <div ref={messagesEnd} />
          </div>

          <form className="chat-composer" onSubmit={submit}>
            {dragOver && (
              <div className="chat-drop-overlay" role="status">
                <Paperclip size={18} />
                <strong>{t('Drop files to attach')}</strong>
                <small>{t('Documents or images · up to 1 MB')}</small>
              </div>
            )}
            {pending.length > 0 && (
              <div className="chat-pending-attachments" role="list" aria-label={t('Attachments')}>
                {pending.map((item, index) => (
                  <div key={`${item.type}-${item.label}-${index}`} className="chat-pending-attachment" role="listitem">
                    {item.type === 'file' && item.file.mime.startsWith('image/') ? (
                      <img src={item.file.data} alt="" />
                    ) : item.type === 'project' ? <FolderGit2 size={15} /> : <File size={15} />}
                    <span>
                      <small>{item.type === 'project' ? t('PROJECT') : t('FILE')}</small>
                      <strong>{item.label}</strong>
                    </span>
                    <button type="button" onClick={() => setPending(current => current.filter((_, i) => i !== index))} aria-label={t('Remove attachment')}><X size={14} /></button>
                  </div>
                ))}
              </div>
            )}
            {uploadProgress && <div className="chat-upload-progress" role="status">{uploadProgress}</div>}
            {showAttachments && (
              <div
                className="chat-attach-backdrop"
                role="presentation"
                onMouseDown={event => { if (event.target === event.currentTarget) setShowAttachments(false) }}
              >
                <div
                  className="chat-attach-window"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="chat-attach-title"
                  ref={attachPanelRef}
                >
                  <header>
                    <div>
                      <small>{t('Attach')}</small>
                      <strong id="chat-attach-title">{t('Share into this conversation')}</strong>
                    </div>
                    <button type="button" onClick={() => setShowAttachments(false)} aria-label={t('Close attach window')}><X size={15} /></button>
                  </header>
                  <button
                    type="button"
                    className="chat-attach-upload"
                    onClick={() => { fileInput.current?.click(); setShowAttachments(false) }}
                  >
                    <Paperclip size={16} />
                    <span>
                      <strong>{t('Upload a file')}</strong>
                      <small>{t('Documents or images · up to 1 MB')}</small>
                    </span>
                  </button>
                  <p className="chat-attach-label">{t('Projects')}</p>
                  <div className="chat-attach-list">
                    {state.projects.slice(0, 8).map(project => (
                      <button
                        type="button"
                        key={project.id}
                        onClick={() => {
                          setPending(current => current.some(item => item.type === 'project' && item.id === project.id)
                            ? current
                            : [...current, { type: 'project', id: project.id, label: project.name }])
                          setShowAttachments(false)
                        }}
                      >
                        <FolderGit2 size={15} />
                        <span>
                          <strong>{project.name}</strong>
                          <small>{t(getSpaceDefinition(project.space_id).name)} · {getMiniApp(project.app_kind).name}</small>
                        </span>
                      </button>
                    ))}
                    {state.projects.length === 0 && (
                      <div className="chat-attach-empty">{t('No projects yet — create one in Create, then attach it here.')}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <div className="chat-composer-box">
              <button
                type="button"
                className={showAttachments ? 'is-active' : ''}
                onClick={() => setShowAttachments(value => !value)}
                aria-label={t('Attach file or Project')}
                aria-expanded={showAttachments}
              >
                <Plus size={17} />
              </button>
              <textarea
                value={draft}
                maxLength={4000}
                onChange={event => setDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
                placeholder={t('Message {name}…', { name: active.title })}
              />
              <button type="submit" disabled={sending || (!draft.trim() && pending.length === 0)} aria-label={t('Send message')}><Send size={15} /></button>
            </div>
            <small className="chat-composer-hint">{t('Enter to send · Shift + Enter for a new line')}</small>
          </form>
        </>}
      </main>
    </div>
  )
}

function CreateConversationDialog({ kind, projects, onClose, onCreated }: { kind: Conversation['kind']; projects: Project[]; onClose: () => void; onCreated: (id: number) => void }) {
  const t = useT()
  const [selectedKind, setSelectedKind] = useState(kind)
  const [title, setTitle] = useState(() => sessionStorage.getItem('helios-invite-name') ? `Collab with ${sessionStorage.getItem('helios-invite-name')}` : '')
  const [projectId, setProjectId] = useState(projects[0]?.id ?? 0)
  const [handles, setHandles] = useState(() => {
    const invite = sessionStorage.getItem('helios-invite-handle') || ''
    sessionStorage.removeItem('helios-invite-handle')
    sessionStorage.removeItem('helios-invite-name')
    return invite
  })
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
  return <div className="chat-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><form className="chat-dialog" onSubmit={submit}><header><div><small>{t('Collaboration chat')}</small><h2>{t('New conversation')}</h2></div><button type="button" onClick={onClose}><X size={16} /></button></header><div className="chat-dialog-kinds">{TAB_COPY.map(item => <button type="button" key={item.id} className={selectedKind === item.id ? 'is-active' : ''} onClick={() => setSelectedKind(item.id)}>{item.icon}{t(item.label)}</button>)}</div>{selectedKind === 'project' ? <label><span>{t('Project')}</span><select value={projectId} onChange={event => setProjectId(Number(event.target.value))}>{projects.map(project => <option key={project.id} value={project.id}>{project.name} · {getMiniApp(project.app_kind).name}</option>)}</select>{projects.length === 0 && <small>{t('Create a Project before starting a Project Chat.')}</small>}</label> : <><label><span>{selectedKind === 'private' ? t('Conversation name') : t('Group name')}</span><input value={title} onChange={event => setTitle(event.target.value)} placeholder={selectedKind === 'private' ? t('Private chat') : t('Study group')} /></label><label><span>{selectedKind === 'private' ? t('Helios handle') : t('Member handles')}</span><input value={handles} onChange={event => setHandles(event.target.value)} placeholder={selectedKind === 'private' ? '@alex' : '@alex, @maya, @sam'} /><small>{t('Only users with valid Helios handles are added.')}</small></label></>}{error && <div className="chat-dialog-error">{error}</div>}<footer><button type="button" onClick={onClose}>{t('Cancel')}</button><button type="submit" disabled={saving || (selectedKind === 'project' && !projectId)}>{saving ? t('Creating…') : t('Create Chat')}</button></footer></form></div>
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
  const t = useT()
  const app = getMiniApp(conversation.app_kind || project?.app_kind || 'web-code')
  return (
    <section className="project-chat-context">
      <p>{conversation.project_name || conversation.title} · {app.name} · {t('{count} messages', { count: messages })}{live?.status === 'live' ? ` · ${t('LIVE')}` : ''}</p>
      <div>
        {conversation.project_id && <button type="button" onClick={() => onOpenProject(conversation.project_id!)}>{t('Open')}</button>}
        <button type="button" onClick={onOpenMiniApp}>{t('Mini App')}</button>
        {live && <button type="button" onClick={() => onOpenLive(live.id)}>{live.status === 'live' ? t('Live') : t('Replay')}</button>}
      </div>
    </section>
  )
}

function ChatMessageRow({ message, compact, selecting, selected, onSelect, onPin, onEdit, onOpenProject }: {
  message: ChatMessage
  compact: boolean
  selecting: boolean
  selected: boolean
  onSelect: () => void
  onPin: () => void
  onEdit: (message: ChatMessage, body: string) => Promise<void>
  onOpenProject: (id: number) => void
}) {
  const t = useT()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.body)
  const [saving, setSaving] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!editing) return
    setDraft(message.body)
    const node = areaRef.current
    if (!node) return
    node.focus()
    node.setSelectionRange(node.value.length, node.value.length)
  }, [editing, message.body])

  async function save() {
    const next = draft.trim()
    if (!next || next === message.body) {
      setEditing(false)
      setDraft(message.body)
      return
    }
    setSaving(true)
    try {
      await onEdit(message, next)
      setEditing(false)
    } catch {
      /* toast already shown */
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className={'chat-message-row' + (message.mine ? ' is-mine' : '') + (compact ? ' is-compact' : '') + (selected ? ' is-selected' : '')} data-message-id={message.id}>
      {selecting && <button type="button" className="chat-select-message" aria-pressed={selected} onClick={onSelect} aria-label={t('Select message for Helios')} />}
      <span className="chat-message-avatar">{compact ? null : <UserAvatar name={message.sender_name} src={message.sender_avatar} size={36} />}</span>
      <div className="chat-message-content">
        {!compact && !message.mine && (
          <header>
            <strong>{message.sender_name}</strong>
            {message.edited_at && <em>{t('Edited')}</em>}
          </header>
        )}
        {((message.mine && message.edited_at) || (compact && message.edited_at)) && !editing && <em className="chat-edited-inline">{t('Edited')}</em>}
        {editing ? (
          <div className="chat-message-edit">
            <textarea
              ref={areaRef}
              value={draft}
              maxLength={4000}
              disabled={saving}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  event.preventDefault()
                  setDraft(message.body)
                  setEditing(false)
                }
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  void save()
                }
              }}
              aria-label={t('Edit message')}
            />
            <div className="chat-message-edit-actions">
              <button type="button" onClick={() => void save()} disabled={saving || !draft.trim()}>{saving ? t('Saving…') : t('Save')}</button>
              <button type="button" onClick={() => { setDraft(message.body); setEditing(false) }} disabled={saving}>{t('Cancel')}</button>
              <small>{t('⌘/Ctrl + Enter to save · Esc to cancel')}</small>
            </div>
          </div>
        ) : (
          <>
            {message.body && <p>{message.body}</p>}
            {message.attachment && <RichAttachment message={message} onOpenProject={onOpenProject} />}
          </>
        )}
        <div className="chat-message-tools">
          {message.mine && Boolean(message.body) && !editing && (
            <button type="button" className="chat-edit-message" onClick={() => setEditing(true)} aria-label={t('Edit message')}><Pencil size={11} /></button>
          )}
          <button type="button" className={'chat-pin-message' + (message.pinned ? ' is-pinned' : '')} onClick={onPin} aria-label={message.pinned ? t('Unpin message') : t('Pin message')}>
            <Pin size={11} fill={message.pinned ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </article>
  )
}

function RichAttachment({ message, onOpenProject }: { message: ChatMessage; onOpenProject: (id: number) => void }) {
  const t = useT()
  const attachment = message.attachment || {}
  if (message.attachment_type === 'project') {
    const projectId = Number(attachment.id || message.attachment_id)
    const app = getMiniApp(String(attachment.app_kind || 'web-code'))
    const space = getSpaceDefinition(String(attachment.space_id || 'coding'))
    return <button type="button" className="chat-project-attachment" onClick={() => onOpenProject(projectId)}><i><FolderGit2 size={19} /></i><span><small>{t('HELIOS PROJECT')} · {t(space.name)}</small><strong>{String(attachment.name || t('Shared Project'))}</strong><b>{app.name} · {t('Open actual work')} <ChevronRight size={12} /></b></span></button>
  }
  if (message.attachment_type === 'file') {
    const data = String(attachment.data || '')
    const mime = String(attachment.mime || '')
    const isImage = mime.startsWith('image/')
    return <div className="chat-file-attachment">{isImage ? <img src={data} alt={String(attachment.name || t('Shared image'))} /> : <i><File size={20} /></i>}<span><small>{isImage ? t('IMAGE') : t('FILE')} · {formatBytes(Number(attachment.size || 0))}</small><strong>{String(attachment.name || t('Shared file'))}</strong></span><a href={data} download={String(attachment.name || t('download'))} aria-label={t('Download file')}><Download size={15} /></a></div>
  }
  if (message.attachment_type === 'post') return <div className="chat-post-attachment"><Image size={17} /><span><small>{t('LIFESTYLE PROGRESS')}</small><strong>{String(attachment.body || t('Shared progress post'))}</strong></span></div>
  return null
}

function ConversationAvatar({ conversation, size = 48 }: { conversation: Conversation; size?: number }) {
  return (
    <span className={`chat-conversation-avatar kind-${conversation.kind}`}>
      <UserAvatar name={conversation.title} size={size} />
    </span>
  )
}

function ChatWelcome({ projects, onCreate }: { projects: Project[]; onCreate: (kind: Conversation['kind']) => void }) {
  const t = useT()
  return (
    <div className="chat-welcome">
      <div className="chat-welcome-mark" aria-hidden="true"><MessageCircle size={26} /></div>
      <h1>{t('Messages')}</h1>
      <p>{t('Pick a chat, or start a private chat, group, or project thread.')}</p>
      <div>
        <button type="button" className="liquid-glass-btn is-primary" onClick={() => onCreate('private')}>
          <AtSign size={15} /> {t('New private chat')}
        </button>
        <button type="button" className="liquid-glass-btn" onClick={() => onCreate('group')}>
          <Users size={15} /> {t('New group')}
        </button>
        <button type="button" className="liquid-glass-btn" onClick={() => onCreate('project')} disabled={projects.length === 0}>
          <FolderGit2 size={15} /> {t('Project chat')}
        </button>
      </div>
      {projects.length === 0 && <small>{t('No projects yet? You can still start a private chat or group.')}</small>}
    </div>
  )
}

function attachmentLabel(message: ChatMessage) { return message.attachment_type === 'project' ? t('Shared a Project') : message.attachment_type === 'file' ? t('Shared a file') : t('Shared progress') }
function compactTime(value: string, locale = getLocale()) { const date = new Date(value); const today = new Date(); return date.toDateString() === today.toDateString() ? date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString(locale, { month: 'short', day: 'numeric' }) }
function formatBytes(size: number) { return size > 999_999 ? `${(size / 1_000_000).toFixed(1)} MB` : size > 999 ? `${Math.round(size / 1000)} KB` : `${size} B` }
function ConversationSkeleton() { return <div className="chat-conversation-skeleton"><i /><span><b /><b /></span></div> }
function MessageSkeleton() { return <div className="chat-message-skeleton"><i /><span><b /><b /><b /></span></div> }
