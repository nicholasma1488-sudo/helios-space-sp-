import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Calculator, Check, ChevronLeft, ChevronRight, Eraser, GripVertical,
  Layers3, LineChart, MessageSquareText, Palette, PanelTop, Plus,
  Search, Sparkles, Square, Trash2,
} from 'lucide-react'

interface EditorProps {
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  onAskHelios: (prompt?: string) => void
  appKind?: string
}

interface Point { x: number; y: number }
interface Stroke { id: string; points: Point[]; color: string; size: number; layer: string; erase?: boolean }
interface Layer { id: string; name: string; visible: boolean }
interface CanvasData {
  strokes: Stroke[]
  layers: Layer[]
  activeLayer: string
  color: string
  size: number
  pages: Array<{ id: string; name: string }>
  activePage?: number
  comicElements?: Array<{ id: string; kind: 'panel' | 'bubble' | 'note'; text: string; x: number; y: number }>
}

export function DrawingWorkspace({ data, onChange, onAskHelios, appKind = 'drawing' }: EditorProps) {
  const value = data as unknown as CanvasData
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef<Stroke | null>(null)
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen')
  const [newLayer, setNewLayer] = useState('')
  const layers = useMemo(() => value.layers || [], [value.layers])
  const comicElements = useMemo(() => value.comicElements || [], [value.comicElements])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scale = Math.min(devicePixelRatio, 2)
    canvas.width = Math.max(1, Math.round(rect.width * scale))
    canvas.height = Math.max(1, Math.round(rect.height * scale))
    const context = canvas.getContext('2d')
    if (!context) return
    context.scale(scale, scale)
    context.clearRect(0, 0, rect.width, rect.height)
    context.fillStyle = '#f8f7f3'
    context.fillRect(0, 0, rect.width, rect.height)
    const visible = new Set(layers.filter(layer => layer.visible).map(layer => layer.id))
    for (const stroke of value.strokes || []) {
      if (!visible.has(stroke.layer) || stroke.points.length < 2) continue
      context.beginPath()
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.lineWidth = stroke.size
      context.strokeStyle = stroke.erase ? '#f8f7f3' : stroke.color
      stroke.points.forEach((point, index) => {
        const x = point.x * rect.width
        const y = point.y * rect.height
        if (index === 0) context.moveTo(x, y)
        else context.lineTo(x, y)
      })
      context.stroke()
    }
  }, [layers, value.strokes])

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    const stroke: Stroke = { id: crypto.randomUUID(), points: [pointFromEvent(event)], color: value.color || '#171819', size: value.size || 4, layer: value.activeLayer || layers[0]?.id || 'base', erase: tool === 'eraser' }
    drawingRef.current = stroke
    onChange({ ...value, strokes: [...(value.strokes || []), stroke] })
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || event.buttons === 0) return
    const point = pointFromEvent(event)
    drawingRef.current = { ...drawingRef.current, points: [...drawingRef.current.points, point] }
    onChange({ ...value, strokes: (value.strokes || []).map(stroke => stroke.id === drawingRef.current?.id ? drawingRef.current : stroke) })
  }

  function addLayer(event: React.FormEvent) {
    event.preventDefault()
    if (!newLayer.trim()) return
    const layer = { id: crypto.randomUUID(), name: newLayer.trim(), visible: true }
    onChange({ ...value, layers: [...layers, layer], activeLayer: layer.id })
    setNewLayer('')
  }

  function addComicElement(kind: 'panel' | 'bubble' | 'note') {
    const text = kind === 'bubble' || kind === 'note' ? window.prompt(kind === 'bubble' ? 'Speech bubble text' : 'Note text')?.trim() || '' : ''
    onChange({ ...value, comicElements: [...comicElements, { id: crypto.randomUUID(), kind, text, x: 18 + comicElements.length * 3, y: 16 + comicElements.length * 4 }] })
  }

  return (
    <div className="drawing-workspace">
      <header className="drawing-toolbar">
        <button type="button" className={tool === 'pen' ? 'is-active' : ''} onClick={() => setTool('pen')}><Palette size={14} /> Brush</button>
        <button type="button" className={tool === 'eraser' ? 'is-active' : ''} onClick={() => setTool('eraser')}><Eraser size={14} /> Eraser</button>
        <label>Colour<input type="color" value={value.color || '#171819'} onChange={event => onChange({ ...value, color: event.target.value })} /></label>
        <label>Size<input type="range" min="1" max="28" value={value.size || 4} onChange={event => onChange({ ...value, size: Number(event.target.value) })} /></label>
        {['comic-studio','comic-maker','manga-studio','graphic-novel','zine-maker','storyboard'].includes(appKind) && <><span /><button type="button" onClick={() => addComicElement('panel')}><PanelTop size={14} /> Panel</button><button type="button" onClick={() => addComicElement('bubble')}><MessageSquareText size={14} /> Speech</button></>}
        {(['whiteboard','moodboard','ui-wireframe','ux-map','typography-lab'].includes(appKind)) && <button type="button" onClick={() => addComicElement('note')}><Square size={14} /> Note</button>}
        <span />
        <button type="button" onClick={() => onAskHelios(['comic-studio','comic-maker','manga-studio','graphic-novel','zine-maker','storyboard'].includes(appKind) ? 'Review this comic page and suggest the next panel' : 'Critique this visual work and suggest one useful next step')}><Sparkles size={14} /> Ask Helios</button>
        <button type="button" onClick={() => onChange({ ...value, strokes: [] })}><Trash2 size={14} /> Clear</button>
      </header>
      <div className="drawing-layout">
        <aside className="layers-panel"><header><Layers3 size={14} /><strong>LAYERS</strong></header>{layers.map(layer => <article key={layer.id} className={value.activeLayer === layer.id ? 'is-active' : ''}><button type="button" onClick={() => onChange({ ...value, activeLayer: layer.id })}><GripVertical size={12} /><span>{layer.name}</span></button><input type="checkbox" checked={layer.visible} onChange={() => onChange({ ...value, layers: layers.map(item => item.id === layer.id ? { ...item, visible: !item.visible } : item) })} aria-label={`Show ${layer.name}`} /></article>)}<form onSubmit={addLayer}><input value={newLayer} onChange={event => setNewLayer(event.target.value)} placeholder="Layer name" /><button type="submit" disabled={!newLayer.trim()}><Plus size={13} /></button></form>{['comic-studio','comic-maker','manga-studio','graphic-novel','zine-maker','storyboard'].includes(appKind) && <section className="comic-pages"><strong>PAGES</strong>{(value.pages || []).map((page, index) => <button type="button" key={page.id} className={(value.activePage || 0) === index ? 'is-active' : ''} onClick={() => onChange({ ...value, activePage: index })}>{index + 1}. {page.name}</button>)}<button type="button" onClick={() => onChange({ ...value, pages: [...(value.pages || []), { id: crypto.randomUUID(), name: `Page ${(value.pages || []).length + 1}` }], activePage: (value.pages || []).length })}><Plus size={12} /> Add page</button></section>}</aside>
        <main className="drawing-stage"><canvas ref={canvasRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { drawingRef.current = null }} onPointerCancel={() => { drawingRef.current = null }} aria-label="Drawing canvas" />{comicElements.map(element => <div key={element.id} className={`canvas-element element-${element.kind}`} style={{ left: `${element.x}%`, top: `${element.y}%` }}>{element.kind === 'panel' ? '' : element.text}<button type="button" onClick={() => onChange({ ...value, comicElements: comicElements.filter(item => item.id !== element.id) })}>×</button></div>)}</main>
      </div>
    </div>
  )
}

