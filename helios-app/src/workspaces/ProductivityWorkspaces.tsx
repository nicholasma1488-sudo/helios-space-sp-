import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDown, ArrowUp, BarChart3, Bold,
  BookOpen, Bookmark, ChevronLeft, ChevronRight, Columns3, Copy, Download, Eraser,
  Heading1, Heading2, Heading3, Highlighter, Image, IndentDecrease, IndentIncrease, Italic,
  Link2, List, ListOrdered, Maximize2, Plus, Presentation, Quote, Redo2, Search, Sparkles,
  Square, Strikethrough, Table2, Trash2, Type, Underline, Undo2, Upload,
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
  const [replaceQuery, setReplaceQuery] = useState('')
  const [findOpen, setFindOpen] = useState(false)
  const [textColor, setTextColor] = useState('#1a1b1e')
  const [highlightColor, setHighlightColor] = useState('#ffe08a')
  const [lineSpacing, setLineSpacing] = useState('1.75')
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

  function insertLink() {
    const url = window.prompt('Link URL (https://…)')?.trim()
    if (!url || !/^https?:\/\//i.test(url)) return
    command('createLink', url)
  }

  function insertPageBreak() {
    command('insertHTML', '<hr class="quill-page-break" /><p><br></p>')
  }

  function applyLineSpacing(spacing: string) {
    setLineSpacing(spacing)
    editorRef.current?.focus()
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      command('formatBlock', 'p')
      if (editorRef.current) {
        const block = selection?.anchorNode instanceof Element
          ? selection.anchorNode.closest('p,div,li,h1,h2,h3,blockquote')
          : selection?.anchorNode?.parentElement?.closest('p,div,li,h1,h2,h3,blockquote')
        if (block instanceof HTMLElement) {
          block.style.lineHeight = spacing
          update({ html: sanitizeHtml(editorRef.current.innerHTML) })
        }
      }
      return
    }
    const selected = selection.toString()
    if (!selected) return
    command('insertHTML', `<p style="line-height:${spacing}">${selected.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`)
  }

  function addCitation() {
    const citation = window.prompt('Citation or source')?.trim()
    if (!citation) return
    command('insertHTML', `<sup>[${Math.max(1, (value.html.match(/<sup>/g) || []).length + 1)}]</sup>`)
    if (editorRef.current) editorRef.current.innerHTML += `<p class="document-citation">${sanitizeHtml(citation)}</p>`
    if (editorRef.current) update({ html: sanitizeHtml(editorRef.current.innerHTML) })
  }

  function findTextIndex(query: string) {
    if (!query || !editorRef.current) return -1
    const text = editorRef.current.innerText || ''
    return text.toLowerCase().indexOf(query.toLowerCase())
  }

  function selectMatch(query: string, index: number) {
    if (!editorRef.current || index < 0) return false
    editorRef.current.focus()
    const selection = window.getSelection()
    if (!selection) return false
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
        return true
      }
      walked += length
      node = walker.nextNode()
    }
    return false
  }

  function findInDocument() {
    const query = findQuery.trim()
    if (!query) return
    const index = findTextIndex(query)
    if (index < 0) {
      window.alert('No matches found')
      return
    }
    selectMatch(query, index)
  }

  function replaceOnce() {
    const query = findQuery.trim()
    if (!query || !editorRef.current) return
    const index = findTextIndex(query)
    if (index < 0) {
      window.alert('No matches found')
      return
    }
    if (!selectMatch(query, index)) return
    document.execCommand('insertText', false, replaceQuery)
    update({ html: sanitizeHtml(editorRef.current.innerHTML) })
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
          <strong className="writing-toolbar-group">Home</strong>
          <button type="button" onClick={() => command('undo')} title="Undo"><Undo2 size={14} /></button>
          <button type="button" onClick={() => command('redo')} title="Redo"><Redo2 size={14} /></button>
          <span />
          <button type="button" onClick={() => command('bold')} title="Bold"><Bold size={14} /></button>
          <button type="button" onClick={() => command('italic')} title="Italic"><Italic size={14} /></button>
          <button type="button" onClick={() => command('underline')} title="Underline"><Underline size={14} /></button>
          <button type="button" onClick={() => command('strikeThrough')} title="Strikethrough"><Strikethrough size={14} /></button>
          <label className="writing-color-picker" title="Text color">
            <Type size={12} />
            <input type="color" value={textColor} onChange={event => { setTextColor(event.target.value); command('foreColor', event.target.value) }} aria-label="Text color" />
          </label>
          <label className="writing-color-picker" title="Highlight color">
            <Highlighter size={12} />
            <input type="color" value={highlightColor} onChange={event => { setHighlightColor(event.target.value); command('hiliteColor', event.target.value) }} aria-label="Highlight color" />
          </label>
          <button type="button" onClick={() => command('hiliteColor', highlightColor)} title="Highlight"><Highlighter size={14} /></button>
          <button type="button" onClick={() => command('removeFormat')} title="Clear formatting"><Eraser size={14} /></button>
          <span />
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
          <label className="writing-font-size" title="Line spacing">
            <select value={lineSpacing} onChange={event => applyLineSpacing(event.target.value)} aria-label="Line spacing">
              <option value="1.15">Single</option>
              <option value="1.5">1.5</option>
              <option value="1.75">Default</option>
              <option value="2">Double</option>
            </select>
          </label>
          <span />
          <button type="button" onClick={() => command('justifyLeft')} title="Align left"><AlignLeft size={14} /></button>
          <button type="button" onClick={() => command('justifyCenter')} title="Align center"><AlignCenter size={14} /></button>
          <button type="button" onClick={() => command('justifyRight')} title="Align right"><AlignRight size={14} /></button>
          <button type="button" onClick={() => command('justifyFull')} title="Justify"><AlignJustify size={14} /></button>
          <button type="button" onClick={() => command('indent')} title="Indent"><IndentIncrease size={14} /></button>
          <button type="button" onClick={() => command('outdent')} title="Outdent"><IndentDecrease size={14} /></button>
          <button type="button" onClick={() => command('insertUnorderedList')} title="Bullet list"><List size={14} /></button>
          <button type="button" onClick={() => command('insertOrderedList')} title="Numbered list"><ListOrdered size={14} /></button>
          <button type="button" onClick={() => command('formatBlock', 'blockquote')} title="Quote"><Quote size={14} /></button>
          <strong className="writing-toolbar-group">Insert</strong>
          <button type="button" onClick={insertLink} title="Insert link"><Link2 size={14} /></button>
          <button type="button" onClick={insertImage} title="Image"><Image size={14} /></button>
          <button type="button" onClick={insertTable} title="Table"><Table2 size={14} /></button>
          <button type="button" onClick={insertPageBreak} title="Page break">Break</button>
          <button type="button" onClick={addCitation} title="Citation"><BookOpen size={14} /></button>
          <strong className="writing-toolbar-group">Review</strong>
          <button type="button" onClick={() => setFindOpen(open => !open)} title="Find & replace" className={findOpen ? 'is-active' : ''}><Search size={14} /></button>
          <button type="button" onClick={() => onAskHelios('Check this Quill document for grammar, clarity, structure and citation gaps')} className="writing-helios-action"><Sparkles size={14} /> Grammar & clarity</button>
        </>}
        <span className={'writing-usage' + (characterRatio >= 1 ? ' is-over' : characterRatio >= 0.85 ? ' is-warn' : '')}>
          {characterUsed.toLocaleString()} chars
        </span>
      </header>
      {mode === 'edit' && findOpen && (
        <form className="writing-find-bar" onSubmit={event => { event.preventDefault(); findInDocument() }}>
          <Search size={13} />
          <input value={findQuery} onChange={event => setFindQuery(event.target.value)} placeholder="Find in Quill…" aria-label="Find in document" autoFocus />
          <input value={replaceQuery} onChange={event => setReplaceQuery(event.target.value)} placeholder="Replace with…" aria-label="Replace with" />
          <button type="submit">Find</button>
          <button type="button" onClick={replaceOnce}>Replace</button>
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
            aria-label="Quill document"
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

type NumberFormat = 'raw' | 'fixed2' | 'percent'

interface SpreadsheetData {
  cells: string[][]
  selected: string
  chartColumn: number
  freezeHeader?: boolean
  numberFormat?: NumberFormat
}

function columnName(index: number) {
  return String.fromCharCode(65 + index)
}

function cellPosition(reference: string) {
  const match = /^([A-Z])([1-9]\d*)$/.exec(reference.toUpperCase())
  return match ? { column: match[1].charCodeAt(0) - 65, row: Number(match[2]) - 1 } : null
}

function expandRange(start: string, end: string) {
  const a = cellPosition(start)
  const b = cellPosition(end)
  if (!a || !b) return [] as Array<{ row: number; column: number }>
  const cells: Array<{ row: number; column: number }> = []
  for (let row = Math.min(a.row, b.row); row <= Math.max(a.row, b.row); row += 1) {
    for (let column = Math.min(a.column, b.column); column <= Math.max(a.column, b.column); column += 1) {
      cells.push({ row, column })
    }
  }
  return cells
}

function numericCell(cells: string[][], reference: string, seen: Set<string>): number {
  const position = cellPosition(reference)
  if (!position) return 0
  if (seen.has(reference)) return 0
  const nextSeen = new Set(seen)
  nextSeen.add(reference)
  const raw = cells[position.row]?.[position.column] || '0'
  const computed = computeCell(cells, raw, nextSeen)
  return Number(computed) || 0
}

function rangeValues(cells: string[][], start: string, end: string, seen: Set<string>) {
  return expandRange(start, end).map(({ row, column }) => (
    Number(computeCell(cells, cells[row]?.[column] || '0', new Set(seen))) || 0
  ))
}

function matchesCriteria(value: number, criteria: string) {
  const trimmed = criteria.trim()
  const comparison = /^(<=|>=|<>|<|>|=)?(-?\d+(?:\.\d+)?)$/.exec(trimmed)
  if (!comparison) return String(value) === trimmed
  const operator = comparison[1] || '='
  const target = Number(comparison[2])
  if (operator === '<') return value < target
  if (operator === '>') return value > target
  if (operator === '<=') return value <= target
  if (operator === '>=') return value >= target
  if (operator === '<>') return value !== target
  return value === target
}

function computeCell(cells: string[][], raw: string, seen = new Set<string>()): string {
  if (!raw.startsWith('=')) return raw
  let expression = raw.slice(1).toUpperCase()

  expression = expression.replace(/(SUM|AVERAGE|MIN|MAX)\(([A-Z][1-9]\d*):([A-Z][1-9]\d*)\)/g, (_, fn: string, start: string, end: string) => {
    const values = rangeValues(cells, start, end, seen)
    if (!values.length) return '0'
    if (fn === 'MIN') return String(Math.min(...values))
    if (fn === 'MAX') return String(Math.max(...values))
    const total = values.reduce((sum, value) => sum + value, 0)
    if (fn === 'AVERAGE') return String(total / values.length)
    return String(total)
  })

  expression = expression.replace(/COUNTIF\(([A-Z][1-9]\d*):([A-Z][1-9]\d*),\s*"?([^)"]*)"?\)/g, (_, start: string, end: string, criteria: string) => {
    const values = rangeValues(cells, start, end, seen)
    return String(values.filter(value => matchesCriteria(value, criteria)).length)
  })

  expression = expression.replace(/ROUND\(([^,]+),(\d+)\)/g, (_, valueExpr: string, digits: string) => {
    const resolved = valueExpr.replace(/[A-Z][1-9]\d*/g, reference => String(numericCell(cells, reference, seen)))
    if (!/^[\d+\-*/().\s]+$/.test(resolved)) return '0'
    try {
      const value = Number(Function(`"use strict"; return (${resolved})`)())
      return String(Number(value.toFixed(Number(digits))))
    } catch {
      return '0'
    }
  })

  expression = expression.replace(/IF\(([^,]+),([^,]+),([^)]+)\)/g, (_, condition: string, whenTrue: string, whenFalse: string) => {
    const resolvePart = (part: string) => part.trim().replace(/[A-Z][1-9]\d*/g, reference => String(numericCell(cells, reference, seen)))
    const conditionExpr = resolvePart(condition).replace(/(<=|>=|<>|<|>|=)/g, match => match === '=' ? '==' : match === '<>' ? '!=' : match)
    try {
      const ok = Boolean(Function(`"use strict"; return (${conditionExpr})`)())
      const chosen = resolvePart(ok ? whenTrue : whenFalse)
      if (/^[\d+\-*/().\s]+$/.test(chosen)) return String(Function(`"use strict"; return (${chosen})`)())
      return chosen
    } catch {
      return '#VALUE!'
    }
  })

  expression = expression.replace(/[A-Z][1-9]\d*/g, reference => {
    if (seen.has(reference)) return '0'
    return String(numericCell(cells, reference, seen))
  })
  if (!/^[\d+\-*/().\s]+$/.test(expression)) return '#VALUE!'
  try { return String(Function(`"use strict"; return (${expression})`)()) } catch { return '#ERROR!' }
}

