import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown, ArrowUp, BarChart3, Bold, BookOpen, Bookmark, ChevronLeft, ChevronRight, Columns3,
  Copy, Heading1, Heading2, Heading3, Highlighter, Image, Italic, List, Maximize2, Plus,
  Presentation, Quote, Search, Sparkles, Square, Table2, Trash2, Type,
} from 'lucide-react'
import { useApp } from '../store/appStore'

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
  const { state } = useApp()
  const value = data as unknown as WritingData
  const editorRef = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<'edit' | 'reader'>(value.readerMode ? 'reader' : 'edit')
  const [note, setNote] = useState('')
  const [fontSize, setFontSize] = useState('3')
  const [findQuery, setFindQuery] = useState('')
  const [findOpen, setFindOpen] = useState(false)
  const safeHtml = useMemo(() => sanitizeHtml(value.html || ''), [value.html])
  const characterLimit = state.user?.usage?.characters.limit ?? null
  const characterUsed = writingCharacterCount(value.html || '')
  const characterRatio = characterLimit == null ? 0 : characterUsed / Math.max(1, characterLimit)
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

  function findInDocument() {
    const query = findQuery.trim()
    if (!query || !editorRef.current) return
    const text = editorRef.current.innerText || ''
    const index = text.toLowerCase().indexOf(query.toLowerCase())
    if (index < 0) {
      window.alert('No matches found')
      return
    }
    editorRef.current.focus()
    const selection = window.getSelection()
    if (!selection) return
    const walker = document.createTreeWalker(editorRef.current, NodeFilter.SHOW_TEXT)
    let walked = 0
    let node = walker.nextNode()
    while (node) {
      const length = node.textContent?.length || 0
      if (walked + length > index) {
        const start = index - walked
        const range = document.createRange()
        range.setStart(node, start)
        range.setEnd(node, Math.min(start + query.length, length))
        selection.removeAllRanges()
        selection.addRange(range)
        ;(node.parentElement as HTMLElement | null)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
        return
      }
      walked += length
      node = walker.nextNode()
    }
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
          <button type="button" onClick={() => command('hiliteColor', '#ffe08a')} title="Highlight"><Highlighter size={14} /></button>
          <button type="button" onClick={() => command('formatBlock', 'h1')} title="Heading 1"><Heading1 size={14} /></button>
          <button type="button" onClick={() => command('formatBlock', 'h2')} title="Heading 2"><Heading2 size={14} /></button>
          <button type="button" onClick={() => command('formatBlock', 'h3')} title="Heading 3"><Heading3 size={14} /></button>
          <label className="writing-font-size" title="Font size">
            <Type size={13} />
            <select value={fontSize} onChange={event => { setFontSize(event.target.value); command('fontSize', event.target.value) }} aria-label="Font size">
              <option value="2">Small</option>
              <option value="3">Normal</option>
              <option value="4">Large</option>
              <option value="5">XL</option>
            </select>
          </label>
          <button type="button" onClick={() => command('insertUnorderedList')} title="List"><List size={14} /></button>
          <button type="button" onClick={() => command('formatBlock', 'blockquote')} title="Quote"><Quote size={14} /></button>
          <button type="button" onClick={insertImage} title="Image"><Image size={14} /></button>
          <button type="button" onClick={insertTable} title="Table"><Table2 size={14} /></button>
          <button type="button" onClick={addCitation} title="Citation"><BookOpen size={14} /></button>
          <button type="button" onClick={() => setFindOpen(open => !open)} title="Find" className={findOpen ? 'is-active' : ''}><Search size={14} /></button>
          <button type="button" onClick={() => onAskHelios('Check this document for grammar, clarity, structure and citation gaps')} className="writing-helios-action"><Sparkles size={14} /> Grammar & clarity</button>
        </>}
        <span className={'writing-usage' + (characterRatio >= 1 ? ' is-over' : characterRatio >= 0.85 ? ' is-warn' : '')}>
          {characterUsed.toLocaleString()} chars
        </span>
      </header>
      {mode === 'edit' && findOpen && (
        <form className="writing-find-bar" onSubmit={event => { event.preventDefault(); findInDocument() }}>
          <Search size={13} />
          <input value={findQuery} onChange={event => setFindQuery(event.target.value)} placeholder="Find in document…" aria-label="Find in document" autoFocus />
          <button type="submit">Find</button>
        </form>
      )}

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
  expression = expression.replace(/(SUM|AVERAGE)\(([A-Z][1-9]\d*):([A-Z][1-9]\d*)\)/g, (_, fn: string, start: string, end: string) => {
    const a = cellPosition(start)
    const b = cellPosition(end)
    if (!a || !b) return '0'
    let total = 0
    let count = 0
    for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row += 1) {
      for (let column = Math.min(a.column, b.column); column <= Math.max(a.column, b.column); column += 1) {
        total += Number(computeCell(cells, cells[row]?.[column] || '0', seen)) || 0
        count += 1
      }
    }
    if (fn === 'AVERAGE') return String(count ? total / count : 0)
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

type SlideLayout = 'title' | 'title-content' | 'two-column' | 'blank' | 'section'
type SlideTransition = 'none' | 'fade' | 'push'
type SlideThemeId = 'terracotta-glass' | 'blue-glass' | 'charcoal' | 'warm-sand'

interface SlideShape {
  id: string
  type: 'text' | 'rect'
  x: number
  y: number
  w: number
  h: number
  text?: string
  fill?: string
}

interface Slide {
  id: string
  title: string
  body: string
  notes: string
  layout: SlideLayout
  theme: SlideThemeId
  imageUrl?: string
  shapes?: SlideShape[]
  transition?: SlideTransition
  secondary?: string
}

interface PresentationData { slides: Slide[]; activeSlide: number }

const SLIDE_THEMES: Record<SlideThemeId, { label: string; bg: string; text: string; muted: string; accent: string }> = {
  'terracotta-glass': {
    label: 'Terracotta glass',
    bg: 'linear-gradient(145deg, rgba(255,255,255,.92), rgba(236,239,243,.88)), linear-gradient(160deg, #fff7f2, #eceff3)',
    text: '#1c1917',
    muted: '#6b635c',
    accent: '#c96442',
  },
  'blue-glass': {
    label: 'Blue glass',
    bg: 'linear-gradient(145deg, rgba(255,255,255,.9), rgba(219,232,255,.85)), linear-gradient(160deg, #eef5ff, #eceff3)',
    text: '#132033',
    muted: '#5a6b82',
    accent: '#5b8def',
  },
  charcoal: {
    label: 'Charcoal',
    bg: 'linear-gradient(145deg, #1c1f26, #12141a)',
    text: '#eceff3',
    muted: '#9aa3b2',
    accent: '#5b8def',
  },
  'warm-sand': {
    label: 'Warm sand',
    bg: 'linear-gradient(145deg, #f7f1e8, #eceff3)',
    text: '#2a241c',
    muted: '#7a6f62',
    accent: '#c96442',
  },
}

const LAYOUT_OPTIONS: Array<{ id: SlideLayout; label: string }> = [
  { id: 'title', label: 'Title' },
  { id: 'title-content', label: 'Title + content' },
  { id: 'two-column', label: 'Two column' },
  { id: 'blank', label: 'Blank' },
  { id: 'section', label: 'Section' },
]

function normalizeSlide(slide: Partial<Slide> & { id?: string; title?: string; body?: string; notes?: string }): Slide {
  return {
    id: slide.id || crypto.randomUUID(),
    title: slide.title || 'Untitled slide',
    body: slide.body || '',
    notes: slide.notes || '',
    layout: slide.layout || 'title-content',
    theme: slide.theme || 'terracotta-glass',
    imageUrl: slide.imageUrl,
    shapes: slide.shapes || [],
    transition: slide.transition || 'none',
    secondary: slide.secondary || '',
  }
}

function createBlankSlide(partial?: Partial<Slide>): Slide {
  return normalizeSlide({
    id: crypto.randomUUID(),
    title: 'New slide',
    body: 'Add one clear idea.',
    notes: '',
    layout: 'title-content',
    theme: 'terracotta-glass',
    shapes: [],
    transition: 'none',
    ...partial,
  })
}

export function PresentationWorkspace({ data, onChange, onAskHelios }: EditorProps) {
  const value = data as unknown as PresentationData
  const [presenting, setPresenting] = useState(false)
  const [imageUrlDraft, setImageUrlDraft] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const slides = useMemo(
    () => (value.slides || []).map(slide => normalizeSlide(slide)),
    [value.slides],
  )
  const activeIndex = Math.min(value.activeSlide || 0, Math.max(0, slides.length - 1))
  const active = slides[activeIndex]

  function commitSlides(nextSlides: Slide[], activeSlide = activeIndex) {
    onChange({ ...value, slides: nextSlides, activeSlide })
  }

  function patchSlide(patch: Partial<Slide>) {
    commitSlides(slides.map((slide, index) => index === activeIndex ? { ...slide, ...patch } : slide))
  }

  function addSlide() {
    const next = [...slides, createBlankSlide({ theme: active?.theme || 'terracotta-glass' })]
    commitSlides(next, next.length - 1)
  }

  function duplicateSlide() {
    if (!active) return
    const copy = createBlankSlide({
      ...active,
      id: crypto.randomUUID(),
      title: `${active.title} (copy)`,
      shapes: (active.shapes || []).map(shape => ({ ...shape, id: crypto.randomUUID() })),
    })
    const next = [...slides.slice(0, activeIndex + 1), copy, ...slides.slice(activeIndex + 1)]
    commitSlides(next, activeIndex + 1)
  }

  function deleteSlide() {
    if (slides.length <= 1) return
    const next = slides.filter((_, index) => index !== activeIndex)
    commitSlides(next, Math.max(0, activeIndex - 1))
  }

  function moveSlide(direction: -1 | 1) {
    const target = activeIndex + direction
    if (target < 0 || target >= slides.length) return
    const next = [...slides]
    const [item] = next.splice(activeIndex, 1)
    next.splice(target, 0, item)
    commitSlides(next, target)
  }

  function applyTheme(themeId: SlideThemeId) {
    patchSlide({ theme: themeId })
  }

  function insertPhotoFromFile(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    patchSlide({ imageUrl: url })
  }

  function insertPhotoFromUrl() {
    const url = imageUrlDraft.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url) && !url.startsWith('data:') && !url.startsWith('blob:')) return
    patchSlide({ imageUrl: url })
    setImageUrlDraft('')
  }

  function addShape(type: 'text' | 'rect') {
    const shapes = [...(active?.shapes || [])]
    shapes.push({
      id: crypto.randomUUID(),
      type,
      x: 12 + shapes.length * 4,
      y: 18 + shapes.length * 5,
      w: type === 'text' ? 36 : 28,
      h: type === 'text' ? 14 : 18,
      text: type === 'text' ? 'Text box' : '',
      fill: type === 'rect' ? 'rgba(201,100,66,.28)' : 'rgba(255,255,255,.72)',
    })
    patchSlide({ shapes })
  }

  function patchShape(id: string, patch: Partial<SlideShape>) {
    patchSlide({
      shapes: (active?.shapes || []).map(shape => shape.id === id ? { ...shape, ...patch } : shape),
    })
  }

  function removeShape(id: string) {
    patchSlide({ shapes: (active?.shapes || []).filter(shape => shape.id !== id) })
  }

  function renderCanvas(slide: Slide, editable: boolean) {
    const palette = SLIDE_THEMES[slide.theme]
    const layout = slide.layout
    return (
      <div
        className={`slide-canvas layout-${layout} theme-${slide.theme}`}
        style={{ background: palette.bg, color: palette.text, ['--slide-accent' as string]: palette.accent, ['--slide-muted' as string]: palette.muted }}
      >
        {layout !== 'blank' && (
          editable ? (
            <input
              className="slide-title-field"
              value={slide.title}
              onChange={event => patchSlide({ title: event.target.value })}
              aria-label="Slide title"
              placeholder={layout === 'section' ? 'Section title' : 'Slide title'}
            />
          ) : (
            <h1 className="slide-title-field">{slide.title}</h1>
          )
        )}
        {(layout === 'title-content' || layout === 'title' || layout === 'section') && (
          editable ? (
            <textarea
              className="slide-body-field"
              value={slide.body}
              onChange={event => patchSlide({ body: event.target.value })}
              aria-label="Slide body"
              placeholder={layout === 'title' ? 'Supporting line' : 'Body'}
            />
          ) : (
            <p className="slide-body-field">{slide.body}</p>
          )
        )}
        {layout === 'two-column' && (
          <div className="slide-two-column">
            {editable ? (
              <>
                <textarea value={slide.body} onChange={event => patchSlide({ body: event.target.value })} aria-label="Left column" placeholder="Left column" />
                <textarea value={slide.secondary || ''} onChange={event => patchSlide({ secondary: event.target.value })} aria-label="Right column" placeholder="Right column" />
              </>
            ) : (
              <>
                <p>{slide.body}</p>
                <p>{slide.secondary}</p>
              </>
            )}
          </div>
        )}
        {slide.imageUrl && (
          <figure className="slide-media">
            <img src={slide.imageUrl} alt="" />
            {editable && (
              <button type="button" onClick={() => patchSlide({ imageUrl: undefined })} aria-label="Remove image">
                <Trash2 size={12} />
              </button>
            )}
          </figure>
        )}
        {(slide.shapes || []).map(shape => (
          <div
            key={shape.id}
            className={`slide-shape is-${shape.type}`}
            style={{
              left: `${shape.x}%`,
              top: `${shape.y}%`,
              width: `${shape.w}%`,
              height: `${shape.h}%`,
              background: shape.fill || (shape.type === 'rect' ? 'rgba(91,141,239,.28)' : 'rgba(255,255,255,.75)'),
            }}
          >
            {shape.type === 'text' && (
              editable ? (
                <textarea
                  value={shape.text || ''}
                  onChange={event => patchShape(shape.id, { text: event.target.value })}
                  aria-label="Shape text"
                />
              ) : (
                <span>{shape.text}</span>
              )
            )}
            {editable && (
              <button type="button" className="slide-shape-remove" onClick={() => removeShape(shape.id)} aria-label="Remove shape">
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="presentation-workspace">
      <aside className="slide-thumbnails">
        <header>
          <strong>SLIDES</strong>
          <button type="button" onClick={addSlide} aria-label="Add slide"><Plus size={13} /></button>
        </header>
        {slides.map((slide, index) => (
          <button
            type="button"
            key={slide.id}
            className={activeIndex === index ? 'is-active' : ''}
            onClick={() => onChange({ ...value, slides, activeSlide: index })}
          >
            <span>{index + 1}</span>
            <i style={{ background: SLIDE_THEMES[slide.theme].bg, color: SLIDE_THEMES[slide.theme].text }}>
              <strong>{slide.title}</strong>
              <small>{slide.body}</small>
            </i>
          </button>
        ))}
      </aside>

      <section className="slide-editor">
        <header className="slide-editor-toolbar">
          <button type="button" onClick={() => setPresenting(true)}><Presentation size={14} /> Present</button>
          <button type="button" onClick={duplicateSlide} disabled={!active}><Copy size={14} /> Duplicate</button>
          <button type="button" onClick={() => moveSlide(-1)} disabled={activeIndex === 0} aria-label="Move slide up"><ArrowUp size={14} /></button>
          <button type="button" onClick={() => moveSlide(1)} disabled={activeIndex >= slides.length - 1} aria-label="Move slide down"><ArrowDown size={14} /></button>
          <button type="button" onClick={() => onAskHelios('Improve this presentation structure and make each slide clearer')}><Sparkles size={14} /> Improve</button>
          <button type="button" onClick={deleteSlide} aria-label="Delete slide"><Trash2 size={14} /></button>
        </header>

        {active && (
          <div className="slide-editor-body">
            <div className="slide-stage">
              {renderCanvas(active, true)}
              <label className="slide-notes">
                Speaker notes
                <textarea value={active.notes} onChange={event => patchSlide({ notes: event.target.value })} />
              </label>
            </div>

            <aside className="slide-designer liquid-glass">
              <strong>Designer</strong>
              <label>
                Layout
                <select value={active.layout} onChange={event => patchSlide({ layout: event.target.value as SlideLayout })} aria-label="Slide layout">
                  {LAYOUT_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </label>
              <label>
                Transition
                <select value={active.transition || 'none'} onChange={event => patchSlide({ transition: event.target.value as SlideTransition })} aria-label="Slide transition">
                  <option value="none">None</option>
                  <option value="fade">Fade</option>
                  <option value="push">Push</option>
                </select>
              </label>
              <div className="slide-theme-presets">
                <span>Theme</span>
                {(Object.keys(SLIDE_THEMES) as SlideThemeId[]).map(themeId => (
                  <button
                    type="button"
                    key={themeId}
                    className={active.theme === themeId ? 'is-active' : ''}
                    onClick={() => applyTheme(themeId)}
                    style={{ ['--theme-swatch' as string]: SLIDE_THEMES[themeId].accent }}
                  >
                    {SLIDE_THEMES[themeId].label}
                  </button>
                ))}
              </div>
              <div className="slide-insert-photo">
                <span>Insert photo</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={event => {
                    insertPhotoFromFile(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
                <button type="button" onClick={() => fileInputRef.current?.click()}><Image size={13} /> Upload image</button>
                <div>
                  <input
                    value={imageUrlDraft}
                    onChange={event => setImageUrlDraft(event.target.value)}
                    placeholder="https://… or data URL"
                    aria-label="Image URL"
                  />
                  <button type="button" onClick={insertPhotoFromUrl}>Add URL</button>
                </div>
              </div>
              <div className="slide-shape-actions">
                <span>Shapes</span>
                <button type="button" onClick={() => addShape('text')}><Type size={13} /> Text box</button>
                <button type="button" onClick={() => addShape('rect')}><Square size={13} /> Rectangle</button>
              </div>
            </aside>
          </div>
        )}
      </section>

      {presenting && active && (
        <div className={`presentation-mode transition-${active.transition || 'none'}`} role="dialog" aria-modal="true" aria-label="Presenting slides">
          <button type="button" onClick={() => setPresenting(false)}><Maximize2 size={15} /> Exit</button>
          <article className="presentation-mode-stage">
            {renderCanvas(active, false)}
          </article>
          <footer>
            <button type="button" onClick={() => onChange({ ...value, slides, activeSlide: Math.max(0, activeIndex - 1) })} disabled={activeIndex === 0}><ChevronLeft /></button>
            <span>{activeIndex + 1} / {slides.length}</span>
            <button type="button" onClick={() => onChange({ ...value, slides, activeSlide: Math.min(slides.length - 1, activeIndex + 1) })} disabled={activeIndex === slides.length - 1}><ChevronRight /></button>
          </footer>
        </div>
      )}
    </div>
  )
}