interface MathData { expression: string; calculator: string; history: string[]; notes: string }

function evaluateMath(expression: string, x = 0) {
  let normalized = expression.trim().toLowerCase().replace(/\^/g, '**')
  const replacements: Record<string, string> = { sin: 'Math.sin', cos: 'Math.cos', tan: 'Math.tan', sqrt: 'Math.sqrt', log: 'Math.log10', ln: 'Math.log', abs: 'Math.abs', pi: 'Math.PI', e: 'Math.E' }
  for (const [name, replacement] of Object.entries(replacements)) normalized = normalized.replace(new RegExp(`\\b${name}\\b`, 'g'), replacement)
  if (!/^[0-9x+\-*/().,\s*MathsincoqrtlgabPIE]+$/.test(normalized)) return Number.NaN
  try { return Number(Function('x', `"use strict"; return (${normalized})`)(x)) } catch { return Number.NaN }
}

export function MathWorkspace({ data, onChange, onAskHelios }: EditorProps) {
  const value = data as unknown as MathData
  const [result, setResult] = useState('')
  const points = useMemo(() => {
    const values: Array<{ x: number; y: number }> = []
    for (let pixel = 0; pixel <= 600; pixel += 3) {
      const x = (pixel - 300) / 30
      const y = evaluateMath(value.expression || 'x', x)
      if (Number.isFinite(y)) values.push({ x: pixel, y: 180 - y * 24 })
    }
    return values
  }, [value.expression])
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')

  function calculate(event: React.FormEvent) {
    event.preventDefault()
    const calculated = evaluateMath(value.calculator || '0')
    const text = Number.isFinite(calculated) ? String(calculated) : 'Invalid expression'
    setResult(text)
    onChange({ ...value, history: [`${value.calculator} = ${text}`, ...(value.history || [])].slice(0, 20) })
  }

  return (
    <div className="math-workspace">
      <section className="scientific-calculator"><header><Calculator size={16} /><div><strong>Scientific Calculator</strong><small>sin, cos, tan, sqrt, log, ln, π and powers</small></div></header><form onSubmit={calculate}><input value={value.calculator || ''} onChange={event => onChange({ ...value, calculator: event.target.value })} placeholder="sqrt(144) + sin(pi / 2)" aria-label="Calculation" /><button type="submit">=</button></form><output>{result || '0'}</output><div className="calculator-keys">{['sin(', 'cos(', 'tan(', 'sqrt(', 'log(', 'pi', '^', '(', ')'].map(key => <button type="button" key={key} onClick={() => onChange({ ...value, calculator: (value.calculator || '') + key })}>{key}</button>)}</div><section><strong>History</strong>{(value.history || []).slice(0, 8).map((item, index) => <button type="button" key={index} onClick={() => onChange({ ...value, calculator: item.split(' = ')[0] })}>{item}</button>)}</section></section>
      <section className="graph-workspace"><header><LineChart size={16} /><div><strong>Graphing workspace</strong><small>Use x as the variable</small></div><button type="button" onClick={() => onAskHelios('Explain this graph, its intercepts, domain and important behaviour')}><Sparkles size={13} /> Explain</button></header><label>y = <input value={value.expression || ''} onChange={event => onChange({ ...value, expression: event.target.value })} /></label><svg viewBox="0 0 600 360" role="img" aria-label={`Graph of ${value.expression}`}><path className="graph-grid" d="M0 180H600M300 0V360" /><path className="graph-line" d={path} /></svg><textarea value={value.notes || ''} onChange={event => onChange({ ...value, notes: event.target.value })} placeholder="Formula, geometry, probability or statistics notes…" /></section>
    </div>
  )
}

