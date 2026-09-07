import { useEffect, useMemo, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { zipSync, strToU8 } from 'fflate'
import {
  BookOpen, Download, FileCode2, Play, RefreshCw, Sparkles, TerminalSquare, X,
} from 'lucide-react'
import type { Project } from '../api'
import { api } from '../api'
import { RepoEmptyState, RepoFrame, useProjectRepo } from './RepoFrame'
import {
  isValidRepoPath,
  LANGUAGE_OPTIONS,
  languageForFile,
  monacoLanguageFor,
  README_STARTER,
  replaceExtension,
  type EditorLanguage,
} from './repoModel'

interface CodeData {
  files: Record<string, string>
  activeFile: string
  openFiles: string[]
  terminal: string[]
  language?: EditorLanguage
}

interface Props {
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  onCheckpoint: () => void
  onAskHelios: (prompt?: string) => void
  project?: Project
  canEdit?: boolean
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function CodeWorkspace({ data, onChange, onAskHelios, project, canEdit = true }: Props) {
  const value = data as unknown as CodeData
  const workspaceFiles = useMemo(() => value.files || {}, [value.files])
  const repo = useProjectRepo(project?.id, canEdit)
  const [rightPanel, setRightPanel] = useState<'preview' | 'terminal' | 'readme'>('preview')
  const [terminalInput, setTerminalInput] = useState('')
  const [previewKey, setPreviewKey] = useState(0)
  const [running, setRunning] = useState(false)
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
  const activeLanguage = value.language || (activeFile ? languageForFile(activeFile) : 'javascript')

  const preview = useMemo(() => {
    const html = files['index.html'] || '<main id="app"><p>Add index.html to preview the web app.</p></main>'
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
    patch({
      activeFile: name,
      openFiles: openFiles.includes(name) ? openFiles : [...openFiles, name],
      language: languageForFile(name),
    })
  }

  function closeFile(name: string) {
    const nextOpen = openFiles.filter(file => file !== name)
    const nextActive = value.activeFile === name ? (nextOpen[0] || Object.keys(files)[0] || '') : value.activeFile
    patch({
      openFiles: nextOpen,
      activeFile: nextActive,
      language: nextActive ? languageForFile(nextActive) : value.language,
    })
  }

  function createFile(path: string, content = '') {
    const nextFiles = { ...files, [path]: content }
    void repo.createFile(path, content)
    patch({
      files: nextFiles,
      activeFile: path,
      openFiles: [...openFiles, path],
      language: languageForFile(path),
    })
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
      language: languageForFile(value.activeFile === from ? to : value.activeFile),
    })
  }

  function removeFile(name: string) {
    const nextFiles = { ...files }
    delete nextFiles[name]
    void repo.deleteFile(name)
    const nextOpen = openFiles.filter(file => file !== name)
    const nextActive = nextOpen[0] || Object.keys(nextFiles)[0] || ''
    patch({
      files: nextFiles,
      openFiles: nextOpen,
      activeFile: nextActive,
      language: nextActive ? languageForFile(nextActive) : value.language,
    })
  }

  async function commit(message: string) {
    await repo.commit(message)
  }

  function switchLanguage(next: EditorLanguage) {
    const option = LANGUAGE_OPTIONS.find(item => item.id === next)
    if (!option) return
    if (!activeFile) {
      const path = `main.${option.extension}`
      createFile(path, option.starter)
      patch({ language: next })
      return
    }
    const target = replaceExtension(activeFile, option.extension)
    if (target !== activeFile && files[target] === undefined) {
      renameFile(activeFile, target)
      if (!files[activeFile]?.trim()) {
        patch({
          files: { ...files, [target]: option.starter },
          activeFile: target,
          openFiles: openFiles.map(name => name === activeFile ? target : name),
          language: next,
        })
        return
      }
    }
    patch({ language: next, activeFile: files[target] !== undefined ? target : activeFile })
  }

  function downloadCode() {
    const entries = Object.entries(files)
    if (entries.length === 0) return
    const base = (project?.name || 'helios-code').replace(/[^\w.-]+/g, '-')
    if (entries.length === 1) {
      const [path, content] = entries[0]
      downloadBlob(new Blob([content], { type: 'text/plain;charset=utf-8' }), path.split('/').pop() || `${base}.txt`)
      return
    }
    const zipped = zipSync(
      Object.fromEntries(entries.map(([path, content]) => [`${base}/${path}`, strToU8(content)])),
      { level: 6 },
    )
    downloadBlob(new Blob([zipped], { type: 'application/zip' }), `${base}.zip`)
  }

  async function runActiveFile() {
    if (!activeFile) return
    const lang = languageForFile(activeFile)
    const source = files[activeFile] || ''
    const output = [...(value.terminal || []), `$ run ${activeFile}`]
    setRightPanel('terminal')

    if (lang === 'html' || lang === 'css' || lang === 'javascript' || activeFile.endsWith('.js')) {
      output.push('Opening live preview from index.html / styles / app.js…')
      setRightPanel('preview')
      setPreviewKey(key => key + 1)
      patch({ terminal: output.slice(-120) })
      return
    }

    setRunning(true)
    try {
      const result = await api.codeRun({
        language: lang,
        filename: activeFile,
        source,
        files,
      })
      output.push(result.stdout || '(no stdout)')
      if (result.stderr) output.push(result.stderr)
      if (result.status) output.push(`[exit ${result.status}]`)
    } catch (error) {
      output.push(`Run failed: ${(error as Error).message}`)
    } finally {
      setRunning(false)
      patch({ terminal: output.slice(-120) })
    }
  }

  function runTerminal(event: React.FormEvent) {
    event.preventDefault()
    const command = terminalInput.trim()
    if (!command) return
    const output = [...(value.terminal || []), `$ ${command}`]
    const normalized = command.toLowerCase()
    if (normalized === 'help') output.push('Supported: help, ls, clear, preview, run, download, commit')
    else if (normalized === 'ls') output.push(Object.keys(files).join('   ') || '(empty repository)')
    else if (normalized === 'clear') output.splice(0, output.length)
    else if (['preview', 'npm run preview'].includes(normalized)) {
      output.push('Preview rebuilt from index.html, styles.css and app.js.')
      setRightPanel('preview')
      setPreviewKey(key => key + 1)
    } else if (normalized === 'run') {
      setTerminalInput('')
      void runActiveFile()
      return
    } else if (normalized === 'download') {
      downloadCode()
      output.push(Object.keys(files).length > 1 ? 'Downloaded zip folder.' : 'Downloaded file.')
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
        const path = window.prompt('File name, including extension', 'main.cpp')?.trim()
        if (path && isValidRepoPath(path) && files[path] === undefined) createFile(path)
      }}
      onAddReadme={() => createFile('README.md', README_STARTER)}
      onCommit={() => { void commit('Initial commit') }}
    />
  ) : (
    <section className="code-editor-zone">
      <div className="code-toolbar liquid-glass">
        <label className="code-language-switch">
          <span>Language</span>
          <select
            value={activeLanguage}
            disabled={!canEdit || Boolean(repo.viewingCommit)}
            onChange={event => switchLanguage(event.target.value as EditorLanguage)}
            aria-label="Code language"
          >
            {LANGUAGE_OPTIONS.map(option => (
              <option key={option.id} value={option.id}>{option.label}</option>
            ))}
          </select>
        </label>
        <button type="button" className="liquid-glass-btn" disabled={running || !activeFile} onClick={() => void runActiveFile()}>
          <Play size={13} /> {running ? 'Running…' : 'Run'}
        </button>
        <button type="button" className="liquid-glass-btn" onClick={() => { setRightPanel('preview'); setPreviewKey(key => key + 1) }}>
          <RefreshCw size={13} /> Preview
        </button>
        <button type="button" className="liquid-glass-btn is-primary" disabled={Object.keys(files).length === 0} onClick={downloadCode}>
          <Download size={13} /> {Object.keys(files).length > 1 ? 'Download ZIP' : 'Download'}
        </button>
      </div>
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
            <small>{LANGUAGE_OPTIONS.find(item => item.id === activeLanguage)?.label || activeLanguage}</small>
            {!editorValue && <small>This file is empty. Start writing, then commit a snapshot.</small>}
          </div>
          <div className="code-monaco">
            <Editor
              language={monacoLanguageFor(activeLanguage)}
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
          onAddFile={() => createFile('main.cpp', LANGUAGE_OPTIONS.find(item => item.id === 'cpp')!.starter)}
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
            <button type="button" onClick={() => onAskHelios(`Review ${activeFile || 'this repository'} and write the next useful file changes as path-tagged code blocks`)}><Sparkles size={12} /> Helios</button>
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
