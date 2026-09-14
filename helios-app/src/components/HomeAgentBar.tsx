import { useEffect, useState } from 'react'
import { ArrowRight, Bot, KeyRound, Sparkles } from 'lucide-react'
import { api, type UserAiSettings } from '../api'
import { useApp } from '../store/appStore'
import { runHeliosAgent } from '../product/flow'
import './HomeAgentBar.css'

const SUGGESTIONS = [
  'Write a short essay about the solar system and share it to the Space feed',
  'Make a slide deck about photosynthesis for grade 8',
  'Create a to-do list for this week',
  '帮我做一个月度预算表格',
]

export function HomeAgentBar() {
  const { state, dispatch } = useApp()
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
    ? `My API · ${userAi?.model || ''}`
    : `Free · ${userAi?.site_default?.model || 'Helios'}`
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
          <h2 id="home-agent-title">Helios Agent</h2>
          <p>Tell it what to make. It opens the right Mini App, writes the content, and can share it to your Space.</p>
        </div>
        <span className="home-agent-model" title="Model used by the agent">
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
          placeholder={ready ? 'e.g. Make a slide deck about photosynthesis, then post it to the Space feed' : 'Helios AI is not connected yet — add a key in Settings'}
          aria-label="Tell the Helios agent what to do"
          disabled={!ready}
        />
        <button type="submit" disabled={!ready || !value.trim()} className="liquid-glass-btn is-primary">
          {sent ? 'Sent to Helios' : 'Run'} <ArrowRight size={14} />
        </button>
      </form>

      <div className="home-agent-chips" aria-label="Examples">
        {SUGGESTIONS.map(text => (
          <button key={text} type="button" onClick={() => submit(text)} disabled={!ready}>{text}</button>
        ))}
      </div>
    </section>
  )
}
