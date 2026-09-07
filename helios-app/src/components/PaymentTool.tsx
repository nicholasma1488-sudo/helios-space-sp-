import { useEffect, useState } from 'react'
import { Check, CreditCard, Gift, Lock, Sparkles } from 'lucide-react'
import {
  api,
  type BillingPlan,
  type BillingSnapshot,
  type User,
} from '../api'
import { useApp } from '../store/appStore'
import './PaymentTool.css'

const FALLBACK_PLANS: BillingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price_cents: 0,
    currency: 'cny',
    interval: 'month',
    eligible: true,
    description: '五个 Create 工具一直可用。额度只限制文稿数量与字数。',
    features: [
      '免费创建 Helios 账号',
      '墨语、随身本、格间、今日事、搭子码',
      '60 篇文稿',
      '每篇 40,000 字',
      'Space、Messages、协作开播',
    ],
    mini_apps: ['墨语', '随身本', '格间', '今日事', '搭子码'],
    limits: { documents: 60, characters: 40_000 },
  },
  {
    id: 'orbit',
    name: 'Orbit',
    price_cents: 6800,
    currency: 'cny',
    interval: 'month',
    description: '更多文稿空间，以及更从容的协作。用银行卡在 Stripe 付款。',
    features: [
      '包含 Free 的全部内容',
      '文稿不限篇数',
      '每篇 500,000 字',
      '完整 Create 体验',
      'Stripe 银行卡付款 — Helios 自动检测开通',
    ],
    mini_apps: ['墨语', '随身本', '格间', '今日事', '搭子码'],
    limits: { documents: null, characters: 500_000 },
  },
]

function formatPrice(cents: number, currency = 'cny') {
  if (cents <= 0) return '¥0'
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100)
}

function brandLabel(brand: string) {
  if (brand === 'visa') return 'Visa'
  if (brand === 'mastercard') return 'Mastercard'
  if (brand === 'amex') return 'American Express'
  if (brand === 'discover') return 'Discover'
  if (brand === 'stripe') return 'Card'
  return 'Card'
}

