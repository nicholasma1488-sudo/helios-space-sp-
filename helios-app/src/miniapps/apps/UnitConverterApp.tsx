import { useMemo, useState } from 'react'
import { ArrowLeftRight } from 'lucide-react'

type Kind = 'length' | 'mass' | 'temperature' | 'time' | 'area' | 'volume'

const UNITS: Record<Kind, Record<string, number>> = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
  mass: { kg: 1, g: 0.001, mg: 1e-6, lb: 0.45359237, oz: 0.028349523125, t: 1000 },
  time: { s: 1, min: 60, h: 3600, d: 86400, ms: 0.001 },
  area: { 'm²': 1, 'km²': 1e6, 'cm²': 0.0001, 'ft²': 0.09290304, acre: 4046.8564224 },
  volume: { L: 1, mL: 0.001, 'm³': 1000, gal: 3.785411784, cup: 0.2365882365 },
  temperature: { C: 1, F: 1, K: 1 },
}

function convert(kind: Kind, value: number, from: string, to: string) {
  if (kind === 'temperature') {
    let celsius = value
    if (from === 'F') celsius = (value - 32) * 5 / 9
    if (from === 'K') celsius = value - 273.15
    if (to === 'C') return celsius
    if (to === 'F') return celsius * 9 / 5 + 32
    return celsius + 273.15
  }
  return value * UNITS[kind][from] / UNITS[kind][to]
}

export default function UnitConverterApp() {
  const [kind, setKind] = useState<Kind>('length')
  const [from, setFrom] = useState('m')
  const [to, setTo] = useState('ft')
  const [value, setValue] = useState('1')

  const units = Object.keys(UNITS[kind])
  const numeric = Number(value)
  const result = useMemo(() => {
    if (!Number.isFinite(numeric)) return '—'
    return convert(kind, numeric, from, to).toPrecision(8).replace(/\.?0+$/, '')
  }, [kind, numeric, from, to])

  function changeKind(next: Kind) {
    const keys = Object.keys(UNITS[next])
    setKind(next)
    setFrom(keys[0])
    setTo(keys[1] ?? keys[0])
  }

  return (
    <div className="tool-app">
      <div className="tool-tabs" role="tablist" aria-label="Conversion type">
        {(Object.keys(UNITS) as Kind[]).map(item => (
          <button key={item} type="button" role="tab" aria-selected={kind === item} className={kind === item ? 'is-on' : ''} onClick={() => changeKind(item)}>
            {item}
          </button>
        ))}
      </div>
      <div className="convert-row">
        <label>
          From
          <input value={value} onChange={event => setValue(event.target.value)} inputMode="decimal" aria-label="Value to convert" />
          <select value={from} onChange={event => setFrom(event.target.value)} aria-label="From unit">
            {units.map(unit => <option key={unit}>{unit}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => { setFrom(to); setTo(from) }} aria-label="Swap units">
          <ArrowLeftRight size={16} />
        </button>
        <label>
          To
          <strong>{result}</strong>
          <select value={to} onChange={event => setTo(event.target.value)} aria-label="To unit">
            {units.map(unit => <option key={unit}>{unit}</option>)}
          </select>
        </label>
      </div>
    </div>
  )
}
