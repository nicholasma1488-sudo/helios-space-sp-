import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowLeft, Check, Clock3, Flame, Heart, Pause, Play, Plus,
  RotateCcw, Search, Shuffle, Sparkles, Star, StickyNote, TimerReset, Trash2,
} from 'lucide-react'
import { useApp } from '../store/appStore'
import { useFocusTrap } from '../hooks/useFocusTrap'
import './MiniAppsView.css'

type AppId = 'focus' | 'notes' | 'habits' | 'decision'

interface MiniAppDefinition {
  id: AppId
  name: string
  eyebrow: string
  description: string
  color: string
  icon: React.ReactNode
}

const MINI_APPS: MiniAppDefinition[] = [
  {
    id: 'focus',
    name: 'Focus Orbit',
    eyebrow: 'TIME',
    description: 'A quiet focus timer that survives refreshes.',
    color: '#8576f5',
    icon: <TimerReset size={25} />,
  },
  {
    id: 'notes',
    name: 'Quick Notes',
    eyebrow: 'CAPTURE',
    description: 'Catch the thought before it leaves your orbit.',
    color: '#4fc3f7',
    icon: <StickyNote size={25} />,
  },
  {
    id: 'habits',
    name: 'Habit Pulse',
    eyebrow: 'RHYTHM',
    description: 'Small daily signals, visible over time.',
    color: '#6ed69a',
    icon: <Activity size={25} />,
  },
  {
    id: 'decision',
    name: 'Decision Flip',
    eyebrow: 'CLARITY',
    description: 'Choose between good options without the spiral.',
    color: '#f2b84b',
    icon: <Shuffle size={25} />,
  },
]

function useAccountState<T>(accountId: number, name: string, initial: T) {
  const key = 'helios-mini-v1-' + accountId + '-' + name
  const initialRef = useRef(initial)
  const [value, setValue] = useState<T>(initial)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReady(false)
    try {
      const raw = localStorage.getItem(key)
      setValue(raw ? JSON.parse(raw) as T : initialRef.current)
    } catch {
      setValue(initialRef.current)
    } finally {
      setReady(true)
    }
  }, [key])

  useEffect(() => {
    if (!ready) return
    try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
  }, [key, ready, value])

  return [value, setValue] as const
}

