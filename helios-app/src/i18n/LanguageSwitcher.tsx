import { LANGUAGES, setLanguage, useLanguage, useT } from './index'

/** Compact language picker for landing, auth, and any chrome that is not Settings. */
export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const t = useT()
  const language = useLanguage()
  return (
    <label className={'helios-language-switcher' + (compact ? ' is-compact' : '')}>
      <span className="sr-only">{t('Language')}</span>
      <select
        aria-label={t('Language')}
        value={language}
        onChange={event => setLanguage(event.target.value as typeof language)}
      >
        {LANGUAGES.map(option => (
          <option key={option.id} value={option.id} lang={option.id}>
            {option.native}{option.id === 'en' ? ` · ${t('Default')}` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
