import { Sparkles } from 'lucide-react'
import { PaymentTool } from './PaymentTool'
import './PlanPicker.css'

export function PlanPicker() {
  return (
    <div className="plan-picker" role="dialog" aria-modal="true" aria-labelledby="plan-picker-title">
      <div className="plan-picker-panel">
        <header>
          <span><Sparkles size={14} /> AFTER YOUR ACCOUNT</span>
          <h1 id="plan-picker-title">Use Free, or subscribe to Orbit.</h1>
          <p>
            Free includes Word, Excel, PowerPoint and OneNote. Orbit unlocks the full Mini App suite.
            Pay Orbit with card, WeChat or Alipay.
          </p>
        </header>
        <PaymentTool mode="onboarding" />
      </div>
    </div>
  )
}
