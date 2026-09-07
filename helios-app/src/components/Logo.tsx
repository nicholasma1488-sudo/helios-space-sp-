export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { icon: 26, text: 14 },
    md: { icon: 34, text: 18 },
    lg: { icon: 44, text: 24 },
  }
  const s = sizes[size]
  return (
    <div className="flex items-center gap-2.5" aria-label="Helios Space">
      <div
        className="flex items-center justify-center rounded-xl flex-shrink-0"
        style={{
          width: s.icon,
          height: s.icon,
          background:
            'linear-gradient(145deg, rgba(255,255,255,0.72), rgba(120,128,140,0.28))',
          border: '1px solid rgba(255,255,255,0.55)',
          boxShadow: '0 8px 24px rgba(28,25,23,0.10), inset 0 1px 0 rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          fontSize: s.icon * 0.48,
          color: 'var(--codex-gray, #5a6270)',
          fontWeight: 700,
        }}
        aria-hidden="true"
      >
        ✦
      </div>

      <div className="flex items-baseline leading-none" style={{ userSelect: 'none' }}>
        <span style={{
          fontSize: s.text,
          fontWeight: 500,
          color: 'var(--helios-text)',
          letterSpacing: '-0.03em',
        }}>
          helios
        </span>
        <span style={{
          fontSize: s.text,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          marginLeft: 2,
          color: 'var(--codex-gray, #5a6270)',
          opacity: 0.85,
        }}>
          space
        </span>
      </div>
    </div>
  )
}
