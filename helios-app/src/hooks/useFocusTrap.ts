import { useEffect, useRef } from 'react'

// Traps keyboard focus inside a dialog while it is open and restores focus to
// the previously focused element on close. Also focuses the first focusable
// child on mount. Accessibility: WCAG 2.1 SC 2.1.2 (No Keyboard Trap escape via
// close) + 2.4.3 (Focus Order).
export function useFocusTrap<T extends HTMLElement>(active = true) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return

    const previouslyFocused = document.activeElement as HTMLElement | null

    const selector = [
      'a[href]', 'button:not([disabled])', 'textarea:not([disabled])',
      'input:not([disabled])', 'select:not([disabled])', '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    function focusables(): HTMLElement[] {
      if (!node) return []
      return Array.from(node.querySelectorAll<HTMLElement>(selector))
        .filter(el => el.offsetParent !== null || el === document.activeElement)
    }

    // Focus the first focusable element on mount (defer for render/animation).
    const t = setTimeout(() => {
      const items = focusables()
      if (items.length && !node.contains(document.activeElement)) items[0].focus()
    }, 40)

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const activeEl = document.activeElement as HTMLElement
      if (e.shiftKey) {
        if (activeEl === first || !node?.contains(activeEl)) { e.preventDefault(); last.focus() }
      } else {
        if (activeEl === last) { e.preventDefault(); first.focus() }
      }
    }

    node.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      node.removeEventListener('keydown', onKey)
      // Restore focus to the trigger element for a smooth keyboard experience.
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [active])

  return ref
}
