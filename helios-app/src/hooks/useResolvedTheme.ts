import { useEffect, useState } from 'react'

export type ResolvedTheme = 'light' | 'dark'

function readTheme(): ResolvedTheme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

/**
 * The theme actually painted on <html data-theme>, including "system" resolved
 * to light or dark. Components that embed third-party widgets with their own
 * theme option (Monaco, charts) use this to stay in step with the app.
 */
export function useResolvedTheme(): ResolvedTheme {
  const [theme, setTheme] = useState<ResolvedTheme>(readTheme)

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return
    const observer = new MutationObserver(() => setTheme(readTheme()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    setTheme(readTheme())
    return () => observer.disconnect()
  }, [])

  return theme
}

export const monacoThemeFor = (theme: ResolvedTheme) => (theme === 'dark' ? 'vs-dark' : 'vs')
