import { useEffect, useState } from 'react'
import { Check, Eye, EyeOff, KeyRound, X } from 'lucide-react'
import { api, ApiError, type AiProviderId, type UserAiSettings } from '../api'
import { useT } from '../i18n'

const PROVIDER_ORDER: AiProviderId[] = ['groq', 'openai', 'gemini', 'deepseek', 'openrouter', 'ollama', 'custom']
const PROVIDER_KEY_HINT: Record<AiProviderId, string> = {
  groq: 'console.groq.com → API Keys (free tier)',
  openai: 'platform.openai.com → API keys',
  gemini: 'aistudio.google.com → Get API key (free tier)',
  deepseek: 'platform.deepseek.com → API keys',
  openrouter: 'openrouter.ai → Keys (has free routes)',
  ollama: 'Any value works, e.g. "ollama". Host must be reachable from the internet.',
  custom: 'Any OpenAI-compatible /v1/chat/completions endpoint.',
}

export function HeliosApiForm({ settings, onSaved }: { settings: UserAiSettings | null; onSaved?: (next: UserAiSettings) => void }) {
  const t = useT()
  const [provider, setProvider] = useState<AiProviderId>(settings?.configured ? settings.provider : 'groq')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [baseUrl, setBaseUrl] = useState(settings?.configured ? settings.base_url : settings?.presets.groq.base_url || '')
  const [model, setModel] = useState(settings?.configured ? settings.model : settings?.presets.groq.model || '')
  const [busy, setBusy] = useState<'save' | 'test' | null>(null)
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!settings) return
    if (settings.configured) {
      setProvider(settings.provider)
      setBaseUrl(settings.base_url)
      setModel(settings.model)
    } else {
      const preset = settings.presets.groq
      setProvider('groq')
      setBaseUrl(preset.base_url)
      setModel(preset.model)
      setEditing(true)
    }
  }, [settings])

  function pickProvider(id: AiProviderId) {
    setProvider(id)
    const preset = settings?.presets[id]
    if (preset) {
      setBaseUrl(preset.base_url)
      setModel(preset.model)
    }
    setNotice(null)
  }

  function describeError(error: unknown) {
    if (error instanceof ApiError) return error.detail ? `${error.message} — ${error.detail}` : error.message
    return (error as Error).message
  }

  async function save() {
    setBusy('save')
    setNotice(null)
    try {
      const data = await api.ai.save({ provider, api_key: apiKey || undefined, base_url: baseUrl, model })
      setApiKey('')
      setEditing(false)
      window.dispatchEvent(new CustomEvent('helios-ai-settings-changed'))
      onSaved?.(data)
      setNotice({ tone: 'ok', text: t('Saved. Helios now uses your {provider} key.', { provider: data.presets[data.provider]?.label ?? t('custom') }) })
    } catch (error) {
      setNotice({ tone: 'error', text: describeError(error) })
    } finally {
      setBusy(null)
    }
  }

  async function test() {
    setBusy('test')
    setNotice(null)
    try {
      const result = await api.ai.test({ api_key: apiKey || undefined, base_url: baseUrl, model })
      setNotice({ tone: 'ok', text: t('Connected · {model} replied “{reply}”', { model: result.model, reply: result.reply }) })
    } catch (error) {
      setNotice({ tone: 'error', text: describeError(error) })
    } finally {
      setBusy(null)
    }
  }

  const canSubmit = Boolean(baseUrl.trim() && model.trim() && (apiKey.trim() || settings?.configured))
  const showForm = editing || !settings?.configured

  return (
    <div className="helios-api-form">
      <div className="helios-api-form-head">
        <KeyRound size={13} />
        <div>
          <strong>{settings?.configured ? t('Your key') : t('Add your API key here')}</strong>
          <span>
            {settings?.configured
              ? `${settings.presets[settings.provider]?.label ?? t('Custom')} · ${settings.model}`
              : t('Stays in this panel. Groq, OpenAI, Gemini, DeepSeek, Ollama…')}
          </span>
        </div>
        {settings?.configured && !editing && (
          <button type="button" onClick={() => { setEditing(true); setNotice(null) }}>{t('Change')}</button>
        )}
      </div>
      {showForm && (
        <>
          <div className="helios-api-presets" role="radiogroup" aria-label={t('Provider')}>
            {PROVIDER_ORDER.map(id => (
              <button type="button" key={id} role="radio" aria-checked={provider === id} className={provider === id ? 'is-active' : ''} onClick={() => pickProvider(id)}>
                {settings?.presets[id]?.label ?? id}
              </button>
            ))}
          </div>
          <label className="helios-field">
            <span>{t('API key')}</span>
            <div className="helios-api-key">
              <input
                className="helios-input"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={event => setApiKey(event.target.value)}
                placeholder={settings?.configured ? t('Leave blank to keep {preview}', { preview: settings.key_preview }) : t('Paste your key')}
                autoComplete="off"
                spellCheck={false}
              />
              <button type="button" onClick={() => setShowKey(value => !value)} aria-label={showKey ? t('Hide key') : t('Show key')}>
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <small>{t(PROVIDER_KEY_HINT[provider])}</small>
          </label>
          <div className="helios-api-grid">
            <label className="helios-field"><span>{t('Base URL')}</span><input className="helios-input" value={baseUrl} onChange={event => setBaseUrl(event.target.value)} spellCheck={false} /></label>
            <label className="helios-field"><span>{t('Model')}</span><input className="helios-input" value={model} onChange={event => setModel(event.target.value)} spellCheck={false} /></label>
          </div>
          <div className="helios-api-actions">
            <button type="button" className="liquid-glass-btn is-primary" onClick={() => void save()} disabled={busy !== null || !canSubmit}>
              {busy === 'save' ? t('Saving…') : <><Check size={13} /> {t('Save & use my key')}</>}
            </button>
            <button type="button" className="liquid-glass-btn" onClick={() => void test()} disabled={busy !== null || !canSubmit}>
              {busy === 'test' ? t('Testing…') : t('Test connection')}
            </button>
            {settings?.configured && (
              <button type="button" className="liquid-glass-btn" onClick={() => { setEditing(false); setApiKey(''); setNotice(null) }}>
                <X size={13} /> {t('Cancel')}
              </button>
            )}
          </div>
        </>
      )}
      {notice && <p className={'helios-api-notice is-' + notice.tone} role="status">{notice.text}</p>}
    </div>
  )
}
