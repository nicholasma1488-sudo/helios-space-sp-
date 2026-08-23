import { useState } from 'react'
import { Check, Flame, Plus, Trash2 } from 'lucide-react'

function useAccountState<T>(accountId: number, name: string, initial: T) {
  const key = 'helios-mini-v1-' + accountId + '-' + name
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) as T : initial
    } catch {
      return initial
    }
  })

  function save(next: T | ((current: T) => T)) {
    setValue(current => {
      const resolved = typeof next === 'function' ? (next as (current: T) => T)(current) : next
      try { localStorage.setItem(key, JSON.stringify(resolved)) } catch {}
      return resolved
    })
  }

  return [value, save] as const
}

function localDayKey(date = new Date()) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

export function MoodCheck({ accountId }: { accountId: number }) {
  const [entries, setEntries] = useAccountState<{ day: string; mood: string; note: string }[]>(accountId, 'mood', [])
  const [mood, setMood] = useState('calm')
  const [note, setNote] = useState('')
  const today = localDayKey()

  function save(event: React.FormEvent) {
    event.preventDefault()
    setEntries(current => [{ day: today, mood, note: note.trim() }, ...current.filter(item => item.day !== today)])
    setNote('')
  }

  return (
    <div className="notes-app">
      <form onSubmit={save}>
        <label htmlFor="mood-pick">How does today feel?</label>
        <div className="focus-presets" aria-label="Mood">
          {['calm', 'sparked', 'tired', 'brave', 'stuck'].map(item => (
            <button type="button" key={item} aria-pressed={mood === item} onClick={() => setMood(item)}>{item}</button>
          ))}
        </div>
        <textarea id="mood-pick" value={note} maxLength={200} onChange={event => setNote(event.target.value)} placeholder="One honest sentence…" />
        <div>
          <span>Saved only for this account</span>
          <button type="submit"><Plus size={16} /> Save today</button>
        </div>
      </form>
      <div className="notes-list">
        {entries.map(entry => (
          <article key={entry.day}>
            <p><strong>{entry.mood}</strong>{entry.note ? ' · ' + entry.note : ''}</p>
            <div><time>{entry.day}</time></div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function CountdownApp({ accountId }: { accountId: number }) {
  const [items, setItems] = useAccountState<{ id: string; name: string; date: string }[]>(accountId, 'countdown', [])
  const [name, setName] = useState('')
  const [date, setDate] = useState('')

  function add(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !date) return
    setItems(current => [{ id: crypto.randomUUID(), name: name.trim(), date }, ...current])
    setName('')
    setDate('')
  }

  return (
    <div className="habits-app">
      <form onSubmit={add}>
        <input value={name} maxLength={60} onChange={event => setName(event.target.value)} placeholder="Exam, launch, due date" aria-label="Countdown name" />
        <input type="date" value={date} onChange={event => setDate(event.target.value)} aria-label="Countdown date" />
        <button type="submit" disabled={!name.trim() || !date}><Plus size={17} /> Add</button>
      </form>
      <div className="habit-list">
        {items.map(item => {
          const days = Math.ceil((Date.parse(item.date + 'T00:00:00') - Date.now()) / 86_400_000)
          return (
            <article key={item.id}>
              <button type="button">
                <strong>{item.name}</strong>
                <small>{days >= 0 ? days + ' days left' : Math.abs(days) + ' days ago'}</small>
              </button>
              <button type="button" onClick={() => setItems(current => current.filter(entry => entry.id !== item.id))} aria-label={'Delete ' + item.name}><Trash2 size={14} /></button>
            </article>
          )
        })}
      </div>
    </div>
  )
}

export function FlashCards({ accountId }: { accountId: number }) {
  const [cards, setCards] = useAccountState<{ id: string; front: string; back: string }[]>(accountId, 'flashcards', [])
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [flipped, setFlipped] = useState<string | null>(null)

  function add(event: React.FormEvent) {
    event.preventDefault()
    if (!front.trim() || !back.trim()) return
    setCards(current => [{ id: crypto.randomUUID(), front: front.trim(), back: back.trim() }, ...current])
    setFront('')
    setBack('')
  }

  return (
    <div className="notes-app">
      <form onSubmit={add}>
        <label htmlFor="card-front">New card</label>
        <input id="card-front" value={front} maxLength={120} onChange={event => setFront(event.target.value)} placeholder="Question or prompt" />
        <textarea value={back} maxLength={240} onChange={event => setBack(event.target.value)} placeholder="Answer" />
        <div>
          <span>{cards.length} cards</span>
          <button type="submit" disabled={!front.trim() || !back.trim()}><Plus size={16} /> Add card</button>
        </div>
      </form>
      <div className="notes-list">
        {cards.map(card => (
          <article key={card.id}>
            <button type="button" onClick={() => setFlipped(current => current === card.id ? null : card.id)} style={{ width: '100%', background: 'none', border: 0, color: 'inherit', textAlign: 'left', cursor: 'pointer' }}>
              <p>{flipped === card.id ? card.back : card.front}</p>
              <small>{flipped === card.id ? 'Answer' : 'Tap to flip'}</small>
            </button>
            <div>
              <button type="button" onClick={() => setCards(current => current.filter(item => item.id !== card.id))} aria-label="Delete card"><Trash2 size={14} /></button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function HomeworkRadar({ accountId }: { accountId: number }) {
  const [items, setItems] = useAccountState<{ id: string; title: string; due: string; done: boolean }[]>(accountId, 'homework', [])
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')

  function add(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    setItems(current => [{ id: crypto.randomUUID(), title: title.trim(), due, done: false }, ...current])
    setTitle('')
    setDue('')
  }

  return (
    <div className="habits-app">
      <form onSubmit={add}>
        <input value={title} maxLength={80} onChange={event => setTitle(event.target.value)} placeholder="Assignment" aria-label="Homework title" />
        <input type="date" value={due} onChange={event => setDue(event.target.value)} aria-label="Due date" />
        <button type="submit" disabled={!title.trim()}><Plus size={17} /> Add</button>
      </form>
      <div className="habit-list">
        {items.map(item => (
          <article key={item.id} className={item.done ? 'is-done' : ''}>
            <button type="button" onClick={() => setItems(current => current.map(entry => entry.id === item.id ? { ...entry, done: !entry.done } : entry))} aria-pressed={item.done}>
              <span>{item.done && <Check size={15} />}</span>
              <strong>{item.title}</strong>
              <small>{item.due || 'No due date'}</small>
            </button>
            <button type="button" onClick={() => setItems(current => current.filter(entry => entry.id !== item.id))} aria-label={'Delete ' + item.title}><Trash2 size={14} /></button>
          </article>
        ))}
      </div>
    </div>
  )
}

export function VocabSpark({ accountId }: { accountId: number }) {
  const [words, setWords] = useAccountState<{ id: string; word: string; meaning: string }[]>(accountId, 'vocab', [])
  const [word, setWord] = useState('')
  const [meaning, setMeaning] = useState('')

  function add(event: React.FormEvent) {
    event.preventDefault()
    if (!word.trim() || !meaning.trim()) return
    setWords(current => [{ id: crypto.randomUUID(), word: word.trim(), meaning: meaning.trim() }, ...current])
    setWord('')
    setMeaning('')
  }

  return (
    <div className="notes-app">
      <form onSubmit={add}>
        <label htmlFor="vocab-word">New word</label>
        <input id="vocab-word" value={word} maxLength={60} onChange={event => setWord(event.target.value)} placeholder="Word or phrase" />
        <textarea value={meaning} maxLength={200} onChange={event => setMeaning(event.target.value)} placeholder="Meaning and one example" />
        <div>
          <span>{words.length} words</span>
          <button type="submit" disabled={!word.trim() || !meaning.trim()}><Plus size={16} /> Save word</button>
        </div>
      </form>
      <div className="notes-list">
        {words.map(item => (
          <article key={item.id}>
            <p><strong>{item.word}</strong> · {item.meaning}</p>
            <div>
              <button type="button" onClick={() => setWords(current => current.filter(entry => entry.id !== item.id))} aria-label="Delete word"><Trash2 size={14} /></button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function StreakArena({ accountId }: { accountId: number }) {
  const [days, setDays] = useAccountState<string[]>(accountId, 'streaks', [])
  const today = localDayKey()
  const done = days.includes(today)
  const sorted = [...days].sort()
  let streak = 0
  for (let offset = 0; offset < 400; offset += 1) {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    if (sorted.includes(localDayKey(date))) streak += 1
    else break
  }

  return (
    <div className="habits-app">
      <div className="habit-summary">
        <div><Flame size={22} /><strong>{streak}</strong></div>
        <span>Day streak</span>
      </div>
      <button type="button" className="focus-primary" onClick={() => setDays(current => done ? current.filter(day => day !== today) : [...current, today])}>
        {done ? 'Unmark today' : 'Protect today’s streak'}
      </button>
    </div>
  )
}

export function IdeaVault({ accountId }: { accountId: number }) {
  const [ideas, setIdeas] = useAccountState<{ id: string; body: string }[]>(accountId, 'ideas', [])
  const [body, setBody] = useState('')

  function add(event: React.FormEvent) {
    event.preventDefault()
    if (!body.trim()) return
    setIdeas(current => [{ id: crypto.randomUUID(), body: body.trim() }, ...current])
    setBody('')
  }

  return (
    <div className="notes-app">
      <form onSubmit={add}>
        <label htmlFor="idea-body">Park an idea</label>
        <textarea id="idea-body" value={body} maxLength={280} onChange={event => setBody(event.target.value)} placeholder="A product, a sentence, a risk worth taking…" />
        <div>
          <span>{ideas.length} in the vault</span>
          <button type="submit" disabled={!body.trim()}><Plus size={16} /> Keep it</button>
        </div>
      </form>
      <div className="notes-list">
        {ideas.map(idea => (
          <article key={idea.id}>
            <p>{idea.body}</p>
            <div>
              <button type="button" onClick={() => setIdeas(current => current.filter(item => item.id !== idea.id))} aria-label="Delete idea"><Trash2 size={14} /></button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function MeetingPulse({ accountId }: { accountId: number }) {
  const [items, setItems] = useAccountState<{ id: string; title: string; next: string }[]>(accountId, 'meetings', [])
  const [title, setTitle] = useState('')
  const [next, setNext] = useState('')

  function add(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    setItems(current => [{ id: crypto.randomUUID(), title: title.trim(), next: next.trim() }, ...current])
    setTitle('')
    setNext('')
  }

  return (
    <div className="notes-app">
      <form onSubmit={add}>
        <label htmlFor="meeting-title">What was decided?</label>
        <input id="meeting-title" value={title} maxLength={80} onChange={event => setTitle(event.target.value)} placeholder="Decision" />
        <textarea value={next} maxLength={160} onChange={event => setNext(event.target.value)} placeholder="Owner and next move" />
        <div>
          <span>{items.length} pulses</span>
          <button type="submit" disabled={!title.trim()}><Plus size={16} /> Save</button>
        </div>
      </form>
      <div className="notes-list">
        {items.map(item => (
          <article key={item.id}>
            <p><strong>{item.title}</strong>{item.next ? ' · ' + item.next : ''}</p>
            <div>
              <button type="button" onClick={() => setItems(current => current.filter(entry => entry.id !== item.id))} aria-label="Delete meeting note"><Trash2 size={14} /></button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export function DeepWork({ accountId }: { accountId: number }) {
  const [block, setBlock] = useAccountState<{ intention: string; minutes: number }>(accountId, 'deepwork', { intention: '', minutes: 50 })
  const [intention, setIntention] = useState(block.intention)

  return (
    <div className="focus-app">
      <form onSubmit={event => { event.preventDefault(); setBlock({ intention: intention.trim(), minutes: block.minutes }) }}>
        <label htmlFor="deep-intention">Intention for this block</label>
        <textarea id="deep-intention" value={intention} maxLength={140} onChange={event => setIntention(event.target.value)} placeholder="The one thing that must move…" />
        <div className="focus-presets">
          {[50, 75, 90].map(minutes => (
            <button type="button" key={minutes} aria-pressed={block.minutes === minutes} onClick={() => setBlock(current => ({ ...current, minutes }))}>{minutes} min</button>
          ))}
        </div>
        <button type="submit" className="focus-primary">Lock intention · {block.minutes} min</button>
      </form>
      {block.intention && <p>Current block: {block.intention}</p>}
    </div>
  )
}

export function WinLog({ accountId }: { accountId: number }) {
  const [wins, setWins] = useAccountState<{ id: string; body: string; at: string }[]>(accountId, 'wins', [])
  const [body, setBody] = useState('')

  function add(event: React.FormEvent) {
    event.preventDefault()
    if (!body.trim()) return
    setWins(current => [{ id: crypto.randomUUID(), body: body.trim(), at: new Date().toISOString() }, ...current])
    setBody('')
  }

  return (
    <div className="notes-app">
      <form onSubmit={add}>
        <label htmlFor="win-body">A finished thing</label>
        <textarea id="win-body" value={body} maxLength={200} onChange={event => setBody(event.target.value)} placeholder="Shipped, solved, helped, published…" />
        <div>
          <span>{wins.length} wins</span>
          <button type="submit" disabled={!body.trim()}><Plus size={16} /> Log win</button>
        </div>
      </form>
      <div className="notes-list">
        {wins.map(win => (
          <article key={win.id}>
            <p>{win.body}</p>
            <div>
              <time>{new Date(win.at).toLocaleDateString()}</time>
              <button type="button" onClick={() => setWins(current => current.filter(item => item.id !== win.id))} aria-label="Delete win"><Trash2 size={14} /></button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
