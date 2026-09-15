import { useEffect, useState } from 'react'

const KEY = 'helios-chrome-fullscreen'
const EVENT = 'helios-chrome-fullscreen-changed'

function read(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

function apply(on: boolean) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('helios-is-fullscreen', on)
}

export function getChromeFullscreen() {
  return read()
}

export function setChromeFullscreen(on: boolean) {
  try { localStorage.setItem(KEY, on ? '1' : '0') } catch { /* ignore */ }
  apply(on)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: { on } }))
}

export function useChromeFullscreen() {
  const [on, setOn] = useState(read)
  useEffect(() => {
    apply(on)
    const sync = () => setOn(read())
    window.addEventListener(EVENT, sync)
    window.addEventListener('helios-session-cleared', sync)
    return () => {
      window.removeEventListener(EVENT, sync)
      window.removeEventListener('helios-session-cleared', sync)
    }
  }, [on])
  return [on, setChromeFullscreen] as const
}
