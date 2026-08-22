import { useCallback, useEffect, useRef, useState } from 'react'
import { Redo2, Trash2, Type, Undo2 } from 'lucide-react'
import { useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

type Tool = 'draw' | 'text' | 'rect' | 'ellipse'
interface Stroke {
  tool: Tool
  color: string
  points: Array<{ x: number; y: number }>
  text?: string
}

export default function WhiteboardApp({ accountId }: MiniAppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokesRef = useRef<Stroke[]>([])
  const [tool, setTool] = useState<Tool>('draw')
  const [color, setColor] = useState('#f6f5f2')
  const [strokes, setStrokes] = useAccountState<Stroke[]>(accountId, 'whiteboard', [])
  const [redo, setRedo] = useState<Stroke[]>([])
  const drawing = useRef<Stroke | null>(null)
  strokesRef.current = strokes

  const redraw = useCallback((next = strokesRef.current) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const width = canvas.width / dpr
    const height = canvas.height / dpr
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#12151c'
    ctx.fillRect(0, 0, width, height)
    next.forEach(stroke => {
      ctx.strokeStyle = stroke.color
      ctx.fillStyle = stroke.color
      ctx.lineWidth = 2.4
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      if (stroke.tool === 'text' && stroke.text) {
        ctx.font = '18px Inter, sans-serif'
        ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y)
        return
      }
      if (stroke.tool === 'rect' && stroke.points.length > 1) {
        const a = stroke.points[0]
        const b = stroke.points[stroke.points.length - 1]
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y)
        return
      }
      if (stroke.tool === 'ellipse' && stroke.points.length > 1) {
        const a = stroke.points[0]
        const b = stroke.points[stroke.points.length - 1]
        ctx.beginPath()
        ctx.ellipse(a.x, a.y, Math.abs(b.x - a.x), Math.abs(b.y - a.y), 0, 0, Math.PI * 2)
        ctx.stroke()
        return
      }
      ctx.beginPath()
      stroke.points.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      })
      ctx.stroke()
    })
  }, [])

  useEffect(() => { redraw(strokes) }, [redraw, strokes])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      redraw()
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [redraw])

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function onDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === 'text') {
      const value = window.prompt('Whiteboard text')
      if (!value) return
      setStrokes(current => [...current, { tool, color, points: [point(event)], text: value }])
      setRedo([])
      return
    }
    drawing.current = { tool, color, points: [point(event)] }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    drawing.current.points.push(point(event))
    redraw([...strokesRef.current, drawing.current])
  }

  function onUp() {
    if (!drawing.current) return
    const stroke = drawing.current
    drawing.current = null
    setStrokes(current => [...current, stroke])
    setRedo([])
  }

  return (
    <div className="board-app">
      <div className="board-toolbar">
        {(['draw', 'text', 'rect', 'ellipse'] as Tool[]).map(item => (
          <button key={item} type="button" className={tool === item ? 'is-on' : ''} onClick={() => setTool(item)}>
            {item === 'text' ? <Type size={14} /> : item}
          </button>
        ))}
        <input type="color" value={color} onChange={event => setColor(event.target.value)} aria-label="Stroke color" />
        <button type="button" onClick={() => { const last = strokes[strokes.length - 1]; if (!last) return; setStrokes(strokes.slice(0, -1)); setRedo(current => [...current, last]) }} aria-label="Undo"><Undo2 size={15} /></button>
        <button type="button" onClick={() => { const last = redo[redo.length - 1]; if (!last) return; setRedo(redo.slice(0, -1)); setStrokes(current => [...current, last]) }} aria-label="Redo"><Redo2 size={15} /></button>
        <button type="button" onClick={() => { setStrokes([]); setRedo([]) }} aria-label="Clear board"><Trash2 size={15} /></button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label="Whiteboard canvas"
      />
    </div>
  )
}
