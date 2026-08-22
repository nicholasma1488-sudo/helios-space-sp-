import type { Dispatch } from 'react'
import { api, type Conversation, type LiveSession, type Project } from '../api'
import type { AppState } from '../store/appStore'

type AppAction =
  | { type: 'SET_VIEW'; view: AppState['view'] }
  | { type: 'SET_ACTIVE_SUBJECT'; subjectId: string }
  | { type: 'OPEN_CODE_EDITOR'; projectId: number }
  | { type: 'OPEN_LIVE_SESSION'; sessionId: number }
  | { type: 'OPEN_SPACE'; spaceId: string; tab?: AppState['activeSpaceTab'] }
  | { type: 'OPEN_HELIOS_PANEL' }
  | { type: 'ADD_PROJECT'; project: Project }
  | { type: 'PUSH_TOAST'; toast: { id: string; message: string; tone: 'success' | 'info' | 'warning' } }

export async function resolveProject(projectId: number, known: Project[], dispatch: Dispatch<AppAction>) {
  const existing = known.find(item => item.id === projectId)
  if (existing) return existing
  const result = await api.projects.get(projectId)
  dispatch({ type: 'ADD_PROJECT', project: result.project })
  return result.project
}

export async function openProjectWorkspace(projectId: number, known: Project[], dispatch: Dispatch<AppAction>) {
  const project = await resolveProject(projectId, known, dispatch)
  dispatch({ type: 'SET_ACTIVE_SUBJECT', subjectId: project.space_id })
  dispatch({ type: 'OPEN_CODE_EDITOR', projectId: project.id })
  return project
}

export async function openOrCreateProjectChat(project: Project, dispatch: Dispatch<AppAction>) {
  const result = await api.chat.list()
  const existing = result.conversations.find(item => item.kind === 'project' && item.project_id === project.id)
  const conversation = existing ?? (await api.chat.create({ kind: 'project', project_id: project.id })).conversation
  sessionStorage.setItem('helios-open-conversation', String(conversation.id))
  dispatch({ type: 'SET_VIEW', view: 'chat' })
  return conversation
}

export function openConversation(conversation: Pick<Conversation, 'id'>, dispatch: Dispatch<AppAction>) {
  sessionStorage.setItem('helios-open-conversation', String(conversation.id))
  dispatch({ type: 'SET_VIEW', view: 'chat' })
}

export function openLiveSession(sessionId: number, dispatch: Dispatch<AppAction>) {
  dispatch({ type: 'OPEN_LIVE_SESSION', sessionId })
}

export function openCreatorProfile(author: { id: number; name: string; handle: string }, dispatch: Dispatch<AppAction>) {
  sessionStorage.setItem('helios-open-creator', JSON.stringify(author))
  dispatch({ type: 'SET_VIEW', view: 'profile' })
}

export function openLifestylePost(postId: number, dispatch: Dispatch<AppAction>) {
  sessionStorage.setItem('helios-open-post', String(postId))
  dispatch({ type: 'SET_VIEW', view: 'lifestyle' })
}

export async function publishLiveReplay(session: LiveSession, project: Project, dispatch: Dispatch<AppAction>) {
  const result = await api.posts.create({
    body: `${session.owner_name} finished a Live session on ${project.name}. The Project, comments and suggestions remain connected.`,
    category: 'code',
    audience: 'public',
    project_id: project.id,
    space_id: session.space_id,
    post_type: 'live-replay',
  })
  sessionStorage.setItem('helios-open-post', String(result.post.id))
  dispatch({
    type: 'PUSH_TOAST',
    toast: { id: String(Date.now()), message: 'Live session kept as Feed-discoverable work', tone: 'success' },
  })
  return result.post
}

export function askHeliosWithContext(context: Record<string, unknown>, prompt: string, dispatch: Dispatch<AppAction>) {
  sessionStorage.setItem('helios-workspace-context', JSON.stringify(context))
  sessionStorage.setItem('helios-pending-prompt', prompt)
  dispatch({ type: 'OPEN_HELIOS_PANEL' })
}

export function categoryForSpace(spaceId: string) {
  if (['coding', 'ai', 'engineering', 'robotics', 'gaming'].includes(spaceId)) return 'code'
  if (['running', 'basketball', 'music', 'photography', 'cooking', 'travel'].includes(spaceId)) return 'activity'
  if (['reading', 'english', 'languages', 'history'].includes(spaceId)) return 'reading'
  return 'study'
}
