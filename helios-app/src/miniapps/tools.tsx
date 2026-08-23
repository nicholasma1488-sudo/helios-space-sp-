import { useEffect, useMemo, useRef, useState } from 'react'

function useLocal<T>(key: string, initial: T) {
  const initialRef = useRef(initial)
  const [value, setValue] = useState<T>(initial)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      setValue(raw ? JSON.parse(raw) as T : initialRef.current)
    } catch {
      setValue(initialRef.current)
    } finally {
      setReady(true)
    }
  }, [key])
  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  }, [key, ready, value])
  return [value, setValue] as const
}

export function CalculatorApp() {
  const [expr, setExpr] = useState('0')
  const [error, setError] = useState('')
  function press(token: string) {
    setError('')
    setExpr(current => current === '0' && /[0-9.]/.test(token) ? token : current + token)
  }
  function evaluate() {
    try {
      const sanitized = expr.replace(/[^0-9+\-*/().%\s]/g, '')
      const result = Function(`"use strict"; return (${sanitized.replace(/%/g, '/100')})`)()
      if (!Number.isFinite(result)) throw new Error('Invalid')
      setExpr(String(result))
    } catch {
      setError('Could not evaluate that expression')
    }
  }
  const keys = ['C', '(', ')', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '%', '=']
  return (
    <div className="tool-calc">
      <output aria-live="polite">{expr}</output>
      {error && <p className="tool-error">{error}</p>}
      <div className="tool-calc-grid">
        {keys.map(key => (
          <button
            key={key}
            type="button"
            onClick={() => {
              if (key === 'C') { setExpr('0'); setError('') }
              else if (key === '=') evaluate()
              else press(key)
            }}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ScientificCalculatorApp() {
  const [expr, setExpr] = useState('sin(pi/2)')
  const [result, setResult] = useState('1')
  function run() {
    try {
      const fn = Function(
        'sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'abs', 'pi', 'e', 'pow',
        `"use strict"; return (${expr})`,
      )
      const value = fn(Math.sin, Math.cos, Math.tan, Math.log10, Math.log, Math.sqrt, Math.abs, Math.PI, Math.E, Math.pow)
      if (!Number.isFinite(value)) throw new Error('Invalid')
      setResult(String(value))
    } catch {
      setResult('Error')
    }
  }
  return (
    <div className="tool-stack">
      <label>
        Expression
        <input value={expr} onChange={event => setExpr(event.target.value)} aria-label="Scientific expression" />
      </label>
      <div className="tool-sci-ops">
        {['sin(', 'cos(', 'tan(', 'ln(', 'log(', 'sqrt(', 'pi', 'e', 'pow('].map(token => (
          <button key={token} type="button" onClick={() => setExpr(current => current + token)}>{token}</button>
        ))}
      </div>
      <button type="button" className="os-btn is-primary" onClick={run}>Evaluate</button>
      <output aria-live="polite">{result}</output>
    </div>
  )
}

const UNIT_SETS = {
  Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, ft: 0.3048, in: 0.0254 },
  Mass: { kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495 },
  Time: { s: 1, min: 60, h: 3600, d: 86400 },
} as const

export function UnitConverterApp() {
  const [kind, setKind] = useState<keyof typeof UNIT_SETS>('Length')
  const units = Object.keys(UNIT_SETS[kind])
  const [from, setFrom] = useState(units[0])
  const [to, setTo] = useState(units[1])
  const [amount, setAmount] = useState('1')
  const value = Number(amount)
  const table = UNIT_SETS[kind] as Record<string, number>
  const converted = Number.isFinite(value) ? value * table[from] / table[to] : NaN
  return (
    <div className="tool-stack">
      <div className="tool-sci-ops">
        {(Object.keys(UNIT_SETS) as Array<keyof typeof UNIT_SETS>).map(item => (
          <button key={item} type="button" className={kind === item ? 'is-on' : ''} onClick={() => {
            setKind(item)
            const next = Object.keys(UNIT_SETS[item])
            setFrom(next[0])
            setTo(next[1])
          }}>{item}</button>
        ))}
      </div>
      <label>Amount<input type="number" value={amount} onChange={event => setAmount(event.target.value)} /></label>
      <label>From<select value={from} onChange={event => setFrom(event.target.value)}>{units.map(unit => <option key={unit}>{unit}</option>)}</select></label>
      <label>To<select value={to} onChange={event => setTo(event.target.value)}>{units.map(unit => <option key={unit}>{unit}</option>)}</select></label>
      <output>{Number.isFinite(converted) ? converted.toPrecision(8).replace(/\.?0+$/, '') : '—'}</output>
    </div>
  )
}

export function MarkdownEditorApp({ storageKey }: { storageKey: string }) {
  const [text, setText] = useLocal(storageKey, '# Notes\n\nWrite **markdown** here.')
  const html = useMemo(() => renderMarkdown(text), [text])
  return (
    <div className="tool-split">
      <textarea value={text} onChange={event => setText(event.target.value)} aria-label="Markdown source" />
      <article className="tool-preview" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] as string))
}

function renderMarkdown(source: string) {
  const escaped = escapeHtml(source)
  return escaped
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br />')
}

export function CodePlaygroundApp({ storageKey }: { storageKey: string }) {
  const [files, setFiles] = useLocal(storageKey, {
    html: '<h1>Orbit</h1>\n<p>Hello from Helios.</p>',
    css: 'body { font-family: Inter, sans-serif; background: #0a0c12; color: #f4f6fb; padding: 24px; }\nh1 { color: #5ee7ff; }',
    js: 'document.querySelector("h1")?.addEventListener("click", () => {\n  document.body.style.background = "#10131a"\n})',
  })
  const [tab, setTab] = useState<'html' | 'css' | 'js'>('html')
  const srcdoc = `<style>${files.css}</style>${files.html}<script>${files.js}</script>`
  return (
    <div className="tool-split">
      <div>
        <div className="tool-sci-ops">
          {(['html', 'css', 'js'] as const).map(item => (
            <button key={item} type="button" className={tab === item ? 'is-on' : ''} onClick={() => setTab(item)}>{item}</button>
          ))}
        </div>
        <textarea
          value={files[tab]}
          onChange={event => setFiles(current => ({ ...current, [tab]: event.target.value }))}
          aria-label={`${tab} source`}
          spellCheck={false}
        />
      </div>
      <iframe title="Playground preview" sandbox="allow-scripts" srcDoc={srcdoc} />
    </div>
  )
}

interface Card { id: string; front: string; back: string }

export function FlashcardsApp({ storageKey }: { storageKey: string }) {
  const [cards, setCards] = useLocal<Card[]>(storageKey, [
    { id: '1', front: 'Helios', back: 'A spatial OS for students and creators' },
  ])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const card = cards[index]
  function add(event: React.FormEvent) {
    event.preventDefault()
    if (!front.trim() || !back.trim()) return
    setCards(current => [...current, { id: crypto.randomUUID(), front: front.trim(), back: back.trim() }])
    setFront('')
    setBack('')
  }
  return (
    <div className="tool-stack">
      {card ? (
        <button type="button" className={'tool-flip' + (flipped ? ' is-flipped' : '')} onClick={() => setFlipped(value => !value)}>
          <span>{flipped ? card.back : card.front}</span>
          <small>{flipped ? 'Back' : 'Front'} · tap to flip</small>
        </button>
      ) : <p>Add a card to begin.</p>}
      <div className="tool-sci-ops">
        <button type="button" onClick={() => { setIndex(value => Math.max(0, value - 1)); setFlipped(false) }}>Prev</button>
        <button type="button" onClick={() => { setIndex(value => Math.min(cards.length - 1, value + 1)); setFlipped(false) }}>Next</button>
      </div>
      <form onSubmit={add} className="tool-stack">
        <input value={front} onChange={event => setFront(event.target.value)} placeholder="Front" aria-label="Card front" />
        <input value={back} onChange={event => setBack(event.target.value)} placeholder="Back" aria-label="Card back" />
        <button type="submit" className="os-btn">Add card</button>
      </form>
    </div>
  )
}

export function DrawingBoardApp({ storageKey }: { storageKey: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [color, setColor] = useState('#5ee7ff')
  const [size, setSize] = useState(4)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const image = new Image()
        image.onload = () => ctx.drawImage(image, 0, 0)
        image.src = saved
      }
    } catch {}
  }, [storageKey])
  function persist() {
    const canvas = canvasRef.current
    if (!canvas) return
    try { localStorage.setItem(storageKey, canvas.toDataURL('image/png')) } catch {}
  }
  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) * (event.currentTarget.width / rect.width), y: (event.clientY - rect.top) * (event.currentTarget.height / rect.height) }
  }
  return (
    <div className="tool-stack">
      <div className="tool-sci-ops">
        {['#5ee7ff', '#6d7cff', '#f4f6fb', '#ff6b6b', '#6ed69a'].map(value => (
          <button key={value} type="button" aria-label={value} onClick={() => setColor(value)} style={{ background: value, width: 28, height: 28, borderRadius: 8, border: color === value ? '2px solid white' : '1px solid transparent' }} />
        ))}
        <label>Size<input type="range" min={1} max={24} value={size} onChange={event => setSize(Number(event.target.value))} /></label>
        <button type="button" onClick={() => {
          const canvas = canvasRef.current
          const ctx = canvas?.getContext('2d')
          if (canvas && ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); persist() }
        }}>Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        width={900}
        height={520}
        className="tool-canvas"
        onPointerDown={event => {
          drawing.current = true
          event.currentTarget.setPointerCapture(event.pointerId)
          const ctx = event.currentTarget.getContext('2d')
          const { x, y } = point(event)
          if (!ctx) return
          ctx.beginPath()
          ctx.moveTo(x, y)
        }}
        onPointerMove={event => {
          if (!drawing.current) return
          const ctx = event.currentTarget.getContext('2d')
          const { x, y } = point(event)
          if (!ctx) return
          ctx.strokeStyle = color
          ctx.lineWidth = size
          ctx.lineCap = 'round'
          ctx.lineTo(x, y)
          ctx.stroke()
        }}
        onPointerUp={() => { drawing.current = false; persist() }}
      />
    </div>
  )
}

