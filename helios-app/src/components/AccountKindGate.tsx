import { useState } from 'react'
import { Briefcase, GraduationCap, Loader } from 'lucide-react'
import { api, type AccountKind } from '../api'
import { useApp } from '../store/appStore'
import { ADULT_PLAN_PRICE_RMB } from '../product/audience'
import './AudienceModals.css'

export function AccountKindGate() {
  const { dispatch } = useApp()
  const [kind, setKind] = useState<Exclude<AccountKind, ''> | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!kind || loading) return
    setLoading(true)
    setError('')
    try {
      const result = await api.setAccountKind(kind)
      dispatch({ type: 'SET_USER', user: result.user })
      if (kind === 'adult' && !result.user.adult_plan_active)
        dispatch({ type: 'SET_ADULT_PLAN_OPEN', open: true })
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="audience-overlay" role="dialog" aria-modal="true" aria-labelledby="account-kind-title">
      <div className="audience-card">
        <span>WELCOME TO HELIOS</span>
        <h2 id="account-kind-title">Are you a student or an adult?</h2>
        <p>This chooses the Spaces you see first. Adults can unlock workplace tools and more mature independent-living content for ¥{ADULT_PLAN_PRICE_RMB} per month.</p>
        <div className="audience-choice-grid">
          <button type="button" className={kind === 'student' ? 'is-selected' : ''} onClick={() => setKind('student')} aria-pressed={kind === 'student'}>
            <i><GraduationCap size={22} /></i>
            <strong>Student</strong>
            <small>Free school subjects, hobbies and classroom tools.</small>
          </button>
          <button type="button" className={kind === 'adult' ? 'is-selected' : ''} onClick={() => setKind('adult')} aria-pressed={kind === 'adult'}>
            <i><Briefcase size={22} /></i>
            <strong>Adult</strong>
            <small>Workplace, career, finance and city-life tools for ¥{ADULT_PLAN_PRICE_RMB}/month.</small>
          </button>
        </div>
        {error && <div className="audience-error" role="alert">{error}</div>}
        <button type="button" className="audience-primary" disabled={!kind || loading} onClick={() => void submit()}>
          {loading && <Loader size={15} className="audience-spin" />}
          Continue
        </button>
      </div>
    </div>
  )
}
