import { useState } from 'react'
import { Check, Copy, Minimize2, WandSparkles } from 'lucide-react'
import { MiniAppError } from '../MiniAppStates'

export default function JsonFormatterApp() {
  const [value, setValue] = useState('{\n  "space": "Helios"\n}')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  function parse() {
    try {
      const parsed = JSON.parse(value)
      setError('')
      return parsed
    } catch (reason) {
      setError((reason as Error).message)
      return null
    }
  }

  function format() {
    const parsed = parse()
    if (parsed) setValue(JSON.stringify(parsed, null, 2))
  }

  function minify() {
    const parsed = parse()
    if (parsed) setValue(JSON.stringify(parsed))
  }

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="json-app">
      <div className="board-toolbar">
        <button type="button" onClick={format}><WandSparkles size={14} /> Format</button>
        <button type="button" onClick={() => parse()}>Validate</button>
        <button type="button" onClick={minify}><Minimize2 size={14} /> Minify</button>
        <button type="button" onClick={() => void copy()}>{copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}</button>
      </div>
      <textarea value={value} onChange={event => setValue(event.target.value)} spellCheck={false} aria-label="JSON input" />
      {error ? <MiniAppError message={error} onRetry={() => setError('')} /> : <p className="json-ok">JSON is valid or waiting for input.</p>}
    </div>
  )
}
