import { Star } from 'lucide-react'
import { MiniAppIcon } from './MiniAppIcon'
import type { MiniAppDefinition } from './types'

interface Props {
  app: MiniAppDefinition
  favorite: boolean
  index?: number
  selected?: boolean
  onOpen: () => void
  onToggleFavorite: () => void
}

export function MiniAppCard({ app, favorite, index = 0, selected, onOpen, onToggleFavorite }: Props) {
  return (
    <article
      className={'mini-app-card' + (selected ? ' is-selected' : '')}
      style={{ '--app-color': app.accent, '--app-delay': String(index * 40) + 'ms' } as React.CSSProperties}
    >
      <button type="button" className="mini-app-card-main" onClick={onOpen} aria-label={'Open ' + app.name}>
        <span className="mini-app-icon" style={{ background: app.accent + '20', color: app.accent }}>
          <MiniAppIcon name={app.icon} />
        </span>
        <span className="mini-app-eyebrow">{app.categoryLabel}</span>
        <strong>{app.name}</strong>
        <span className="mini-app-description">{app.description}</span>
        <span className="mini-app-open">Open app <span aria-hidden="true">↗</span></span>
      </button>
      <button
        type="button"
        className={'mini-app-favorite' + (favorite ? ' is-favorite' : '')}
        onClick={onToggleFavorite}
        aria-label={(favorite ? 'Unpin ' : 'Pin ') + app.name}
        aria-pressed={favorite}
      >
        <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
      </button>
    </article>
  )
}
