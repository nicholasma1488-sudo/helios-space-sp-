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
          <h1 id="upgrade-title">Need more writing room?</h1>
          <p>
            Spreadsheets and the core apps stay on Free. Orbit is for unlimited drafts, 500,000 characters per document, and the extra Mini Apps. Pay with a Stripe card — Helios detects the payment automatically.
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
