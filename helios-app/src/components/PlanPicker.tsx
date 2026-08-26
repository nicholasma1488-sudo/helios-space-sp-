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
            Word, Excel, PowerPoint and OneNote stay included. Free already has generous writing room.
            Orbit adds unlimited drafts, 500,000 characters per document, and the extra Mini Apps.
            Pay Orbit with a bank card on Stripe.
          </p>
        </header>
        <PaymentTool mode="onboarding" />
      </div>
    </div>
  )
}
