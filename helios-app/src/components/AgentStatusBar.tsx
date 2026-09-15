import { useEffect, useState } from 'react'
import { AlertTriangle, Bot, Check } from 'lucide-react'
import { AGENT_STATUS_EVENT, type AgentStatus } from '../product/flow'
import './AgentStatusBar.css'

/**
 * Floating "Helios is doing X" pill over the main content. It mirrors the
 * agent step list in the side panel so the user can follow the agent while
 * it switches pages, opens Mini Apps and posts — even when the panel is narrow.
 */
export function AgentStatusBar() {
  const [status, setStatus] = useState<AgentStatus | null>(null)

  useEffect(() => {
    let hide = 0
    const onStatus = (event: Event) => {
      const next = (event as CustomEvent<AgentStatus>).detail
      window.clearTimeout(hide)
      if (!next || next.phase === 'idle') { setStatus(null); return }
      setStatus(next)
      if (next.phase === 'done' || next.phase === 'failed') hide = window.setTimeout(() => setStatus(null), 4500)
    }
    window.addEventListener(AGENT_STATUS_EVENT, onStatus)
    return () => { window.removeEventListener(AGENT_STATUS_EVENT, onStatus); window.clearTimeout(hide) }
  }, [])

  if (!status) return null
  const busy = status.phase === 'planning' || status.phase === 'running'
  return (
    <div className={`agent-status agent-status-${status.phase}`} role="status" aria-live="polite">
      <span className="agent-status-icon" aria-hidden="true">
        {status.phase === 'done' ? <Check size={13} /> : status.phase === 'failed' ? <AlertTriangle size={13} /> : <Bot size={13} />}
      </span>
      <span className="agent-status-text">
        <strong>
          Helios agent
          {busy && status.total ? ` · step ${Math.min(status.step || 1, status.total)}/${status.total}` : ''}
        </strong>
        <span>{status.title}{status.detail ? ` — ${status.detail}` : ''}</span>
      </span>
      {busy && <span className="agent-status-dots" aria-hidden="true"><i /><i /><i /></span>}
    </div>
  )
}
