import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { SpaceBackground } from '../components/ui/primitives'
import { HOBBIES, SUBJECTS } from '../product/catalog'
import { useApp } from '../store/appStore'
import './LearnView.css'

export function LearnView() {
  const { dispatch } = useApp()
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const subjects = useMemo(
    () => SUBJECTS.filter(space => !needle || space.name.toLowerCase().includes(needle) || space.description.toLowerCase().includes(needle)),
    [needle],
  )
  const hobbies = useMemo(
    () => HOBBIES.filter(space => !needle || space.name.toLowerCase().includes(needle) || space.description.toLowerCase().includes(needle)),
    [needle],
  )

  return (
    <div className="os-page learn-page">
      <SpaceBackground />
      <header className="learn-hero">
        <span className="os-kicker">Learn</span>
        <h1 className="os-title">Enter a subject. Keep the context.</h1>
        <p className="os-lede">Coding, maths, science, art, languages, and hobbies — each Space holds projects, mini apps, live work, and a feed.</p>
        <label className="learn-search">
          <Search size={16} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a subject or hobby" aria-label="Search spaces" />
        </label>
      </header>
      <section>
        <h2>Subjects</h2>
        <div className="learn-grid">
          {subjects.map(space => (
            <button key={space.id} type="button" onClick={() => dispatch({ type: 'OPEN_SPACE', spaceId: space.id })} style={{ '--accent': space.accent } as React.CSSProperties}>
              <i />
              <strong>{space.name}</strong>
              <span>{space.description}</span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h2>Practice & hobbies</h2>
        <div className="learn-grid">
          {hobbies.map(space => (
            <button key={space.id} type="button" onClick={() => dispatch({ type: 'OPEN_SPACE', spaceId: space.id })} style={{ '--accent': space.accent } as React.CSSProperties}>
              <i />
              <strong>{space.name}</strong>
              <span>{space.description}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
