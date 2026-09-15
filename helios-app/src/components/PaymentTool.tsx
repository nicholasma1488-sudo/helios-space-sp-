import { Check, Gift, Sparkles } from 'lucide-react'
import './PaymentTool.css'

/** Billing UI retired — Helios Space is completely free. */
export function PaymentTool({ mode = 'settings' }: { mode?: 'settings' | 'onboarding' }) {
  return (
    <div className="payment-tool is-free-forever" aria-labelledby="payment-tool-title">
      <header>
        <span><Gift size={13} /> FREE FOREVER</span>
        <h3 id="payment-tool-title">
          {mode === 'onboarding' ? 'Helios Space is completely free' : 'No payment needed'}
        </h3>
        <p>No plans, no upgrades. Create an account and use all of Create, Space, and Messages.</p>
      </header>
      <ul className="payment-free-points">
        <li><Check size={14} /> Docs, Sheets, Slides, Notebook, Code, and more</li>
        <li><Check size={14} /> Unlimited documents and characters</li>
        <li><Check size={14} /> No card required</li>
      </ul>
      <div className="payment-current-note">
        <Sparkles size={14} /> You are already in free Helios Space.
      </div>
    </div>
  )
}
