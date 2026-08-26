import { useEffect, useMemo, useState } from 'react'
import { Plus, RefreshCw, Trash2, TrendingUp } from 'lucide-react'
import { api, type MarketQuote } from '../api'
import './StocksWorkspace.css'

interface StocksData {
  symbols?: string[]
}

interface Props {
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
}

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'SPY', '0700.HK', 'BABA']

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

function formatPrice(value: number | null, currency?: string) {
  if (value == null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat(undefined, {
    style: currency ? 'currency' : 'decimal',
    currency: currency && currency.length === 3 ? currency : 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatChange(value: number | null, percent: number | null) {
  if (value == null) return '—'
  const sign = value > 0 ? '+' : ''
  const pct = percent == null ? '' : ` (${sign}${percent.toFixed(2)}%)`
  return `${sign}${value.toFixed(2)}${pct}`
}

export function StocksWorkspace({ data, onChange }: Props) {
  const value = data as StocksData
  const symbols = useMemo(() => {
    const list = Array.isArray(value.symbols) ? value.symbols.map(normalizeSymbol).filter(Boolean) : []
    return list.length ? [...new Set(list)] : DEFAULT_SYMBOLS
  }, [value.symbols])

  const [draft, setDraft] = useState('')
  const [quotes, setQuotes] = useState<MarketQuote[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (symbols.length === 0) return
      setLoading(true)
      setError('')
      try {
        const result = await api.markets.quotes(symbols)
        if (cancelled) return
        setQuotes(result.quotes)
        setUpdatedAt(result.updated_at)
      } catch (reason) {
        if (!cancelled) setError((reason as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    const timer = window.setInterval(() => { void load() }, 30_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [symbols])

  function setSymbols(next: string[]) {
    onChange({ ...value, symbols: [...new Set(next.map(normalizeSymbol).filter(Boolean))].slice(0, 20) })
  }

  function addSymbol(event: React.FormEvent) {
    event.preventDefault()
    const symbol = normalizeSymbol(draft)
    if (!symbol) return
    setSymbols([...symbols, symbol])
    setDraft('')
  }

  const quoteMap = new Map(quotes.map(quote => [quote.symbol, quote]))

  return (
    <div className="stocks-workspace">
      <header>
        <div>
          <small>WATCHLIST</small>
          <h2>Stocks</h2>
          <p>{updatedAt ? `Updated ${new Date(updatedAt).toLocaleTimeString()}` : 'Quotes refresh every 30 seconds.'}</p>
        </div>
        <button type="button" onClick={() => setSymbols([...symbols])} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'is-spinning' : undefined} />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      <form onSubmit={addSymbol}>
        <label htmlFor="stock-symbol">Add ticker</label>
        <input
          id="stock-symbol"
          value={draft}
          maxLength={16}
          onChange={event => setDraft(event.target.value)}
          placeholder="AAPL, 0700.HK, 600519.SS"
          autoCapitalize="characters"
        />
        <button type="submit" disabled={!normalizeSymbol(draft) || symbols.length >= 20}>
          <Plus size={14} /> Add
        </button>
      </form>

      {error && <div className="stocks-error" role="alert">{error}</div>}

      <div className="stocks-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Name</th>
              <th>Price</th>
              <th>Change</th>
              <th>Market</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {symbols.map(symbol => {
              const quote = quoteMap.get(symbol)
              const up = (quote?.change ?? 0) > 0
              const down = (quote?.change ?? 0) < 0
              return (
                <tr key={symbol} className={up ? 'is-up' : down ? 'is-down' : ''}>
                  <th>{symbol}</th>
                  <td>{quote?.name || '—'}</td>
                  <td>{formatPrice(quote?.price ?? null, quote?.currency)}</td>
                  <td>{formatChange(quote?.change ?? null, quote?.change_percent ?? null)}</td>
                  <td>{quote?.market_state || '—'}</td>
                  <td>
                    <button type="button" onClick={() => setSymbols(symbols.filter(item => item !== symbol))} aria-label={`Remove ${symbol}`}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {symbols.length === 0 && (
          <div className="stocks-empty">
            <TrendingUp size={22} />
            <strong>Add a ticker to start watching</strong>
            <span>US, Hong Kong and Shanghai symbols all work.</span>
          </div>
        )}
      </div>
    </div>
  )
}
