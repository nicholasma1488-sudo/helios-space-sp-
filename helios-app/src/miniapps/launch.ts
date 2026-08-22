import type { MiniAppId } from './types'

const OPEN_KEY = 'helios-open-miniapp'

export function requestOpenMiniApp(id: MiniAppId) {
  sessionStorage.setItem(OPEN_KEY, id)
}

export function consumeOpenMiniApp(): MiniAppId | null {
  const id = sessionStorage.getItem(OPEN_KEY)
  if (!id) return null
  sessionStorage.removeItem(OPEN_KEY)
  return id as MiniAppId
}
