import { AlertTriangle, Inbox, LoaderCircle, RefreshCw } from 'lucide-react'

export function MiniAppLoading({ label = 'Opening app' }: { label?: string }) {
  return (
    <div className="mini-state" role="status" aria-live="polite">
      <LoaderCircle size={22} className="mini-spin" aria-hidden="true" />
      <strong>{label}</strong>
      <span>Keeping this inside Helios Space.</span>
    </div>
  )
}

export function MiniAppEmpty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mini-state">
      <Inbox size={22} aria-hidden="true" />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  )
}

export function MiniAppError({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="mini-state is-error" role="alert">
      <AlertTriangle size={22} aria-hidden="true" />
      <strong>This app hit a problem</strong>
      <span>{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry}>
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  )
}
