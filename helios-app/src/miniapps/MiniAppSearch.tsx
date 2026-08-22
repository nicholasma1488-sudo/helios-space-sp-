import type { Ref } from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  inputRef?: Ref<HTMLInputElement>
}

export function MiniAppSearch({ value, onChange, inputRef }: Props) {
  return (
    <label className="mini-app-search">
      <Search size={16} aria-hidden="true" />
      <span className="sr-only">Search mini apps</span>
      <input
        ref={inputRef}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder="Search apps"
        autoComplete="off"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search">
          <X size={14} />
        </button>
      )}
    </label>
  )
}
