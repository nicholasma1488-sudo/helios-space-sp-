// Typed API client for Helios Space backend

export type AccountKind = 'student' | 'adult' | ''

export interface User {
  id: number
  name: string
  handle: string
  email: string
  account_kind?: AccountKind
  adult_plan_active?: boolean
  adult_plan_expires_at?: string | null
  adult_plan_price_rmb?: number
}

export interface Project {
  id: number
  user_id: number
  name: string
  space: string
  space_id: string
  type: 'code' | 'doc' | 'design' | 'research' | 'writing' | 'spreadsheet' | 'presentation' | 'drawing' | 'survey' | 'board' | 'notebook' | 'book' | 'math'
  app_kind: string
  visibility: 'private' | 'space' | 'public'
  content: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  owner_name: string
  owner_handle: string
  can_edit: boolean
  can_manage: boolean
  collaborator_role: string | null
}

export interface Post {
  id: number
  author_id: number | null
  category: string
  body: string
  audience: 'public' | 'private' | string
  space_id: string
  post_type: string
  media_url: string
  created_at: string
  project_id: number | null
  project_name: string | null
  project_app_kind: string | null
  project_type: string | null
  project_visibility: string | null
  author_name: string
  author_handle: string
  can_delete: boolean
  reactions: Record<string, number>
  my_reactions: string[]
  comment_count: number
  is_saved: boolean
}

export interface Comment {
  id: number
  post_id: number
  author_id: number | null
  author_name: string
  author_handle: string
  body: string
  created_at: string
  can_delete: boolean
}

export interface PostPage {
  posts: Post[]
  next_cursor: number | null
}

export interface PostFilters {
  limit?: number
  cursor?: number | null
  category?: string
  q?: string
  saved?: boolean
  space_id?: string
}

export interface SpaceSummary {
  id: string
  name: string
  kind: 'subject' | 'hobby' | string
  custom: boolean
  project_count: number
  live_count: number
  created_at?: string
}

export interface ProjectVersion {
  id: number
  project_id: number
  user_id: number
  author_name: string
  label: string
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface ProjectFile {
  path: string
  content: string
  updated_at?: string
}

export interface ProjectCommit {
  id: number
  project_id: number
  user_id: number
  author_name: string
  author_handle: string
  message: string
  created_at: string
  file_count: number
  files?: Record<string, string>
}

export interface ProjectComment {
  id: number
  project_id: number
  user_id: number
  author_name: string
  author_handle: string
  body: string
  created_at: string
  can_delete: boolean
}

export interface Collaborator {
  user_id: number
  name: string
  handle: string
  role: 'viewer' | 'commenter' | 'editor' | string
  status: string
  created_at?: string
}

export interface LiveSession {
  id: number
  owner_id: number
  owner_name: string
  owner_handle: string
  project_id: number
  project_name: string
  app_kind: string
  space_id: string
  title: string
  status: 'live' | 'ended' | string
  audience: 'public' | 'private' | string
  permissions: { comment?: boolean; suggest?: boolean; request_edit?: boolean; voice?: boolean }
  viewer_count: number
  started_at: string
  ended_at: string | null
  can_manage: boolean
}

export interface LiveEvent {
  id: number | string
  session_id: number
  user_id: number
  kind: string
  payload: Record<string, unknown> & { text?: string; author_name?: string; author_handle?: string }
  created_at: string
}

export interface Conversation {
  id: number
  kind: 'project' | 'group' | 'private'
  title: string
  project_id: number | null
  project_name?: string | null
  space_id?: string | null
  app_kind?: string | null
  last_message?: string | null
  last_message_at?: string | null
  unread: number
  created_at: string
}

export interface ChatMessage {
  id: number
  conversation_id: number
  sender_id: number
  sender_name: string
  sender_handle: string
  body: string
  attachment_type: 'project' | 'post' | 'file' | null
  attachment_id: number | null
  attachment?: Record<string, unknown>
  created_at: string
  pinned: boolean
  mine: boolean
}

export interface SolarSummary {
  total: number
  identity: 'Dawn' | 'Orbit' | 'Radiant' | 'Nova' | 'Stellar' | 'Helios'
  next_threshold: number | null
  events: Array<{ id: number; source_type: string; source_id: string; amount: number; reason: string; created_at: string }>
}

export interface ApiNotification {
  id: number
  actor_id: number | null
  actor_name: string | null
  actor_handle: string | null
  kind: string
  title: string
  detail: string
  target_type: string | null
  target_id: string | null
  read_at: string | null
  read: boolean
  created_at: string
}

export interface SearchResults {
  projects: Project[]
  people: Array<{ id: number; name: string; handle: string }>
  posts: Post[]
  live: LiveSession[]
  spaces: Array<{ id: string; name: string; kind: string }>
}

export interface ExploreResults {
  projects: Project[]
  posts: Post[]
  live: LiveSession[]
  creators: Array<{ id: number; name: string; handle: string; project_count: number; post_count: number }>
  spaces: Array<{ id: string; name: string; kind: string; project_count: number; post_count: number; live_count: number }>
}

export interface UserExport {
  exported_at: string
  account: User & { created_at?: string; status?: string }
  projects: Project[]
  posts: Array<Record<string, unknown>>
  reactions: Array<Record<string, unknown>>
  collaborative_projects?: Project[]
  comments?: Array<Record<string, unknown>>
  project_comments?: Array<Record<string, unknown>>
  project_versions?: Array<Record<string, unknown>>
  spaces?: Array<Record<string, unknown>>
  live_sessions?: Array<Record<string, unknown>>
  live_events?: Array<Record<string, unknown>>
  conversations?: Array<Record<string, unknown>>
  chat_messages?: Array<Record<string, unknown>>
  solar_events?: Array<Record<string, unknown>>
  notifications?: Array<Record<string, unknown>>
  follows?: Array<Record<string, unknown>>
}

export interface SiteInfo {
  site_name: string
  tagline: string
  announcement: string
  signup_open: boolean
  ai_enabled: boolean
}

export class ApiError extends Error {
  status: number
  code?: string
  detail?: string
  retryAfter?: number

