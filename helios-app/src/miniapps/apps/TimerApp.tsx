import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'

type Mode = 'countdown' | 'stopwatch'

const PRESETS = [1, 5, 10, 25, 45]

function format(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  const s = safe % 60
  return (h ? String(h).padStart(2, '0') + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
}

export default function TimerApp() {
  const [mode, setMode] = useState<Mode>('countdown')
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(5 * 60)
  const [duration, setDuration] = useState(5 * 60)
  const [elapsed, setElapsed] = useState(0)
  const endAt = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    const tick = () => {
      if (mode === 'countdown') {
        const next = endAt.current ? Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)) : remaining
        setRemaining(next)
        if (next === 0) {
          setRunning(false)
          endAt.current = null
        }
      } else {
        setElapsed(current => current + 0.2)
      }
    }
    const id = window.setInterval(tick, 200)
    return () => window.clearInterval(id)
  }, [mode, remaining, running])

  function startPause() {
    if (running) {
      if (mode === 'countdown' && endAt.current) setRemaining(Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000)))
      endAt.current = null
      setRunning(false)
      return
    }
    if (mode === 'countdown') {
      const next = remaining || duration
      setRemaining(next)
      endAt.current = Date.now() + next * 1000
    }
    setRunning(true)
  }

  function reset(next = duration) {
    setRunning(false)
    endAt.current = null
    setDuration(next)
    setRemaining(next)
    setElapsed(0)
  }

  return (
    <div className="focus-app">
      <div className="tool-tabs">
        <button type="button" className={mode === 'countdown' ? 'is-on' : ''} onClick={() => { setMode('countdown'); reset(duration) }}>Countdown</button>
        <button type="button" className={mode === 'stopwatch' ? 'is-on' : ''} onClick={() => { setMode('stopwatch'); reset(duration) }}>Stopwatch</button>
      </div>
      {mode === 'countdown' && (
        <div className="focus-presets">
          {PRESETS.map(minutes => (
            <button key={minutes} type="button" aria-pressed={duration === minutes * 60} onClick={() => reset(minutes * 60)}>{minutes} min</button>
          ))}
        </div>
      )}
      <div className="focus-orbit">
        <div className="focus-orbit-inner">
          <span>{running ? 'RUNNING' : remaining === 0 && mode === 'countdown' ? 'DONE' : 'READY'}</span>
          <strong>{mode === 'countdown' ? format(remaining) : format(elapsed)}</strong>
        </div>
      </div>
      <div className="focus-actions">
        <button type="button" className="focus-primary" onClick={startPause}>
          {running ? <Pause size={18} /> : <Play size={18} />}
          {running ? 'Pause' : 'Start'}
        </button>
        <button type="button" onClick={() => reset()} aria-label="Reset"><RotateCcw size={18} /></button>
      </div>
    </div>
  )
}