export function PaymentTool({ mode = 'settings' }: { mode?: 'settings' | 'onboarding' }) {
  const { state, dispatch } = useApp()
  const [billing, setBilling] = useState<BillingSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [watching, setWatching] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.billing.get().then(snapshot => {
      if (cancelled) return
      setBilling(snapshot)
      if (snapshot.pending_checkout && snapshot.plan !== 'orbit') setWatching(true)
    }).catch(reason => {
      if (!cancelled) setError((reason as Error).message)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!watching || billing?.plan === 'orbit') return
    let cancelled = false
    const tick = async () => {
      try {
        const snapshot = await api.billing.get()
        if (cancelled) return
        setBilling(snapshot)
        if (snapshot.plan === 'orbit' && state.user) {
          dispatch({ type: 'SET_USER', user: { ...state.user, plan: snapshot.plan, edition: snapshot.edition, plan_selected: true } })
          dispatch({ type: 'CLOSE_UPGRADE' })
          setWatching(false)
          setBusy(null)
          dispatch({
            type: 'PUSH_TOAST',
            toast: { id: String(Date.now()), message: 'Orbit is active. Stripe payment detected.', tone: 'success' },
          })
        }
      } catch {}
    }
    const timer = window.setInterval(() => { void tick() }, 1500)
    void tick()
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [watching, billing?.plan, dispatch, state.user])

  const plans = billing?.plans?.length ? billing.plans : FALLBACK_PLANS
  const currentPlan = billing?.plan ?? state.user?.plan ?? 'free'
  const stripeEnabled = Boolean(billing?.stripe?.enabled)

  function applyUser(user: User) {
    dispatch({ type: 'SET_USER', user })
    if (user.plan === 'orbit') dispatch({ type: 'CLOSE_UPGRADE' })
  }

  async function chooseFree() {
    setBusy('free')
    setError('')
    try {
      const result = await api.billing.checkout({ plan: 'free' })
      setBilling(result.billing)
      applyUser(result.user)
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: 'You are on the Free edition.', tone: 'success' },
      })
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function payWithStripe() {
    setBusy('stripe')
    setError('')
    try {
      const session = await api.billing.stripe('orbit')
      setWatching(true)
      if (session.mock || session.url.includes('billing=success')) {
        const result = await api.billing.confirmStripe(session.session_id)
        setBilling(result.billing)
        applyUser(result.user)
        setWatching(false)
        dispatch({
          type: 'PUSH_TOAST',
          toast: { id: String(Date.now()), message: 'Orbit is active. Stripe card payment detected.', tone: 'success' },
        })
        setBusy(null)
        return
      }
      window.location.assign(session.url)
    } catch (reason) {
      setError((reason as Error).message)
      setBusy(null)
      setWatching(false)
    }
  }

  return (
    <section className="payment-tool" aria-labelledby="payment-tool-title">
      <header>
        <span><CreditCard size={13} /> {mode === 'onboarding' ? 'PICK A PLAN' : 'PAYMENT'}</span>
        <h3 id="payment-tool-title">{mode === 'onboarding' ? 'Start on Free, or get more writing room with Orbit.' : 'Upgrade for more writing room. Pay with a Stripe card.'}</h3>
        <p>五个 Create 工具在 Free 可用。Orbit 每月 ¥68，文稿不限篇、每篇 50 万字。银行卡走 Stripe。</p>
      </header>

      {loading && <div className="payment-tool-status">Loading payment options…</div>}
      {error && <div className="payment-tool-error" role="alert">{error}</div>}
      {watching && currentPlan !== 'orbit' && (
        <div className="payment-tool-status" role="status">Watching Stripe for your card payment…</div>
      )}

      <div className="payment-plan-grid">
        {plans.filter(plan => plan.id === 'free' || plan.id === 'orbit').map(plan => {
          const current = currentPlan === plan.id
          return (
            <article
              key={plan.id}
              className={'payment-plan' + (current ? ' is-current' : '') + (plan.id === 'orbit' ? ' is-orbit' : '')}
            >
              <div className="payment-plan-top">
                <i>{plan.id === 'free' ? <Gift size={16} /> : <Sparkles size={16} />}</i>
                <div>
                  <small>{plan.id === 'free' ? 'INCLUDED' : 'FULL SUITE'}</small>
                  <strong>{plan.name}</strong>
                </div>
                <b>{formatPrice(plan.price_cents, plan.currency)}{plan.price_cents > 0 ? <em>/月</em> : null}</b>
              </div>
              <p>{plan.description}</p>
              <ul>
                {plan.features.map(feature => (
                  <li key={feature}><Check size={12} /> {feature}</li>
                ))}
              </ul>
              {plan.mini_apps && plan.mini_apps.length > 0 && (
                <div className="payment-mini-apps">
                  {plan.mini_apps.map(app => <span key={app}>{app}</span>)}
                </div>
              )}
              {plan.id === 'free' ? (
                <button
                  type="button"
                  className="payment-free-btn"
                  onClick={() => void chooseFree()}
                  disabled={busy !== null || (current && Boolean(state.user?.plan_selected))}
                >
                  {current && state.user?.plan_selected ? 'Current Free edition' : busy === 'free' ? 'Switching…' : 'Use Free'}
                </button>
              ) : current ? (
                <div className="payment-current-note">Orbit is active on this account.</div>
              ) : (
                <div className="payment-current-note">Pay with a bank card on Stripe. Helios detects the payment by itself.</div>
              )}
            </article>
          )
        })}
      </div>

      {currentPlan !== 'orbit' && (
        <div className="payment-card-form">
          <div className="payment-card-heading">
            <Lock size={16} />
            <div>
              <strong>Stripe card checkout</strong>
              <small>Visa, Mastercard, Amex and more. Helios never sees the full card number. Payment is detected automatically after Stripe confirms it.</small>
            </div>
          </div>
          {billing?.payment_method && (
            <div className="payment-saved-card">
              <Lock size={13} />
              <span>
                Saved {brandLabel(billing.payment_method.brand)} •••• {billing.payment_method.last4}
                {billing.payment_method.source === 'stripe' ? ' via Stripe' : ''}
              </span>
            </div>
          )}
          <button type="button" disabled={busy !== null || !stripeEnabled} onClick={() => void payWithStripe()}>
            <Lock size={14} />
            {busy === 'stripe'
              ? 'Opening Stripe…'
              : stripeEnabled
                ? 'Pay Orbit with Stripe'
                : 'Stripe is not configured yet'}
          </button>
        </div>
      )}

      {currentPlan === 'orbit' && billing?.payment_method && (
        <div className="payment-saved-card">
          <Lock size={13} />
          <span>
            Orbit paid with {brandLabel(billing.payment_method.brand)}
            {billing.payment_method.last4 ? ` •••• ${billing.payment_method.last4}` : ''}
            {billing.payment_method.source === 'stripe' ? ' via Stripe' : ''}
          </span>
        </div>
      )}
    </section>
  )
}
