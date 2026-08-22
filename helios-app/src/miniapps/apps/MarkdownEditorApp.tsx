import { useMemo } from 'react'
import { Save } from 'lucide-react'
import { useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderMarkdown(source: string) {
  const escaped = escapeHtml(source)
  const html = escaped
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/\n{2,}/g, '</p><p>')
  return `<p>${html}</p>`
}

export default function MarkdownEditorApp({ accountId, onToast }: MiniAppProps) {
  const [doc, setDoc] = useAccountState(accountId, 'markdown', { title: 'Untitled', body: '# Helios note\n\nWrite **markdown** and watch the preview.' })
  const preview = useMemo(() => renderMarkdown(doc.body), [doc.body])

  return (
    <div className="md-app">
      <header>
        <input value={doc.title} onChange={event => setDoc(current => ({ ...current, title: event.target.value }))} aria-label="Document title" />
        <button type="button" onClick={() => onToast('Markdown saved on this account', 'success')}><Save size={14} /> Saved locally</button>
      </header>
      <div className="md-split">
        <textarea value={doc.body} onChange={event => setDoc(current => ({ ...current, body: event.target.value }))} aria-label="Markdown input" />
        <article className="md-preview" dangerouslySetInnerHTML={{ __html: preview }} />
      </div>
    </div>
  )
}
