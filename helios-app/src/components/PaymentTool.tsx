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
    audience: 'all',
    eligible: true,
    description: 'Child or Adult edition from your date of birth. Word, Excel, PowerPoint and OneNote included.',
    features: [
      'Create a Helios account for free',
      'Word, Excel, PowerPoint, OneNote, and Stocks for adults',
      'Projects that stay connected to your feed',
      'Lifestyle, Chat Hub, and Live work',
    ],
  },
  {
    id: 'alpha',
    name: 'Alpha',
    price_cents: 399,
    currency: 'usd',
    interval: 'month',
    audience: 'child',
    description: 'The student upgrade: essays, gradebook, lessons, labs and homework in real files.',
    features: [
      'Everything in the Child edition',
      'Full school 365 suite',
      'Student price — less than half of Orbit',
      'Parent or guardian card / Stripe checkout',
    ],
  },
  {
    id: 'orbit',
    name: 'Orbit',
    price_cents: 900,
    currency: 'usd',
    interval: 'month',
    audience: 'adult',
    description: 'The work upgrade: documents, workbooks, decks, meetings and plans.',
    features: [
      'Everything in the Adult edition',
      'Full work 365 suite',
      'Priority Helios capacity when AI is configured',
      'Saved card or Stripe on file',
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
  if (brand === 'stripe') return 'Stripe'
  return 'Card'
}

function planLabel(id: BillingPlanId | string) {
  if (id === 'alpha') return 'Alpha'
  if (id === 'orbit') return 'Orbit'
  return 'Free'
}

export function PaymentTool({ mode = 'settings' }: { mode?: 'settings' | 'onboarding' }) {
  const { state, dispatch } = useApp()
  const [billing, setBilling] = useState<BillingSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [payMethod, setPayMethod] = useState<'card' | 'stripe'>('card')
  const [selectedPaid, setSelectedPaid] = useState<Exclude<BillingPlanId, 'free'> | null>(null)
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [name, setName] = useState(state.user?.name ?? '')

  useEffect(() => {
    let cancelled = false
    api.billing.get().then(snapshot => {
      if (cancelled) return
      setBilling(snapshot)
      const firstPaid = snapshot.plans.find(plan => plan.id !== 'free' && plan.eligible)
      if (firstPaid?.id === 'alpha' || firstPaid?.id === 'orbit') setSelectedPaid(firstPaid.id)
    }).catch(reason => {
      if (!cancelled) setError((reason as Error).message)
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const plans = billing?.plans?.length ? billing.plans : FALLBACK_PLANS
  const currentPlan = billing?.plan ?? state.user?.plan ?? 'free'
  const audience = billing?.audience ?? state.user?.audience ?? null
  const stripeEnabled = Boolean(billing?.stripe?.enabled)
  const paidPlan = selectedPaid || (audience === 'child' ? 'alpha' : 'orbit')
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
        toast: {
          id: String(Date.now()),
          message: audience === 'adult' ? 'You are on the Adult edition.' : 'You are on the Child edition.',
          tone: 'success',
        },
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
        plan: paidPlan,
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
          message: planLabel(result.billing.plan) + ' is active. Card saved as ' + brandLabel(result.billing.payment_method?.brand || 'card') + ' •••• ' + (result.billing.payment_method?.last4 || ''),
          tone: 'success',
        },
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
      const session = await api.billing.stripe(paidPlan)
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
        <h3 id="payment-tool-title">{mode === 'onboarding' ? 'Stay on your free edition, or unlock the full 365 suite.' : 'Child or Adult is free. Alpha and Orbit unlock the rest.'}</h3>
        <p>
          {audience === 'child'
            ? 'You are under 18, so you are on the Child edition. Alpha is the student upgrade. A parent or guardian should complete checkout.'
            : audience === 'adult'
              ? 'You are 18 or over, so you are on the Adult edition. Orbit is the work upgrade. Pay with card or Stripe.'
              : 'Helios uses your date of birth: Child + Alpha under 18, Adult + Orbit at 18+.'}
        </p>
      </header>

      {loading && <div className="payment-tool-status">Loading payment options…</div>}
      {error && <div className="payment-tool-error" role="alert">{error}</div>}

      <div className="payment-plan-grid is-three">
        {plans.map(plan => {
          const current = currentPlan === plan.id
          const eligible = plan.eligible !== false
          return (
            <article
              key={plan.id}
              className={
                'payment-plan'
                + (current ? ' is-current' : '')
                + (plan.id === 'orbit' ? ' is-orbit' : '')
                + (plan.id === 'alpha' ? ' is-alpha' : '')
                + (!eligible ? ' is-locked' : '')
              }
            >
              <div className="payment-plan-top">
                <i>{plan.id === 'free' ? <Gift size={16} /> : <Sparkles size={16} />}</i>
                <div>
                  <small>{plan.id === 'free' ? (audience === 'adult' ? 'ADULT EDITION' : 'CHILD EDITION') : plan.id === 'alpha' ? 'STUDENT UPGRADE' : 'WORK UPGRADE'}</small>
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
                  disabled={busy !== null || current}
                >
                  {current ? (audience === 'adult' ? 'Current Adult edition' : 'Current Child edition') : busy === 'free' ? 'Switching…' : audience === 'adult' ? 'Continue on Adult' : 'Continue on Child'}
                </button>
              ) : !eligible ? (
                <div className="payment-current-note">
                  {plan.id === 'alpha' ? 'Alpha is only for accounts under 18.' : 'Orbit is only for adults 18 and over.'}
                </div>
              ) : current ? (
                <div className="payment-current-note">{plan.name} is active on this account.</div>
              ) : (
                <button
                  type="button"
                  className={selectedPaid === plan.id ? 'payment-select-btn is-active' : 'payment-select-btn'}
                  onClick={() => setSelectedPaid(plan.id === 'alpha' ? 'alpha' : 'orbit')}
                >
                  {selectedPaid === plan.id ? 'Selected for checkout' : 'Choose ' + plan.name}
                </button>
              )}
            </article>
          )
        })}
      </div>

      {audience && (
        <div className="payment-methods">
          <button type="button" className={payMethod === 'card' ? 'is-active' : ''} onClick={() => setPayMethod('card')}>
            Card
          </button>
          <button type="button" className={payMethod === 'stripe' ? 'is-active' : ''} onClick={() => setPayMethod('stripe')}>
            Stripe
          </button>
        </div>
      )}

      {payMethod === 'stripe' ? (
        <div className="payment-card-form">
          <div className="payment-card-heading">
            <Lock size={16} />
            <div>
              <strong>Stripe checkout</strong>
              <small>Helios never sees the full card number when you pay with Stripe.</small>
            </div>
          </div>
          {audience === 'child' && <p className="payment-tool-status">Ask a parent or guardian to finish Stripe checkout for Alpha.</p>}
          <button type="button" disabled={busy !== null || !stripeEnabled} onClick={() => void payWithStripe()}>
            <Lock size={14} />
            {busy === 'stripe' ? 'Opening Stripe…' : stripeEnabled ? 'Pay ' + planLabel(paidPlan) + ' with Stripe' : 'Stripe is not configured yet'}
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
          {audience === 'child' && <p className="payment-tool-status">Ask a parent or guardian to enter the card for Alpha.</p>}
          {billing?.payment_method && (
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
            {busy === 'card' ? 'Paying…' : currentPlan === paidPlan ? 'Update card' : 'Pay ' + planLabel(paidPlan) + ' with card'}
          </button>
        </form>
      )}
    </section>
  )
}
