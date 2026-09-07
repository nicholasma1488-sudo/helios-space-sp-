import { Gift } from 'lucide-react'
import { PaymentTool } from './PaymentTool'
import './PlanPicker.css'

export function PlanPicker() {
  return (
    <div className="plan-picker" role="dialog" aria-modal="true" aria-labelledby="plan-picker-title">
      <div className="plan-picker-panel">
        <header>
          <span><Gift size={14} /> FREE FOREVER</span>
          <h1 id="plan-picker-title">Helios Space is completely free</h1>
          <p>There are no plans to choose. All five Create tools, Space, and Messages are open.</p>
        </header>
        <PaymentTool mode="onboarding" />
      </div>
    </div>
  )
}
