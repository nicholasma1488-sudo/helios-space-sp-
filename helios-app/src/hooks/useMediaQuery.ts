import { useEffect, useState } from 'react'

// Small, dependency-free responsive hook.
// Returns true when the given media query currently matches, and updates on change.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}

// Helios breakpoints (handbook ch.12 responsive tiers).
// Mobile: single-column, bottom destination bar.
// Tablet: collapsible navigation.
export const useIsMobile = () => useMediaQuery('(max-width: 720px)')
export const useIsTablet = () => useMediaQuery('(min-width: 721px) and (max-width: 1024px)')
