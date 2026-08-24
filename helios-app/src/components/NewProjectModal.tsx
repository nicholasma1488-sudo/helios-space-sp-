import { useState, useEffect } from 'react'
import { useApp } from '../store/appStore'
import { api } from '../api'
import type { Project } from '../api'
import { X, Code, FileText, Palette, BookOpen, Check, Sparkles } from 'lucide-react'
import { useFocusTrap } from '../hooks/useFocusTrap'

type ProjType = Project['type']

interface NewProjectModalProps {
  onClose: () => void
  initialSpace?: string
  initialSpaceId?: string
  initialType?: ProjType
  initialAppKind?: string
  initialAppName?: string
}

const TEMPLATES: { id: string; name: string; type: ProjType; description: string }[] = [
  { id: 'code-blank', name: 'Code project', type: 'code', description: 'Start a coding project from scratch.' },
  { id: 'doc-blank', name: 'Document', type: 'doc', description: 'Notes, essays, research, or study.' },
  { id: 'design-blank', name: 'Design exploration', type: 'design', description: 'Moodboard, layout exploration, or UI design.' },
  { id: 'research-blank', name: 'Research log', type: 'research', description: 'Reproducible analysis with sources.' },
]

const TYPE_ICON: Partial<Record<ProjType, React.ReactNode>> = {
  code: <Code size={14} />, doc: <FileText size={14} />, design: <Palette size={14} />, research: <BookOpen size={14} />,
}

