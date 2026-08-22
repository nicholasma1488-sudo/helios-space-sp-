import { MINI_APP_CATEGORIES } from './catalog'
import type { MiniAppCategoryId } from './types'

interface Props {
  value: MiniAppCategoryId | 'all'
  counts: Record<string, number>
  onChange: (value: MiniAppCategoryId | 'all') => void
}

export function MiniAppCategory({ value, counts, onChange }: Props) {
  const items = [{ id: 'all' as const, label: 'All' }, ...MINI_APP_CATEGORIES]
  return (
    <div className="mini-app-categories" role="tablist" aria-label="Mini app categories">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          className={value === item.id ? 'is-on' : ''}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          <small>{counts[item.id] ?? 0}</small>
        </button>
      ))}
    </div>
  )
}
