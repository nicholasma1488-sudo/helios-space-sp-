import { useState } from 'react'
import { Calendar, Loader } from 'lucide-react'
import { api } from '../api'
import { useApp } from '../store/appStore'
import { ADULT_AGE, PLAN_PRICE_RMB, planLabel } from '../product/audience'
import './AudienceModals.css'

export function BirthdayGate() {
  const { dispatch } = useApp()
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!dateOfBirth || loading) return
    setLoading(true)
    setError('')
    try {
      const result = await api.setBirthday(dateOfBirth)
      dispatch({ type: 'SET_USER', user: result.user })
      dispatch({ type: 'SET_PLAN_OPEN', open: true })
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="audience-overlay" role="dialog" aria-modal="true" aria-labelledby="birthday-title">
      <div className="audience-card">
        <span>DATE OF BIRTH</span>
        <h2 id="birthday-title">When were you born?</h2>
        <p>Helios uses this to detect whether you are a student or an adult. Students can stay on Free or choose Alpha. Adults can stay on Free or choose Orbit Plan. Paid plans are ¥{PLAN_PRICE_RMB} per month.</p>
        <label className="audience-date-field" htmlFor="account-dob">
          <Calendar size={16} />
          <input id="account-dob" type="date" value={dateOfBirth} onChange={event => setDateOfBirth(event.target.value)} required />
        </label>
        <small className="audience-hint">Ages {ADULT_AGE}+ are treated as adults. Under {ADULT_AGE} is treated as a student.</small>
        {error && <div className="audience-error" role="alert">{error}</div>}
        <button type="button" className="audience-primary" disabled={!dateOfBirth || loading} onClick={() => void submit()}>
          {loading && <Loader size={15} className="audience-spin" />}
          Continue
        </button>
        <p className="audience-hint">Next you can keep {planLabel('free')} or pick the matching paid plan.</p>
      </div>
    </div>
  )
}
