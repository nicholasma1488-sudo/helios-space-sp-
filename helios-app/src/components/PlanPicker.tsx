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
              ? 'You can stay on the free student edition, or unlock Alpha Mini Apps like Flash Cards, Homework Radar, Vocab Spark and Streak Arena.'
              : audience === 'adult'
                ? 'You can stay free, or unlock every Mini App with Orbit — Idea Vault, Meeting Pulse, Deep Work, Win Log and the full student lab.'
                : 'Stay free, or pick the paid plan that matches your age. The Mini Apps are the reason people upgrade.'}
          </p>
        </header>
        <PaymentTool mode="onboarding" />
      </div>
    </div>
  )
}
