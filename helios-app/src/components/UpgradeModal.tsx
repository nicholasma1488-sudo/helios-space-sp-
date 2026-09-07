import { Gift, X } from 'lucide-react'
import { PaymentTool } from './PaymentTool'
import { useApp } from '../store/appStore'
import './PlanPicker.css'

export function UpgradeModal() {
  const { dispatch } = useApp()
  return (
    <div className="plan-picker" role="dialog" aria-modal="true" aria-labelledby="upgrade-title">
      <div className="plan-picker-panel">
        <header>
          <span><Gift size={14} /> FREE FOREVER</span>
          <h1 id="upgrade-title">No upgrade needed</h1>
          <p>Helios Space is completely free. There is no Orbit, and no paywall.</p>
          <button
            type="button"
            className="upgrade-modal-close"
            onClick={() => dispatch({ type: 'CLOSE_UPGRADE' })}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>
        <PaymentTool mode="settings" />
      </div>
    </div>
  )
}
