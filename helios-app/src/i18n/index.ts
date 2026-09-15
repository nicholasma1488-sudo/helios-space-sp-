import { useSyncExternalStore } from 'react'
import { MESSAGES } from './messages'

/**
 * Helios UI languages. English is the source language: every user-visible
 * string in the code is written in English and passed through `t()`, and the
 * dictionaries in ./messages map that exact English text to a translation.
 * A missing entry falls back to the English text, so partially translated
 * screens degrade gracefully instead of showing keys.
 */
export type Language = 'en' | 'zh-CN' | 'zh-TW'

export const LANGUAGES: { id: Language; label: string; native: string; locale: string }[] = [
  { id: 'en', label: 'English', native: 'English', locale: 'en-US' },
  { id: 'zh-CN', label: 'Chinese (Simplified)', native: '中文（简体）', locale: 'zh-CN' },
  { id: 'zh-TW', label: 'Chinese (Traditional)', native: '中文（繁體）', locale: 'zh-TW' },
]

export const DEFAULT_LANGUAGE: Language = 'en'
const STORAGE_KEY = 'helios-language'
export const LANGUAGE_EVENT = 'helios-language-changed'

export function normalizeLanguage(value: unknown): Language {
  if (value === 'zh-CN' || value === 'zh-TW' || value === 'en') return value
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (/^zh(-|_)?(hant|tw|hk|mo)/.test(lower)) return 'zh-TW'
    if (/^zh/.test(lower)) return 'zh-CN'
  }
  return DEFAULT_LANGUAGE
}

function loadLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return normalizeLanguage(stored)
  } catch {}
  return DEFAULT_LANGUAGE
}

let current: Language = loadLanguage()
const listeners = new Set<() => void>()

function applyDocumentLanguage(lang: Language) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lang
}
applyDocumentLanguage(current)

export function getLanguage(): Language {
  return current
}

export function setLanguage(next: Language) {
  const lang = normalizeLanguage(next)
  if (lang === current) return
  current = lang
  try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
  applyDocumentLanguage(lang)
  listeners.forEach(listener => listener())
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: { language: lang } }))
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** The active UI language; re-renders the caller when it changes. */
export function useLanguage(): Language {
  return useSyncExternalStore(subscribe, getLanguage, () => DEFAULT_LANGUAGE)
}

/** BCP 47 locale for Intl / toLocale* formatting in the active language. */
export function getLocale(lang: Language = current): string {
  return LANGUAGES.find(item => item.id === lang)?.locale ?? 'en-US'
}

export function useLocale(): string {
  return getLocale(useLanguage())
}

export type TranslationVars = Record<string, string | number | undefined>

function interpolate(text: string, vars?: TranslationVars) {
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (vars[key] === undefined ? match : String(vars[key])))
}

/**
 * Translate an English UI string into the active language.
 * `t('Open {name}', { name })` — placeholders survive translation, so the
 * dictionary entry keeps the same `{name}` token wherever the grammar puts it.
 */
export function t(text: string, vars?: TranslationVars): string {
  const dict = current === 'en' ? null : MESSAGES[current]
  return interpolate(dict?.[text] ?? text, vars)
}

/** `t` bound to the component lifecycle: the component re-renders on language change. */
export function useT() {
  useLanguage()
  return t
}

export const isChineseLanguage = (lang: Language = current) => lang !== 'en'

export { LanguageSwitcher } from './LanguageSwitcher'
