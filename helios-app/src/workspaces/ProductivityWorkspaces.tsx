import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3, Bold, BookOpen, Bookmark, ChevronLeft, ChevronRight, Columns3,
  Heading2, Image, Italic, List, Maximize2, Plus, Presentation, Quote,
  Sparkles, Table2, Trash2,
} from 'lucide-react'

function writingCharacterCount(html: string) {
  return [...(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()].length
}

interface EditorProps {
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  onAskHelios: (prompt?: string) => void
}

interface WritingData {
  html: string
  progress: number
  bookmarks: string[]
  notes: Array<{ id: string; body: string }>
  readerMode: boolean
}

function sanitizeHtml(html: string) {
  const documentValue = new DOMParser().parseFromString(html, 'text/html')
  documentValue.querySelectorAll('script,style,iframe,object,embed').forEach(node => node.remove())
  documentValue.querySelectorAll('*').forEach(node => {
    for (const attribute of [...node.attributes]) {
      if (attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name)
      if (['href', 'src'].includes(attribute.name.toLowerCase()) && /^javascript:/i.test(attribute.value)) node.removeAttribute(attribute.name)
    }
  })
  return documentValue.body.innerHTML
}

export function WritingWorkspace({ data, onChange, onAskHelios }: EditorProps) {
  const value = data as unknown as WritingData
  const editorRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'edit' | 'reader'>(value.readerMode ? 'reader' : 'edit')
  const [note, setNote] = useState('')
  const safeHtml = useMemo(() => sanitizeHtml(value.html || ''), [value.html])
  const characterUsed = writingCharacterCount(value.html || '')
  const headings = useMemo(() => {
    const documentValue = new DOMParser().parseFromString(safeHtml, 'text/html')
    return [...documentValue.querySelectorAll('h1,h2,h3')].map((heading, index) => heading.textContent?.trim() || `Section ${index + 1}`)
  }, [safeHtml])

  useEffect(() => {
    if (editorRef.current && document.activeElement !== editorRef.current && editorRef.current.innerHTML !== safeHtml)
      editorRef.current.innerHTML = safeHtml
  }, [safeHtml])

  function update(patch: Partial<WritingData>) {
    onChange({ ...value, ...patch })
  }

  function command(name: string, argument?: string) {
    editorRef.current?.focus()
    document.execCommand(name, false, argument)
    if (editorRef.current) update({ html: sanitizeHtml(editorRef.current.innerHTML) })
  }

  function insertImage() {
    const url = window.prompt('HTTPS image URL')?.trim()
    if (!url || !/^https:\/\//i.test(url)) return
    command('insertHTML', `<figure><img src="${url.replace(/"/g, '&quot;')}" alt="Document image"><figcaption>Image caption</figcaption></figure>`)
  }

  function insertTable() {
    command('insertHTML', '<table><tbody><tr><th>Heading</th><th>Heading</th></tr><tr><td>Data</td><td>Data</td></tr></tbody></table><p><br></p>')
  }

  function addCitation() {
    const citation = window.prompt('Citation or source')?.trim()
    if (!citation) return
    command('insertHTML', `<sup>[${Math.max(1, (value.html.match(/<sup>/g) || []).length + 1)}]</sup>`)
    if (editorRef.current) editorRef.current.innerHTML += `<p class="document-citation">${sanitizeHtml(citation)}</p>`
    if (editorRef.current) update({ html: sanitizeHtml(editorRef.current.innerHTML) })
  }

  function addNote(event: React.FormEvent) {
    event.preventDefault()
    if (!note.trim()) return
    update({ notes: [...(value.notes || []), { id: crypto.randomUUID(), body: note.trim() }] })
    setNote('')
  }

  return (
    <div className="writing-workspace">
      <header className="writing-toolbar">
        <div className="workspace-mode-switch"><button type="button" className={mode === 'edit' ? 'is-active' : ''} onClick={() => setMode('edit')}>Edit</button><button type="button" className={mode === 'reader' ? 'is-active' : ''} onClick={() => setMode('reader')}>Reader</button></div>
        {mode === 'edit' && <>
          <span />
          <button type="button" onClick={() => command('bold')} title="Bold"><Bold size={14} /></button>
          <button type="button" onClick={() => command('italic')} title="Italic"><Italic size={14} /></button>
          <button type="button" onClick={() => command('formatBlock', 'h2')} title="Heading"><Heading2 size={14} /></button>
          <button type="button" onClick={() => command('insertUnorderedList')} title="List"><List size={14} /></button>
          <button type="button" onClick={() => command('formatBlock', 'blockquote')} title="Quote"><Quote size={14} /></button>
          <button type="button" onClick={insertImage} title="Image"><Image size={14} /></button>
          <button type="button" onClick={insertTable} title="Table"><Table2 size={14} /></button>
          <button type="button" onClick={addCitation} title="Citation"><BookOpen size={14} /></button>
          <button type="button" onClick={() => onAskHelios('Check this document for grammar, clarity, structure and citation gaps')} className="writing-helios-action"><Sparkles size={14} /> Grammar & clarity</button>
        </>}
        <span className="writing-usage">
          {characterUsed.toLocaleString()} 字
        </span>
      </header>

      {mode === 'edit' ? (
        <div className="writing-editor-scroll">
          <div
            ref={editorRef}
            className="writing-page"
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Writing document"
            onInput={event => update({ html: sanitizeHtml(event.currentTarget.innerHTML) })}
          />
        </div>
      ) : (
        <div className="reader-layout">
          <aside><strong>CONTENTS</strong>{headings.map((heading, index) => <button type="button" key={`${heading}-${index}`}>{heading}</button>)}<div><span>Reading progress</span><input type="range" min="0" max="100" value={value.progress || 0} onChange={event => update({ progress: Number(event.target.value) })} /><small>{value.progress || 0}% complete</small></div></aside>
          <article className="reader-page"><div className="reader-actions"><button type="button" onClick={() => update({ bookmarks: [...new Set([...(value.bookmarks || []), headings[0] || 'Current page'])] })}><Bookmark size={14} /> Bookmark</button><button type="button" onClick={() => onAskHelios('Explain the selected passage and define difficult vocabulary')}><Sparkles size={14} /> Ask Helios</button></div><div dangerouslySetInnerHTML={{ __html: safeHtml }} /></article>
          <aside className="reader-notes"><strong>NOTES & VOCABULARY</strong><form onSubmit={addNote}><textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Add a note or unfamiliar word…" /><button type="submit" disabled={!note.trim()}><Plus size={13} /> Add</button></form>{(value.notes || []).map(item => <article key={item.id}><p>{item.body}</p><button type="button" onClick={() => update({ notes: value.notes.filter(noteItem => noteItem.id !== item.id) })}><Trash2 size={12} /></button></article>)}</aside>
        </div>
      )}
    </div>
  )
}

interface SpreadsheetData {
  cells: string[][]
  selected: string
  chartColumn: number
}

function columnName(index: number) {
  return String.fromCharCode(65 + index)
}

function cellPosition(reference: string) {
  const match = /^([A-Z])([1-9]\d*)$/.exec(reference.toUpperCase())
  return match ? { column: match[1].charCodeAt(0) - 65, row: Number(match[2]) - 1 } : null
}

function numericCell(cells: string[][], reference: string): number {
  const position = cellPosition(reference)
  if (!position) return 0
  const raw = cells[position.row]?.[position.column] || '0'
  const computed = computeCell(cells, raw, new Set([reference]))
  return Number(computed) || 0
}

function computeCell(cells: string[][], raw: string, seen = new Set<string>()): string {
  if (!raw.startsWith('=')) return raw
  let expression = raw.slice(1).toUpperCase()
  expression = expression.replace(/SUM\(([A-Z][1-9]\d*):([A-Z][1-9]\d*)\)/g, (_, start: string, end: string) => {
    const a = cellPosition(start)
    const b = cellPosition(end)
    if (!a || !b) return '0'
    let total = 0
    for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row += 1)
      for (let column = Math.min(a.column, b.column); column <= Math.max(a.column, b.column); column += 1)
        total += Number(computeCell(cells, cells[row]?.[column] || '0', seen)) || 0
    return String(total)
  })
  expression = expression.replace(/[A-Z][1-9]\d*/g, reference => {
    if (seen.has(reference)) return '0'
    return String(numericCell(cells, reference))
  })
  if (!/^[\d+\-*/().\s]+$/.test(expression)) return '#VALUE!'
  try { return String(Function(`"use strict"; return (${expression})`)()) } catch { return '#ERROR!' }
}

export function SpreadsheetWorkspace({ data, onChange, onAskHelios }: EditorProps) {
  const value = data as unknown as SpreadsheetData
  const cells = value.cells || []
  const selected = cellPosition(value.selected || 'A1') || { row: 0, column: 0 }

  function updateCell(row: number, column: number, next: string) {
    const nextCells = cells.map(line => [...line])
    while (nextCells.length <= row) nextCells.push(Array(cells[0]?.length || 8).fill(''))
    while (nextCells[row].length <= column) nextCells[row].push('')
    nextCells[row][column] = next
    onChange({ ...value, cells: nextCells })
  }

  const chartValues = cells.slice(1, 9).map((row, index) => ({ label: row[0] || `Row ${index + 2}`, value: Number(computeCell(cells, row[value.chartColumn] || '0')) || 0 }))
  const chartMax = Math.max(1, ...chartValues.map(item => Math.abs(item.value)))

  return (
    <div className="spreadsheet-workspace">
      <header className="sheet-toolbar"><button type="button" onClick={() => onChange({ ...value, cells: [...cells, Array(cells[0]?.length || 8).fill('')] })}><Plus size={13} /> Row</button><button type="button" onClick={() => onChange({ ...value, cells: cells.map(row => [...row, '']) })}><Columns3 size={13} /> Column</button><span /><button type="button" onClick={() => onAskHelios('Analyze this spreadsheet, identify patterns, formula problems and useful next charts')}><Sparkles size={13} /> Analyze with Helios</button></header>
      <div className="sheet-formula-bar"><strong>{columnName(selected.column)}{selected.row + 1}</strong><span>fx</span><input value={cells[selected.row]?.[selected.column] || ''} onChange={event => updateCell(selected.row, selected.column, event.target.value)} aria-label="Formula bar" /></div>
      <div className="spreadsheet-layout">
        <div className="sheet-grid-scroll"><table><thead><tr><th /><>{Array.from({ length: cells[0]?.length || 8 }, (_, column) => <th key={column}>{columnName(column)}</th>)}</></tr></thead><tbody>{cells.map((row, rowIndex) => <tr key={rowIndex}><th>{rowIndex + 1}</th>{row.map((raw, columnIndex) => <td key={columnIndex} className={value.selected === `${columnName(columnIndex)}${rowIndex + 1}` ? 'is-selected' : ''}><input value={raw} onFocus={() => onChange({ ...value, selected: `${columnName(columnIndex)}${rowIndex + 1}` })} onChange={event => updateCell(rowIndex, columnIndex, event.target.value)} aria-label={`${columnName(columnIndex)}${rowIndex + 1}`} /><span>{computeCell(cells, raw)}</span></td>)}</tr>)}</tbody></table></div>
        <aside className="sheet-chart"><header><BarChart3 size={15} /><strong>Quick chart</strong><select value={value.chartColumn || 1} onChange={event => onChange({ ...value, chartColumn: Number(event.target.value) })}>{Array.from({ length: cells[0]?.length || 8 }, (_, index) => <option key={index} value={index}>Column {columnName(index)}</option>)}</select></header><div>{chartValues.map(item => <span key={item.label}><small>{item.label}</small><i style={{ height: `${Math.max(3, Math.abs(item.value) / chartMax * 100)}%` }} title={String(item.value)} /><b>{item.value}</b></span>)}</div></aside>
      </div>
    </div>
  )
}

interface Slide { id: string; title: string; body: string; notes: string }
interface PresentationData { slides: Slide[]; activeSlide: number }

export function PresentationWorkspace({ data, onChange, onAskHelios }: EditorProps) {
  const value = data as unknown as PresentationData
  const [presenting, setPresenting] = useState(false)
  const slides = value.slides || []
  const activeIndex = Math.min(value.activeSlide || 0, Math.max(0, slides.length - 1))
  const active = slides[activeIndex]

  function patchSlide(patch: Partial<Slide>) {
    onChange({ ...value, slides: slides.map((slide, index) => index === activeIndex ? { ...slide, ...patch } : slide) })
  }

  function addSlide() {
    const next = [...slides, { id: crypto.randomUUID(), title: 'New slide', body: 'Add one clear idea.', notes: '' }]
    onChange({ ...value, slides: next, activeSlide: next.length - 1 })
  }

  function deleteSlide() {
    if (slides.length <= 1) return
    const next = slides.filter((_, index) => index !== activeIndex)
    onChange({ ...value, slides: next, activeSlide: Math.max(0, activeIndex - 1) })
  }

  return (
    <div className="presentation-workspace">
      <aside className="slide-thumbnails"><header><strong>SLIDES</strong><button type="button" onClick={addSlide}><Plus size={13} /></button></header>{slides.map((slide, index) => <button type="button" key={slide.id} className={activeIndex === index ? 'is-active' : ''} onClick={() => onChange({ ...value, activeSlide: index })}><span>{index + 1}</span><i><strong>{slide.title}</strong><small>{slide.body}</small></i></button>)}</aside>
      <section className="slide-editor"><header><button type="button" onClick={() => setPresenting(true)}><Presentation size={14} /> Present</button><button type="button" onClick={() => onAskHelios('Improve this presentation structure and make each slide clearer')}><Sparkles size={14} /> Improve</button><button type="button" onClick={deleteSlide} aria-label="Delete slide"><Trash2 size={14} /></button></header>{active && <><div className="slide-canvas"><input value={active.title} onChange={event => patchSlide({ title: event.target.value })} aria-label="Slide title" /><textarea value={active.body} onChange={event => patchSlide({ body: event.target.value })} aria-label="Slide body" /></div><label className="slide-notes">Speaker notes<textarea value={active.notes} onChange={event => patchSlide({ notes: event.target.value })} /></label></>}</section>
      {presenting && active && <div className="presentation-mode" role="dialog" aria-modal="true" aria-label="Presenting slides"><button type="button" onClick={() => setPresenting(false)}><Maximize2 size={15} /> Exit</button><article><h1>{active.title}</h1><p>{active.body}</p></article><footer><button type="button" onClick={() => onChange({ ...value, activeSlide: Math.max(0, activeIndex - 1) })} disabled={activeIndex === 0}><ChevronLeft /></button><span>{activeIndex + 1} / {slides.length}</span><button type="button" onClick={() => onChange({ ...value, activeSlide: Math.min(slides.length - 1, activeIndex + 1) })} disabled={activeIndex === slides.length - 1}><ChevronRight /></button></footer></div>}
    </div>
  )
}
