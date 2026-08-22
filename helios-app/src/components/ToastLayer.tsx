import { useEffect } from 'react'
import { useApp } from '../store/appStore'
import { CheckCircle, Info, AlertTriangle, X } from 'lucide-react'

const TONE_STYLES = {
  success: { bg: 'var(--helios-success)', icon: <CheckCircle size={14} /> },
  info: { bg: 'var(--helios-accent2)', icon: <Info size={14} /> },
  warning: { bg: 'var(--helios-solar)', icon: <AlertTriangle size={14} /> },
}

export function ToastLayer() {
  const { state, dispatch } = useApp()

  useEffect(() => {
    if (state.toasts.length === 0) return
    const id = state.toasts[state.toasts.length - 1].id
    const timer = setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id }), 4000)
    return () => clearTimeout(timer)
  }, [state.toasts, dispatch])

  if (state.toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-6 right-6 flex flex-col gap-2 z-50"
      role="status"
      aria-live="polite"
      aria-label="Notifications"
    >
      {state.toasts.map((t, index) => {
        const style = TONE_STYLES[t.tone]
        return (
          <div
            key={`${t.id}-${index}`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg"
            style={{ background: 'var(--helios-surface)', border: `1px solid ${style.bg}`, minWidth: 280, maxWidth: 400 }}
          >
            <span style={{ color: style.bg, flexShrink: 0 }}>{style.icon}</span>
            <span style={{ fontSize: 13, flex: 1, lineHeight: 1.4 }}>{t.message}</span>
            <button
              onClick={() => dispatch({ type: 'DISMISS_TOAST', id: t.id })}
              style={{ background: 'none', border: 'none', color: 'var(--helios-muted)', cursor: 'pointer', flexShrink: 0, padding: 0 }}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