interface SurveyQuestion { id: string; prompt: string; type: 'short' | 'long' | 'choice'; options: string[] }
interface SurveyData { title: string; description: string; questions: SurveyQuestion[] }

export function SurveyWorkspace({ data, onChange, onAskHelios }: EditorProps) {
  const value = data as unknown as SurveyData
  const [preview, setPreview] = useState(false)
  const questions = value.questions || []
  function patchQuestion(id: string, patch: Partial<SurveyQuestion>) {
    onChange({ ...value, questions: questions.map(question => question.id === id ? { ...question, ...patch } : question) })
  }
  return <div className="survey-workspace"><header><div><strong>Survey Builder</strong><small>Build useful questions, then share this Project.</small></div><button type="button" onClick={() => setPreview(value => !value)}>{preview ? 'Edit survey' : 'Preview survey'}</button><button type="button" onClick={() => onAskHelios('Review this survey for bias, clarity, missing options and research usefulness')}><Sparkles size={13} /> Review questions</button></header>{!preview ? <main><input className="survey-title" value={value.title || ''} onChange={event => onChange({ ...value, title: event.target.value })} aria-label="Survey title" /><textarea className="survey-description" value={value.description || ''} onChange={event => onChange({ ...value, description: event.target.value })} aria-label="Survey description" />{questions.map((question, index) => <article key={question.id}><span>{index + 1}</span><input value={question.prompt} onChange={event => patchQuestion(question.id, { prompt: event.target.value })} aria-label={`Question ${index + 1}`} /><select value={question.type} onChange={event => patchQuestion(question.id, { type: event.target.value as SurveyQuestion['type'] })}><option value="short">Short answer</option><option value="long">Long answer</option><option value="choice">Multiple choice</option></select>{question.type === 'choice' && <div>{question.options.map((option, optionIndex) => <input key={optionIndex} value={option} onChange={event => patchQuestion(question.id, { options: question.options.map((item, indexValue) => indexValue === optionIndex ? event.target.value : item) })} aria-label={`Option ${optionIndex + 1}`} />)}<button type="button" onClick={() => patchQuestion(question.id, { options: [...question.options, `Option ${question.options.length + 1}`] })}><Plus size={12} /> Option</button></div>}<button type="button" className="survey-delete" onClick={() => onChange({ ...value, questions: questions.filter(item => item.id !== question.id) })}><Trash2 size={13} /></button></article>)}<button type="button" className="survey-add" onClick={() => onChange({ ...value, questions: [...questions, { id: crypto.randomUUID(), prompt: 'New question', type: 'short', options: [] }] })}><Plus size={14} /> Add question</button></main> : <main className="survey-preview"><h1>{value.title}</h1><p>{value.description}</p>{questions.map((question, index) => <label key={question.id}><strong>{index + 1}. {question.prompt}</strong>{question.type === 'choice' ? question.options.map(option => <span key={option}><input type="radio" name={question.id} /> {option}</span>) : question.type === 'long' ? <textarea /> : <input />}</label>)}<button type="button"><Check size={14} /> Submit response</button></main>}</div>
}

