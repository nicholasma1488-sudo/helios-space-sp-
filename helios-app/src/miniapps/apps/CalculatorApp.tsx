import { useEffect, useRef, useState } from 'react'
import { Delete, Equal } from 'lucide-react'
import { MiniAppEmpty } from '../MiniAppStates'
import { useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

const KEYS = [
  ['sin', 'cos', 'tan', 'C', '⌫'],
  ['ln', 'log', '√', '(', ')'],
  ['π', 'e', '^', '/', '*'],
  ['7', '8', '9', '-', '+'],
  ['4', '5', '6', '.', '='],
  ['1', '2', '3', '0', 'Ans'],
]

function tokenize(input: string): string[] {
  return input.replace(/\s+/g, '').match(/Ans|sin|cos|tan|log|ln|√|π|e|\d+(\.\d+)?|[+\-*/^()]/g) ?? []
}

function evaluate(expression: string, ans: number): number {
  const tokens = tokenize(expression)
  let index = 0

  const peek = () => tokens[index]
  const take = () => tokens[index++]

  function parseExpression(): number {
    let value = parseTerm()
    while (peek() === '+' || peek() === '-') {
      const op = take()
      const right = parseTerm()
      value = op === '+' ? value + right : value - right
    }
    return value
  }

  function parseTerm(): number {
    let value = parsePower()
    while (peek() === '*' || peek() === '/') {
      const op = take()
      const right = parsePower()
      if (op === '/') {
        if (right === 0) throw new Error('Cannot divide by zero')
        value /= right
      } else {
        value *= right
      }
    }
    return value
  }

  function parsePower(): number {
    const value = parseUnary()
    if (peek() === '^') {
      take()
      return value ** parsePower()
    }
    return value
  }

  function parseUnary(): number {
    if (peek() === '-') {
      take()
      return -parseUnary()
    }
    if (peek() === '+') {
      take()
      return parseUnary()
    }
    if (['sin', 'cos', 'tan', 'log', 'ln', '√'].includes(peek())) {
      const fn = take()
      const argument = parseUnary()
      if (fn === 'sin') return Math.sin(argument)
      if (fn === 'cos') return Math.cos(argument)
      if (fn === 'tan') return Math.tan(argument)
      if (fn === 'log') return Math.log10(argument)
      if (fn === 'ln') return Math.log(argument)
      return Math.sqrt(argument)
    }
    return parsePrimary()
  }

  function parsePrimary(): number {
    const token = take()
    if (token === '(') {
      const value = parseExpression()
      if (take() !== ')') throw new Error('Unbalanced parentheses')
      return value
    }
    if (token === 'π') return Math.PI
    if (token === 'e') return Math.E
    if (token === 'Ans') return ans
    if (token && !Number.isNaN(Number(token))) return Number(token)
    throw new Error('Invalid expression')
  }

  const result = parseExpression()
  if (index !== tokens.length) throw new Error('Unexpected token')
  if (!Number.isFinite(result)) throw new Error('Result is not a finite number')
  return result
}

export default function CalculatorApp({ accountId }: MiniAppProps) {
  const [expr, setExpr] = useState('')
  const [error, setError] = useState('')
  const [history, setHistory] = useAccountState<Array<{ expr: string; result: string }>>(accountId, 'calculator-history', [])
  const last = history[0] ? Number(history[0].result) : 0

  function apply(key: string) {
    setError('')
    if (key === 'C') { setExpr(''); return }
    if (key === '⌫') { setExpr(current => current.slice(0, -1)); return }
    if (key === 'Ans') { setExpr(current => current + String(last || 0)); return }
    if (key === '=') {
      try {
        const result = evaluate(expr || '0', last)
        const formatted = String(Number(result.toPrecision(12)))
        setHistory(current => [{ expr, result: formatted }, ...current].slice(0, 20))
        setExpr(formatted)
      } catch (reason) {
        setError((reason as Error).message)
      }
      return
    }
    setExpr(current => current + key)
  }

  const applyRef = useRef(apply)
  applyRef.current = apply

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      const map: Record<string, string> = {
        Enter: '=',
        Backspace: '⌫',
        Escape: 'C',
        '*': '*',
        '/': '/',
        '+': '+',
        '-': '-',
        '.': '.',
        '(': '(',
        ')': ')',
        '^': '^',
      }
      if (map[event.key]) { event.preventDefault(); applyRef.current(map[event.key]); return }
      if (/^[0-9]$/.test(event.key)) applyRef.current(event.key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="calc-app">
      <div className="calc-display" aria-live="polite">
        <small>{error || 'Scientific · radians · keyboard ready'}</small>
        <strong>{expr || '0'}</strong>
      </div>
      <div className="calc-keys" role="group" aria-label="Calculator keys">
        {KEYS.flat().map(key => (
          <button key={key} type="button" className={key === '=' ? 'is-eq' : ''} onClick={() => apply(key)} aria-label={key === '⌫' ? 'Backspace' : key}>
            {key === '=' ? <Equal size={16} /> : key === '⌫' ? <Delete size={16} /> : key}
          </button>
        ))}
      </div>
      <aside className="calc-history" aria-label="Calculation history">
        <h3>History</h3>
        {history.length === 0 && <MiniAppEmpty title="No calculations yet" detail="Use the keypad or your keyboard." />}
        {history.map((item, index) => (
          <button key={index} type="button" onClick={() => setExpr(item.result)}>
            <small>{item.expr}</small>
            <strong>{item.result}</strong>
          </button>
        ))}
      </aside>
    </div>
  )
}
