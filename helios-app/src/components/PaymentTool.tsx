import { useEffect, useMemo, useState } from 'react'
import { Check, CreditCard, Gift, Lock, Sparkles } from 'lucide-react'
import {
  api,
  type BillingPlan,
  type BillingPlanId,
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
    currency: 'usd',
    interval: 'month',
    description: 'Start building without a card.',
    features: [
      'Subjects and Hobby Spaces',
      'Projects, Mini Apps, and workspaces',
      'Lifestyle feed, Chat, and Live',
      'No card required',
    ],
  },
  {
    id: 'orbit',
    name: 'Orbit',
    price_cents: 900,
    currency: 'usd',
    interval: 'month',
    description: 'Pay with card to support Helios and keep a payment method on file.',
    features: [
      'Everything in Free',
      'Priority Helios capacity when AI is configured',
      'Saved card on file',
      'Help keep the Space running',
    ],
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
  return 'Card'
}

export function PaymentTool() {
  const { state, dispatch } = useApp()
  const [billing, setBilling] = useState<BillingSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<BillingPlanId | null>(null)
  const [error, setError] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState(state.user?.name ?? '')

  useEffect(() => {
    let cancelled = false
    api.billing.get().then(snapshot => {
      if (!cancelled) setBilling(snapshot)
    }).catch(reason => {
      if (!cancelled) setError((reason as Error).message)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const plans = billing?.plans?.length ? billing.plans : FALLBACK_PLANS
  const currentPlan = billing?.plan ?? state.user?.plan ?? 'free'
  const cardReady = useMemo(() => {
    const digits = cardNumber.replace(/\D/g, '')
    const expiryDigits = expiry.replace(/\D/g, '')
    return digits.length >= 13 && expiryDigits.length === 4 && cvc.replace(/\D/g, '').length >= 3 && name.trim().length >= 2
  }, [cardNumber, expiry, cvc, name])

  function applyUser(user: User) {
    dispatch({ type: 'SET_USER', user })
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
        toast: { id: String(Date.now()), message: 'You are on the free option.', tone: 'success' },
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
    const month = Number(expiryDigits.slice(0, 2))
    const year = Number(expiryDigits.slice(2))
    setBusy('orbit')
    setError('')
    try {
      const result = await api.billing.checkout({
        plan: 'orbit',
        card: {
          number,
          exp_month: month,
          exp_year: year,
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
        toast: { id: String(Date.now()), message: 'Orbit is active. Card saved as ' + brandLabel(result.billing.payment_method?.brand || 'card') + ' •••• ' + (result.billing.payment_method?.last4 || ''), tone: 'success' },
      })
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="payment-tool" aria-labelledby="payment-tool-title">
      <header>
        <span><CreditCard size={13} /> PAYMENT</span>
        <h3 id="payment-tool-title">Pay with card, or stay free</h3>
        <p>Choose the free option at any time. Orbit accepts a card and keeps only the brand and last four digits.</p>
      </header>

      {loading && <div className="payment-tool-status">Loading payment options…</div>}
      {error && <div className="payment-tool-error" role="alert">{error}</div>}

      <div className="payment-plan-grid">
        {plans.map(plan => {
          const current = currentPlan === plan.id
          return (
            <article key={plan.id} className={'payment-plan' + (current ? ' is-current' : '') + (plan.id === 'orbit' ? ' is-orbit' : '')}>
              <div className="payment-plan-top">
                <i>{plan.id === 'free' ? <Gift size={16} /> : <Sparkles size={16} />}</i>
                <div>
                  <small>{plan.id === 'free' ? 'NO CARD' : 'PAY WITH CARD'}</small>
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
              {plan.id === 'free' ? (
                <button
                  type="button"
                  className="payment-free-btn"
                  onClick={() => void chooseFree()}
                  disabled={busy !== null || current}
                >
                  {current ? 'Current free option' : busy === 'free' ? 'Switching…' : 'Continue free'}
                </button>
              ) : current ? (
                <div className="payment-current-note">Orbit is active on this account.</div>
              ) : (
                <div className="payment-current-note">Enter a card below to switch to Orbit.</div>
              )}
            </article>
          )
        })}
      </div>

      <form className="payment-card-form" onSubmit={event => void payWithCard(event)}>
        <div className="payment-card-heading">
          <CreditCard size={16} />
          <div>
            <strong>Card checkout</strong>
            <small>The card number and security code are never stored.</small>
          </div>
        </div>
        {billing?.payment_method && (
          <div className="payment-saved-card">
            <Lock size={13} />
            <span>
              Saved {brandLabel(billing.payment_method.brand)} •••• {billing.payment_method.last4}
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
          {busy === 'orbit' ? 'Paying…' : currentPlan === 'orbit' ? 'Update card' : 'Pay with card'}
        </button>
      </form>
    </section>
  )
}
