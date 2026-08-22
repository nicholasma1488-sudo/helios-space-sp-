import { useEffect } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'
import { useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

interface FocusData {
  phase: 'focus' | 'break'
  duration: number
  remaining: number
  running: boolean
  endAt: number | null
  sessions: number
}

export default function PomodoroApp({ accountId }: MiniAppProps) {
  const [focus, setFocus] = useAccountState<FocusData>(accountId, 'focus', {
    phase: 'focus',
    duration: 25 * 60,
    remaining: 25 * 60,
    running: false,
    endAt: null,
    sessions: 0,
  })

  useEffect(() => {
    if (!focus.running || !focus.endAt) return
    const tick = () => {
      setFocus(current => {
        if (!current.running || !current.endAt) return current
        const remaining = Math.max(0, Math.ceil((current.endAt - Date.now()) / 1000))
        if (remaining === 0) {
          if (current.phase === 'focus') {
            return { phase: 'break', duration: 5 * 60, remaining: 5 * 60, running: false, endAt: null, sessions: current.sessions + 1 }
          }
          return { phase: 'focus', duration: 25 * 60, remaining: 25 * 60, running: false, endAt: null, sessions: current.sessions }
        }
        return remaining === current.remaining ? current : { ...current, remaining }
      })
    }
    tick()
    const id = window.setInterval(tick, 500)
    return () => window.clearInterval(id)
  }, [focus.endAt, focus.running, setFocus])

  const minutes = Math.floor(focus.remaining / 60)
  const seconds = focus.remaining % 60
  const progress = 1 - focus.remaining / Math.max(focus.duration, 1)

  function startPause() {
    setFocus(current => {
      if (current.running) {
        const remaining = current.endAt ? Math.max(0, Math.ceil((current.endAt - Date.now()) / 1000)) : current.remaining
        return { ...current, running: false, endAt: null, remaining }
      }
      return { ...current, running: true, endAt: Date.now() + current.remaining * 1000 }
    })
  }

  function reset(phase: FocusData['phase'] = 'focus') {
    const duration = phase === 'focus' ? 25 * 60 : 5 * 60
    setFocus(current => ({ ...current, phase, duration, remaining: duration, running: false, endAt: null }))
  }

  return (
    <div className="focus-app">
      <div className="tool-tabs">
        <button type="button" className={focus.phase === 'focus' ? 'is-on' : ''} onClick={() => reset('focus')}>Focus 25</button>
        <button type="button" className={focus.phase === 'break' ? 'is-on' : ''} onClick={() => reset('break')}>Break 5</button>
      </div>
      <div className="focus-orbit" style={{ '--focus-progress': String(progress * 360) + 'deg' } as React.CSSProperties}>
        <div className="focus-orbit-inner">
          <span>{focus.running ? (focus.phase === 'focus' ? 'IN FOCUS' : 'ON BREAK') : 'READY'}</span>
          <strong>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</strong>
          <small>{focus.sessions} session{focus.sessions === 1 ? '' : 's'} completed</small>
        </div>
      </div>
      <div className="focus-actions">
        <button type="button" className="focus-primary" onClick={startPause}>
          {focus.running ? <Pause size={18} /> : <Play size={18} />}
          {focus.running ? 'Pause' : 'Start'}
        </button>
        <button type="button" onClick={() => reset(focus.phase)} aria-label="Reset pomodoro"><RotateCcw size={18} /></button>
      </div>
    </div>
  )
}