interface BoardCard {
  id: string
  text: string
  due?: string
  owner?: string
}
interface BoardColumn { id: string; name: string; cards: BoardCard[] }
interface BoardData { columns: BoardColumn[]; filter?: string }

const BOARD_BRANDING: Record<string, { label: string; blurb: string; helios: string }> = {
  'homework-board': {
    label: 'Pulse',
    blurb: 'Homework & tasks — move work from To do → Doing → Done.',
    helios: 'Prioritize this Pulse board: what is due soon, what is blocked, and one realistic next action',
  },
  'planner-board': {
    label: 'Cascade',
    blurb: 'Break goals into buckets and move cards until they ship.',
    helios: 'Turn this Cascade board into a realistic plan with blockers and sequencing',
  },
  lists: {
    label: 'Tally',
    blurb: 'Checklists with owners — tick items off as you finish.',
    helios: 'Review this Tally list for missing owners, due dates, and what to do next',
  },
  checklist: {
    label: 'Tally',
    blurb: 'Checklists with owners — tick items off as you finish.',
    helios: 'Review this Tally list for missing owners, due dates, and what to do next',
  },
}

function normalizeBoardColumns(raw: BoardData['columns'] | undefined): BoardColumn[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [
      { id: 'todo', name: 'To do', cards: [{ id: crypto.randomUUID(), text: 'Define the next meaningful outcome' }] },
      { id: 'doing', name: 'Doing', cards: [] },
      { id: 'done', name: 'Done', cards: [] },
    ]
  }
  return (raw as Array<{
    id?: string
    name?: string
    title?: string
    cards?: Array<{ id?: string; text?: string; title?: string; due?: string; owner?: string }>
  }>).map(column => ({
    id: column.id || crypto.randomUUID(),
    name: column.name || column.title || 'Column',
    cards: (column.cards || []).map(card => ({
      id: card.id || crypto.randomUUID(),
      text: card.text || card.title || '',
      due: card.due || '',
      owner: card.owner || '',
    })),
  }))
}

