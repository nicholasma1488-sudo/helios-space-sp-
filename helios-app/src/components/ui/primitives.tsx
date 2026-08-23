import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

export function SpaceBackground({ className = '' }: { className?: string }) {
  return (
    <div className={'space-bg ' + className} aria-hidden="true">
      <i className="a" />
      <i className="b" />
      <i className="c" />
    </div>
  )
}

export function GlassPanel({
  children,
  className = '',
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={'os-panel ' + className} style={style}>
      {children}
    </div>
  )
}

export function AnimatedButton({
  children,
  primary = false,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return (
    <button
      type="button"
      className={'os-btn' + (primary ? ' is-primary' : '') + (className ? ' ' + className : '')}
      {...props}
    >
      {children}
    </button>
  )
}

export function UserAvatar({
  name,
  size = 36,
}: {
  name: string
  size?: number
}) {
  const initial = (name || '?').slice(0, 1).toUpperCase()
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'grid',
        placeItems: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: Math.round(size * 0.32),
        border: '1px solid rgba(160,190,255,.18)',
        background: 'linear-gradient(145deg, rgba(109,124,255,.45), #1a2140)',
        color: '#f4f6fb',
        fontSize: Math.max(11, Math.round(size * 0.36)),
        fontWeight: 700,
      }}
    >
      {initial}
    </span>
  )
}

export function XPBar({
  total,
  identity,
  nextThreshold,
  previousThreshold = 0,
}: {
  total: number
  identity: string
  nextThreshold: number | null
  previousThreshold?: number
}) {
  const span = nextThreshold ? Math.max(1, nextThreshold - previousThreshold) : 1
  const progress = nextThreshold ? Math.max(0, Math.min(100, ((total - previousThreshold) / span) * 100)) : 100
  return (
    <div aria-label={`${identity} · ${total} XP`} style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12 }}>
        <strong>{identity}</strong>
        <span style={{ color: 'var(--helios-muted)' }}>{total} XP</span>
      </div>
      <div
        style={{
          height: 6,
          overflow: 'hidden',
          borderRadius: 99,
          background: 'rgba(255,255,255,.06)',
        }}
      >
        <i
          style={{
            display: 'block',
            width: progress + '%',
            height: '100%',
            borderRadius: 99,
            background: 'linear-gradient(90deg, #6d7cff, #5ee7ff)',
          }}
        />
      </div>
      <small style={{ color: 'var(--helios-muted)', fontSize: 12 }}>
        {nextThreshold ? `${nextThreshold - total} XP to the next identity` : 'Highest identity reached'}
      </small>
    </div>
  )
}

export function StatusState({
  kind,
  title,
  detail,
  action,
}: {
  kind: 'loading' | 'empty' | 'error'
  title: string
  detail?: string
  action?: ReactNode
}) {
  if (kind === 'loading') {
    return (
      <div className="os-status" role="status" aria-label={title}>
        <div className="os-skeleton" style={{ width: '100%', height: 180 }} />
        <span>{title}</span>
      </div>
    )
  }
  return (
    <div className={kind === 'error' ? 'os-error' : 'os-empty'} role={kind === 'error' ? 'alert' : 'status'}>
      <strong>{title}</strong>
      {detail && <span>{detail}</span>}
      {action}
    </div>
  )
}

export function previousSolarThreshold(identity: string) {
  if (identity === 'Helios') return 2400
  if (identity === 'Stellar') return 1200
  if (identity === 'Nova') return 600
  if (identity === 'Radiant') return 280
  if (identity === 'Orbit') return 100
  return 0
}
