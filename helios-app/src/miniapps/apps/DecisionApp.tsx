import { useEffect, useRef, useState } from 'react'
import { Plus, Shuffle, Trash2 } from 'lucide-react'
import { useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

interface DecisionData { options: string[]; result: string; history: string[] }

export default function DecisionApp({ accountId }: MiniAppProps) {
  const [decision, setDecision] = useAccountState<DecisionData>(accountId, 'decision', { options: ['', ''], result: '', history: [] })
  const [spinning, setSpinning] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  function choose() {
    const options = decision.options.map(option => option.trim()).filter(Boolean)
    if (options.length < 2 || spinning) return
    setSpinning(true)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const result = options[Math.floor(Math.random() * options.length)]
      setDecision(current => ({ ...current, result, history: [result, ...current.history].slice(0, 5) }))
      setSpinning(false)
    }, 420)
  }

  return (
    <div className="decision-app">
      <div className={'decision-result' + (spinning ? ' is-spinning' : '')}>
        <span>{spinning ? 'CONSULTING THE ORBIT' : decision.result ? 'YOUR NEXT MOVE' : 'TWO GOOD OPTIONS?'}</span>
        <strong>{spinning ? '···' : decision.result || 'Let momentum choose.'}</strong>
      </div>
      <div className="decision-options">
        {decision.options.map((option, index) => (
          <div key={index}>
            <span>{index + 1}</span>
            <input value={option} maxLength={80} onChange={event => setDecision(current => ({ ...current, options: current.options.map((item, itemIndex) => itemIndex === index ? event.target.value : item), result: '' }))} placeholder={'Option ' + (index + 1)} />
            {decision.options.length > 2 && (
              <button type="button" onClick={() => setDecision(current => ({ ...current, options: current.options.filter((_, itemIndex) => itemIndex !== index), result: '' }))} aria-label={'Remove option ' + (index + 1)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="decision-actions">
        <button type="button" onClick={() => setDecision(current => ({ ...current, options: [...current.options, ''], result: '' }))} disabled={decision.options.length >= 6}><Plus size={16} /> Add option</button>
        <button type="button" className="decision-choose" onClick={choose} disabled={decision.options.filter(option => option.trim()).length < 2 || spinning}><Shuffle size={17} /> Choose for me</button>
      </div>
    </div>
  )
}
