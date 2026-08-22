import { useEffect, useRef, useState } from 'react'
import type { MiniAppId } from './types'

const PREFIX = 'helios-mini-v2-'
const LEGACY_PREFIX = 'helios-mini-v1-'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

export function miniAppStorageKey(accountId: number, name: string) {
  return PREFIX + accountId + '-' + name
}

export function loadMiniAppState<T>(accountId: number, name: string, fallback: T): T {
  const current = readJson<T | null>(miniAppStorageKey(accountId, name), null)
  if (current !== null) return current
  return readJson<T>(LEGACY_PREFIX + accountId + '-' + name, fallback)
}

export function saveMiniAppState<T>(accountId: number, name: string, value: T) {
  try {
    localStorage.setItem(miniAppStorageKey(accountId, name), JSON.stringify(value))
  } catch {
    // Storage can be full or blocked; the app still works in-session.
  }
}

export function useAccountState<T>(accountId: number, name: string, initial: T) {
  const initialRef = useRef(initial)
  const [value, setValue] = useState<T>(initial)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(false)
    setValue(loadMiniAppState(accountId, name, initialRef.current))
    setReady(true)
  }, [accountId, name])

  useEffect(() => {
    if (!ready) return
    saveMiniAppState(accountId, name, value)
  }, [accountId, name, ready, value])

  return [value, setValue, ready] as const
}

export function loadFavorites(accountId: number): MiniAppId[] {
  return loadMiniAppState<MiniAppId[]>(accountId, 'favorites', ['pomodoro', 'notes'])
}

export function loadRecent(accountId: number): MiniAppId[] {
  return loadMiniAppState<MiniAppId[]>(accountId, 'recent', [])
}

export function recordRecent(accountId: number, id: MiniAppId) {
  const next = [id, ...loadRecent(accountId).filter(item => item !== id)].slice(0, 8)
  saveMiniAppState(accountId, 'recent', next)
  return next
}

export function toggleFavorite(accountId: number, id: MiniAppId) {
  const current = loadFavorites(accountId)
  const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id]
  saveMiniAppState(accountId, 'favorites', next)
  return next
}

export function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function loadStreak(accountId: number) {
  const data = loadMiniAppState<{ last: string; count: number }>(accountId, 'streak', { last: '', count: 0 })
  const today = localDayKey()
  if (data.last === today) return data.count
  const yesterday = localDayKey(new Date(Date.now() - 86_400_000))
  if (data.last === yesterday) {
    const next = { last: today, count: data.count + 1 }
    saveMiniAppState(accountId, 'streak', next)
    return next.count
  }
  const next = { last: today, count: 1 }
  saveMiniAppState(accountId, 'streak', next)
  return next.count
}
