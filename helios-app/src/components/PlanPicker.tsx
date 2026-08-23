import { Sparkles } from 'lucide-react'
import { PaymentTool } from './PaymentTool'
import { useApp } from '../store/appStore'
import './PlanPicker.css'

export function PlanPicker() {
  const { state } = useApp()
  const audience = state.user?.audience
  return (
    <div className="plan-picker" role="dialog" aria-modal="true" aria-labelledby="plan-picker-title">
      <div className="plan-picker-panel">
        <header>
          <span><Sparkles size={14} /> AFTER YOUR ACCOUNT</span>
          <h1 id="plan-picker-title">Choose a plan before you enter Helios.</h1>
          <p>
            {audience === 'child'
              ? 'You start on the Child edition: Word, Excel, PowerPoint and OneNote for school. Alpha unlocks essays, gradebook, lessons, labs and homework — real files, not scratch pads.'
              : audience === 'adult'
                ? 'You start on the Adult edition: Word, Excel, PowerPoint, OneNote and a Stocks watchlist you can open any time. Orbit unlocks the full work suite.'
                : 'Stay on your free Child or Adult edition, or unlock Alpha (students) or Orbit (work).'}
          </p>
        </header>
        <PaymentTool mode="onboarding" />
      </div>
    </div>
  )
}
