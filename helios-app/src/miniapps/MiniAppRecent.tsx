import { Clock3 } from 'lucide-react'
import { MiniAppIcon } from './MiniAppIcon'
import { getUtilityMiniApp } from './catalog'
import type { MiniAppId } from './types'

interface Props {
  ids: MiniAppId[]
  onOpen: (id: MiniAppId) => void
}

export function MiniAppRecent({ ids, onOpen }: Props) {
  const apps = ids.map(getUtilityMiniApp).filter((app): app is NonNullable<typeof app> => Boolean(app))
  if (apps.length === 0) return null
  return (
    <section className="mini-app-section" aria-labelledby="recent-apps-title">
      <div className="mini-app-section-title">
        <h2 id="recent-apps-title"><Clock3 size={14} /> Recently used</h2>
        <span>Stored only for this account</span>
      </div>
      <div className="mini-app-recent-row">
        {apps.map(app => (
          <button key={app.id} type="button" onClick={() => onOpen(app.id)} className="mini-app-recent">
            <span style={{ background: app.accent + '22', color: app.accent }}><MiniAppIcon name={app.icon} /></span>
            <span>{app.name}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
