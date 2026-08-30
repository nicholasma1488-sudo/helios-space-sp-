import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Headphones, Mail, Shield } from 'lucide-react'
import { api, type SimpliBoxState } from '../api'
import {
  formatAddress,
  passwordIssues,
  SIMPLIBOX_RECOVERY_EMAIL,
  SIMPLIBOX_SUPPORT_EMAIL,
  suggestLocalParts,
  type SimpliBoxProvider,
  validateLocalPart,
} from '../product/simplibox'
import { useApp } from '../store/appStore'
import './SimpliBoxView.css'

type Step = 'provider' | 'design' | 'password' | 'done'

export function SimpliBoxView() {
  const { state, dispatch } = useApp()
  const [step, setStep] = useState<Step>('provider')
  const [provider, setProvider] = useState<SimpliBoxProvider>('outlook')
  const [localPart, setLocalPart] = useState(() => (state.user?.handle || '').replace(/^@/, '').replace(/[^a-z0-9._-]/gi, ''))
  const [checkMessage, setCheckMessage] = useState('')
  const [taken, setTaken] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [checking, setChecking] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [ticket, setTicket] = useState('')
  const [ticketSent, setTicketSent] = useState(false)
  const [box, setBox] = useState<SimpliBoxState | null>(null)
  const [error, setError] = useState('')
  const [askSwitch, setAskSwitch] = useState(false)
  const [switched, setSwitched] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.simplibox.get().then(result => {
      if (cancelled) return
      setBox(result)
      if (result.request) {
        setProvider(result.request.provider)
        setLocalPart(result.request.local_part)
        setStep('done')
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const address = useMemo(() => {
    const checked = validateLocalPart(localPart)
    return checked.localPart ? formatAddress(checked.localPart, provider) : ''
  }, [localPart, provider])
  const passwordError = passwordIssues(password, confirm)

  async function checkDesign(nextLocal = localPart) {
    const checked = validateLocalPart(nextLocal)
    if (!checked.localPart) {
      setTaken(false)
      setCheckMessage(checked.error || 'That design is not valid.')
      setSuggestions(suggestLocalParts(nextLocal || state.user?.handle || 'mail'))
      return false
    }
    const chosen = checked.localPart
    setChecking(true)
    setError('')
    try {
      const result = await api.simplibox.check({ provider, local_part: chosen })
      setTaken(!result.available)
      setCheckMessage(result.message)
      setSuggestions(result.suggestions.map(item => item.split('@')[0] || item).filter(Boolean))
      setLocalPart(chosen)
      return result.available
    } catch (reason) {
      setError((reason as Error).message)
      return false
    } finally {
      setChecking(false)
    }
  }

  async function submitDesign() {
    if (passwordError) return
    const available = await checkDesign()
    if (!available) {
      setStep('design')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await api.simplibox.create({
        provider,
        local_part: localPart,
        password_confirmed: true,
      })
      setBox(current => current ? { ...current, request: result.request } : { support_email: SIMPLIBOX_SUPPORT_EMAIL, recovery_email: SIMPLIBOX_RECOVERY_EMAIL, request: result.request })
      setPassword('')
      setConfirm('')
      setStep('done')
      if (result.request.address !== state.user?.email && !result.request.applied) setAskSwitch(true)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function sendTicket() {
    const message = ticket.trim()
    if (message.length < 8) return
    setSaving(true)
    setError('')
    try {
      await api.simplibox.support(message)
      setTicket('')
      setTicketSent(true)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function applyNewLogin() {
    setSaving(true)
    setError('')
    try {
      const result = await api.simplibox.applyLogin()
      setBox(current => current ? { ...current, request: result.request } : current)
      dispatch({ type: 'SET_USER', user: result.user })
      setAskSwitch(false)
      setSwitched(true)
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: 'Login email updated. Projects and progress stay.', tone: 'success' } })
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setSaving(false)
    }
  }

  function copyAddress() {
    if (!address) return
    void navigator.clipboard?.writeText(address)
    dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: 'Address copied', tone: 'success' } })
  }

  return (
    <div className="simplibox-page">
      <button type="button" className="simplibox-back" onClick={() => dispatch({ type: 'SET_VIEW', view: 'profile' })}>
        <ArrowLeft size={15} /> Back to profile
      </button>

      <header className="simplibox-hero">
        <span>SIMPLIBOX</span>
        <h1>Design a personal email in seconds.</h1>
        <p>Pick Hotmail or Outlook, lock a design, and confirm the password you will use. Helios support finishes the rest. We never open Outlook for you or store that password.</p>
      </header>

      <ol className="simplibox-steps" aria-label="SimpliBox steps">
        {(['provider', 'design', 'password', 'done'] as const).map(item => (
          <li key={item} className={step === item ? 'is-on' : ''}>{item}</li>
        ))}
      </ol>

      {step === 'provider' && (
        <section className="simplibox-card">
          <h2>Which mailbox do you want?</h2>
          <p>Choose the public look. You create the Microsoft account yourself, or ask support to walk you through it.</p>
          <div className="simplibox-providers">
            <button type="button" className={provider === 'outlook' ? 'is-on' : ''} onClick={() => setProvider('outlook')}>
              <Mail size={18} />
              <strong>Outlook</strong>
              <small>name@outlook.com</small>
            </button>
            <button type="button" className={provider === 'hotmail' ? 'is-on' : ''} onClick={() => setProvider('hotmail')}>
              <Mail size={18} />
              <strong>Hotmail</strong>
              <small>name@hotmail.com</small>
            </button>
          </div>
          <button type="button" className="simplibox-primary" onClick={() => setStep('design')}>
            Continue <ArrowRight size={15} />
          </button>
        </section>
      )}

      {step === 'design' && (
        <section className="simplibox-card">
          <h2>Customize the address</h2>
          <label>
            <span>Your design</span>
            <div className="simplibox-address">
              <input
                value={localPart}
                onChange={event => {
                  setLocalPart(event.target.value)
                  setTaken(false)
                  setCheckMessage('')
                }}
                autoComplete="off"
                spellCheck={false}
                aria-label="Email username"
              />
              <em>@{provider === 'hotmail' ? 'hotmail.com' : 'outlook.com'}</em>
            </div>
          </label>
          <div className="simplibox-actions">
            <button type="button" onClick={() => void checkDesign()} disabled={checking}>
              {checking ? 'Checking…' : 'Check this design'}
            </button>
            <button type="button" className="simplibox-primary" onClick={() => void checkDesign().then(ok => { if (ok) setStep('password') })} disabled={checking}>
              Use this design <ArrowRight size={15} />
            </button>
          </div>
          {checkMessage && (
            <p className={'simplibox-note' + (taken ? ' is-used' : '')}>
              {taken ? 'This email design has already been used. ' : ''}
              {checkMessage}
            </p>
          )}
          {suggestions.length > 0 && (
            <div className="simplibox-try">
              <span>Try these</span>
              <div>
                {suggestions.map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setLocalPart(item)
                      void checkDesign(item)
                    }}
                  >
                    {item}@{provider === 'hotmail' ? 'hotmail.com' : 'outlook.com'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {step === 'password' && (
        <section className="simplibox-card">
          <h2>Choose a password</h2>
          <p>Enter it twice here so you know it by heart. Helios only records that you confirmed it — the password never leaves this page.</p>
          <label>
            <span>Password</span>
            <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" />
          </label>
          <label>
            <span>Type it again</span>
            <input type="password" value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="new-password" />
          </label>
          {password && passwordError && <p className="simplibox-note is-used">{passwordError}</p>}
          {password && !passwordError && <p className="simplibox-note"><Check size={13} /> Both entries match.</p>}
          <div className="simplibox-recovery">
            <Shield size={16} />
            <div>
              <strong>If Microsoft asks for another email</strong>
              <p>Use the Helios recovery contact <b>{box?.recovery_email || SIMPLIBOX_RECOVERY_EMAIL}</b>. That is the dedicated address we watch for SimpliBox help.</p>
            </div>
          </div>
          <div className="simplibox-actions">
            <button type="button" onClick={() => setStep('design')}>Back</button>
            <button type="button" className="simplibox-primary" onClick={() => void submitDesign()} disabled={!!passwordError || saving}>
              {saving ? 'Saving…' : 'Save this design'}
            </button>
          </div>
        </section>
      )}

      {step === 'done' && (
        <section className="simplibox-card">
          <h2>Your SimpliBox design is ready.</h2>
          <p className="simplibox-final-address">{box?.request?.address || address}</p>
          <p>Create that mailbox on the official Microsoft signup page, or write support if you want a person to walk through it with you.</p>
          <div className="simplibox-actions">
            <button type="button" onClick={copyAddress}>Copy address</button>
            <a className="simplibox-primary" href="https://signup.live.com" target="_blank" rel="noreferrer">
              Open Outlook signup <ArrowRight size={15} />
            </a>
          </div>
          <button type="button" className="simplibox-text" onClick={() => setStep('provider')}>Design a different address</button>
          {box?.request && !box.request.applied && !switched && (
            <button type="button" className="simplibox-text" onClick={() => setAskSwitch(true)}>
              Use this as my Helios login
            </button>
          )}
          {switched && <p className="simplibox-note">Helios now signs in with this address. Nothing else was reset.</p>}
        </section>
      )}

      {askSwitch && (
        <div className="simplibox-modal" role="dialog" aria-labelledby="simplibox-switch-title" aria-modal="true">
          <div className="simplibox-modal-card">
            <h2 id="simplibox-switch-title">Use this as your Helios login?</h2>
            <p>Switch from <b>{state.user?.email}</b> to <b>{box?.request?.address || address}</b>.</p>
            <p>Projects, posts, Solar, chats, and files stay. Your Helios password stays the same. Only the login email changes.</p>
            <div className="simplibox-actions">
              <button type="button" onClick={() => setAskSwitch(false)}>Keep my current email</button>
              <button type="button" className="simplibox-primary" onClick={() => void applyNewLogin()} disabled={saving}>
                {saving ? 'Updating…' : 'Yes, change login email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="simplibox-note is-used" role="alert">{error}</p>}

      <section className="simplibox-card simplibox-support">
        <header>
          <Headphones size={18} />
          <div>
            <span>NEED HELP?</span>
            <h2>Contact customer service</h2>
          </div>
        </header>
        <p>Write {box?.support_email || SIMPLIBOX_SUPPORT_EMAIL}. If something gets stuck, a person answers.</p>
        <textarea
          value={ticket}
          onChange={event => { setTicket(event.target.value); setTicketSent(false) }}
          placeholder="Describe what you need — a walkthrough, a stuck signup, or a different design."
          rows={4}
        />
        <div className="simplibox-actions">
          <a href={`mailto:${box?.support_email || SIMPLIBOX_SUPPORT_EMAIL}`}>Email support</a>
          <button type="button" className="simplibox-primary" onClick={() => void sendTicket()} disabled={ticket.trim().length < 8 || saving}>
            Send to Helios support
          </button>
        </div>
        {ticketSent && <p className="simplibox-note">Support has the note. We will reply at your Helios login email.</p>}
      </section>
    </div>
  )
}
