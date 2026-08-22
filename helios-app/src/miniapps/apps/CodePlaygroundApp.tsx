import { useMemo, useState } from 'react'
import { Play, Save } from 'lucide-react'
import { api } from '../../api'
import { useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

type Language = 'html' | 'javascript' | 'css'

const STARTERS: Record<Language, string> = {
  html: '<!doctype html>\n<html><body>\n  <h1>Helios Playground</h1>\n  <script>console.log("ready")</script>\n</body></html>',
  javascript: 'const greet = name => `hello ${name}`\nconsole.log(greet("Helios"))',
  css: 'body { font-family: Inter, sans-serif; background: #111; color: #fff; }',
}

export default function CodePlaygroundApp({ accountId, onToast, onOpenProject }: MiniAppProps) {
  const [language, setLanguage] = useState<Language>('javascript')
  const [files, setFiles] = useAccountState<Record<Language, string>>(accountId, 'playground', STARTERS)
  const [output, setOutput] = useState('')
  const [saving, setSaving] = useState(false)
  const srcDoc = useMemo(() => {
    if (language === 'html') return files.html
    return `<!doctype html><html><head><style>${files.css}</style></head><body><pre id="out"></pre><script>
      const out = document.getElementById('out');
      const log = (...args) => { out.textContent += args.join(' ') + '\\n' };
      console.log = log; console.error = log;
      try { ${language === 'javascript' ? files.javascript : ''} } catch (error) { log(error.message) }
    </script></body></html>`
  }, [files, language])

  function run() {
    try {
      if (language === 'javascript') {
        const logs: string[] = []
        const sandbox = { console: { log: (...args: unknown[]) => logs.push(args.map(String).join(' ')) } }
        Function('console', files.javascript)(sandbox.console)
        setOutput(logs.join('\n') || 'Ran with no output.')
      } else {
        setOutput('Preview updated.')
      }
    } catch (error) {
      setOutput((error as Error).message)
    }
  }

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const result = await api.projects.create({
        name: 'Playground ' + new Date().toLocaleDateString(),
        type: 'code',
        app_kind: 'web-code',
        visibility: 'private',
        content: language === 'html' ? files.html : files.javascript,
      })
      onToast('Saved as a Helios project', 'success')
      onOpenProject(result.project.id)
    } catch (error) {
      onToast((error as Error).message, 'warning')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="play-app">
      <header>
        <label>
          Language
          <select value={language} onChange={event => setLanguage(event.target.value as Language)}>
            <option value="javascript">JavaScript</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
          </select>
        </label>
        <button type="button" onClick={run}><Play size={14} /> Run</button>
        <button type="button" onClick={() => void save()} disabled={saving}><Save size={14} /> {saving ? 'Saving…' : 'Save project'}</button>
      </header>
      <textarea
        value={files[language]}
        onChange={event => setFiles(current => ({ ...current, [language]: event.target.value }))}
        spellCheck={false}
        aria-label="Code editor"
      />
      <div className="play-output">
        <strong>Output</strong>
        <pre>{output || 'Run to see console output.'}</pre>
        <iframe title="Playground preview" sandbox="allow-scripts" srcDoc={srcDoc} />
      </div>
    </div>
  )
}
