import { useEffect } from 'react'
import { useApp } from '../store/appStore'
import { X, Command } from 'lucide-react'
import { useFocusTrap } from '../hooks/useFocusTrap'

const SHORTCUTS: { keys: string; label: string; group: string }[] = [
  { keys: 'Ctrl/⌘ K', label: 'Open command palette', group: 'Global' },
  { keys: 'Ctrl/⌘ J', label: 'Ask Helios', group: 'Global' },
  { keys: '?', label: 'Show this help', group: 'Global' },
  { keys: 'Esc', label: 'Close panel or overlay', group: 'Global' },
  { keys: '↑ / ↓', label: 'Navigate command list', group: 'Command palette' },
  { keys: '⏎', label: 'Run selected command', group: 'Command palette' },
]

export function ShortcutsHelp() {
  const { state, dispatch } = useApp()
  const trapRef = useFocusTrap<HTMLDivElement>(state.shortcutsOpen)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      const typing = tag === 'INPUT' || tag === 'TEXTAREA'
      if (e.key === '?' && !typing) {
        e.preventDefault()
        dispatch({ type: 'TOGGLE_SHORTCUTS' })
      }
      if (e.key === 'Escape' && state.shortcutsOpen) {
        dispatch({ type: 'SET_SHORTCUTS', open: false })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, state.shortcutsOpen])

  if (!state.shortcutsOpen) return null

  const groups = [...new Set(SHORTCUTS.map(s => s.group))]

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={() => dispatch({ type: 'SET_SHORTCUTS', open: false })}
    >
      <div
        ref={trapRef}
        className="flex flex-col w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxWidth: 480, maxHeight: '80vh', background: 'var(--helios-surface)', border: '1px solid var(--helios-border)' }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--helios-border)' }}>
          <Command size={16} style={{ color: 'var(--helios-accent)' }} />
          <h2 id="shortcuts-title" style={{ fontSize: 15, fontWeight: 700, flex: 1, margin: 0 }}>Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_SHORTCUTS', open: false })}
            style={{ background: 'none', border: 'none', color: 'var(--helios-muted)', cursor: 'pointer', padding: 4 }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {groups.map(group => (
            <div key={group}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--helios-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                {group}
              </div>
              <div className="flex flex-col gap-1">
                {SHORTCUTS.filter(s => s.group === group).map(s => (
                  <div key={s.label} className="flex items-center justify-between py-1.5">
                    <span style={{ fontSize: 13 }}>{s.label}</span>
                    <kbd style={{ fontSize: 11, color: 'var(--helios-text)', background: 'var(--helios-surface2)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--helios-border)', fontFamily: 'ui-monospace, monospace' }}>
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
