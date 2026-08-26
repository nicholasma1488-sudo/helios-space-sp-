export function isPayPath(path = window.location.pathname) {
  return path === '/pay' || path === '/pay/'
}

export function goToPay() {
  if (isPayPath()) return
  window.history.pushState({ helios: 'pay' }, '', '/pay')
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function leavePay(path = '/') {
  const next = path.startsWith('/') ? path : `/${path}`
  if (window.location.pathname === next && !window.location.search) return
  window.history.pushState({ helios: 'app' }, '', next)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

export function payQuery() {
  return new URLSearchParams(window.location.search)
}