export function MiniAppsView() {
  const { state } = useApp()
  const accountId = state.user?.id ?? 0
  const [activeApp, setActiveApp] = useState<AppId | null>(null)
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useAccountState<AppId[]>(accountId, 'favorites', ['focus'])
  const [recent, setRecent] = useAccountState<AppId[]>(accountId, 'recent', [])
  const workspaceRef = useFocusTrap<HTMLDivElement>(Boolean(activeApp))

  useEffect(() => {
    if (!activeApp) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setActiveApp(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeApp])

  const filteredApps = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return MINI_APPS
    return MINI_APPS.filter(app =>
      app.name.toLowerCase().includes(normalized) ||
      app.description.toLowerCase().includes(normalized),
    )
  }, [query])

  function openApp(id: AppId) {
    setActiveApp(id)
    setRecent(current => [id, ...current.filter(item => item !== id)].slice(0, 4))
  }

  function toggleFavorite(id: AppId) {
    setFavorites(current =>
      current.includes(id) ? current.filter(item => item !== id) : [...current, id],
    )
  }

  const activeDefinition = MINI_APPS.find(app => app.id === activeApp)

  return (
    <div className="mini-apps-view">
      <header className="mini-apps-header">
        <div>
          <div className="mini-apps-kicker"><Sparkles size={13} /> HELIOS MINI APPS</div>
          <h1>Small tools for real momentum.</h1>
          <p>Open a focused tool without leaving the space where your work lives.</p>
        </div>
        <label className="mini-app-search">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search mini apps</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search apps"
          />
        </label>
      </header>

      <div className="mini-apps-scroll">
        {recent.length > 0 && !query && (
          <section className="mini-app-section" aria-labelledby="recent-apps-title">
            <div className="mini-app-section-title">
              <h2 id="recent-apps-title">Recently opened</h2>
              <span>Stored only for this account</span>
            </div>
            <div className="mini-app-recent-row">
              {recent.map(id => {
                const app = MINI_APPS.find(item => item.id === id)
                if (!app) return null
                return (
                  <button key={id} type="button" onClick={() => openApp(id)} className="mini-app-recent">
                    <span style={{ background: app.color + '22', color: app.color }}>{app.icon}</span>
                    <span>{app.name}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <section className="mini-app-section" aria-labelledby="all-apps-title">
          <div className="mini-app-section-title">
            <h2 id="all-apps-title">{query ? 'Search results' : 'Your app shelf'}</h2>
            <span>{filteredApps.length} available</span>
          </div>
          <div className="mini-app-grid">
            {filteredApps.map((app, index) => {
              const favorite = favorites.includes(app.id)
              return (
                <article
                  key={app.id}
                  className="mini-app-card"
                  style={{ '--app-color': app.color, '--app-delay': String(index * 55) + 'ms' } as React.CSSProperties}
                >
                  <button
                    type="button"
                    className="mini-app-card-main"
                    onClick={() => openApp(app.id)}
                    aria-label={'Open ' + app.name}
                  >
                    <span className="mini-app-icon" style={{ background: app.color + '20', color: app.color }}>
                      {app.icon}
                    </span>
                    <span className="mini-app-eyebrow">{app.eyebrow}</span>
                    <strong>{app.name}</strong>
                    <span className="mini-app-description">{app.description}</span>
                    <span className="mini-app-open">Open app <span aria-hidden="true">↗</span></span>
                  </button>
                  <button
                    type="button"
                    className={'mini-app-favorite' + (favorite ? ' is-favorite' : '')}
                    onClick={() => toggleFavorite(app.id)}
                    aria-label={(favorite ? 'Unfavorite ' : 'Favorite ') + app.name}
                    aria-pressed={favorite}
                  >
                    <Star size={16} fill={favorite ? 'currentColor' : 'none'} />
                  </button>
                </article>
              )
            })}
          </div>
          {filteredApps.length === 0 && (
            <div className="mini-app-empty">
              <Search size={24} />
              <strong>No app found</strong>
              <span>Try “focus”, “notes”, or “habit”.</span>
            </div>
          )}
        </section>

        <section className="mini-app-promise">
          <div className="mini-app-promise-orbit"><Sparkles size={22} /></div>
          <div>
            <span>BUILT INTO YOUR SPACE</span>
            <h2>Useful by default. Quiet when you do not need it.</h2>
          </div>
          <p>Mini Apps keep their data in this browser and isolate it by Helios account.</p>
        </section>
      </div>

      {activeApp && activeDefinition && (
        <div className="mini-app-workspace" role="dialog" aria-modal="true" aria-labelledby="mini-app-title" ref={workspaceRef}>
          <div className="mini-app-workspace-glow" style={{ background: activeDefinition.color }} />
          <header>
            <button type="button" onClick={() => setActiveApp(null)} className="mini-app-back">
              <ArrowLeft size={17} /> All apps
            </button>
            <div className="mini-app-workspace-title">
              <span style={{ background: activeDefinition.color + '20', color: activeDefinition.color }}>
                {activeDefinition.icon}
              </span>
              <div>
                <small>{activeDefinition.eyebrow}</small>
                <h2 id="mini-app-title">{activeDefinition.name}</h2>
              </div>
            </div>
            <button
              type="button"
              className={'mini-app-favorite workspace-star' + (favorites.includes(activeApp) ? ' is-favorite' : '')}
              onClick={() => toggleFavorite(activeApp)}
              aria-label="Toggle favorite"
              aria-pressed={favorites.includes(activeApp)}
            >
              <Star size={17} fill={favorites.includes(activeApp) ? 'currentColor' : 'none'} />
            </button>
          </header>
          <main>
            {activeApp === 'focus' && <FocusOrbit accountId={accountId} />}
            {activeApp === 'notes' && <QuickNotes accountId={accountId} />}
            {activeApp === 'habits' && <HabitPulse accountId={accountId} />}
            {activeApp === 'decision' && <DecisionFlip accountId={accountId} />}
          </main>
        </div>
      )}
    </div>
  )
}

interface FocusData {
  duration: number
  remaining: number
  running: boolean
  endAt: number | null
  sessions: number
}

function FocusOrbit({ accountId }: { accountId: number }) {
  const [focus, setFocus] = useAccountState<FocusData>(accountId, 'focus', {
    duration: 25 * 60,
    remaining: 25 * 60,
    running: false,
    endAt: null,
    sessions: 0,
  })

  useEffect(() => {
    if (!focus.running || !focus.endAt) return
    function tick() {
      setFocus(current => {
        if (!current.running || !current.endAt) return current
        const remaining = Math.max(0, Math.ceil((current.endAt - Date.now()) / 1000))
        if (remaining === 0)
          return { ...current, running: false, endAt: null, remaining: 0, sessions: current.sessions + 1 }
        return remaining === current.remaining ? current : { ...current, remaining }
      })
    }
    tick()
    const interval = window.setInterval(tick, 500)
    return () => window.clearInterval(interval)
  }, [focus.endAt, focus.running, setFocus])

  const minutes = Math.floor(focus.remaining / 60)
  const seconds = focus.remaining % 60
  const progress = 1 - focus.remaining / focus.duration

  function startPause() {
    setFocus(current => {
      if (current.remaining === 0)
        return { ...current, remaining: current.duration, running: true, endAt: Date.now() + current.duration * 1000 }
      if (current.running) {
        const remaining = current.endAt
          ? Math.max(0, Math.ceil((current.endAt - Date.now()) / 1000))
          : current.remaining
        return { ...current, running: false, endAt: null, remaining }
      }
      return { ...current, running: true, endAt: Date.now() + current.remaining * 1000 }
    })
  }

  function reset(duration = focus.duration) {
    setFocus(current => ({ ...current, duration, remaining: duration, running: false, endAt: null }))
  }

  return (
    <div className="focus-app">
      <div className="focus-presets" aria-label="Timer length">
        {[15, 25, 45].map(minutesOption => (
          <button
            type="button"
            key={minutesOption}
            aria-pressed={focus.duration === minutesOption * 60}
            onClick={() => reset(minutesOption * 60)}
          >
            {minutesOption} min
          </button>
        ))}
      </div>
      <div className="focus-orbit" style={{ '--focus-progress': String(progress * 360) + 'deg' } as React.CSSProperties}>
        <div className="focus-orbit-inner">
          <span>{focus.running ? 'IN FOCUS' : focus.remaining === 0 ? 'COMPLETE' : 'READY'}</span>
          <strong>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</strong>
          <small>{focus.sessions} session{focus.sessions === 1 ? '' : 's'} completed</small>
        </div>
      </div>
      <div className="focus-actions">
        <button type="button" className="focus-primary" onClick={startPause}>
          {focus.running ? <Pause size={18} /> : <Play size={18} />}
          {focus.running ? 'Pause' : focus.remaining === 0 ? 'Focus again' : 'Start focus'}
        </button>
        <button type="button" onClick={() => reset()} aria-label="Reset timer">
          <RotateCcw size={18} />
        </button>
      </div>
      <p><Clock3 size={14} /> You can leave this page. The orbit keeps accurate time.</p>
    </div>
  )
}

interface NoteItem { id: string; body: string; createdAt: string }

function QuickNotes({ accountId }: { accountId: number }) {
  const [notes, setNotes] = useAccountState<NoteItem[]>(accountId, 'notes', [])
  const [draft, setDraft] = useState('')

  function addNote(event: React.FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    setNotes(current => [{ id: crypto.randomUUID(), body, createdAt: new Date().toISOString() }, ...current])
    setDraft('')
  }

  return (
    <div className="notes-app">
      <form onSubmit={addNote}>
        <label htmlFor="quick-note">Capture a thought</label>
        <textarea
          id="quick-note"
          value={draft}
          maxLength={500}
          onChange={event => setDraft(event.target.value)}
          placeholder="A question, an idea, the next small move…"
          onKeyDown={event => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') event.currentTarget.form?.requestSubmit()
          }}
        />
        <div>
          <span>{draft.length}/500 · ⌘ Enter to save</span>
          <button type="submit" disabled={!draft.trim()}><Plus size={16} /> Add note</button>
        </div>
      </form>
      <div className="notes-list" aria-live="polite">
        {notes.map(note => (
          <article key={note.id}>
            <p>{note.body}</p>
            <div>
              <time dateTime={note.createdAt}>
                {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </time>
              <button
                type="button"
                onClick={() => setNotes(current => current.filter(item => item.id !== note.id))}
                aria-label="Delete note"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </article>
        ))}
        {notes.length === 0 && (
          <div className="mini-tool-empty"><StickyNote size={22} /><span>Your first note has room to land.</span></div>
        )}
      </div>
    </div>
  )
}

interface HabitItem { id: string; name: string; completedDays: string[] }

function localDayKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function HabitPulse({ accountId }: { accountId: number }) {
  const [habits, setHabits] = useAccountState<HabitItem[]>(accountId, 'habits', [])
  const [name, setName] = useState('')
  const today = localDayKey()

  function addHabit(event: React.FormEvent) {
    event.preventDefault()
    const normalized = name.trim()
    if (!normalized) return
    setHabits(current => [...current, { id: crypto.randomUUID(), name: normalized, completedDays: [] }])
    setName('')
  }

  function toggleToday(id: string) {
    setHabits(current => current.map(habit => habit.id === id
      ? {
          ...habit,
          completedDays: habit.completedDays.includes(today)
            ? habit.completedDays.filter(day => day !== today)
            : [...habit.completedDays, today],
        }
      : habit,
    ))
  }

  const completed = habits.filter(habit => habit.completedDays.includes(today)).length

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
              <button type="button" onClick={() => toggleToday(habit.id)} aria-pressed={done}>
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
        {habits.length === 0 && (
          <div className="mini-tool-empty"><Heart size={22} /><span>Start with something almost too easy.</span></div>
        )}
      </div>
    </div>
  )
}

interface DecisionData { options: string[]; result: string; history: string[] }

function DecisionFlip({ accountId }: { accountId: number }) {
  const [decision, setDecision] = useAccountState<DecisionData>(accountId, 'decision', {
    options: ['', ''],
    result: '',
    history: [],
  })
  const [spinning, setSpinning] = useState(false)

  function updateOption(index: number, value: string) {
    setDecision(current => ({
      ...current,
      options: current.options.map((option, optionIndex) => optionIndex === index ? value : option),
      result: '',
    }))
  }

  function choose() {
    const options = decision.options.map(option => option.trim()).filter(Boolean)
    if (options.length < 2 || spinning) return
    setSpinning(true)
    window.setTimeout(() => {
      const result = options[Math.floor(Math.random() * options.length)]
      setDecision(current => ({ ...current, result, history: [result, ...current.history].slice(0, 5) }))
      setSpinning(false)
    }, 520)
  }

  const validCount = decision.options.filter(option => option.trim()).length

  return (
    <div className="decision-app">
      <div className={'decision-result' + (spinning ? ' is-spinning' : '')}>
        <span>{spinning ? 'CONSULTING THE ORBIT' : decision.result ? 'YOUR NEXT MOVE' : 'TWO GOOD OPTIONS?'}</span>
        <strong>{spinning ? '···' : decision.result || 'Let momentum choose.'}</strong>
      </div>
      <div className="decision-options">
        {decision.options.map((option, index) => (
          <div key={index}>
            <span>{index + 1}</span>
            <input
              value={option}
              maxLength={80}
              onChange={event => updateOption(index, event.target.value)}
              placeholder={'Option ' + (index + 1)}
              aria-label={'Decision option ' + (index + 1)}
            />
            {decision.options.length > 2 && (
              <button
                type="button"
                onClick={() => setDecision(current => ({ ...current, options: current.options.filter((_, i) => i !== index), result: '' }))}
                aria-label={'Remove option ' + (index + 1)}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="decision-actions">
        <button
          type="button"
          onClick={() => setDecision(current => ({ ...current, options: [...current.options, ''], result: '' }))}
          disabled={decision.options.length >= 6}
        >
          <Plus size={16} /> Add option
        </button>
        <button type="button" className="decision-choose" onClick={choose} disabled={validCount < 2 || spinning}>
          <Shuffle size={17} /> Choose for me
        </button>
      </div>
      {decision.history.length > 0 && (
        <div className="decision-history">
          <span>Recent choices</span>
          {decision.history.map((item, index) => <small key={index}>{item}</small>)}
        </div>
      )}
    </div>
  )
}
