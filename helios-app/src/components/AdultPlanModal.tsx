import { useState } from 'react'
import { Briefcase, Check, Loader, X } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../store/appStore'
import { ADULT_PLAN_PRICE_RMB, hasAdultPlan } from '../product/audience'
import { useFocusTrap } from '../hooks/useFocusTrap'
import './AudienceModals.css'

const BENEFITS = [
  'Workplace Spaces: standups, 1:1s, reviews and team notes',
  'Career tools: job search, interviews, offers and networking',
  'Finance tools: salary, invoices, tax notes and expenses',
  'More mature City Life content for housing and independent living',
]

export function AdultPlanModal({ onClose }: { onClose?: () => void }) {
  const { state, dispatch } = useApp()
  const trapRef = useFocusTrap<HTMLDivElement>()
  const [method, setMethod] = useState<'wechat' | 'alipay'>('wechat')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const alreadyActive = hasAdultPlan(state.user)

  function close() {
    sessionStorage.setItem('helios-adult-plan-seen', '1')
    dispatch({ type: 'SET_ADULT_PLAN_OPEN', open: false })
    onClose?.()
  }

  async function pay() {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const result = await api.subscribeAdultPlan(method)
      dispatch({ type: 'SET_USER', user: result.user })
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: `Adult Work Plan is active for ¥${ADULT_PLAN_PRICE_RMB}/month`, tone: 'success' },
      })
      close()
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="audience-overlay" onClick={close}>
      <div
        className="audience-card audience-paywall"
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="adult-plan-title"
        onClick={event => event.stopPropagation()}
      >
        <button type="button" className="audience-close" onClick={close} aria-label="Close Adult Work Plan">
          <X size={16} />
        </button>
        <span>ADULT WORK PLAN</span>
        <h2 id="adult-plan-title">Unlock work tools and more mature content</h2>
        <p>Adults pay ¥{ADULT_PLAN_PRICE_RMB} per month for functions dedicated to work, career and independent city life. Students keep the free school experience.</p>
        <div className="audience-price"><strong>¥{ADULT_PLAN_PRICE_RMB}</strong><small>/ month</small></div>
        <ul>
          {BENEFITS.map(item => (
            <li key={item}><Check size={14} />{item}</li>
          ))}
        </ul>
        {alreadyActive ? (
          <p className="audience-active">Your plan is already active{state.user?.adult_plan_expires_at ? ` until ${new Date(state.user.adult_plan_expires_at).toLocaleDateString()}` : ''}.</p>
        ) : (
          <>
            <div className="audience-methods" role="radiogroup" aria-label="Payment method">
              <button type="button" className={method === 'wechat' ? 'is-selected' : ''} onClick={() => setMethod('wechat')} aria-pressed={method === 'wechat'}>
                WeChat Pay
              </button>
              <button type="button" className={method === 'alipay' ? 'is-selected' : ''} onClick={() => setMethod('alipay')} aria-pressed={method === 'alipay'}>
                Alipay
              </button>
            </div>
            {error && <div className="audience-error" role="alert">{error}</div>}
            <button type="button" className="audience-primary" disabled={loading} onClick={() => void pay()}>
              {loading ? <Loader size={15} className="audience-spin" /> : <Briefcase size={15} />}
              {loading ? 'Confirming…' : `Pay ¥${ADULT_PLAN_PRICE_RMB} and unlock`}
            </button>
            <button type="button" className="audience-secondary" onClick={close}>Not now — keep student Spaces</button>
          </>
        )}
      </div>
    </div>
  )
}
