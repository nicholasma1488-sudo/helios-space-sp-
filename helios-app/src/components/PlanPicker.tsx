import { Gift } from 'lucide-react'
import { PaymentTool } from './PaymentTool'
import './PlanPicker.css'

export function PlanPicker() {
  return (
    <div className="plan-picker" role="dialog" aria-modal="true" aria-labelledby="plan-picker-title">
      <div className="plan-picker-panel">
        <header>
          <span><Gift size={14} /> FREE FOREVER</span>
          <h1 id="plan-picker-title">Helios Space 完全免费</h1>
          <p>没有套餐可以选择。五个 Create 工具、Space 与 Messages 全部开放。</p>
        </header>
        <PaymentTool mode="onboarding" />
      </div>
    </div>
  )
}
