import { Sparkles, X } from 'lucide-react'
import { PaymentTool } from './PaymentTool'
import { useApp } from '../store/appStore'
import './PlanPicker.css'

export function UpgradeModal() {
  const { dispatch } = useApp()
  return (
    <div className="plan-picker" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <div className="plan-picker-panel">
        <header>
          <span><Sparkles size={14} /> UPGRADE</span>
          <h1 id="upgrade-title">Unlock Orbit and every Mini App.</h1>
          <p>
            Stay on Free, or subscribe to Orbit with a Stripe card. Helios detects the payment automatically. The upgrade button stays in the top-left until you are on Orbit.
          </p>
          <button
            type="button"
            className="upgrade-modal-close"
            onClick={() => dispatch({ type: 'CLOSE_UPGRADE' })}
            aria-label="Close upgrade"
          >
            <X size={16} />
          </button>
        </header>
        <PaymentTool mode="settings" />
      </div>
    </div>
  )
}
