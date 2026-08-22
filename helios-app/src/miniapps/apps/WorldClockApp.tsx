import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

const CITIES = [
  { city: 'London', tz: 'Europe/London' },
  { city: 'New York', tz: 'America/New_York' },
  { city: 'Los Angeles', tz: 'America/Los_Angeles' },
  { city: 'Tokyo', tz: 'Asia/Tokyo' },
  { city: 'Singapore', tz: 'Asia/Singapore' },
  { city: 'Sydney', tz: 'Australia/Sydney' },
  { city: 'Paris', tz: 'Europe/Paris' },
  { city: 'Dubai', tz: 'Asia/Dubai' },
]

function clock(tz: string, now: Date) {
  return new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(now)
}

export default function WorldClockApp({ accountId }: MiniAppProps) {
  const [ids, setIds] = useAccountState<string[]>(accountId, 'worldclock', ['Europe/London', 'America/New_York', 'Asia/Tokyo'])
  const [now, setNow] = useState(() => new Date())
  const [pick, setPick] = useState(CITIES[3].tz)

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="clock-app">
      <form onSubmit={event => { event.preventDefault(); setIds(current => current.includes(pick) ? current : [...current, pick]) }}>
        <select value={pick} onChange={event => setPick(event.target.value)} aria-label="City timezone">
          {CITIES.map(city => <option key={city.tz} value={city.tz}>{city.city}</option>)}
        </select>
        <button type="submit"><Plus size={14} /> Add city</button>
      </form>
      <div className="clock-grid">
        {ids.map(tz => {
          const city = CITIES.find(item => item.tz === tz)?.city ?? tz
          return (
            <article key={tz}>
              <small>{city}</small>
              <strong>{clock(tz, now)}</strong>
              <span>{tz}</span>
              <button type="button" onClick={() => setIds(current => current.filter(item => item !== tz))} aria-label={'Remove ' + city}><Trash2 size={13} /></button>
            </article>
          )
        })}
      </div>
    </div>
  )
}
