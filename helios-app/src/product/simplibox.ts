export const SIMPLIBOX_PROVIDERS = ['hotmail', 'outlook'] as const
export type SimpliBoxProvider = (typeof SIMPLIBOX_PROVIDERS)[number]

export const SIMPLIBOX_SUPPORT_EMAIL = 'support@helioschat.space'
export const SIMPLIBOX_RECOVERY_EMAIL = 'support@helioschat.space'

const RESERVED = new Set([
  'admin', 'administrator', 'support', 'help', 'postmaster', 'abuse',
  'root', 'microsoft', 'outlook', 'hotmail', 'live', 'simplibox', 'helios',
])

export function providerDomain(provider: SimpliBoxProvider) {
  return provider === 'hotmail' ? 'hotmail.com' : 'outlook.com'
}

export function normalizeLocalPart(value: string) {
  return value.trim().toLowerCase().replace(/^@/, '')
}

export function validateLocalPart(value: string): { error: string; localPart?: undefined } | { error?: undefined; localPart: string } {
  const localPart = normalizeLocalPart(value)
  if (localPart.length < 3 || localPart.length > 32)
    return { error: 'Use 3–32 characters, starting with a letter.' }
  if (!/^[a-z][a-z0-9._-]*$/.test(localPart))
    return { error: 'Start with a letter. Use letters, numbers, dots, _ or -.' }
  if (localPart.includes('..') || localPart.endsWith('.') || localPart.endsWith('-') || localPart.endsWith('_'))
    return { error: 'Do not end with a dot, underscore, or hyphen.' }
  if (RESERVED.has(localPart))
    return { error: 'That name is reserved. Try another design.' }
  return { localPart }
}

export function formatAddress(localPart: string, provider: SimpliBoxProvider) {
  return `${normalizeLocalPart(localPart)}@${providerDomain(provider)}`
}

export function suggestLocalParts(localPart: string) {
  const base = normalizeLocalPart(localPart).replace(/[^a-z0-9]/g, '') || 'mail'
  const year = new Date().getUTCFullYear()
  const unique = new Set<string>()
  for (const candidate of [
    `${base}2017`,
    `${base}${year}`,
    `${base}${String(year).slice(2)}`,
    `${base}123`,
    `${base}88`,
    `${base}.mail`,
  ]) {
    if (candidate !== localPart && !validateLocalPart(candidate).error) unique.add(candidate)
  }
  return [...unique].slice(0, 5)
}

export function passwordIssues(password: string, confirm: string) {
  if (password.length < 8) return 'Use at least 8 characters.'
  if (password.length > 128) return 'Keep the password under 128 characters.'
  if (password !== confirm) return 'The two passwords do not match yet.'
  return ''
}