export function ProjectBoardWorkspace({ data, onChange, onAskHelios, appKind = 'project-board' }: EditorProps) {
  const value = data as unknown as BoardData
  const columns = useMemo(() => normalizeBoardColumns(value.columns), [value.columns])
  const branding = BOARD_BRANDING[appKind] || {
    label: 'Board',
    blurb: 'Every card remains part of this Project.',
    helios: 'Turn this board into a realistic next-step plan and identify blockers',
  }
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState(value.filter || '')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [columnDraft, setColumnDraft] = useState('')

  function commit(nextColumns: BoardColumn[], nextFilter = filter) {
    onChange({ ...value, columns: nextColumns, filter: nextFilter })
  }

  function addCard(columnId: string) {
    const text = drafts[columnId]?.trim()
    if (!text) return
    commit(columns.map(column => (
      column.id === columnId
        ? { ...column, cards: [...column.cards, { id: crypto.randomUUID(), text, due: '', owner: '' }] }
        : column
    )))
    setDrafts(current => ({ ...current, [columnId]: '' }))
  }

  function moveCard(card: BoardCard, fromIndex: number, direction: -1 | 1) {
    const target = fromIndex + direction
    if (target < 0 || target >= columns.length) return
    commit(columns.map((column, index) => {
      if (index === fromIndex) return { ...column, cards: column.cards.filter(item => item.id !== card.id) }
      if (index === target) return { ...column, cards: [...column.cards, card] }
      return column
    }))
  }

  function patchCard(columnId: string, cardId: string, patch: Partial<BoardCard>) {
    commit(columns.map(column => (
      column.id === columnId
        ? { ...column, cards: column.cards.map(card => card.id === cardId ? { ...card, ...patch } : card) }
        : column
    )))
  }

  function addColumn(event: React.FormEvent) {
    event.preventDefault()
    const name = columnDraft.trim()
    if (!name) return
    commit([...columns, { id: crypto.randomUUID(), name, cards: [] }])
    setColumnDraft('')
  }

  function matchesFilter(card: BoardCard) {
    const query = filter.trim().toLowerCase()
    if (!query) return true
    return (
      card.text.toLowerCase().includes(query)
      || (card.owner || '').toLowerCase().includes(query)
      || (card.due || '').includes(query)
    )
  }

  return (
    <div className={`board-workspace board-app-${appKind}`}>
      <header>
        <div>
          <strong>{branding.label}</strong>
          <small>{branding.blurb}</small>
        </div>
        <label className="board-filter">
          <Search size={13} />
          <input
            value={filter}
            onChange={event => {
              setFilter(event.target.value)
              onChange({ ...value, columns, filter: event.target.value })
            }}
            placeholder="Filter cards…"
            aria-label="Filter cards"
          />
        </label>
        <form className="board-add-column" onSubmit={addColumn}>
          <input value={columnDraft} onChange={event => setColumnDraft(event.target.value)} placeholder="New column" aria-label="New column name" />
          <button type="submit" disabled={!columnDraft.trim()}><Plus size={13} /> Column</button>
        </form>
        <button type="button" onClick={() => onAskHelios(branding.helios)}><Sparkles size={13} /> Plan with Helios</button>
      </header>
      <main>
        {columns.map((column, columnIndex) => {
          const cards = column.cards.filter(matchesFilter)
          return (
            <section key={column.id}>
              <header>
                <strong>{column.name}</strong>
                <span>{cards.length}</span>
              </header>
              <div>
                {cards.map(card => (
                  <article key={card.id} className={editingId === card.id ? 'is-editing' : ''}>
                    <GripVertical size={13} />
                    {editingId === card.id ? (
                      <div className="board-card-edit">
                        <input value={card.text} onChange={event => patchCard(column.id, card.id, { text: event.target.value })} aria-label="Card text" />
                        <input type="date" value={card.due || ''} onChange={event => patchCard(column.id, card.id, { due: event.target.value })} aria-label="Due date" />
                        <input value={card.owner || ''} onChange={event => patchCard(column.id, card.id, { owner: event.target.value })} placeholder="Owner" aria-label="Owner" />
                        <button type="button" onClick={() => setEditingId(null)}>Done</button>
                      </div>
                    ) : (
                      <button type="button" className="board-card-body" onClick={() => setEditingId(card.id)}>
                        <p>{card.text}</p>
                        <small>
                          {card.due ? `Due ${card.due}` : 'No due date'}
                          {card.owner ? ` · ${card.owner}` : ''}
                        </small>
                      </button>
                    )}
                    <button type="button" disabled={columnIndex === 0} onClick={() => moveCard(card, columnIndex, -1)} aria-label="Move left"><ChevronLeft size={13} /></button>
                    <button type="button" disabled={columnIndex === columns.length - 1} onClick={() => moveCard(card, columnIndex, 1)} aria-label="Move right"><ChevronRight size={13} /></button>
                    <button
                      type="button"
                      onClick={() => commit(columns.map(item => item.id === column.id ? { ...item, cards: item.cards.filter(cardItem => cardItem.id !== card.id) } : item))}
                      aria-label="Delete card"
                    >
                      <Trash2 size={12} />
                    </button>
                  </article>
                ))}
              </div>
              <form onSubmit={event => { event.preventDefault(); addCard(column.id) }}>
                <input
                  value={drafts[column.id] || ''}
                  onChange={event => setDrafts(current => ({ ...current, [column.id]: event.target.value }))}
                  placeholder={branding.label === 'Tally' ? 'Add an item' : 'Add a card'}
                />
                <button type="submit" disabled={!drafts[column.id]?.trim()}><Plus size={13} /></button>
              </form>
            </section>
          )
        })}
      </main>
    </div>
  )
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  time?: string
  notes?: string
}