function formatDisplayValue(raw: string, computed: string, numberFormat: NumberFormat) {
  if (raw.startsWith('=') && (computed === '#VALUE!' || computed === '#ERROR!')) return computed
  const numeric = Number(computed)
  if (!Number.isFinite(numeric) || computed.trim() === '') return computed
  if (numberFormat === 'fixed2') return numeric.toFixed(2)
  if (numberFormat === 'percent') return `${(numeric * 100).toFixed(2)}%`
  return computed
}

function downloadTextFile(filename: string, contents: string, mime = 'text/plain') {
  const blob = new Blob([contents], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function cellsToCsv(cells: string[][]) {
  return cells.map(row => row.map(cell => {
    const value = cell ?? ''
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
    return value
  }).join(',')).join('\n')
}

function csvToCells(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let current = ''
  let inQuotes = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"'
        index += 1
      } else if (char === '"') {
        inQuotes = false
      } else {
        current += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === ',') {
      row.push(current)
      current = ''
      continue
    }
    if (char === '\n' || (char === '\r' && next === '\n')) {
      row.push(current)
      rows.push(row)
      row = []
      current = ''
      if (char === '\r') index += 1
      continue
    }
    if (char === '\r') {
      row.push(current)
      rows.push(row)
      row = []
      current = ''
      continue
    }
    current += char
  }
  row.push(current)
  if (row.some(cell => cell.length) || rows.length === 0) rows.push(row)
  const width = Math.max(8, ...rows.map(line => line.length))
  return rows.map(line => {
    const next = [...line]
    while (next.length < width) next.push('')
    return next
  })
}