  constructor(message: string, status: number, code?: string, detail?: string, retryAfter?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.detail = detail
    this.retryAfter = retryAfter
  }
}

const call = async <T>(path: string, opts: RequestInit = {}): Promise<T> => {
  const r = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) {
    const errorBody = body as { error?: string; code?: string; detail?: string; retryAfter?: number }
    const retryAfterHeader = Number(r.headers.get('Retry-After') || 0) || undefined
    throw new ApiError(
      errorBody.error || 'HTTP ' + r.status,
      r.status,
      errorBody.code,
      errorBody.detail,
      errorBody.retryAfter || retryAfterHeader,
    )
  }
  return body as T
}

function postQuery(filters: PostFilters = {}) {
  const params = new URLSearchParams()
  if (filters.limit !== undefined) params.set('limit', String(filters.limit))
  if (filters.cursor) params.set('cursor', String(filters.cursor))
  if (filters.category && filters.category !== 'all') params.set('category', filters.category)
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.saved) params.set('saved', 'true')
  if (filters.space_id) params.set('space_id', filters.space_id)
  const query = params.toString()
  return query ? '/api/posts?' + query : '/api/posts'
}

export const api = {
  site: () => call<SiteInfo>('/api/site'),

  signup: (data: { name: string; handle: string; email: string; password: string; account_kind?: AccountKind }) =>
    call<{ ok: boolean; user: User }>('/api/signup', { method: 'POST', body: JSON.stringify(data) }),

  setAccountKind: (account_kind: Exclude<AccountKind, ''>) =>
    call<{ ok: boolean; user: User }>('/api/account/kind', { method: 'POST', body: JSON.stringify({ account_kind }) }),

  subscribeAdultPlan: (method: 'wechat' | 'alipay') =>
    call<{ ok: boolean; user: User }>('/api/account/adult-plan', { method: 'POST', body: JSON.stringify({ method }) }),

  login: (data: { email: string; password: string }) =>
    call<{ ok: boolean; user: User }>('/api/login', { method: 'POST', body: JSON.stringify(data) }),

  logout: () => call<{ ok: boolean }>('/api/logout', { method: 'POST' }),

  session: () => call<{ user: User | null }>('/api/session'),

  me: () => call<{ user: User }>('/api/me'),

  projects: {
    list: () => call<{ projects: Project[] }>('/api/projects'),
    get: (id: number) => call<{ project: Project }>(`/api/projects/${id}`),
    create: (data: Partial<Project>) =>
      call<{ project: Project }>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Project>) =>
      call<{ project: Project }>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    remove: (id: number) =>
      call<{ ok: boolean }>(`/api/projects/${id}`, { method: 'DELETE' }),
    versions: {
      list: (id: number) => call<{ versions: ProjectVersion[] }>(`/api/projects/${id}/versions`),
      create: (id: number, label: string) => call<{ id: number; ok: boolean }>(`/api/projects/${id}/versions`, { method: 'POST', body: JSON.stringify({ label }) }),
      restore: (id: number, versionId: number) => call<{ project: Project }>(`/api/projects/${id}/versions/${versionId}/restore`, { method: 'POST' }),
    },
    files: {
      list: (id: number) => call<{ files: ProjectFile[] }>(`/api/projects/${id}/files`),
      save: (id: number, files: Record<string, string>, deleted: string[] = []) =>
        call<{ files: ProjectFile[] }>(`/api/projects/${id}/files`, { method: 'PUT', body: JSON.stringify({ files, deleted }) }),
      create: (id: number, path: string, content = '') =>
        call<{ file: ProjectFile }>(`/api/projects/${id}/files`, { method: 'POST', body: JSON.stringify({ path, content }) }),
      rename: (id: number, from: string, to: string) =>
        call<{ ok: boolean; path: string }>(`/api/projects/${id}/files/rename`, { method: 'POST', body: JSON.stringify({ from, to }) }),
      remove: (id: number, path: string) =>
        call<{ ok: boolean }>(`/api/projects/${id}/files?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),
    },
    commits: {
      list: (id: number) => call<{ commits: ProjectCommit[] }>(`/api/projects/${id}/commits`),
      create: (id: number, message: string) =>
        call<{ commit: ProjectCommit }>(`/api/projects/${id}/commits`, { method: 'POST', body: JSON.stringify({ message }) }),
      get: (id: number, commitId: number) =>
        call<{ commit: ProjectCommit }>(`/api/projects/${id}/commits/${commitId}`),
      restore: (id: number, commitId: number) =>
        call<{ files: ProjectFile[]; project: Project }>(`/api/projects/${id}/commits/${commitId}/restore`, { method: 'POST' }),
    },
    comments: {
      list: (id: number) => call<{ comments: ProjectComment[] }>(`/api/projects/${id}/comments`),
      create: (id: number, body: string) => call<{ comment: ProjectComment }>(`/api/projects/${id}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
      remove: (commentId: number) => call<{ ok: boolean }>(`/api/project-comments/${commentId}`, { method: 'DELETE' }),
    },
    collaborators: {
      list: (id: number) => call<{ collaborators: Collaborator[] }>(`/api/projects/${id}/collaborators`),
      invite: (id: number, handle: string, role: Collaborator['role']) => call<{ collaborator: Collaborator }>(`/api/projects/${id}/collaborators`, { method: 'POST', body: JSON.stringify({ handle, role }) }),
      remove: (id: number, userId: number) => call<{ ok: boolean }>(`/api/projects/${id}/collaborators/${userId}`, { method: 'DELETE' }),
    },
    requestCollaboration: (id: number, message?: string) => call<{ ok: boolean; status: string }>(`/api/projects/${id}/collaboration-requests`, { method: 'POST', body: JSON.stringify({ message }) }),
  },

  collaborationRequests: {
    list: () => call<{ requests: Array<Record<string, unknown>> }>('/api/collaboration-requests'),
    respond: (id: number, decision: 'approve' | 'decline') => call<{ ok: boolean; status: string }>(`/api/collaboration-requests/${id}/respond`, { method: 'POST', body: JSON.stringify({ decision }) }),
  },

  follow: (userId: number) => call<{ following: boolean }>(`/api/users/${userId}/follow`, { method: 'POST' }),

  spaces: {
    list: () => call<{ spaces: SpaceSummary[] }>('/api/spaces'),
    create: (name: string) => call<{ space: SpaceSummary }>('/api/spaces', { method: 'POST', body: JSON.stringify({ name }) }),
    remove: (id: string) => call<{ ok: boolean }>(`/api/spaces/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  },

  posts: {
    list: (filters: PostFilters = {}) => call<PostPage>(postQuery(filters)),
    get: (id: number) => call<{ post: Post }>(`/api/posts/${id}`),
    create: (data: Partial<Post> & { body: string }) =>
      call<{ post: Post }>('/api/posts', { method: 'POST', body: JSON.stringify(data) }),
    react: (id: number, emoji: string) =>
      call<{ post: Post }>(`/api/posts/${id}/react`, { method: 'POST', body: JSON.stringify({ emoji }) }),
    remove: (id: number) =>
      call<{ ok: boolean }>('/api/posts/' + id, { method: 'DELETE' }),
    save: (id: number, saved?: boolean) =>
      call<{ saved: boolean }>('/api/posts/' + id + '/save', {
        method: 'POST',
        body: JSON.stringify(saved === undefined ? {} : { saved }),
      }),
    comments: {
      list: (postId: number) =>
        call<{ comments: Comment[] }>('/api/posts/' + postId + '/comments'),
      create: (postId: number, body: string) =>
        call<{ comment: Comment }>('/api/posts/' + postId + '/comments', {
          method: 'POST',
          body: JSON.stringify({ body }),
        }),
      remove: (commentId: number) =>
        call<{ ok: boolean }>('/api/comments/' + commentId, { method: 'DELETE' }),
    },
  },

  exportData: () => call<UserExport>('/api/export'),

  solar: () => call<SolarSummary>('/api/solar'),

  notifications: {
    list: () => call<{ notifications: ApiNotification[]; unread: number }>('/api/notifications'),
    markRead: (ids?: number[]) => call<{ ok: boolean }>('/api/notifications/read', { method: 'POST', body: JSON.stringify(ids ? { ids } : {}) }),
  },

  search: (query: string) => call<SearchResults>('/api/search?q=' + encodeURIComponent(query)),

  explore: () => call<ExploreResults>('/api/explore'),

  live: {
    list: (spaceId?: string) => call<{ sessions: LiveSession[] }>('/api/live' + (spaceId ? '?space_id=' + encodeURIComponent(spaceId) : '')),
    get: (id: number) => call<{ session: LiveSession; project: Project; events: LiveEvent[] }>(`/api/live/${id}`),
    create: (data: { project_id: number; title?: string; audience?: 'public' | 'private'; permissions?: Record<string, boolean> }) =>
      call<{ session: LiveSession }>('/api/live', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { audience?: 'public' | 'private'; permissions?: Record<string, boolean> }) =>
      call<{ session: LiveSession }>(`/api/live/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    event: (id: number, kind: string, payload: Record<string, unknown>) =>
      call<{ event: LiveEvent }>(`/api/live/${id}/events`, { method: 'POST', body: JSON.stringify({ kind, payload }) }),
    end: (id: number) => call<{ ok: boolean; ended_at: string }>(`/api/live/${id}/end`, { method: 'POST' }),
  },

  chat: {
    list: () => call<{ conversations: Conversation[] }>('/api/conversations'),
    create: (data: { kind: Conversation['kind']; title?: string; project_id?: number; member_handles?: string[] }) =>
      call<{ conversation: Conversation }>('/api/conversations', { method: 'POST', body: JSON.stringify(data) }),
    messages: (id: number) => call<{ messages: ChatMessage[] }>(`/api/conversations/${id}/messages`),
    send: (id: number, data: { body?: string; attachment_type?: 'project' | 'post' | 'file'; attachment_id?: number; file?: { name: string; mime: string; size: number; data: string } }) =>
      call<{ message: ChatMessage }>(`/api/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify(data) }),
    read: (id: number) => call<{ ok: boolean }>(`/api/conversations/${id}/read`, { method: 'POST' }),
    pin: (conversationId: number, messageId: number) => call<{ pinned: boolean }>(`/api/conversations/${conversationId}/messages/${messageId}/pin`, { method: 'POST' }),
  },

  helios: {
    chat: (messages: { role: string; content: string }[], project_id?: number, context?: Record<string, unknown>) =>
      call<{ reply: string; model: string }>('/api/helios/chat', {
        method: 'POST',
        body: JSON.stringify({ messages, project_id, context }),
      }),
  },
}