export function PhysicsCalculatorApp() {
  const [mode, setMode] = useState<'motion' | 'ohm'>('motion')
  const [a, setA] = useState('10')
  const [b, setB] = useState('2')
  const [c, setC] = useState('0')
  const u = Number(a)
  const acc = Number(b)
  const t = Number(c)
  const v = u + acc * t
  const s = u * t + 0.5 * acc * t * t
  const volts = Number(a)
  const ohms = Number(b)
  const amps = ohms === 0 ? NaN : volts / ohms
  return (
    <div className="tool-stack">
      <div className="tool-sci-ops">
        <button type="button" className={mode === 'motion' ? 'is-on' : ''} onClick={() => setMode('motion')}>Kinematics</button>
        <button type="button" className={mode === 'ohm' ? 'is-on' : ''} onClick={() => setMode('ohm')}>Ohm’s law</button>
      </div>
      {mode === 'motion' ? (
        <>
          <label>Initial velocity (m/s)<input value={a} onChange={event => setA(event.target.value)} /></label>
          <label>Acceleration (m/s²)<input value={b} onChange={event => setB(event.target.value)} /></label>
          <label>Time (s)<input value={c} onChange={event => setC(event.target.value)} /></label>
          <output>v = {Number.isFinite(v) ? v.toFixed(3) : '—'} m/s · s = {Number.isFinite(s) ? s.toFixed(3) : '—'} m</output>
        </>
      ) : (
        <>
          <label>Voltage (V)<input value={a} onChange={event => setA(event.target.value)} /></label>
          <label>Resistance (Ω)<input value={b} onChange={event => setB(event.target.value)} /></label>
          <output>I = {Number.isFinite(amps) ? amps.toFixed(4) : '—'} A · P = {Number.isFinite(amps) ? (volts * amps).toFixed(4) : '—'} W</output>
        </>
      )}
    </div>
  )
}

