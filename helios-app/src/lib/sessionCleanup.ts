const SESSION_KEYS = [
  'helios-memory-v1',
  'helios-agent-history-v1',
  'helios-model-tab',
  'helios-pending-prompt',
  'helios-workspace-context',
  'helios-open-conversation',
  'helios-open-post',
  'helios-invite-handle',
  'helios-invite-name',
  'helios-chrome-fullscreen',
]

/** Wipe session-scoped client data after sign-out. Device a11y prefs stay. */
export function clearSessionClientState() {
  try {
    for (const key of SESSION_KEYS) localStorage.removeItem(key)
  } catch { /* ignore quota / private mode */ }
  try {
    sessionStorage.clear()
  } catch { /* ignore */ }
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('helios-is-fullscreen')
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('helios-session-cleared'))
  }
}
