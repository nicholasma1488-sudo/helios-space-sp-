import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Trash2 } from 'lucide-react'
import { MiniAppEmpty } from '../MiniAppStates'
import { useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

interface Note {
  id: string
  title: string
  body: string
  updatedAt: string
}

export default function NotesApp({ accountId, onToast }: MiniAppProps) {
  const [notes, setNotes] = useAccountState<Note[]>(accountId, 'notes-v2', [])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [savedAt, setSavedAt] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return notes.filter(note => !needle || note.title.toLowerCase().includes(needle) || note.body.toLowerCase().includes(needle))
  }, [notes, query])

  const active = notes.find(note => note.id === activeId) ?? filtered[0] ?? null

  useEffect(() => {
    if (active && activeId !== active.id) setActiveId(active.id)
  }, [active, activeId])

  function create() {
    const note: Note = { id: crypto.randomUUID(), title: 'Untitled', body: '', updatedAt: new Date().toISOString() }
    setNotes(current => [note, ...current])
    setActiveId(note.id)
  }

  function update(patch: Partial<Note>) {
    if (!active) return
    const updatedAt = new Date().toISOString()
    setNotes(current => current.map(note => note.id === active.id ? { ...note, ...patch, updatedAt } : note))
    setSavedAt('Saved')
  }

  useEffect(() => {
    if (!savedAt) return
    const timer = window.setTimeout(() => setSavedAt(''), 1200)
    return () => window.clearTimeout(timer)
  }, [savedAt])

  return (
    <div className="notes-split">
      <aside>
        <div className="notes-toolbar">
          <label>
            <Search size={14} />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search notes" aria-label="Search notes" />
          </label>
          <button type="button" onClick={create}><Plus size={15} /> New</button>
        </div>
        <div className="notes-list">
          {filtered.map(note => (
            <button key={note.id} type="button" className={active?.id === note.id ? 'is-on' : ''} onClick={() => setActiveId(note.id)}>
              <strong>{note.title || 'Untitled'}</strong>
              <small>{note.body.slice(0, 72) || 'Empty note'}</small>
            </button>
          ))}
          {filtered.length === 0 && <MiniAppEmpty title="No notes" detail="Create one and it will autosave." />}
        </div>
      </aside>
      {active ? (
        <section>
          <header>
            <input value={active.title} onChange={event => update({ title: event.target.value })} aria-label="Note title" />
            <small>{savedAt || new Date(active.updatedAt).toLocaleString()}</small>
            <button type="button" onClick={() => { setNotes(current => current.filter(note => note.id !== active.id)); onToast('Note deleted', 'info') }} aria-label="Delete note">
              <Trash2 size={15} />
            </button>
          </header>
          <textarea value={active.body} onChange={event => update({ body: event.target.value })} placeholder="Write here. Autosave is on." aria-label="Note body" />
        </section>
      ) : (
        <MiniAppEmpty title="Start a note" detail="Your notes stay on this account." />
      )}
    </div>
  )
}
