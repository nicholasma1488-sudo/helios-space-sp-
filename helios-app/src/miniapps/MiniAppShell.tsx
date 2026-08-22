import type { ReactNode } from 'react'
import { ArrowLeft, Maximize2, Minimize2, Star } from 'lucide-react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { MiniAppIcon } from './MiniAppIcon'
import type { MiniAppDefinition } from './types'

interface Props {
  app: MiniAppDefinition
  favorite: boolean
  fullscreen: boolean
  onBack: () => void
  onMinimize: () => void
  onToggleFavorite: () => void
  onToggleFullscreen: () => void
  children: ReactNode
}

export function MiniAppShell({
  app,
  favorite,
  fullscreen,
  onBack,
  onMinimize,
  onToggleFavorite,
  onToggleFullscreen,
  children,
}: Props) {
  const workspaceRef = useFocusTrap<HTMLDivElement>(true)

  return (
    <div
      className={'mini-app-workspace' + (fullscreen ? ' is-fullscreen' : '')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mini-app-title"
      ref={workspaceRef}
    >
      <div className="mini-app-workspace-glow" style={{ background: app.accent }} />
      <header>
        <button type="button" onClick={onBack} className="mini-app-back">
          <ArrowLeft size={17} /> All apps
        </button>
        <div className="mini-app-workspace-title">
          <span style={{ background: app.accent + '20', color: app.accent }}>
            <MiniAppIcon name={app.icon} />
          </span>
          <div>
            <small>{app.categoryLabel}</small>
            <h2 id="mini-app-title">{app.name}</h2>
          </div>
        </div>
        <div className="mini-app-shell-actions">
          <button
            type="button"
            className={'mini-app-favorite workspace-star' + (favorite ? ' is-favorite' : '')}
            onClick={onToggleFavorite}
            aria-label={favorite ? 'Unpin app' : 'Pin app'}
            aria-pressed={favorite}
          >
            <Star size={17} fill={favorite ? 'currentColor' : 'none'} />
          </button>
          <button type="button" onClick={onMinimize} aria-label="Minimize app">
            <Minimize2 size={16} />
          </button>
          <button type="button" onClick={onToggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} aria-pressed={fullscreen}>
            <Maximize2 size={16} />
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
