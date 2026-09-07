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
          <h1 id="upgrade-title">无需升级</h1>
          <p>Helios Space 完全免费。没有 Orbit，也没有付费墙。</p>
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
