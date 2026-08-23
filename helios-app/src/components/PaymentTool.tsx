import { useEffect, useMemo, useState } from 'react'
import { Check, CreditCard, Gift, Lock, Sparkles } from 'lucide-react'
import {
  api,
  type BillingPlan,
  type BillingSnapshot,
  type PayMethod,
  type User,
} from '../api'
import { useApp } from '../store/appStore'
import './PaymentTool.css'

const FALLBACK_PLANS: BillingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price_cents: 0,
    currency: 'usd',
    interval: 'month',
    eligible: true,
    description: 'Word, Excel, PowerPoint and OneNote — real files you can keep working in.',
    features: [
      'Create a Helios account for free',
      'Word, Excel, PowerPoint and OneNote',
      'Projects that stay connected to your feed',
      'Lifestyle, Chat Hub, and Live work',
    ],
    mini_apps: ['Word', 'Excel', 'PowerPoint', 'OneNote'],
  },
  {
    id: 'orbit',
    name: 'Orbit',
    price_cents: 900,
    currency: 'usd',
    interval: 'month',
    description: 'The complete Mini App suite. Pay with card, WeChat or Alipay.',
    features: [
      'Everything in Free',
      'Every extra Mini App, including Stocks',
      'School and work tools in one account',
      'Card, WeChat or Alipay checkout',
    ],
    mini_apps: ['Stocks', 'Docs', 'Budget', 'Pitch', 'Meetings', 'Essay', 'Gradebook', 'Planner'],
  },
]

function formatPrice(cents: number) {
  if (cents <= 0) return 'Free'
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function formatCardNumber(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 19)
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ')
}

function formatExpiry(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return digits.slice(0, 2) + ' / ' + digits.slice(2)
}

function brandLabel(brand: string) {
  if (brand === 'visa') return 'Visa'
  if (brand === 'mastercard') return 'Mastercard'
  if (brand === 'amex') return 'American Express'
  if (brand === 'discover') return 'Discover'
  if (brand === 'wechat') return 'WeChat'
  if (brand === 'alipay') return 'Alipay'
  if (brand === 'stripe') return 'Card'
  return 'Card'
}

function methodLabel(method: PayMethod) {
  if (method === 'wechat') return 'WeChat'
  if (method === 'alipay') return 'Alipay'
  return 'card'
}

