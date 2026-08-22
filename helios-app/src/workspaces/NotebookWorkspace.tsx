import { useMemo, useState } from 'react'
import { Plus, Sparkles, Trash2 } from 'lucide-react'

interface Cell {
  id: string
  kind: 'markdown' | 'code' | 'result'
  body: string
}

interface NotebookData {
  title?: string
  cells?: Cell[]
  html?: string
}

interface Props {
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  onAskHelios: (prompt?: string) => void
}

function asCells(data: NotebookData): Cell[] {
  if (Array.isArray(data.cells) && data.cells.length > 0) return data.cells
  const html = String(data.html || '')
  return [
    { id: 'question', kind: 'markdown', body: html || '# Experiment\nWhat are you trying to find out?' },
    { id: 'method', kind: 'markdown', body: '## Method\nWrite a reproducible method.' },
    { id: 'code', kind: 'code', body: 'const observation = []\n// record measurements here' },
    { id: 'result', kind: 'result', body: 'Findings stay attached to this Project.' },
  ]
}

export function NotebookWorkspace({ data, onChange, onAskHelios }: Props) {
  const value = data as NotebookData
  const cells = useMemo(() => asCells(value), [value])
  const [activeId, setActiveId] = useState(cells[0]?.id || '')

  function patch(next: Partial<NotebookData>) {
    onChange({ ...value, ...next, cells: next.cells || cells })
  }

  function updateCell(id: string, body: string) {
    patch({ cells: cells.map(cell => cell.id === id ? { ...cell, body } : cell) })
  }

  function addCell(kind: Cell['kind']) {
    const cell = { id: crypto.randomUUID(), kind, body: kind === 'code' ? '// next trial' : kind === 'result' ? 'Observation' : '## Next note' }
    patch({ cells: [...cells, cell] })
    setActiveId(cell.id)
  }

  function removeCell(id: string) {
    if (cells.length <= 1) return
    const next = cells.filter(cell => cell.id !== id)
    patch({ cells: next })
    setActiveId(next[0].id)
  }

  return (
    <div className="notebook-workspace">
      <header className="writing-toolbar">
        <strong>LAB NOTEBOOK</strong>
        <button type="button" onClick={() => addCell('markdown')}><Plus size={13} /> Note</button>
        <button type="button" onClick={() => addCell('code')}><Plus size={13} /> Code</button>
        <button type="button" onClick={() => addCell('result')}><Plus size={13} /> Result</button>
        <span />
        <button type="button" className="writing-helios-action" onClick={() => onAskHelios('Review this lab notebook for method gaps, unclear observations and a stronger findings section')}><Sparkles size={14} /> Review experiment</button>
      </header>
      <div className="notebook-cells">
        {cells.map((cell, index) => (
          <article key={cell.id} className={'notebook-cell kind-' + cell.kind + (activeId === cell.id ? ' is-active' : '')} onClick={() => setActiveId(cell.id)}>
            <header>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <span>{cell.kind}</span>
              <button type="button" aria-label="Remove cell" onClick={event => { event.stopPropagation(); removeCell(cell.id) }}><Trash2 size={12} /></button>
            </header>
            <textarea
              value={cell.body}
              onChange={event => updateCell(cell.id, event.target.value)}
              aria-label={`${cell.kind} cell ${index + 1}`}
            />
          </article>
        ))}
      </div>
    </div>
  )
}
