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
            五个 Create 工具（墨语、随身本、格间、今日事、搭子码）一直可用。
            Free 已有充足文稿额度；Orbit 提供不限篇数与每篇 50 万字。
            Orbit 通过 Stripe 银行卡付款。
          </p>
        </header>
        <PaymentTool mode="onboarding" />
      </div>
    </div>
  )
}