export function PaymentTool({ mode = 'settings' }: { mode?: 'settings' | 'onboarding' }) {
  const { state, dispatch } = useApp()
  const [billing, setBilling] = useState<BillingSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [payMethod, setPayMethod] = useState<PayMethod>('card')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState(state.user?.name ?? '')

  useEffect(() => {
    let cancelled = false
    api.billing.get().then(snapshot => {
      if (cancelled) return
      setBilling(snapshot)
    }).catch(reason => {
      if (!cancelled) setError((reason as Error).message)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const plans = billing?.plans?.length ? billing.plans : FALLBACK_PLANS
  const currentPlan = billing?.plan ?? state.user?.plan ?? 'free'
  const stripeEnabled = Boolean(billing?.stripe?.enabled)
  const cardReady = useMemo(() => {
    const digits = cardNumber.replace(/\D/g, '')
    const expiryDigits = expiry.replace(/\D/g, '')
    return digits.length >= 13 && expiryDigits.length === 4 && cvc.replace(/\D/g, '').length >= 3 && name.trim().length >= 2
  }, [cardNumber, expiry, cvc, name])

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

  async function payWithCard(event: React.FormEvent) {
    event.preventDefault()
    const number = cardNumber.replace(/\D/g, '')
    const expiryDigits = expiry.replace(/\D/g, '')
    setBusy('card')
    setError('')
    try {
      const result = await api.billing.checkout({
        plan: 'orbit',
        card: {
          number,
          exp_month: Number(expiryDigits.slice(0, 2)),
          exp_year: Number(expiryDigits.slice(2)),
          cvc: cvc.replace(/\D/g, ''),
          name: name.trim(),
        },
      })
      setBilling(result.billing)
      applyUser(result.user)
      setCardNumber('')
      setExpiry('')
      setCvc('')
      dispatch({
        type: 'PUSH_TOAST',
        toast: {
          id: String(Date.now()),
          message: 'Orbit is active. Card saved as ' + brandLabel(result.billing.payment_method?.brand || 'card') + ' •••• ' + (result.billing.payment_method?.last4 || ''),
          tone: 'success',
        },
      })
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function payWithWallet(method: PayMethod) {
    setBusy(method)
    setError('')
    try {
      const session = await api.billing.stripe('orbit', method)
      if (session.mock || session.url.includes('billing=success')) {
        const result = await api.billing.confirmStripe(session.session_id)
        setBilling(result.billing)
        applyUser(result.user)
        dispatch({
          type: 'PUSH_TOAST',
          toast: {
            id: String(Date.now()),
            message: 'Orbit is active. Paid with ' + methodLabel(method) + '.',
            tone: 'success',
          },
        })
        setBusy(null)
        return
      }
      window.location.assign(session.url)
    } catch (reason) {
      setError((reason as Error).message)
      setBusy(null)
    }
  }

  return (
    <section className="payment-tool" aria-labelledby="payment-tool-title">
      <header>
        <span><CreditCard size={13} /> {mode === 'onboarding' ? 'PICK A PLAN' : 'PAYMENT'}</span>
        <h3 id="payment-tool-title">{mode === 'onboarding' ? 'Start on Free, or unlock every Mini App with Orbit.' : 'Upgrade to Orbit any time. Pay with card, WeChat or Alipay.'}</h3>
        <p>Free is included with every account. Orbit is $9 a month and adds the complete Mini App suite.</p>
      </header>

      {loading && <div className="payment-tool-status">Loading payment options…</div>}
      {error && <div className="payment-tool-error" role="alert">{error}</div>}

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
                <b>{formatPrice(plan.price_cents)}{plan.price_cents > 0 ? <em>/mo</em> : null}</b>
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
                <div className="payment-current-note">Choose a payment method below to subscribe.</div>
              )}
            </article>
          )
        })}
      </div>

      {currentPlan !== 'orbit' && (
        <>
          <div className="payment-methods is-three">
            <button type="button" className={payMethod === 'card' ? 'is-active' : ''} onClick={() => setPayMethod('card')}>
              银行卡
            </button>
            <button type="button" className={payMethod === 'wechat' ? 'is-active' : ''} onClick={() => setPayMethod('wechat')}>
              微信
            </button>
            <button type="button" className={payMethod === 'alipay' ? 'is-active' : ''} onClick={() => setPayMethod('alipay')}>
              支付宝
            </button>
          </div>

          {payMethod === 'wechat' || payMethod === 'alipay' ? (
            <div className="payment-card-form">
              <div className="payment-card-heading">
                <Lock size={16} />
                <div>
                  <strong>{payMethod === 'wechat' ? 'WeChat Pay' : 'Alipay'}</strong>
                  <small>Helios opens a {payMethod === 'wechat' ? 'WeChat' : 'Alipay'} checkout. The wallet never sends card details here.</small>
                </div>
              </div>
              <button type="button" disabled={busy !== null || !stripeEnabled} onClick={() => void payWithWallet(payMethod)}>
                <Lock size={14} />
                {busy === payMethod
                  ? 'Opening checkout…'
                  : stripeEnabled
                    ? 'Pay Orbit with ' + methodLabel(payMethod)
                    : 'Wallet checkout is not configured yet'}
              </button>
            </div>
          ) : (
            <form className="payment-card-form" onSubmit={event => void payWithCard(event)}>
              <div className="payment-card-heading">
                <CreditCard size={16} />
                <div>
                  <strong>Card checkout</strong>
                  <small>The card number and security code are never stored.</small>
                </div>
              </div>
              {billing?.payment_method && billing.payment_method.source !== 'wechat' && billing.payment_method.source !== 'alipay' && (
                <div className="payment-saved-card">
                  <Lock size={13} />
                  <span>
                    Saved {brandLabel(billing.payment_method.brand)} •••• {billing.payment_method.last4}
                    {billing.payment_method.source === 'stripe' ? ' via Stripe' : ''}
                    <em>Expires {String(billing.payment_method.exp_month).padStart(2, '0')}/{billing.payment_method.exp_year}</em>
                  </span>
                </div>
              )}
              <label>
                <span>Cardholder name</span>
                <input
                  value={name}
                  onChange={event => setName(event.target.value)}
                  autoComplete="cc-name"
                  maxLength={80}
                  placeholder="Name on card"
                />
              </label>
              <label>
                <span>Card number</span>
                <input
                  value={cardNumber}
                  onChange={event => setCardNumber(formatCardNumber(event.target.value))}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  placeholder="4242 4242 4242 4242"
                />
              </label>
              <div className="payment-card-row">
                <label>
                  <span>Expiry</span>
                  <input
                    value={expiry}
                    onChange={event => setExpiry(formatExpiry(event.target.value))}
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    placeholder="MM / YY"
                  />
                </label>
                <label>
                  <span>Security code</span>
                  <input
                    value={cvc}
                    onChange={event => setCvc(event.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    placeholder="CVC"
                  />
                </label>
              </div>
              <button type="submit" disabled={busy !== null || !cardReady}>
                <Lock size={14} />
                {busy === 'card' ? 'Paying…' : 'Pay Orbit with card'}
              </button>
            </form>
          )}
        </>
      )}

      {currentPlan === 'orbit' && billing?.payment_method && (
        <div className="payment-saved-card">
          <Lock size={13} />
          <span>
            {billing.payment_method.source === 'wechat' || billing.payment_method.brand === 'wechat'
              ? 'Orbit paid with WeChat'
              : billing.payment_method.source === 'alipay' || billing.payment_method.brand === 'alipay'
                ? 'Orbit paid with Alipay'
                : `Saved ${brandLabel(billing.payment_method.brand)} •••• ${billing.payment_method.last4}`}
          </span>
        </div>
      )}
    </section>
  )
}