export function SpreadsheetWorkspace({ data, onChange, onAskHelios }: EditorProps) {
  const value = data as unknown as SpreadsheetData
  const cells = value.cells || []
  const selected = cellPosition(value.selected || 'A1') || { row: 0, column: 0 }
  const freezeHeader = Boolean(value.freezeHeader)
  const numberFormat = value.numberFormat || 'raw'
  const csvInputRef = useRef<HTMLInputElement>(null)

  function update(patch: Partial<SpreadsheetData>) {
    onChange({ ...value, ...patch })
  }

  function updateCell(row: number, column: number, next: string) {
    const nextCells = cells.map(line => [...line])
    while (nextCells.length <= row) nextCells.push(Array(cells[0]?.length || 8).fill(''))
    while (nextCells[row].length <= column) nextCells[row].push('')
    nextCells[row][column] = next
    update({ cells: nextCells })
  }

  function insertRow() {
    const width = cells[0]?.length || 8
    const next = [...cells]
    next.splice(selected.row + 1, 0, Array(width).fill(''))
    update({ cells: next, selected: `${columnName(selected.column)}${selected.row + 2}` })
  }

  function insertColumn() {
    const next = cells.map(row => {
      const line = [...row]
      line.splice(selected.column + 1, 0, '')
      return line
    })
    update({ cells: next, selected: `${columnName(selected.column + 1)}${selected.row + 1}` })
  }

  function deleteRow() {
    if (cells.length <= 1) return
    const next = cells.filter((_, index) => index !== selected.row)
    const nextRow = Math.min(selected.row, next.length - 1)
    update({ cells: next, selected: `${columnName(selected.column)}${nextRow + 1}` })
  }

  function sortSelectedColumn(direction: 'asc' | 'desc') {
    if (cells.length < 2) return
    const header = cells[0]
    const body = cells.slice(1).map(row => [...row])
    const column = selected.column
    body.sort((left, right) => {
      const leftRaw = left[column] || ''
      const rightRaw = right[column] || ''
      const leftValue = Number(computeCell(cells, leftRaw))
      const rightValue = Number(computeCell(cells, rightRaw))
      const leftNumeric = Number.isFinite(leftValue) && leftRaw !== ''
      const rightNumeric = Number.isFinite(rightValue) && rightRaw !== ''
      let result = 0
      if (leftNumeric && rightNumeric) result = leftValue - rightValue
      else result = String(leftRaw).localeCompare(String(rightRaw), undefined, { numeric: true, sensitivity: 'base' })
      return direction === 'asc' ? result : -result
    })
    update({ cells: [header, ...body] })
  }

  function exportCsv() {
    downloadTextFile('lattice-sheet.csv', cellsToCsv(cells), 'text/csv')
  }

  function importCsv(file: File | undefined) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || '')
      const nextCells = csvToCells(text)
      if (!nextCells.length) return
      update({ cells: nextCells, selected: 'A1' })
    }
    reader.readAsText(file)
  }

  const chartValues = cells.slice(1, 9).map((row, index) => ({ label: row[0] || `Row ${index + 2}`, value: Number(computeCell(cells, row[value.chartColumn] || '0')) || 0 }))
  const chartMax = Math.max(1, ...chartValues.map(item => Math.abs(item.value)))

  return (
    <div className="spreadsheet-workspace">
      <header className="sheet-toolbar">
        <button type="button" onClick={insertRow}><Plus size={13} /> Insert row</button>
        <button type="button" onClick={insertColumn}><Columns3 size={13} /> Insert column</button>
        <button type="button" onClick={deleteRow}><Trash2 size={13} /> Delete row</button>
        <span />
        <button type="button" className={freezeHeader ? 'is-active' : ''} onClick={() => update({ freezeHeader: !freezeHeader })}>Freeze header</button>
        <button type="button" onClick={() => sortSelectedColumn('asc')} title="Sort ascending"><ArrowUp size={13} /> Sort A→Z</button>
        <button type="button" onClick={() => sortSelectedColumn('desc')} title="Sort descending"><ArrowDown size={13} /> Sort Z→A</button>
        <span />
        <button type="button" className={numberFormat === 'raw' ? 'is-active' : ''} onClick={() => update({ numberFormat: 'raw' })}>Raw</button>
        <button type="button" className={numberFormat === 'fixed2' ? 'is-active' : ''} onClick={() => update({ numberFormat: 'fixed2' })}>0.00</button>
        <button type="button" className={numberFormat === 'percent' ? 'is-active' : ''} onClick={() => update({ numberFormat: 'percent' })}>%</button>
        <span />
        <button type="button" onClick={exportCsv}><Download size={13} /> CSV</button>
        <button type="button" onClick={() => csvInputRef.current?.click()}><Upload size={13} /> Import</button>
        <input ref={csvInputRef} type="file" accept=".csv,text/csv" hidden onChange={event => { importCsv(event.target.files?.[0]); event.target.value = '' }} />
        <span />
        <button type="button" onClick={() => onAskHelios('Analyze this Lattice spreadsheet, identify patterns, formula problems and useful next charts')}><Sparkles size={13} /> Analyze with Helios</button>
      </header>
      <div className="sheet-formula-bar"><strong>{columnName(selected.column)}{selected.row + 1}</strong><span>fx</span><input value={cells[selected.row]?.[selected.column] || ''} onChange={event => updateCell(selected.row, selected.column, event.target.value)} aria-label="Formula bar" /></div>
      <div className="spreadsheet-layout">
        <div className={`sheet-grid-scroll${freezeHeader ? ' is-frozen-header' : ''}`}>
          <table>
            <thead>
              <tr>
                <th />
                {Array.from({ length: cells[0]?.length || 8 }, (_, column) => <th key={column}>{columnName(column)}</th>)}
              </tr>
            </thead>
            <tbody>
              {cells.map((row, rowIndex) => (
                <tr key={rowIndex} className={freezeHeader && rowIndex === 0 ? 'is-frozen-row' : undefined}>
                  <th>{rowIndex + 1}</th>
                  {row.map((raw, columnIndex) => {
                    const computed = computeCell(cells, raw)
                    return (
                      <td key={columnIndex} className={value.selected === `${columnName(columnIndex)}${rowIndex + 1}` ? 'is-selected' : ''}>
                        <input
                          value={raw}
                          onFocus={() => update({ selected: `${columnName(columnIndex)}${rowIndex + 1}` })}
                          onChange={event => updateCell(rowIndex, columnIndex, event.target.value)}
                          aria-label={`${columnName(columnIndex)}${rowIndex + 1}`}
                        />
                        <span>{formatDisplayValue(raw, computed, numberFormat)}</span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="sheet-chart">
          <header>
            <BarChart3 size={15} />
            <strong>Quick chart</strong>
            <select value={value.chartColumn || 1} onChange={event => update({ chartColumn: Number(event.target.value) })}>
              {Array.from({ length: cells[0]?.length || 8 }, (_, index) => <option key={index} value={index}>Column {columnName(index)}</option>)}
            </select>
          </header>
          <div>
            {chartValues.map(item => (
              <span key={item.label}>
                <small>{item.label}</small>
                <i style={{ height: `${Math.max(3, Math.abs(item.value) / chartMax * 100)}%` }} title={String(item.value)} />
                <b>{item.value}</b>
              </span>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

type SlideLayout = 'title' | 'title-content' | 'two-column' | 'blank' | 'section'
type SlideTransition = 'none' | 'fade' | 'push'
type SlideThemeId = 'terracotta-glass' | 'blue-glass' | 'charcoal' | 'warm-sand'
type TextAlign = 'left' | 'center' | 'right'
type ImageFit = 'cover' | 'contain'

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
  imageFit?: ImageFit
  shapes?: SlideShape[]
  transition?: SlideTransition
  secondary?: string
  titleBold?: boolean
  bodyBold?: boolean
  titleAlign?: TextAlign
  bodyAlign?: TextAlign
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
    imageFit: slide.imageFit || 'cover',
    shapes: slide.shapes || [],
    transition: slide.transition || 'none',
    secondary: slide.secondary || '',
    titleBold: slide.titleBold || false,
    bodyBold: slide.bodyBold || false,
    titleAlign: slide.titleAlign || (slide.layout === 'title' ? 'center' : 'left'),
    bodyAlign: slide.bodyAlign || (slide.layout === 'title' ? 'center' : 'left'),
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
    patchSlide({ imageUrl: url, imageFit: active?.imageFit || 'cover' })
  }

  function insertPhotoFromUrl() {
    const url = imageUrlDraft.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url) && !url.startsWith('data:') && !url.startsWith('blob:')) return
    patchSlide({ imageUrl: url, imageFit: active?.imageFit || 'cover' })
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

  function exportSlideText() {
    if (!active) return
    const lines = [
      active.title,
      '',
      active.body,
      active.secondary ? '' : null,
      active.secondary || null,
      '',
      'Notes:',
      active.notes || '(none)',
    ].filter(line => line !== null) as string[]
    downloadTextFile(`stage-slide-${activeIndex + 1}.txt`, `${lines.join('\n')}\n`)
  }

  function renderCanvas(slide: Slide, editable: boolean) {
    const palette = SLIDE_THEMES[slide.theme]
    const layout = slide.layout
    const titleStyle = {
      fontWeight: slide.titleBold ? 800 : 750,
      textAlign: slide.titleAlign || 'left',
    } as const
    const bodyStyle = {
      fontWeight: slide.bodyBold ? 700 : 400,
      textAlign: slide.bodyAlign || 'left',
    } as const
    return (
      <div
        className={`slide-canvas layout-${layout} theme-${slide.theme}`}
        style={{ background: palette.bg, color: palette.text, ['--slide-accent' as string]: palette.accent, ['--slide-muted' as string]: palette.muted }}
      >
        {layout !== 'blank' && (
          editable ? (
            <input
              className="slide-title-field"
              style={titleStyle}
              value={slide.title}
              onChange={event => patchSlide({ title: event.target.value })}
              aria-label="Slide title"
              placeholder={layout === 'section' ? 'Section title' : 'Slide title'}
            />
          ) : (
            <h1 className="slide-title-field" style={titleStyle}>{slide.title}</h1>
          )
        )}
        {(layout === 'title-content' || layout === 'title' || layout === 'section') && (
          editable ? (
            <textarea
              className="slide-body-field"
              style={bodyStyle}
              value={slide.body}
              onChange={event => patchSlide({ body: event.target.value })}
              aria-label="Slide body"
              placeholder={layout === 'title' ? 'Supporting line' : 'Body'}
            />
          ) : (
            <p className="slide-body-field" style={bodyStyle}>{slide.body}</p>
          )
        )}
        {layout === 'two-column' && (
          <div className="slide-two-column">
            {editable ? (
              <>
                <textarea style={bodyStyle} value={slide.body} onChange={event => patchSlide({ body: event.target.value })} aria-label="Left column" placeholder="Left column" />
                <textarea style={bodyStyle} value={slide.secondary || ''} onChange={event => patchSlide({ secondary: event.target.value })} aria-label="Right column" placeholder="Right column" />
              </>
            ) : (
              <>
                <p style={bodyStyle}>{slide.body}</p>
                <p style={bodyStyle}>{slide.secondary}</p>
              </>
            )}
          </div>
        )}
        {slide.imageUrl && (
          <figure className={`slide-media fit-${slide.imageFit || 'cover'}`}>
            <img src={slide.imageUrl} alt="" style={{ objectFit: slide.imageFit || 'cover' }} />
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
          <button type="button" onClick={exportSlideText} disabled={!active}><Download size={14} /> Export .txt</button>
          <button type="button" onClick={() => onAskHelios('Improve this Stage presentation structure and make each slide clearer')}><Sparkles size={14} /> Improve</button>
          <button type="button" onClick={deleteSlide} aria-label="Delete slide"><Trash2 size={14} /></button>
        </header>

        {active && (
          <div className="slide-editor-body">
            <div className="slide-stage">
              {renderCanvas(active, true)}
              <label className="slide-notes is-always-visible">
                Speaker notes
                <textarea value={active.notes} onChange={event => patchSlide({ notes: event.target.value })} placeholder="Notes stay visible while you edit…" />
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
              <div className="slide-text-controls">
                <span>Text</span>
                <div>
                  <button type="button" className={active.titleBold ? 'is-active' : ''} onClick={() => patchSlide({ titleBold: !active.titleBold })} title="Title bold"><Bold size={13} /> Title</button>
                  <button type="button" className={active.bodyBold ? 'is-active' : ''} onClick={() => patchSlide({ bodyBold: !active.bodyBold })} title="Body bold"><Bold size={13} /> Body</button>
                </div>
                <div>
                  <button type="button" className={active.titleAlign === 'left' ? 'is-active' : ''} onClick={() => patchSlide({ titleAlign: 'left' })} title="Title align left"><AlignLeft size={13} /></button>
                  <button type="button" className={active.titleAlign === 'center' ? 'is-active' : ''} onClick={() => patchSlide({ titleAlign: 'center' })} title="Title align center"><AlignCenter size={13} /></button>
                  <button type="button" className={active.titleAlign === 'right' ? 'is-active' : ''} onClick={() => patchSlide({ titleAlign: 'right' })} title="Title align right"><AlignRight size={13} /></button>
                  <button type="button" className={active.bodyAlign === 'left' ? 'is-active' : ''} onClick={() => patchSlide({ bodyAlign: 'left' })} title="Body align left">Body L</button>
                  <button type="button" className={active.bodyAlign === 'center' ? 'is-active' : ''} onClick={() => patchSlide({ bodyAlign: 'center' })} title="Body align center">Body C</button>
                  <button type="button" className={active.bodyAlign === 'right' ? 'is-active' : ''} onClick={() => patchSlide({ bodyAlign: 'right' })} title="Body align right">Body R</button>
                </div>
              </div>
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
                {active.imageUrl && (
                  <button
                    type="button"
                    className={active.imageFit === 'cover' ? 'is-active' : ''}
                    onClick={() => patchSlide({ imageFit: active.imageFit === 'cover' ? 'contain' : 'cover' })}
                  >
                    Crop fit: {active.imageFit === 'cover' ? 'Cover' : 'Contain'}
                  </button>
                )}
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
        <div className={`presentation-mode transition-${active.transition || 'none'}`} role="dialog" aria-modal="true" aria-label="Presenting Stage slides">
          <button type="button" onClick={() => setPresenting(false)}><Maximize2 size={15} /> Exit</button>
          <article key={`${active.id}-${active.transition || 'none'}-${activeIndex}`} className="presentation-mode-stage">
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
