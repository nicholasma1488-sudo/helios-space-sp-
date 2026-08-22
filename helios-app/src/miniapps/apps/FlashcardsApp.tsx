import { useMemo, useState } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import { MiniAppEmpty } from '../MiniAppStates'
import { useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

interface Card { id: string; front: string; back: string; known: boolean }
interface Deck { id: string; name: string; cards: Card[] }

export default function FlashcardsApp({ accountId }: MiniAppProps) {
  const [decks, setDecks] = useAccountState<Deck[]>(accountId, 'flashcards', [])
  const [deckId, setDeckId] = useState<string | null>(null)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [deckName, setDeckName] = useState('')
  const [studyIndex, setStudyIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [mode, setMode] = useState<'edit' | 'study'>('edit')

  const deck = decks.find(item => item.id === deckId) ?? decks[0] ?? null
  const card = deck?.cards[studyIndex] ?? null
  const known = useMemo(() => deck?.cards.filter(item => item.known).length ?? 0, [deck])

  function addDeck(event: React.FormEvent) {
    event.preventDefault()
    const name = deckName.trim()
    if (!name) return
    const next = { id: crypto.randomUUID(), name, cards: [] }
    setDecks(current => [...current, next])
    setDeckId(next.id)
    setDeckName('')
  }

  function addCard(event: React.FormEvent) {
    event.preventDefault()
    if (!deck || !front.trim() || !back.trim()) return
    setDecks(current => current.map(item => item.id === deck.id
      ? { ...item, cards: [...item.cards, { id: crypto.randomUUID(), front: front.trim(), back: back.trim(), known: false }] }
      : item))
    setFront('')
    setBack('')
  }

  function mark(knownValue: boolean) {
    if (!deck || !card) return
    setDecks(current => current.map(item => item.id === deck.id
      ? { ...item, cards: item.cards.map(entry => entry.id === card.id ? { ...entry, known: knownValue } : entry) }
      : item))
    setFlipped(false)
    setStudyIndex(current => deck.cards.length ? (current + 1) % deck.cards.length : 0)
  }

  return (
    <div className="cards-app">
      <aside>
        <form onSubmit={addDeck}>
          <input value={deckName} onChange={event => setDeckName(event.target.value)} placeholder="New deck" aria-label="Deck name" />
          <button type="submit" disabled={!deckName.trim()}><Plus size={14} /></button>
        </form>
        {decks.map(item => (
          <button key={item.id} type="button" className={deck?.id === item.id ? 'is-on' : ''} onClick={() => { setDeckId(item.id); setStudyIndex(0); setFlipped(false) }}>
            <strong>{item.name}</strong>
            <small>{item.cards.filter(cardItem => cardItem.known).length}/{item.cards.length} known</small>
          </button>
        ))}
        {decks.length === 0 && <MiniAppEmpty title="Create a deck" detail="Then add question and answer cards." />}
      </aside>
      {deck && (
        <section>
          <header>
            <strong>{deck.name}</strong>
            <span>{known}/{deck.cards.length} known</span>
            <button type="button" onClick={() => setMode(mode === 'edit' ? 'study' : 'edit')}>{mode === 'edit' ? 'Study' : 'Edit'}</button>
          </header>
          {mode === 'edit' ? (
            <>
              <form onSubmit={addCard} className="card-form">
                <input value={front} onChange={event => setFront(event.target.value)} placeholder="Front" aria-label="Card front" />
                <input value={back} onChange={event => setBack(event.target.value)} placeholder="Back" aria-label="Card back" />
                <button type="submit" disabled={!front.trim() || !back.trim()}>Add card</button>
              </form>
              <ul>
                {deck.cards.map(item => <li key={item.id}>{item.front} → {item.back}</li>)}
              </ul>
            </>
          ) : card ? (
            <div className="study-card">
              <button type="button" onClick={() => setFlipped(value => !value)}>
                <small>{flipped ? 'ANSWER' : 'QUESTION'}</small>
                <strong>{flipped ? card.back : card.front}</strong>
              </button>
              <div>
                <button type="button" onClick={() => mark(false)}>Still learning</button>
                <button type="button" onClick={() => mark(true)}>I know this</button>
                <button type="button" onClick={() => { setStudyIndex(0); setFlipped(false) }} aria-label="Restart"><RotateCcw size={14} /></button>
              </div>
            </div>
          ) : (
            <MiniAppEmpty title="No cards yet" detail="Add a few cards, then start study mode." />
          )}
        </section>
      )}
    </div>
  )
}
