import { leavePay } from '../product/pay'
import { useEffect } from 'react'
import { Check, Gift, Sparkles } from 'lucide-react'
import { Logo } from '../components/Logo'
import './PaymentPage.css'

/** Legacy /pay route — Helios Space is completely free. */
export function PaymentPage() {
  useEffect(() => {
    const timer = window.setTimeout(() => leavePay('/'), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="pay-page">
      <header className="pay-top">
        <Logo size="sm" />
        <button type="button" className="liquid-glass-btn" onClick={() => leavePay('/')}>
          Back to Helios
        </button>
      </header>
      <main className="pay-main">
        <span className="pay-kicker"><Gift size={14} /> FREE FOREVER</span>
        <h1>Helios Space is completely free</h1>
        <p>No plans, no upgrades, and no bank card. Taking you back to the collaboration space…</p>
        <ul className="pay-free-list">
          <li><Check size={14} /> All five Create tools available</li>
          <li><Check size={14} /> Space · Messages · Home</li>
          <li><Check size={14} /> Unlimited documents and characters</li>
        </ul>
        <button type="button" className="liquid-glass-btn is-primary" onClick={() => leavePay('/')}>
          <Sparkles size={15} /> Enter Helios
        </button>
      </main>
    </div>
  )
}