export function NewProjectModal({
  onClose,
  initialSpace = '',
  initialSpaceId,
  initialType = 'code',
  initialAppKind,
  initialAppName,
}: NewProjectModalProps) {
  const { dispatch } = useApp()
  const trapRef = useFocusTrap<HTMLDivElement>()

  // Escape closes the modal
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const [templateId, setTemplateId] = useState(
    () => TEMPLATES.find(t => t.type === initialType)?.id ?? 'code-blank',
  )
  const [name, setName] = useState('')
  const [space, setSpace] = useState(initialSpace)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const template = initialAppKind
    ? { id: 'contextual', name: initialAppName ?? 'Project', type: initialType, description: 'Created inside the current Space.' }
    : TEMPLATES.find(t => t.id === templateId)!

  function moveTemplateFocus(currentId: string, offset: number) {
    const current = TEMPLATES.findIndex(t => t.id === currentId)
    const next = TEMPLATES[(current + offset + TEMPLATES.length) % TEMPLATES.length]
    setTemplateId(next.id)
    requestAnimationFrame(() => document.getElementById(`project-template-${next.id}`)?.focus())
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError('')
    try {
      const r = await api.projects.create({
        name: name.trim(),
        space: space.trim(),
        space_id: initialSpaceId,
        type: template.type,
        app_kind: initialAppKind,
        visibility: 'private',
        content: '',
        metadata: {},
      })
      dispatch({ type: 'ADD_PROJECT', project: r.project })
      dispatch({ type: 'PUSH_TOAST', toast: { id: Date.now().toString(), message: `Created "${r.project.name}"`, tone: 'success' } })
      onClose()
      dispatch({ type: 'OPEN_CODE_EDITOR', projectId: r.project.id })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="flex flex-col rounded-2xl overflow-hidden w-full shadow-2xl"
        ref={trapRef}
        style={{ maxWidth: 500, maxHeight: '80vh', background: 'var(--helios-surface)', border: '1px solid var(--helios-border)' }}
        onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create a new project"
        aria-describedby="new-proj-desc">
        <span id="new-proj-desc" className="sr-only">Choose a project type, enter a name, and begin the workspace.</span>
        <div className="flex items-center gap-3 px-6 py-4 border-b" style={{ borderColor: 'var(--helios-border)' }}>
          <div className="w-8 h-8 flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--helios-solar) 18%, transparent)', color: 'var(--helios-solar)', border: '1px solid color-mix(in srgb, var(--helios-solar) 40%, transparent)', borderRadius: 3 }}><Sparkles size={16} /></div>
          <div style={{ fontSize: 15, fontWeight: 700, flex: 1 }}>New workspace</div>
          <button type="button" onClick={onClose} aria-label="Close new project dialog"
            style={{ background: 'none', border: 'none', color: 'var(--helios-muted)', cursor: 'pointer' }}><X size={16} /></button>
        </div>
        <form onSubmit={create} className="flex flex-col gap-4 p-5 overflow-y-auto flex-1">
          {!initialAppKind ? <div>
            <div id="project-type-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--helios-muted)', marginBottom: 8 }}>Type</div>
            <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }} role="radiogroup" aria-labelledby="project-type-label">
              {TEMPLATES.map(t => (
                <button key={t.id} id={`project-template-${t.id}`} type="button" onClick={() => setTemplateId(t.id)}
                  role="radio" aria-checked={templateId === t.id}
                  tabIndex={templateId === t.id ? 0 : -1}
                  onKeyDown={e => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                      e.preventDefault()
                      moveTemplateFocus(t.id, 1)
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                      e.preventDefault()
                      moveTemplateFocus(t.id, -1)
                    }
                  }}
                  className="flex flex-col gap-1.5 px-4 py-3 text-left cursor-pointer"
                  style={{ background: templateId === t.id ? 'color-mix(in srgb, var(--helios-solar) 12%, var(--helios-surface2))' : 'var(--helios-surface2)', border: `1px solid ${templateId === t.id ? 'var(--helios-solar)' : 'transparent'}`, borderRadius: 3 }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--helios-solar)' }}>{TYPE_ICON[t.type]}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{t.name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--helios-muted)', lineHeight: 1.4 }}>{t.description}</div>
                </button>
              ))}
            </div>
          </div> : (
            <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'color-mix(in srgb, var(--helios-solar) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--helios-solar) 32%, transparent)', borderRadius: 3 }}>
              <span style={{ color: 'var(--helios-solar)' }}>{TYPE_ICON[template.type] ?? <Sparkles size={14} />}</span>
              <div><strong style={{ display: 'block', fontSize: 13 }}>{template.name}</strong><small style={{ display: 'block', marginTop: 3, color: 'var(--helios-muted)', fontSize: 11 }}>{template.description}</small></div>
            </div>
          )}
          <div>
            <label htmlFor="proj-name" style={{ fontSize: 12, fontWeight: 600, color: 'var(--helios-muted)', display: 'block', marginBottom: 6 }}>Project name</label>
            <input id="proj-name" autoFocus value={name} onChange={e => setName(e.target.value)} required
              placeholder={`My ${template.name.toLowerCase()}`}
              className="w-full px-3 py-2.5 rounded-xl outline-none"
              style={{ background: 'var(--helios-surface2)', border: '1px solid var(--helios-border)', color: 'var(--helios-text)', fontSize: 14 }} />
          </div>
          <div>
            <label htmlFor="proj-space" style={{ fontSize: 12, fontWeight: 600, color: 'var(--helios-muted)', display: 'block', marginBottom: 6 }}>Space (optional)</label>
            <input id="proj-space" value={space} onChange={e => setSpace(e.target.value)}
              placeholder="e.g. Machine Learning, Web Design"
              className="w-full px-3 py-2.5 rounded-xl outline-none"
              style={{ background: 'var(--helios-surface2)', border: '1px solid var(--helios-border)', color: 'var(--helios-text)', fontSize: 14 }} />
          </div>
          {error && <div role="alert" style={{ color: 'var(--helios-danger)', fontSize: 13 }}>{error}</div>}
          <button type="submit" disabled={creating || !name.trim()} className="hs-btn-fill w-full">
            <Check size={14} /> {creating ? 'Opening…' : 'Begin'}
          </button>
        </form>
      </div>
    </div>
  )
}
