import { useSyncExternalStore } from 'react'

const KEY = 'helios-memory-v1'
const EVENT = 'helios-memory-changed'
const MAX_NOTES = 8
const MAX_NOTE = 280
const MAX_SUMMARY = 600

export interface HeliosMemory {
  enabled: boolean
  notes: string[]
  summary: string
  updatedAt: string | null
}

const EMPTY: HeliosMemory = { enabled: true, notes: [], summary: '', updatedAt: null }

function load(): HeliosMemory {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...EMPTY }
    const parsed = JSON.parse(raw) as Partial<HeliosMemory>
    return {
      enabled: parsed.enabled !== false,
      notes: Array.isArray(parsed.notes) ? parsed.notes.map(item => String(item).slice(0, MAX_NOTE)).slice(0, MAX_NOTES) : [],
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, MAX_SUMMARY) : '',
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    }
  } catch {
    return { ...EMPTY }
  }
}

let current = load()
const listeners = new Set<() => void>()

function persist(next: HeliosMemory) {
  current = next
  try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
  listeners.forEach(listener => listener())
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
}

export function getHeliosMemory() {
  return current
}

export function setHeliosMemory(patch: Partial<HeliosMemory>) {
  persist({
    ...current,
    ...patch,
    notes: (patch.notes ?? current.notes).map(item => item.trim().slice(0, MAX_NOTE)).filter(Boolean).slice(0, MAX_NOTES),
    summary: (patch.summary ?? current.summary).slice(0, MAX_SUMMARY),
    updatedAt: new Date().toISOString(),
  })
}

export function clearHeliosMemory() {
  persist({ ...EMPTY, enabled: current.enabled, updatedAt: new Date().toISOString() })
}

export function setMemoryEnabled(enabled: boolean) {
  persist({ ...current, enabled, updatedAt: new Date().toISOString() })
}

/** Fold a finished turn into a short rolling summary. Local only. */
export function rememberTurn(userText: string, assistantText: string) {
  if (!current.enabled) return
  const user = userText.replace(/\s+/g, ' ').trim().slice(0, 160)
  const reply = assistantText.replace(/\s+/g, ' ').trim().slice(0, 200)
  if (!user) return
  const line = `User: ${user} → Helios: ${reply || '(no reply)'}`
  const nextSummary = [current.summary, line].filter(Boolean).join('\n').slice(-MAX_SUMMARY)
  persist({ ...current, summary: nextSummary, updatedAt: new Date().toISOString() })
}

export function memoryContextBlock(): string | null {
  if (!current.enabled) return null
  const notes = current.notes.filter(Boolean)
  if (!notes.length && !current.summary) return null
  const parts = ['[Helios memory — user-controlled, local only]']
  if (notes.length) parts.push('Pinned notes:\n- ' + notes.join('\n- '))
  if (current.summary) parts.push('Recent summary:\n' + current.summary)
  return parts.join('\n\n').slice(0, 1200)
}

export function useHeliosMemory() {
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
    getHeliosMemory,
    () => EMPTY,
  )
}
