import { useState } from 'react'
import { Briefcase, Check, GraduationCap, Loader, X } from 'lucide-react'
import { api, type PlanId } from '../api'
import { useApp } from '../store/appStore'
import { PLAN_PRICE_RMB, paidPlanForUser, planLabel } from '../product/audience'
import { useFocusTrap } from '../hooks/useFocusTrap'
import './AudienceModals.css'

const ORBIT_BENEFITS = [
  'Workplace Spaces: standups, 1:1s, reviews and team notes',
  'Career tools: job search, interviews, offers and networking',
  'Finance tools: salary, invoices, tax notes and expenses',
  'More mature City Life content for housing and independent living',
]

const ALPHA_BENEFITS = [
  'Alpha studio for exams, revision and study sprints',
  'Scholarship board and college application drafts',
  'Guided revision notes that stay bound to your Projects',
  'Student-only extras on top of the free school Spaces',
]

export function PlanPickerModal({ onClose }: { onClose?: () => void }) {
  const { state, dispatch } = useApp()
  const trapRef = useFocusTrap<HTMLDivElement>()
  const paidPlan = paidPlanForUser(state.user)
  const [choice, setChoice] = useState<PlanId>(state.user?.plan_id && state.user.plan_id !== 'free' ? state.user.plan_id : 'free')
  const [method, setMethod] = useState<'wechat' | 'alipay'>('wechat')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const currentPaid = state.user?.plan_id === paidPlan

  function close() {
    sessionStorage.setItem('helios-plan-seen', '1')
    dispatch({ type: 'SET_PLAN_OPEN', open: false })
    onClose?.()
  }

  async function confirm() {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const result = choice === 'free'
        ? await api.setPlan('free')
        : await api.setPlan(choice, method)
      dispatch({ type: 'SET_USER', user: result.user })
      dispatch({
        type: 'PUSH_TOAST',
        toast: {
          id: String(Date.now()),
          message: result.user.plan_id === 'free'
            ? 'You are on the free version'
            : `${planLabel(result.user.plan_id)} is active for ¥${PLAN_PRICE_RMB}/month`,
          tone: 'success',
        },
      })
      close()
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const paidLabel = planLabel(paidPlan)
  const benefits = paidPlan === 'alpha' ? ALPHA_BENEFITS : ORBIT_BENEFITS

  return (
    <div className="audience-overlay" onClick={close}>
      <div
        className="audience-card audience-paywall"
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-picker-title"
        onClick={event => event.stopPropagation()}
      >
        <button type="button" className="audience-close" onClick={close} aria-label="Close plan picker">
          <X size={16} />
        </button>
        <span>{state.user?.account_kind === 'student' ? 'STUDENT' : 'ADULT'}</span>
        <h2 id="plan-picker-title">
          {state.user?.account_kind === 'student' ? 'Free version or Alpha' : 'Free version or Orbit Plan'}
        </h2>
        <p>
          {state.user?.account_kind === 'student'
            ? `Your date of birth shows you are a student. Stay on Free, or unlock Alpha for ¥${PLAN_PRICE_RMB}/month.`
            : `Your date of birth shows you are an adult. Stay on Free, or unlock Orbit Plan for ¥${PLAN_PRICE_RMB}/month.`}
        </p>
        <div className="audience-choice-grid">
          <button type="button" className={choice === 'free' ? 'is-selected' : ''} onClick={() => setChoice('free')} aria-pressed={choice === 'free'}>
            <i>{state.user?.account_kind === 'student' ? <GraduationCap size={22} /> : <Briefcase size={22} />}</i>
            <strong>Free</strong>
            <small>School and hobby Spaces with no monthly fee.</small>
          </button>
          <button type="button" className={choice === paidPlan ? 'is-selected' : ''} onClick={() => setChoice(paidPlan || 'orbit')} aria-pressed={choice === paidPlan} disabled={!paidPlan}>
            <i>{paidPlan === 'alpha' ? <GraduationCap size={22} /> : <Briefcase size={22} />}</i>
            <strong>{paidLabel}</strong>
            <small>¥{PLAN_PRICE_RMB}/month · {paidPlan === 'alpha' ? 'student extras' : 'work and mature content'}</small>
          </button>
        </div>
        <ul>
          {benefits.map(item => (
            <li key={item}><Check size={14} />{item}</li>
          ))}
        </ul>
        {currentPaid && choice !== 'free' ? (
          <p className="audience-active">
            {paidLabel} is already active{state.user?.plan_expires_at ? ` until ${new Date(state.user.plan_expires_at).toLocaleDateString()}` : ''}.
          </p>
        ) : (
          <>
            {choice !== 'free' && (
              <div className="audience-methods" role="radiogroup" aria-label="Payment method">
                <button type="button" className={method === 'wechat' ? 'is-selected' : ''} onClick={() => setMethod('wechat')} aria-pressed={method === 'wechat'}>WeChat Pay</button>
                <button type="button" className={method === 'alipay' ? 'is-selected' : ''} onClick={() => setMethod('alipay')} aria-pressed={method === 'alipay'}>Alipay</button>
              </div>
            )}
            {error && <div className="audience-error" role="alert">{error}</div>}
            <button type="button" className="audience-primary" disabled={loading || (!paidPlan && choice !== 'free')} onClick={() => void confirm()}>
              {loading ? <Loader size={15} className="audience-spin" /> : choice === 'free' ? <Check size={15} /> : paidPlan === 'alpha' ? <GraduationCap size={15} /> : <Briefcase size={15} />}
              {loading ? 'Saving…' : choice === 'free' ? 'Continue with Free' : `Pay ¥${PLAN_PRICE_RMB} for ${paidLabel}`}
            </button>
            <button type="button" className="audience-secondary" onClick={close}>Not now</button>
          </>
        )}
      </div>
    </div>
  )
}
