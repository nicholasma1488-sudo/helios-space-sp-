import { useMemo, useRef, useState } from 'react'
import {
  Bold, List, ListOrdered, Pencil, Plus, Search, Sparkles, Tag, Trash2,
} from 'lucide-react'

interface FolioPage {
  id: string
  title: string
  body: string
  tags: string[]
  updatedAt?: string
}

interface Cell {
  id: string
  kind: 'markdown' | 'code' | 'result'
  body: string
}

interface NotebookData {
  title?: string
  pages?: FolioPage[]
  activePageId?: string
  cells?: Cell[]
  html?: string
}

interface Props {
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  onAskHelios: (prompt?: string) => void
}

function pageFromCell(cell: Cell): FolioPage {
  const heading = cell.body.match(/^#+\s*(.+)$/m)?.[1]?.trim()
  const title = heading
    || (cell.kind === 'code' ? 'Code snippet' : cell.kind === 'result' ? 'Findings' : 'Untitled page')
  return {
    id: cell.id || crypto.randomUUID(),
    title,
    body: cell.body,
    tags: cell.kind === 'code' ? ['code'] : cell.kind === 'result' ? ['findings'] : ['notes'],
    updatedAt: new Date().toISOString(),
  }
}

function asPages(data: NotebookData): FolioPage[] {
  if (Array.isArray(data.pages) && data.pages.length > 0) {
    return data.pages.map(page => ({
      id: page.id || crypto.randomUUID(),
      title: page.title || 'Untitled page',
      body: page.body || '',
      tags: Array.isArray(page.tags) ? page.tags : [],
      updatedAt: page.updatedAt,
    }))
  }
  if (Array.isArray(data.cells) && data.cells.length > 0) {
    return data.cells.map(pageFromCell)
  }
  const html = String(data.html || '').replace(/<[^>]+>/g, '\n').trim()
  return [
    {
      id: 'today',
      title: 'Today',
      body: html || '# Today\nWhat are you working on?',
      tags: ['daily'],
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'open',
      title: 'Open threads',
      body: '## Open threads\n- ',
      tags: ['follow-up'],
      updatedAt: new Date().toISOString(),
    },
  ]
}

function applyShortcut(body: string, selectionStart: number, selectionEnd: number, kind: 'bold' | 'ul' | 'ol') {
  const selected = body.slice(selectionStart, selectionEnd) || (kind === 'bold' ? 'text' : 'Item')
  if (kind === 'bold') {
    const next = `**${selected}**`
    return {
      body: body.slice(0, selectionStart) + next + body.slice(selectionEnd),
      cursor: selectionStart + next.length,
    }
  }
  const lines = selected.split('\n').map((line, index) => (
    kind === 'ul' ? `- ${line.replace(/^(\s*[-*]|\d+\.)\s+/, '')}` : `${index + 1}. ${line.replace(/^(\s*[-*]|\d+\.)\s+/, '')}`
  ))
  const next = lines.join('\n')
  return {
    body: body.slice(0, selectionStart) + next + body.slice(selectionEnd),
    cursor: selectionStart + next.length,
  }
}

export function NotebookWorkspace({ data, onChange, onAskHelios }: Props) {
  const value = data as NotebookData
  const pages = useMemo(() => asPages(value), [value])
  const [search, setSearch] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const activeId = pages.some(page => page.id === value.activePageId)
    ? value.activePageId!
    : pages[0]?.id || ''
  const active = pages.find(page => page.id === activeId) || pages[0]
  const filtered = pages.filter(page => {
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      page.title.toLowerCase().includes(query)
      || page.body.toLowerCase().includes(query)
      || page.tags.some(tag => tag.toLowerCase().includes(query))
    )
  })

  function commit(nextPages: FolioPage[], activePageId = activeId) {
    onChange({
      ...value,
      title: value.title || 'Folio',
      pages: nextPages,
      activePageId,
      cells: undefined,
    })
  }

  function patchActive(patch: Partial<FolioPage>) {
    if (!active) return
    commit(pages.map(page => (
      page.id === active.id
        ? { ...page, ...patch, updatedAt: new Date().toISOString() }
        : page
    )))
  }

  function addPage() {
    const page: FolioPage = {
      id: crypto.randomUUID(),
      title: `Page ${pages.length + 1}`,
      body: '# New page\n',
      tags: [],
      updatedAt: new Date().toISOString(),
    }
    commit([...pages, page], page.id)
    setRenamingId(page.id)
  }

  function renamePage(id: string, title: string) {
    const trimmed = title.trim() || 'Untitled page'
    commit(pages.map(page => page.id === id ? { ...page, title: trimmed, updatedAt: new Date().toISOString() } : page))
    setRenamingId(null)
  }

  function deletePage(id: string) {
    if (pages.length <= 1) return
    const next = pages.filter(page => page.id !== id)
    commit(next, activeId === id ? next[0].id : activeId)
  }

  function addTag(event: React.FormEvent) {
    event.preventDefault()
    if (!active || !tagDraft.trim()) return
    const tag = tagDraft.trim().toLowerCase()
    if (active.tags.includes(tag)) {
      setTagDraft('')
      return
    }
    patchActive({ tags: [...active.tags, tag] })
    setTagDraft('')
  }

  function formatSelection(kind: 'bold' | 'ul' | 'ol') {
    const field = bodyRef.current
    if (!active || !field) return
    const start = field.selectionStart
    const end = field.selectionEnd
    const result = applyShortcut(active.body, start, end, kind)
    patchActive({ body: result.body })
    requestAnimationFrame(() => {
      field.focus()
      field.setSelectionRange(result.cursor, result.cursor)
    })
  }

  function onBodyKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey)) return
    if (event.key.toLowerCase() === 'b') {
      event.preventDefault()
      formatSelection('bold')
    }
  }

  return (
    <div className="notebook-workspace folio-workspace">
      <header className="writing-toolbar">
        <strong>FOLIO</strong>
        <button type="button" onClick={addPage}><Plus size={13} /> Page</button>
        <button type="button" onClick={() => formatSelection('bold')} title="Bold (Ctrl/Cmd+B)"><Bold size={14} /></button>
        <button type="button" onClick={() => formatSelection('ul')} title="Bullet list"><List size={14} /></button>
        <button type="button" onClick={() => formatSelection('ol')} title="Numbered list"><ListOrdered size={14} /></button>
        <span />
        <label className="folio-search">
          <Search size={13} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Search pages…"
            aria-label="Search Folio pages"
          />
        </label>
        <button
          type="button"
          className="writing-helios-action"
          onClick={() => onAskHelios('Summarize this Folio notebook, highlight open threads, and suggest what to capture next')}
        >
          <Sparkles size={14} /> Summarize
        </button>
      </header>

      <div className="folio-layout">
        <aside className="folio-sidebar" aria-label="Folio pages">
          <header>
            <strong>PAGES</strong>
            <span>{pages.length}</span>
          </header>
          <div className="folio-page-list">
            {filtered.map(page => (
              <article key={page.id} className={page.id === active?.id ? 'is-active' : ''}>
                <button type="button" className="folio-page-select" onClick={() => commit(pages, page.id)}>
                  <strong>{page.title}</strong>
                  <small>{page.tags.length ? page.tags.map(tag => `#${tag}`).join(' ') : 'No tags'}</small>
                </button>
                <div className="folio-page-actions">
                  <button type="button" aria-label={`Rename ${page.title}`} onClick={() => setRenamingId(page.id)}><Pencil size={12} /></button>
                  <button type="button" aria-label={`Delete ${page.title}`} disabled={pages.length <= 1} onClick={() => deletePage(page.id)}><Trash2 size={12} /></button>
                </div>
                {renamingId === page.id && (
                  <form
                    className="folio-rename"
                    onSubmit={event => {
                      event.preventDefault()
                      const input = event.currentTarget.elements.namedItem('title') as HTMLInputElement
                      renamePage(page.id, input.value)
                    }}
                  >
                    <input name="title" defaultValue={page.title} autoFocus aria-label="Page title" />
                    <button type="submit">Save</button>
                  </form>
                )}
              </article>
            ))}
            {filtered.length === 0 && <p className="folio-empty">No pages match “{search.trim()}”.</p>}
          </div>
          <button type="button" className="folio-add-page" onClick={addPage}><Plus size={13} /> New page</button>
        </aside>

        <section className="folio-editor" aria-label="Folio page editor">
          {active ? (
            <>
              <header className="folio-editor-header">
                <input
                  className="folio-title-field"
                  value={active.title}
                  onChange={event => patchActive({ title: event.target.value })}
                  aria-label="Page title"
                />
                <form className="folio-tags" onSubmit={addTag}>
                  <Tag size={13} />
                  {active.tags.map(tag => (
                    <button
                      type="button"
                      key={tag}
                      className="folio-tag"
                      onClick={() => patchActive({ tags: active.tags.filter(item => item !== tag) })}
                      title="Remove tag"
                    >
                      #{tag} ×
                    </button>
                  ))}
                  <input
                    value={tagDraft}
                    onChange={event => setTagDraft(event.target.value)}
                    placeholder="Add tag"
                    aria-label="Add tag"
                  />
                </form>
              </header>
              <textarea
                ref={bodyRef}
                className="folio-body"
                value={active.body}
                onChange={event => patchActive({ body: event.target.value })}
                onKeyDown={onBodyKeyDown}
                aria-label={`${active.title} body`}
                placeholder="Write notes… Use **bold**, - lists, or Ctrl/Cmd+B"
              />
              <footer className="folio-footer">
                <small>Autosaves with the Project · {active.updatedAt ? `Updated ${new Date(active.updatedAt).toLocaleString()}` : 'Not saved yet'}</small>
                <small>{active.body.length.toLocaleString()} chars</small>
              </footer>
            </>
          ) : (
            <div className="folio-empty-state">
              <strong>No pages yet</strong>
              <button type="button" onClick={addPage}><Plus size={14} /> Create a page</button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
