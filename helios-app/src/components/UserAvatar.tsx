import { useMemo } from 'react'

const PALETTE = ['#6d51cd', '#3d8b6e', '#c96442', '#5b8def', '#b44d8a', '#2f6f8f', '#8a6b2f', '#5c4b8a']

function initialsOf(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return parts.slice(0, 2).map(part => part[0]).join('').toUpperCase()
}

function colorOf(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

export function UserAvatar({
  name,
  src,
  size = 32,
  className = '',
}: {
  name: string
  src?: string | null
  size?: number
  className?: string
}) {
  const initials = useMemo(() => initialsOf(name || '?'), [name])
  const color = useMemo(() => colorOf(name || 'helios'), [name])
  return (
    <span
      className={'helios-user-avatar ' + className}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, Math.round(size * 0.36)),
        background: src ? 'var(--helios-surface2)' : color,
      }}
      aria-hidden="true"
    >
      {src ? <img src={src} alt="" /> : initials}
    </span>
  )
}
