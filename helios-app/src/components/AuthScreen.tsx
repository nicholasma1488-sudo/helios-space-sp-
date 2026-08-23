import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import type { User, SiteInfo } from '../api'
import { Logo } from './Logo'
import { Mail, Lock, User as UserIcon, AtSign, Eye, EyeOff, Loader, AlertCircle } from 'lucide-react'
import './AuthScreen.css'

interface Props { onAuth: (user: User) => void; defaultMode?: 'login' | 'register'; onBack?: () => void }

export function AuthScreen({ onAuth, defaultMode = 'register', onBack }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode)
  const [email, setEmail] = useState('')

  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [handle, setHandle] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null)
  const [leaving, setLeaving] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  // Correct: useEffect, not useState, for side effects
  useEffect(() => {
    api.site().then(s => setSiteInfo(s)).catch(() => {})
  }, [])

  // Auto-focus first field when mode changes
  useEffect(() => {
    const t = setTimeout(() => {
      if (mode === 'register') nameRef.current?.focus()
      else emailRef.current?.focus()
    }, 60)
    return () => clearTimeout(t)
  }, [mode])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (mode === 'register') {
      if (!name.trim()) errs.name = 'Name is required'
      else if (name.trim().length < 2) errs.name = 'Name must be at least 2 characters'
      if (!handle.trim()) errs.handle = 'Username is required'
      else if (!/^[a-zA-Z0-9_.]{3,30}$/.test(handle.replace(/^@/, '')))
        errs.handle = '3–30 chars, letters, numbers, _ or .'
    }
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = 'Enter a valid email'
    if (!password) errs.password = 'Password is required'
    else if (mode === 'register' && password.length < 8)
      errs.password = 'Must be at least 8 characters'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        const r = await api.login({ email: email.trim(), password })
        onAuth(r.user)
      } else {
        const r = await api.signup({ name: name.trim(), handle: handle.trim(), email: email.trim(), password })
        onAuth(r.user)
      }
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function backToOverview() {
    if (!onBack || leaving) return
    setLeaving(true)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(onBack, reduced ? 120 : 320)
  }

  const field = (
    id: string,
    label: string,
    icon: React.ReactNode,
    value: string,
    onChange: (v: string) => void,
    opts: { type?: string; placeholder?: string; autoComplete?: string; ref?: React.RefObject<HTMLInputElement | null> } = {}
  ) => (
    <div>
      <label htmlFor={id}
        style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--helios-muted)', marginBottom: 6, letterSpacing: '0.02em' }}>
        {label}
      </label>
      <div
        className="flex items-center rounded-xl px-3.5 transition-colors"
        style={{
          background: 'var(--helios-surface2)',
          border: `1px solid ${fieldErrors[id.replace('auth-','')] ? 'var(--helios-danger)' : 'var(--helios-border)'}`,
        }}
      >
        <span style={{ color: 'var(--helios-muted)', flexShrink: 0, marginTop: 1 }}>{icon}</span>
        <input
          ref={opts.ref as React.RefObject<HTMLInputElement>}
          id={id}
          value={value}
          onChange={e => { onChange(e.target.value); if (fieldErrors[id.replace('auth-','')]) setFieldErrors(prev => { const n = {...prev}; delete n[id.replace('auth-','')]; return n }) }}
          type={opts.type === 'password' ? (showPw ? 'text' : 'password') : opts.type ?? 'text'}
          placeholder={opts.placeholder}
          autoComplete={opts.autoComplete}
          required
          className="flex-1 bg-transparent outline-none px-3 py-3"
          style={{ border: 'none', color: 'var(--helios-text)', fontSize: 14, minWidth: 0 }}
          aria-invalid={!!fieldErrors[id.replace('auth-','')]}
          aria-describedby={fieldErrors[id.replace('auth-','')] ? `${id}-err` : undefined}
        />
        {opts.type === 'password' && (
          <button type="button" onClick={() => setShowPw(v => !v)}
            style={{ background: 'none', border: 'none', color: 'var(--helios-muted)', cursor: 'pointer', padding: '4px 2px', flexShrink: 0 }}
            aria-label={showPw ? 'Hide password' : 'Show password'}>
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {fieldErrors[id.replace('auth-','')] && (
        <div id={`${id}-err`} role="alert"
          className="flex items-center gap-1 mt-1"
          style={{ fontSize: 11, color: 'var(--helios-danger)' }}>
          <AlertCircle size={10} /> {fieldErrors[id.replace('auth-','')]}
        </div>
      )}
    </div>
  )

  return (
    <div className={'auth-screen-v2 fixed inset-0 flex items-center justify-center p-4' + (leaving ? ' is-leaving' : '')}
      style={{ background: 'var(--helios-bg)', overflowY: 'auto' }}>

      {/* Background radial glow */}
      <div aria-hidden="true" style={{
        position: 'fixed', top: '-15%', left: '50%', transform: 'translateX(-50%)',
        width: 700, height: 500,
        background: 'radial-gradient(ellipse, rgba(124,106,247,0.10) 0%, transparent 68%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <aside className="auth-context" aria-hidden="true">
        <span>YOUR HELIOS SPACE</span>
        <h1>Enter a digital universe built for students and creators.</h1>
        <p>Projects, progress, people, and useful little tools — connected without becoming noise.</p>
        <div>
          <i /><span>One account, one continuous context</span>
          <i /><span>Public or private, update by update</span>
          <i /><span>AI stays optional and permission-bound</span>
        </div>
      </aside>

      <div className="auth-card-v2 flex flex-col w-full rounded-2xl overflow-hidden"
        style={{
          maxWidth: 400, background: 'var(--helios-surface)', border: '1px solid var(--helios-border)',
          position: 'relative', zIndex: 1,
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
        }}>

        {/* Announcement banner */}
        {siteInfo?.announcement && (
          <div className="px-5 py-3 text-sm" style={{ background: 'rgba(124,106,247,0.12)', borderBottom: '1px solid rgba(124,106,247,0.2)', color: 'var(--helios-accent)', lineHeight: 1.5 }}>
            {siteInfo.announcement}
          </div>
        )}

        <div className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-7">
            <Logo size="lg" />
          </div>

          {/* Tagline */}
          {siteInfo?.tagline && (
            <p className="text-center mb-6" style={{ fontSize: 13, color: 'var(--helios-muted)', lineHeight: 1.55, margin: '0 0 24px' }}>
              {siteInfo.tagline}
            </p>
          )}

          {/* Sign-up closed banner */}
          {siteInfo && !siteInfo.signup_open && mode === 'register' && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-5"
              style={{ background: 'rgba(255,155,106,0.1)', border: '1px solid rgba(255,155,106,0.3)' }}>
              <AlertCircle size={14} style={{ color: 'var(--helios-warning)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--helios-warning)', lineHeight: 1.4 }}>
                New signups are currently closed. You can still sign in if you have an account.
              </span>
            </div>
          )}

          {/* Tab switch */}
          <div className="flex rounded-xl overflow-hidden mb-6" style={{ background: 'var(--helios-surface2)', padding: 3 }}>
            {onBack && (
              <button onClick={backToOverview} type="button"
                className="flex items-center gap-1 py-2 px-3 text-xs cursor-pointer rounded-lg"
                style={{ background: 'transparent', border: 'none', color: 'var(--helios-muted)', marginRight: 4 }}>
                ← Overview
              </button>
            )}
            {(['login', 'register'] as const).map(m => (
              <button key={m}
                onClick={() => { setMode(m); setError(''); setFieldErrors({}) }}
                className="flex-1 py-2 text-sm font-semibold cursor-pointer transition-all rounded-lg"
                style={{
                  background: mode === m ? 'var(--helios-accent)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--helios-muted)',
                  border: 'none',
                  transition: 'background var(--dur-quick) var(--ease-move), color var(--dur-quick) var(--ease-move)',
                }}>
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            {mode === 'register' && (
              <>
                {field('auth-name', 'Your name', <UserIcon size={15} />, name, setName,
                  { placeholder: 'Jane Smith', autoComplete: 'name', ref: nameRef })}
                {field('auth-handle', 'Username', <AtSign size={15} />, handle, setHandle,
                  { placeholder: 'janesmith', autoComplete: 'username' })}
              </>
            )}
            {field('auth-email', 'Email', <Mail size={15} />, email, setEmail,
              { type: 'email', placeholder: 'you@example.com', autoComplete: 'email', ref: mode === 'login' ? emailRef : undefined })}

            {field('auth-pw', 'Password', <Lock size={15} />, password, setPassword,
              { type: 'password', placeholder: mode === 'register' ? 'At least 8 characters' : '••••••••',
                autoComplete: mode === 'login' ? 'current-password' : 'new-password' })}

            {error && (
              <div role="alert" className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,107,107,0.1)', color: 'var(--helios-danger)', border: '1px solid rgba(255,107,107,0.25)', fontSize: 13, lineHeight: 1.5 }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading || (mode === 'register' && siteInfo !== null && !siteInfo.signup_open)}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold cursor-pointer"
              style={{
                background: 'var(--helios-accent)', color: '#fff', border: 'none', marginTop: 4,
                opacity: (loading || (mode === 'register' && siteInfo !== null && !siteInfo.signup_open)) ? 0.6 : 1,
                transition: 'opacity var(--dur-quick) var(--ease-move)',
              }}>
              {loading && <Loader size={15} style={{ animation: 'spin var(--dur-deliberate) linear infinite', flexShrink: 0 }} />}
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {mode === 'login' && (
            <p className="text-center mt-4" style={{ fontSize: 12, color: 'var(--helios-muted)' }}>
              Don't have an account?{' '}
              <button onClick={() => { setMode('register'); setError(''); setFieldErrors({}) }}
                style={{ background: 'none', border: 'none', color: 'var(--helios-accent)', cursor: 'pointer', fontSize: 12, padding: 0 }}>
                Create one free
              </button>
            </p>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
