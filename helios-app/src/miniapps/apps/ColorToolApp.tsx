import { useMemo, useState } from 'react'
import { Copy } from 'lucide-react'

function hexToRgb(hex: string) {
  const value = hex.replace('#', '')
  const num = Number.parseInt(value.length === 3 ? value.split('').map(part => part + part).join('') : value, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  const l = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

function shift(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex)
  const clamp = (n: number) => Math.max(0, Math.min(255, n + amount))
  return '#' + [clamp(r), clamp(g), clamp(b)].map(n => n.toString(16).padStart(2, '0')).join('')
}

export default function ColorToolApp() {
  const [hex, setHex] = useState('#8576f5')
  const rgb = useMemo(() => hexToRgb(hex), [hex])
  const hsl = useMemo(() => rgbToHsl(rgb.r, rgb.g, rgb.b), [rgb])
  const palette = [-60, -30, 0, 30, 60].map(amount => shift(hex, amount))

  return (
    <div className="color-app">
      <label className="color-pick">
        <input type="color" value={hex} onChange={event => setHex(event.target.value)} />
        <span style={{ background: hex }} />
      </label>
      <div className="color-values">
        <button type="button" onClick={() => void navigator.clipboard.writeText(hex)}><Copy size={13} /> {hex}</button>
        <span>RGB {rgb.r}, {rgb.g}, {rgb.b}</span>
        <span>HSL {hsl.h}, {hsl.s}%, {hsl.l}%</span>
      </div>
      <div className="color-palette">
        {palette.map(item => (
          <button key={item} type="button" style={{ background: item }} onClick={() => setHex(item)} aria-label={item} />
        ))}
      </div>
    </div>
  )
}
