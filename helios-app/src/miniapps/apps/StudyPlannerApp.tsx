import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { MiniAppEmpty } from '../MiniAppStates'
import { useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

interface Assignment {
  id: string
  subject: string
  title: string
  due: string
  done: boolean
}

export default function StudyPlannerApp({ accountId }: MiniAppProps) {
  const [items, setItems] = useAccountState<Assignment[]>(accountId, 'planner', [])
  const [subject, setSubject] = useState('Math')
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')

  const subjects = useMemo(() => [...new Set(items.map(item => item.subject))], [items])
  const done = items.filter(item => item.done).length
  const progress = items.length ? Math.round(done / items.length * 100) : 0

  function add(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    setItems(current => [...current, { id: crypto.randomUUID(), subject, title: title.trim(), due, done: false }])
    setTitle('')
  }

  return (
    <div className="planner-app">
      <header>
        <div>
          <small>PROGRESS</small>
          <strong>{progress}%</strong>
        </div>
        <div className="progress-bar"><span style={{ width: progress + '%' }} /></div>
      </header>
      <form onSubmit={add}>
        <input value={subject} onChange={event => setSubject(event.target.value)} placeholder="Subject" aria-label="Subject" />
        <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Assignment" aria-label="Assignment" />
        <input type="date" value={due} onChange={event => setDue(event.target.value)} aria-label="Deadline" />
        <button type="submit" disabled={!title.trim()}><Plus size={14} /> Add</button>
      </form>
      <div className="planner-subjects">{subjects.map(name => <span key={name}>{name}</span>)}</div>
      <div className="todo-list">
        {items.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999')).map(item => (
          <article key={item.id} className={item.done ? 'is-done' : ''}>
            <button type="button" onClick={() => setItems(current => current.map(entry => entry.id === item.id ? { ...entry, done: !entry.done } : entry))} aria-pressed={item.done} />
            <div>
              <strong>{item.title}</strong>
              <small>{item.subject}{item.due ? ` · due ${item.due}` : ''}</small>
            </div>
          </article>
        ))}
        {items.length === 0 && <MiniAppEmpty title="Plan the next deadline" detail="Add a subject and assignment." />}
      </div>
    </div>
  )
}
