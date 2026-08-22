import { useState } from 'react'
import { Check, Flame, Plus, Trash2 } from 'lucide-react'
import { MiniAppEmpty } from '../MiniAppStates'
import { localDayKey, useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

interface HabitItem { id: string; name: string; completedDays: string[] }

export default function HabitsApp({ accountId }: MiniAppProps) {
  const [habits, setHabits] = useAccountState<HabitItem[]>(accountId, 'habits', [])
  const [name, setName] = useState('')
  const today = localDayKey()
  const completed = habits.filter(habit => habit.completedDays.includes(today)).length

  function addHabit(event: React.FormEvent) {
    event.preventDefault()
    const normalized = name.trim()
    if (!normalized) return
    setHabits(current => [...current, { id: crypto.randomUUID(), name: normalized, completedDays: [] }])
    setName('')
  }

  return (
    <div className="habits-app">
      <div className="habit-summary">
        <div><Flame size={22} /><strong>{completed}/{habits.length || 0}</strong></div>
        <span>Today’s pulse</span>
        <div className="habit-progress"><span style={{ width: habits.length ? String(completed / habits.length * 100) + '%' : '0%' }} /></div>
      </div>
      <form onSubmit={addHabit}>
        <input value={name} maxLength={60} onChange={event => setName(event.target.value)} placeholder="Add a small daily habit" aria-label="Habit name" />
        <button type="submit" disabled={!name.trim()}><Plus size={17} /> Add</button>
      </form>
      <div className="habit-list">
        {habits.map(habit => {
          const done = habit.completedDays.includes(today)
          return (
            <article key={habit.id} className={done ? 'is-done' : ''}>
              <button type="button" onClick={() => setHabits(current => current.map(item => item.id === habit.id
                ? { ...item, completedDays: done ? item.completedDays.filter(day => day !== today) : [...item.completedDays, today] }
                : item))} aria-pressed={done}>
                <span>{done && <Check size={15} />}</span>
                <strong>{habit.name}</strong>
                <small>{habit.completedDays.length} total</small>
              </button>
              <button type="button" onClick={() => setHabits(current => current.filter(item => item.id !== habit.id))} aria-label={'Delete ' + habit.name}>
                <Trash2 size={14} />
              </button>
            </article>
          )
        })}
        {habits.length === 0 && <MiniAppEmpty title="Start a habit" detail="Begin with something almost too easy." />}
      </div>
    </div>
  )
}
