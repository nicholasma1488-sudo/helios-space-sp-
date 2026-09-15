import { useEffect, useState } from 'react'
import { ArrowRight, Bot, KeyRound, Sparkles } from 'lucide-react'
import { api, type UserAiSettings } from '../api'
import { useApp } from '../store/appStore'
import { runHeliosAgent } from '../product/flow'
import { useLanguage, useT } from '../i18n'
import './HomeAgentBar.css'

// Example prompts are shown in the UI language so the agent's answer language
// matches what the user reads; the fourth one stays Chinese in English to show
// that Chinese prompts work too.
const SUGGESTIONS: Record<string, string[]> = {
  en: [
    'Write a short essay about the solar system and share it to the Space feed',
    'Make a slide deck about photosynthesis for grade 8',
    'Create a to-do list for this week',
    '帮我做一个月度预算表格',
  ],
  'zh-CN': [
    '写一篇关于太阳系的短文，然后发到 Space 动态',
    '做一个八年级光合作用的幻灯片',
    '做一个本周的待办清单',
    '帮我做一个月度预算表格',
  ],
  'zh-TW': [
    '寫一篇關於太陽系的短文，然後發到 Space 動態',
    '做一個八年級光合作用的簡報',
    '做一個本週的待辦清單',
    '幫我做一個月度預算表格',
  ],
}

export function HomeAgentBar() {
  const { state, dispatch } = useApp()
  const t = useT()
  const language = useLanguage()
  const [value, setValue] = useState('')
  const [userAi, setUserAi] = useState<UserAiSettings | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    let cancelled = false
    const refresh = () => { api.ai.get().then(result => { if (!cancelled) setUserAi(result) }).catch(() => {}) }
    refresh()
    window.addEventListener('helios-ai-settings-changed', refresh)
    return () => { cancelled = true; window.removeEventListener('helios-ai-settings-changed', refresh) }
  }, [])

  let tab: 'site' | 'user' = 'site'
  try { if (localStorage.getItem('helios-model-tab') === 'user' && userAi?.configured) tab = 'user' } catch {}
  const modelLabel = tab === 'user'
    ? `${t('My API')} · ${userAi?.model || ''}`
    : `${t('Free')} · ${userAi?.site_default?.model || 'Helios'}`
  const ready = state.aiEnabled || Boolean(userAi?.configured)

  function submit(text: string) {
    if (!ready) return
    runHeliosAgent(text, state.heliosPanelOpen, () => dispatch({ type: 'OPEN_HELIOS_PANEL' }))
    setValue('')
    setSent(true)
    window.setTimeout(() => setSent(false), 2500)
  }

  return (
    <section className="home-agent glass-lift" aria-labelledby="home-agent-title">
      <header className="home-agent-head">
        <span className="home-agent-orb" aria-hidden="true"><Bot size={15} /></span>
        <div>
          <h2 id="home-agent-title">{t('Helios Agent')}</h2>
          <p>{t('Tell it what to make. It opens the right Mini App, writes the content, and can share it to your Space.')}</p>
        </div>
        <span className="home-agent-model" title={t('Model used by the agent')}>
          {tab === 'user' ? <KeyRound size={11} /> : <Sparkles size={11} />} {modelLabel}
        </span>
      </header>

      <form
        className="home-agent-form"
        onSubmit={event => { event.preventDefault(); submit(value) }}
      >
        <input
          value={value}
          onChange={event => setValue(event.target.value)}
          placeholder={ready ? t('e.g. Make a slide deck about photosynthesis, then post it to the Space feed') : t('Helios AI is not connected yet — add a key in Settings')}
          aria-label={t('Tell the Helios agent what to do')}
          disabled={!ready}
        />
        <button type="submit" disabled={!ready || !value.trim()} className="liquid-glass-btn is-primary">
          {sent ? t('Sent to Helios') : t('Run')} <ArrowRight size={14} />
        </button>
      </form>

      <div className="home-agent-chips" aria-label={t('Examples')}>
        {(SUGGESTIONS[language] || SUGGESTIONS.en).map(text => (
          <button key={text} type="button" onClick={() => submit(text)} disabled={!ready}>{text}</button>
        ))}
      </div>
    </section>
  )
}
