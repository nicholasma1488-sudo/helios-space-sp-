import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { BookOpen, FileCode2, Play, RefreshCw, Sparkles, TerminalSquare, X } from 'lucide-react'
import type { Project } from '../api'
import { RepoEmptyState, RepoFrame, useProjectRepo } from './RepoFrame'
import { isValidRepoPath, languageForFile, README_STARTER } from './repoModel'

interface CodeData {
  files: Record<string, string>
  activeFile: string
  openFiles: string[]
  terminal: string[]
}

interface Props {
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  onCheckpoint: () => void
  onAskHelios: (prompt?: string) => void
  project?: Project
  canEdit?: boolean
}

export function CodeWorkspace({ data, onChange, onAskHelios, project, canEdit = true }: Props) {
  const value = data as unknown as CodeData
  const workspaceFiles = useMemo(() => value.files || {}, [value.files])
  const repo = useProjectRepo(project?.id, canEdit)
  const [rightPanel, setRightPanel] = useState<'preview' | 'terminal' | 'readme'>('preview')
  const [terminalInput, setTerminalInput] = useState('')
  const [previewKey, setPreviewKey] = useState(0)
  const syncedRef = useRef(false)

  useEffect(() => {
    syncedRef.current = false
  }, [project?.id])

  useEffect(() => {
    if (!repo.ready || syncedRef.current) return
    syncedRef.current = true
    if (Object.keys(repo.workingFiles).length > 0) {
      const active = repo.workingFiles[value.activeFile] !== undefined ? value.activeFile : Object.keys(repo.workingFiles)[0] || ''
      onChange({
        ...value,
        files: repo.workingFiles,
        activeFile: active,
        openFiles: (value.openFiles || []).filter(name => repo.workingFiles[name] !== undefined).concat(active && !(value.openFiles || []).includes(active) ? [active] : []),
      })
      return
    }
    if (Object.keys(workspaceFiles).length > 0) {
      repo.setWorkingFiles(workspaceFiles)
      repo.persist(workspaceFiles)
    }
  }, [repo.ready, project?.id])

  const files = repo.viewingCommit ? repo.files : (Object.keys(repo.workingFiles).length ? repo.workingFiles : workspaceFiles)
  const activeFile = files[value.activeFile] !== undefined ? value.activeFile : Object.keys(files)[0] || ''
  const openFiles = (value.openFiles || []).filter(name => files[name] !== undefined)

  const preview = useMemo(() => {
    const html = files['index.html'] || '<main id="app"></main>'
    const css = files['styles.css'] || files['style.css'] || ''
    const js = files['app.js'] || files['index.js'] || ''
    return html
      .replace(/<link[^>]+href=["'](?:styles|style)\.css["'][^>]*>/i, `<style>${css}</style>`)
      .replace(/<script[^>]+src=["'](?:app|index)\.js["'][^>]*><\/script>/i, `<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`)
  }, [files])

  function patch(next: Partial<CodeData>) {
    const merged = { ...value, ...next }
    onChange(merged)
    if (next.files && canEdit && !repo.viewingCommit) repo.persist(next.files)
  }

  function openFile(name: string) {
    patch({ activeFile: name, openFiles: openFiles.includes(name) ? openFiles : [...openFiles, name] })
  }

  function closeFile(name: string) {
    const nextOpen = openFiles.filter(file => file !== name)
    patch({ openFiles: nextOpen, activeFile: value.activeFile === name ? (nextOpen[0] || Object.keys(files)[0] || '') : value.activeFile })
  }

  function createFile(path: string, content = '') {
    const nextFiles = { ...files, [path]: content }
    void repo.createFile(path, content)
    patch({ files: nextFiles, activeFile: path, openFiles: [...openFiles, path] })
  }

  function renameFile(from: string, to: string) {
    const nextFiles = { ...files }
    nextFiles[to] = nextFiles[from] ?? ''
    delete nextFiles[from]
    void repo.renameFile(from, to)
    patch({
      files: nextFiles,
      activeFile: value.activeFile === from ? to : value.activeFile,
      openFiles: openFiles.map(name => name === from ? to : name),
    })
  }

  function removeFile(name: string) {
    const nextFiles = { ...files }
    delete nextFiles[name]
    void repo.deleteFile(name)
    const nextOpen = openFiles.filter(file => file !== name)
    patch({ files: nextFiles, openFiles: nextOpen, activeFile: nextOpen[0] || Object.keys(nextFiles)[0] || '' })
  }

  async function commit(message: string) {
    await repo.commit(message)
  }

  function runTerminal(event: React.FormEvent) {
    event.preventDefault()
    const command = terminalInput.trim()
    if (!command) return
    const output = [...(value.terminal || []), `$ ${command}`]
    const normalized = command.toLowerCase()
    if (normalized === 'help') output.push('Supported: help, ls, clear, preview, commit')
    else if (normalized === 'ls') output.push(Object.keys(files).join('   ') || '(empty repository)')
    else if (normalized === 'clear') output.splice(0, output.length)
    else if (['preview', 'npm run preview'].includes(normalized)) {
      output.push('Preview rebuilt from index.html, styles.css and app.js.')
      setRightPanel('preview')
      setPreviewKey(key => key + 1)
    } else if (normalized === 'commit') output.push('Use the Commit panel on the right to save a snapshot with a message.')
    else output.push(`Command not available in the browser sandbox: ${command}`)
    patch({ terminal: output.slice(-120) })
    setTerminalInput('')
  }

  const empty = Object.keys(files).length === 0
  const editorValue = files[activeFile] ?? ''

  const editor = empty ? (
    <RepoEmptyState
      canEdit={canEdit && !repo.viewingCommit}
      onAddFile={() => {
        const path = window.prompt('File name, including extension', 'src/app.ts')?.trim()
        if (path && isValidRepoPath(path) && files[path] === undefined) createFile(path)
      }}
      onAddReadme={() => createFile('README.md', README_STARTER)}
      onCommit={() => { void commit('Initial commit') }}
    />
  ) : (
    <section className="code-editor-zone">
      <div className="code-tabs">
        {openFiles.map(name => (
          <button type="button" key={name} className={activeFile === name ? 'is-active' : ''} onClick={() => openFile(name)}>
            <FileCode2 size={12} />
            <span>{name}</span>
            {repo.dirtyPaths.includes(name) && <i className="repo-dirty-dot" />}
            <b role="button" tabIndex={0} aria-label={`Close ${name}`} onClick={event => { event.stopPropagation(); closeFile(name) }}><X size={11} /></b>
          </button>
        ))}
      </div>
      {activeFile ? (
        <>
          <div className="repo-file-meta">
            <FileCode2 size={13} />
            <span>{project?.name || 'repository'} / {activeFile}</span>
            {!editorValue && <small>This file is empty. Start writing, then commit a snapshot.</small>}
          </div>
          <div className="code-monaco">
            <Editor
              language={languageForFile(activeFile)}
              value={editorValue}
              onChange={next => {
                if (!canEdit || repo.viewingCommit || !activeFile) return
                patch({ files: { ...files, [activeFile]: next || '' } })
              }}
              theme="vs-dark"
              options={{
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'Fira Code, Menlo, monospace',
                padding: { top: 14 },
                wordWrap: 'on',
                readOnly: !canEdit || Boolean(repo.viewingCommit),
              }}
            />
          </div>
        </>
      ) : (
        <RepoEmptyState
          canEdit={canEdit && !repo.viewingCommit}
          onAddFile={() => createFile('src/app.ts')}
          onAddReadme={() => createFile('README.md', README_STARTER)}
          onCommit={() => { void commit('Initial commit') }}
        />
      )}
    </section>
  )

  if (!project) {
    return <div className="code-workspace">{editor}</div>
  }

  return (
    <RepoFrame
      project={project}
      canEdit={canEdit && !repo.viewingCommit}
      files={files}
      activeFile={activeFile}
      dirtyPaths={repo.dirtyPaths}
      uncommitted={repo.uncommitted}
      commits={repo.commits}
      viewingCommit={repo.viewingCommit}
      committing={repo.committing}
      onOpenFile={openFile}
      onCreateFile={createFile}
      onRenameFile={renameFile}
      onDeleteFile={removeFile}
      onCommit={message => void commit(message)}
      onViewCommit={next => void repo.viewCommit(next)}
      onRestoreCommit={next => void repo.restoreCommit(next).then(restored => {
        const map = restored || {}
        patch({ files: map, activeFile: Object.keys(map)[0] || '', openFiles: Object.keys(map).slice(0, 4) })
      })}
    >
      <div className="repo-code-split">
        {editor}
        <section className="code-output-zone">
          <nav>
            <button type="button" className={rightPanel === 'preview' ? 'is-active' : ''} onClick={() => setRightPanel('preview')}><Play size={12} /> Preview</button>
            <button type="button" className={rightPanel === 'terminal' ? 'is-active' : ''} onClick={() => setRightPanel('terminal')}><TerminalSquare size={12} /> Terminal</button>
            <button type="button" className={rightPanel === 'readme' ? 'is-active' : ''} onClick={() => setRightPanel('readme')}><BookOpen size={12} /> README</button>
            <button type="button" onClick={() => onAskHelios(`Review ${activeFile || 'this repository'} and suggest the next useful change`)}><Sparkles size={12} /> Helios</button>
            {rightPanel === 'preview' && <button type="button" onClick={() => setPreviewKey(key => key + 1)} aria-label="Refresh preview"><RefreshCw size={12} /></button>}
          </nav>
          {rightPanel === 'preview' && <iframe key={previewKey} title="Live project preview" sandbox="allow-scripts" srcDoc={preview} />}
          {rightPanel === 'terminal' && (
            <div className="browser-terminal">
              <div>{(value.terminal || []).map((line, index) => <p key={index}>{line}</p>)}</div>
              <form onSubmit={runTerminal}><span>$</span><input value={terminalInput} onChange={event => setTerminalInput(event.target.value)} aria-label="Terminal command" /></form>
            </div>
          )}
          {rightPanel === 'readme' && (
            <div className="code-docs">
              <BookOpen size={22} />
              <h3>README</h3>
              <p>Every repository should explain itself. Create <code>README.md</code>, write the purpose, then commit it.</p>
              <button type="button" onClick={() => files['README.md'] !== undefined ? openFile('README.md') : createFile('README.md', README_STARTER)}>
                {files['README.md'] !== undefined ? 'Open README.md' : 'Add README.md'}
              </button>
            </div>
          )}
        </section>
      </div>
    </RepoFrame>
  )
}