interface CalendarData {
  events?: CalendarEvent[]
  view?: 'month' | 'week'
  focusDate?: string
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  const day = next.getDay()
  next.setDate(next.getDate() - day)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function monthCells(focus: Date) {
  const first = new Date(focus.getFullYear(), focus.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

export function CalendarWorkspace({ data, onChange, onAskHelios }: EditorProps) {
  const value = data as unknown as CalendarData
  const events = useMemo(() => (value.events || []).map(event => ({
    id: event.id || crypto.randomUUID(),
    title: event.title || 'Untitled',
    date: event.date || toDateKey(new Date()),
    time: event.time || '',
    notes: event.notes || '',
  })), [value.events])
  const view = value.view === 'week' ? 'week' : 'month'
  const focus = useMemo(() => {
    const raw = value.focusDate || toDateKey(new Date())
    const parsed = new Date(`${raw}T12:00:00`)
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed
  }, [value.focusDate])
  const [selectedDate, setSelectedDate] = useState(toDateKey(focus))
  const [draft, setDraft] = useState({ title: '', time: '', notes: '' })
  const [editingId, setEditingId] = useState<string | null>(null)

  function commit(patch: Partial<CalendarData>) {
    onChange({ ...value, events, ...patch })
  }

  function shiftFocus(amount: number) {
    const next = view === 'week' ? addDays(focus, amount * 7) : new Date(focus.getFullYear(), focus.getMonth() + amount, 1)
    commit({ focusDate: toDateKey(next) })
  }

  function upsertEvent(event: React.FormEvent) {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title) return
    if (editingId) {
      commit({
        events: events.map(item => item.id === editingId
          ? { ...item, title, date: selectedDate, time: draft.time, notes: draft.notes }
          : item),
      })
    } else {
      commit({
        events: [...events, {
          id: crypto.randomUUID(),
          title,
          date: selectedDate,
          time: draft.time,
          notes: draft.notes,
        }],
      })
    }
    setDraft({ title: '', time: '', notes: '' })
    setEditingId(null)
  }

  function editEvent(item: CalendarEvent) {
    setSelectedDate(item.date)
    setEditingId(item.id)
    setDraft({ title: item.title, time: item.time || '', notes: item.notes || '' })
  }

  const days = view === 'week'
    ? Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(focus), index))
    : monthCells(focus)
  const selectedEvents = events.filter(item => item.date === selectedDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
  const monthLabel = focus.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="calendar-workspace">
      <header>
        <div>
          <strong>Orbit</strong>
          <small>Plan collab time and milestones on a real calendar.</small>
        </div>
        <div className="calendar-view-switch">
          <button type="button" className={view === 'month' ? 'is-active' : ''} onClick={() => commit({ view: 'month' })}>Month</button>
          <button type="button" className={view === 'week' ? 'is-active' : ''} onClick={() => commit({ view: 'week' })}>Week</button>
        </div>
        <div className="calendar-nav">
          <button type="button" onClick={() => shiftFocus(-1)} aria-label="Previous"><ChevronLeft size={14} /></button>
          <strong>{view === 'week' ? `Week of ${toDateKey(startOfWeek(focus))}` : monthLabel}</strong>
          <button type="button" onClick={() => shiftFocus(1)} aria-label="Next"><ChevronRight size={14} /></button>
          <button type="button" onClick={() => commit({ focusDate: toDateKey(new Date()) })}>Today</button>
        </div>
        <button type="button" onClick={() => onAskHelios('Review this Orbit calendar and suggest a realistic schedule for the next milestones')}><Sparkles size={13} /> Plan week</button>
      </header>
      <div className="calendar-layout">
        <div className={`calendar-grid is-${view}`} role="grid" aria-label="Orbit calendar">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(label => <span key={label} className="calendar-dow">{label}</span>)}
          {days.map(day => {
            const key = toDateKey(day)
            const dayEvents = events.filter(item => item.date === key)
            const inMonth = day.getMonth() === focus.getMonth()
            return (
              <button
                type="button"
                key={key}
                className={`calendar-day${!inMonth && view === 'month' ? ' is-outside' : ''}${key === selectedDate ? ' is-selected' : ''}${key === toDateKey(new Date()) ? ' is-today' : ''}`}
                onClick={() => setSelectedDate(key)}
              >
                <strong>{day.getDate()}</strong>
                <div>
                  {dayEvents.slice(0, view === 'week' ? 6 : 3).map(item => (
                    <span key={item.id}>{item.time ? `${item.time} ` : ''}{item.title}</span>
                  ))}
                  {dayEvents.length > (view === 'week' ? 6 : 3) && <small>+{dayEvents.length - (view === 'week' ? 6 : 3)} more</small>}
                </div>
              </button>
            )
          })}
        </div>
        <aside className="calendar-sidebar">
          <header>
            <strong>{selectedDate}</strong>
            <small>{selectedEvents.length} event{selectedEvents.length === 1 ? '' : 's'}</small>
          </header>
          <form className="calendar-event-form" onSubmit={upsertEvent}>
            <input value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder="Event title" aria-label="Event title" required />
            <input type="time" value={draft.time} onChange={event => setDraft(current => ({ ...current, time: event.target.value }))} aria-label="Event time" />
            <textarea value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} placeholder="Notes" aria-label="Event notes" />
            <div>
              <button type="submit"><Plus size={13} /> {editingId ? 'Update event' : 'Add event'}</button>
              {editingId && <button type="button" onClick={() => { setEditingId(null); setDraft({ title: '', time: '', notes: '' }) }}>Cancel</button>}
            </div>
          </form>
          <div className="calendar-event-list">
            {selectedEvents.map(item => (
              <article key={item.id}>
                <button type="button" onClick={() => editEvent(item)}>
                  <strong>{item.title}</strong>
                  <small>{item.time || 'All day'}{item.notes ? ` · ${item.notes}` : ''}</small>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${item.title}`}
                  onClick={() => commit({ events: events.filter(eventItem => eventItem.id !== item.id) })}
                >
                  <Trash2 size={12} />
                </button>
              </article>
            ))}
            {selectedEvents.length === 0 && <p>No events on this day. Add one above.</p>}
          </div>
        </aside>
      </div>
    </div>
  )
}
