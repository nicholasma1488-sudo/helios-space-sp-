import { MiniAppCard } from './MiniAppCard'
import { MiniAppEmpty } from './MiniAppStates'
import type { MiniAppDefinition, MiniAppId } from './types'

interface Props {
  apps: MiniAppDefinition[]
  favorites: MiniAppId[]
  selectedId?: MiniAppId | null
  onOpen: (id: MiniAppId) => void
  onToggleFavorite: (id: MiniAppId) => void
}

export function MiniAppGrid({ apps, favorites, selectedId, onOpen, onToggleFavorite }: Props) {
  if (apps.length === 0) {
    return <MiniAppEmpty title="No app found" detail="Try calculator, notes, timer or whiteboard." />
  }

  return (
    <div className="mini-app-grid" role="list">
      {apps.map((app, index) => (
        <div key={app.id} role="listitem">
          <MiniAppCard
            app={app}
            index={index}
            selected={selectedId === app.id}
            favorite={favorites.includes(app.id)}
            onOpen={() => onOpen(app.id)}
            onToggleFavorite={() => onToggleFavorite(app.id)}
          />
        </div>
      ))}
    </div>
  )
}