export function SpreadsheetLiteApp({ storageKey }: { storageKey: string }) {
  const [cells, setCells] = useLocal<string[][]>(storageKey, Array.from({ length: 6 }, () => Array.from({ length: 5 }, () => '')))
  function valueAt(row: number, col: number, seen = new Set<string>()): number {
    const key = `${row}:${col}`
    if (seen.has(key)) return NaN
    seen.add(key)
    const raw = cells[row]?.[col] ?? ''
    if (raw.startsWith('=')) {
      const expr = raw.slice(1).replace(/([A-E])([1-6])/g, (_, letter: string, digit: string) => {
        const c = letter.charCodeAt(0) - 65
        const r = Number(digit) - 1
        return String(valueAt(r, c, seen) || 0)
      })
      try { return Number(Function(`"use strict"; return (${expr})`)()) } catch { return NaN }
    }
    return Number(raw) || 0
  }
  return (
    <div className="tool-sheet">
      <table>
        <thead>
          <tr><th />{['A', 'B', 'C', 'D', 'E'].map(letter => <th key={letter}>{letter}</th>)}</tr>
        </thead>
        <tbody>
          {cells.map((row, rowIndex) => (
            <tr key={rowIndex}>
              <th>{rowIndex + 1}</th>
              {row.map((cell, colIndex) => (
                <td key={colIndex}>
                  <input
                    value={cell}
                    aria-label={`${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`}
                    onChange={event => setCells(current => current.map((item, r) => r === rowIndex ? item.map((value, c) => c === colIndex ? event.target.value : value) : item))}
                  />
                  {cell.startsWith('=') && <small>{Number.isFinite(valueAt(rowIndex, colIndex)) ? valueAt(rowIndex, colIndex) : 'err'}</small>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>Formulas like <code>=A1+B1</code> evaluate locally in this browser.</p>
    </div>
  )
}

export function DocumentEditorApp({ storageKey }: { storageKey: string }) {
  const [html, setHtml] = useLocal(storageKey, '<h1>Untitled</h1><p>Start writing.</p>')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html
  }, [html])
  return (
    <div className="tool-stack">
      <div className="tool-sci-ops">
        <button type="button" onClick={() => document.execCommand('bold')}>Bold</button>
        <button type="button" onClick={() => document.execCommand('italic')}>Italic</button>
        <button type="button" onClick={() => document.execCommand('formatBlock', false, 'h2')}>Heading</button>
        <button type="button" onClick={() => document.execCommand('insertUnorderedList')}>List</button>
      </div>
      <div
        ref={ref}
        className="tool-doc"
        contentEditable
        suppressContentEditableWarning
        onInput={event => setHtml((event.currentTarget as HTMLDivElement).innerHTML)}
        aria-label="Document"
      />
    </div>
  )
}

export function StopwatchApp({ storageKey }: { storageKey: string }) {
  const [state, setState] = useLocal(storageKey, { running: false, start: 0, elapsed: 0 })
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!state.running) return
    const tick = () => setNow(Date.now())
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisibility)
    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      tick()
    }, 80)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [state.running])
  const ms = state.running ? state.elapsed + (now - state.start) : state.elapsed
  const seconds = Math.floor(ms / 1000)
  return (
    <div className="tool-stack" style={{ alignItems: 'center' }}>
      <output style={{ fontSize: 48, fontVariantNumeric: 'tabular-nums' }}>
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </output>
      <div className="tool-sci-ops">
        <button type="button" className="os-btn is-primary" onClick={() => setState(current => current.running
          ? { running: false, start: 0, elapsed: current.elapsed + (Date.now() - current.start) }
          : { running: true, start: Date.now(), elapsed: current.elapsed })}>
          {state.running ? 'Pause' : 'Start'}
        </button>
        <button type="button" className="os-btn" onClick={() => setState({ running: false, start: 0, elapsed: 0 })}>Reset</button>
      </div>
    </div>
  )
}
