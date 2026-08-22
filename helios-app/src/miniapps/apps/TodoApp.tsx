import { useMemo, useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { MiniAppEmpty } from '../MiniAppStates'
import { useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

type Priority = 'low' | 'medium' | 'high'
type Filter = 'all' | 'open' | 'done' | 'high'

interface Task {
  id: string
  text: string
  done: boolean
  priority: Priority
  due: string
}

export default function TodoApp({ accountId }: MiniAppProps) {
  const [tasks, setTasks] = useAccountState<Task[]>(accountId, 'todo', [])
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [due, setDue] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(() => tasks.filter(task => {
    if (filter === 'open') return !task.done
    if (filter === 'done') return task.done
    if (filter === 'high') return task.priority === 'high' && !task.done
    return true
  }), [tasks, filter])

  function add(event: React.FormEvent) {
    event.preventDefault()
    const value = text.trim()
    if (!value) return
    setTasks(current => [{ id: crypto.randomUUID(), text: value, done: false, priority, due }, ...current])
    setText('')
  }

  return (
    <div className="todo-app">
      <form onSubmit={add} className="todo-form">
        <input value={text} maxLength={180} onChange={event => setText(event.target.value)} placeholder="Add a task" aria-label="Task name" />
        <select value={priority} onChange={event => setPriority(event.target.value as Priority)} aria-label="Priority">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input type="date" value={due} onChange={event => setDue(event.target.value)} aria-label="Due date" />
        <button type="submit" disabled={!text.trim()}><Plus size={15} /> Add</button>
      </form>
      <div className="tool-tabs">
        {(['all', 'open', 'done', 'high'] as Filter[]).map(item => (
          <button key={item} type="button" className={filter === item ? 'is-on' : ''} onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>
      <div className="todo-list">
        {visible.map(task => (
          <article key={task.id} className={task.done ? 'is-done' : ''}>
            <button type="button" onClick={() => setTasks(current => current.map(item => item.id === task.id ? { ...item, done: !item.done } : item))} aria-pressed={task.done} aria-label="Complete task">
              {task.done && <Check size={13} />}
            </button>
            <div>
              <strong>{task.text}</strong>
              <small>{task.priority}{task.due ? ` · due ${task.due}` : ''}</small>
            </div>
            <button type="button" onClick={() => setTasks(current => current.filter(item => item.id !== task.id))} aria-label="Delete task"><Trash2 size={14} /></button>
          </article>
        ))}
        {visible.length === 0 && <MiniAppEmpty title="Nothing here" detail="Add a task or change the filter." />}
      </div>
    </div>
  )
}
