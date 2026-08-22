import { useEffect, useState } from 'react'
import { Check, Send, X } from 'lucide-react'
import { api } from '../api'
import type { Project } from '../api'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useApp } from '../store/appStore'

type Audience = 'public' | 'private'

interface Props {
  project: Project
  onClose: () => void
}

const MIN_UPDATE_LENGTH = 10

export function PublishModal({ project, onClose }: Props) {
  const { dispatch } = useApp()
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<Audience>('public')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const trapRef = useFocusTrap<HTMLDivElement>()
  const meaningfulBody = body.trim().length >= MIN_UPDATE_LENGTH

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, submitting])

  function close() {
    if (!submitting) onClose()
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault()
    const update = body.trim()
    if (update.length < MIN_UPDATE_LENGTH) {
      setError(`Describe what changed in at least ${MIN_UPDATE_LENGTH} characters.`)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await api.posts.create({
        body: update,
        category: project.type === 'code' ? 'code' : 'reflection',
        audience,
        project_id: project.id,
        space_id: project.space_id,
        post_type: `${project.app_kind}-project-update`,
      })
      setDone(true)
      dispatch({
        type: 'PUSH_TOAST',
        toast: {
          id: Date.now().toString(),
          message: audience === 'public' ? 'Project update published' : 'Private project update saved',
          tone: 'success',
        },
      })
    } catch (publishError) {
      setError((publishError as Error).message || 'Could not publish this update.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={close}>
      <div ref={trapRef} className="flex flex-col rounded-2xl overflow-hidden w-full shadow-2xl"
        style={{ maxWidth: 480, background: 'var(--helios-surface)', border: '1px solid var(--helios-border)' }}
        onClick={event => event.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="publish-title" aria-describedby="publish-description">
        <header className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--helios-border)' }}>
          <Send size={16} style={{ color: 'var(--helios-accent)' }} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <div id="publish-title" style={{ fontSize: 15, fontWeight: 700 }}>Publish project update</div>
            <div style={{ fontSize: 12, color: 'var(--helios-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {project.name}
            </div>
          </div>
          <button type="button" onClick={close} disabled={submitting} aria-label="Close publish dialog"
            className="p-1.5 rounded-lg cursor-pointer"
            style={{ background: 'none', border: 'none', color: 'var(--helios-muted)', opacity: submitting ? 0.5 : 1 }}>
            <X size={16} />
          </button>
        </header>

        {done ? (
          <div className="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--helios-success)' }}>
              <Check size={24} color="#fff" aria-hidden="true" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {audience === 'public' ? 'Update published' : 'Private update saved'}
            </div>
            <div id="publish-description" style={{ fontSize: 13, color: 'var(--helios-muted)', lineHeight: 1.5 }}>
              {audience === 'public'
                ? 'Your project update is now available in the public post feed.'
                : 'This update is visible only to you.'}
            </div>
            <button type="button" onClick={close} autoFocus
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: 'var(--helios-accent)', color: '#fff', border: 'none' }}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={publish} className="flex flex-col gap-4 p-5">
            <p id="publish-description" style={{ fontSize: 12, color: 'var(--helios-muted)', lineHeight: 1.55, margin: 0 }}>
              Share a concise update about what changed. Publishing links this post to the project; it does not include private editor history.
            </p>

            <div>
              <label htmlFor="publish-update" style={{ fontSize: 12, fontWeight: 600, color: 'var(--helios-muted)', display: 'block', marginBottom: 6 }}>
                What changed?
              </label>
              <textarea id="publish-update" autoFocus value={body}
                onChange={event => { setBody(event.target.value); if (error) setError('') }}
                rows={4} maxLength={2000} required
                placeholder="Describe the progress, decision, or result you want to share…"
                className="w-full rounded-xl px-3 py-2.5 outline-none resize-none"
                style={{ background: 'var(--helios-surface2)', border: `1px solid ${error ? 'var(--helios-danger)' : 'var(--helios-border)'}`, color: 'var(--helios-text)', fontSize: 13, lineHeight: 1.55 }}
                aria-invalid={!!error} aria-describedby={error ? 'publish-error' : 'publish-body-help'} />
              <div id="publish-body-help" className="flex justify-between gap-3 mt-1.5" style={{ fontSize: 11, color: 'var(--helios-muted)' }}>
                <span>At least {MIN_UPDATE_LENGTH} characters</span>
                <span>{body.length}/2000</span>
              </div>
            </div>

            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ fontSize: 12, fontWeight: 600, color: 'var(--helios-muted)', marginBottom: 8 }}>Audience</legend>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['public', 'Public', 'Visible in the public post feed'],
                  ['private', 'Private', 'Visible only to you'],
                ] as const).map(([value, label, detail]) => (
                  <button key={value} type="button" onClick={() => setAudience(value)} aria-pressed={audience === value}
                    className="flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl text-left cursor-pointer"
                    style={{ background: audience === value ? 'rgba(124,106,247,0.15)' : 'var(--helios-surface2)', color: audience === value ? 'var(--helios-accent)' : 'var(--helios-text)', border: `1px solid ${audience === value ? 'var(--helios-accent)' : 'var(--helios-border)'}` }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                    <span style={{ fontSize: 11, color: 'var(--helios-muted)', lineHeight: 1.4 }}>{detail}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            {error && (
              <div id="publish-error" role="alert" className="px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', color: 'var(--helios-danger)', fontSize: 12 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting || !meaningfulBody}
              className="py-3 rounded-xl text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
              style={{ background: 'var(--helios-accent)', color: '#fff', border: 'none', opacity: (submitting || !meaningfulBody) ? 0.55 : 1 }}>
              <Send size={14} aria-hidden="true" /> {submitting ? 'Publishing…' : audience === 'public' ? 'Publish update' : 'Save private update'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
