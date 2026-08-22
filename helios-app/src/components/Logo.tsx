export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { icon: 26, text: 14, star: 6 },
    md: { icon: 34, text: 18, star: 8 },
    lg: { icon: 44, text: 24, star: 10 },
  }
  const s = sizes[size]
  return (
    <div className="flex items-center gap-2.5" aria-label="Helios Space">
      {/* Icon */}
      <div
        className="flex items-center justify-center rounded-xl flex-shrink-0"
        style={{
          width: s.icon, height: s.icon,
          background: 'linear-gradient(135deg, #7c6af7, #4fc3f7)',
          fontSize: s.icon * 0.54, color: '#fff', fontWeight: 700,
        }}
        aria-hidden="true"
      >
        ✦
      </div>

      {/* Wordmark */}
      <div className="flex items-baseline leading-none" style={{ userSelect: 'none' }}>
        {/* helios — normal weight */}
        <span style={{ fontSize: s.text, fontWeight: 400, color: 'var(--helios-text)', letterSpacing: '-0.02em' }}>
          helios
        </span>

        {/* space — bold, gradient, with small star top-right */}
        <span style={{ position: 'relative', display: 'inline-block' }}>
          <span
            style={{
              fontSize: s.text, fontWeight: 800, letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, #7c6af7, #4fc3f7)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            space
          </span>
          {/* small rounded corner star, top-right of "space" */}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', top: -s.star * 0.9, right: -s.star * 0.2,
              fontSize: s.star, lineHeight: 1,
              background: 'linear-gradient(90deg, #7c6af7, #4fc3f7)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: 800,
            }}
          >
            ✦
          </span>
        </span>
      </div>
    </div>
  )
}
