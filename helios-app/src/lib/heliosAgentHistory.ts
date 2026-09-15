import { useSyncExternalStore } from 'react'
import type { AgentStep } from '../api'

const KEY = 'helios-agent-history-v1'
const EVENT = 'helios-agent-history-changed'
const MAX_CHATS = 40
const MAX_MESSAGES = 80
const MAX_CONTENT = 4000

export interface StoredAgentStep {
  step: AgentStep
  status: 'pending' | 'running' | 'done' | 'failed' | 'undone'
  detail?: string
}

export interface StoredAgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: string
  proposal?: { label: string; cost: 'low' | 'medium' | 'high'; safety: 'safe' | 'review'; targetProjectId: number; plan: string }
  applied?: boolean
  steps?: StoredAgentStep[]
  finished?: boolean
  meta?: { model: string; source: 'user' | 'site'; planner?: string }
}

export interface AgentChat {
  id: string
  title: string
  mode: 'agent' | 'chat'
  updatedAt: string
  messages: StoredAgentMessage[]
}

interface Store {
  activeId: string | null
  chats: AgentChat[]
}

const EMPTY: Store = { activeId: null, chats: [] }

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function load(): Store {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY, chats: [] }
    const parsed = JSON.parse(raw) as Partial<Store>
    const chats = Array.isArray(parsed.chats) ? parsed.chats.filter(isChat).slice(0, MAX_CHATS) : []
    const activeId = typeof parsed.activeId === 'string' && chats.some(chat => chat.id === parsed.activeId)
      ? parsed.activeId
      : chats[0]?.id ?? null
    return { activeId, chats }
  } catch {
    return { ...EMPTY, chats: [] }
  }
}

function isChat(value: unknown): value is AgentChat {
  if (!value || typeof value !== 'object') return false
  const chat = value as AgentChat
  return typeof chat.id === 'string' && typeof chat.title === 'string' && Array.isArray(chat.messages)
}

let current = load()
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(listener => listener())
}

function persist(next: Store) {
  current = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* quota / private mode */ }
  notify()
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
}

function reloadFromStorage() {
  current = load()
  notify()
}

if (typeof window !== 'undefined') {
  window.addEventListener('helios-session-cleared', reloadFromStorage)
}

export function serializeAgentMessages(messages: Array<StoredAgentMessage & { steps?: Array<StoredAgentStep & { undo?: unknown }> }>): StoredAgentMessage[] {
  return messages
    .filter(item => item.id !== 'welcome')
    .slice(-MAX_MESSAGES)
    .map(item => ({
      id: String(item.id),
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.content || '').slice(0, MAX_CONTENT),
      ts: item.ts || new Date().toISOString(),
      proposal: item.proposal,
      applied: item.applied,
      finished: item.finished,
      meta: item.meta,
      steps: item.steps?.map(step => ({
        step: step.step,
        status: step.status,
        detail: step.detail,
      })),
    }))
}

export function titleFromMessages(messages: StoredAgentMessage[]) {
  const first = messages.find(item => item.role === 'user' && item.content.trim())
  const text = (first?.content || messages.find(item => item.content.trim())?.content || '').replace(/\s+/g, ' ').trim()
  if (!text) return 'New chat'
  return text.length > 42 ? `${text.slice(0, 41)}…` : text
}

export function getAgentHistory() {
  return current
}

export function getActiveAgentChat() {
  return current.chats.find(chat => chat.id === current.activeId) ?? null
}

export function saveAgentChat(id: string | null, patch: { mode: 'agent' | 'chat'; messages: StoredAgentMessage[] }) {
  const messages = serializeAgentMessages(patch.messages)
  if (!messages.length) return id
  const now = new Date().toISOString()
  const existing = id ? current.chats.find(chat => chat.id === id) : null
  const chat: AgentChat = {
    id: existing?.id || newId(),
    title: titleFromMessages(messages),
    mode: patch.mode,
    updatedAt: now,
    messages,
  }
  const chats = [chat, ...current.chats.filter(item => item.id !== chat.id)].slice(0, MAX_CHATS)
  persist({ activeId: chat.id, chats })
  return chat.id
}

export function openAgentChat(id: string) {
  if (!current.chats.some(chat => chat.id === id)) return
  persist({ ...current, activeId: id })
}

export function closeActiveAgentChat() {
  persist({ ...current, activeId: null })
}

export function deleteAgentChat(id: string) {
  const chats = current.chats.filter(chat => chat.id !== id)
  persist({
    activeId: current.activeId === id ? chats[0]?.id ?? null : current.activeId,
    chats,
  })
}

export function clearAgentHistory() {
  persist({ activeId: null, chats: [] })
}

function oneLine(value: string, max: number) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function chatOutcome(chat: AgentChat) {
  const lastUser = [...chat.messages].reverse().find(item => item.role === 'user' && item.content.trim())
  const lastAssistant = [...chat.messages].reverse().find(item => item.role === 'assistant')
  const done = lastAssistant?.steps
    ?.filter(item => item.status === 'done' || item.status === 'failed')
    .map(item => item.detail || item.step.tool)
    .filter(Boolean)
    .slice(0, 3) ?? []
  const parts = [`${chat.mode}: ${oneLine(chat.title, 72)}`]
  if (lastUser) parts.push(`last ask: ${oneLine(lastUser.content, 140)}`)
  if (done.length) parts.push(`done: ${oneLine(done.join('; '), 180)}`)
  else if (lastAssistant?.content) parts.push(`last reply: ${oneLine(lastAssistant.content, 140)}`)
  return `- ${parts.join(' · ')}`
}

/** Compact recap of earlier local chats so Helios can continue that work. */
export function priorWorkContext(excludeId?: string | null, maxChars = 1800) {
  const chats = current.chats.filter(chat => chat.id !== excludeId && chat.messages.some(item => item.id !== 'welcome'))
  if (!chats.length) return null
  const lines = [
    'Earlier Helios chats on this device. If the user says continue, keep going, finish that, or refers to prior work, resume the matching chat instead of starting over.',
    ...chats.slice(0, 8).map(chatOutcome),
  ]
  const text = lines.join('\n').trim()
  return text ? text.slice(0, maxChars) : null
}

export function useHeliosAgentHistory() {
  return useSyncExternalStore(
    listener => {
      listeners.add(listener)
      const onEvent = () => listener()
      window.addEventListener(EVENT, onEvent)
      window.addEventListener('helios-session-cleared', onEvent)
      return () => {
        listeners.delete(listener)
        window.removeEventListener(EVENT, onEvent)
        window.removeEventListener('helios-session-cleared', onEvent)
      }
    },
    getAgentHistory,
    () => EMPTY,
  )
}
