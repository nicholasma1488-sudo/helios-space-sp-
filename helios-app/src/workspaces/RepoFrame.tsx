import { useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import {
  ChevronRight, FileCode2, FilePlus2, FolderGit2, GitCommitHorizontal,
  History, Pencil, Trash2,
} from 'lucide-react'
import { api, type Project, type ProjectCommit } from '../api'
import { artifactPathForKind, filesFromList, isValidRepoPath, languageForFile, README_STARTER, sortFilePaths } from './repoModel'

interface RepoFrameProps {
  project: Project
  canEdit: boolean
  files: Record<string, string>
  activeFile: string
  dirtyPaths?: string[]
  uncommitted?: boolean
  commits: ProjectCommit[]
  viewingCommit: ProjectCommit | null
  creating?: boolean
  committing?: boolean
  children?: React.ReactNode
  nativeLabel?: string
  onOpenFile: (path: string) => void
  onCreateFile: (path: string, content?: string) => void
  onRenameFile?: (from: string, to: string) => void
  onDeleteFile?: (path: string) => void
  onCommit: (message: string) => void
  onViewCommit: (commit: ProjectCommit | null) => void
  onRestoreCommit?: (commit: ProjectCommit) => void
}

export function RepoFrame({
  project, canEdit, files, activeFile, dirtyPaths = [], uncommitted = false, commits, viewingCommit,
  creating = false, committing = false, children, nativeLabel, onOpenFile, onCreateFile, onRenameFile,
  onDeleteFile, onCommit, onViewCommit, onRestoreCommit,
}: RepoFrameProps) {
  const [newPath, setNewPath] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [message, setMessage] = useState('')
  const names = sortFilePaths(Object.keys(files))
  const empty = names.length === 0
  const handle = project.owner_handle || 'repo'
  const slug = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project'

  function submitNew(event: React.FormEvent) {
    event.preventDefault()
    const path = newPath.trim()
    if (!isValidRepoPath(path) || files[path] !== undefined) return
    onCreateFile(path, path.toLowerCase() === 'readme.md' ? README_STARTER : '')
    setNewPath('')
    setShowNew(false)
  }

  function submitCommit(event: React.FormEvent) {
    event.preventDefault()
    const next = message.trim()
    if (!next || !canEdit) return
    onCommit(next)
    setMessage('')
  }

  return (
    <div className="repo-workspace">
      <header className="repo-toolbar">
        <div className="repo-identity">
          <FolderGit2 size={15} />
          <strong>{handle}/{slug}</strong>
          <span className="repo-branch">main</span>
          {uncommitted && <i className="repo-dirty-dot" title="Uncommitted changes" />}
          <small>{names.length} {names.length === 1 ? 'file' : 'files'}</small>
        </div>
        <div className="repo-toolbar-actions">
          {canEdit && <button type="button" onClick={() => setShowNew(true)} disabled={creating}><FilePlus2 size={13} /> Add file</button>}
        </div>
      </header>

      {viewingCommit && (
        <div className="repo-commit-banner">
          <History size={13} />
          <span>Viewing commit · {viewingCommit.message}</span>
          <small>{viewingCommit.author_name} · {new Date(viewingCommit.created_at).toLocaleString()}</small>
          <button type="button" onClick={() => onViewCommit(null)}>Back to current</button>
          {canEdit && onRestoreCommit && <button type="button" onClick={() => onRestoreCommit(viewingCommit)}>Restore this snapshot</button>}
        </div>
      )}

      <div className="repo-body">
        <aside className="repo-tree">
          <header>
            <span>Files</span>
            {canEdit && !viewingCommit && <button type="button" onClick={() => setShowNew(true)} aria-label="Add file"><FilePlus2 size={13} /></button>}
          </header>
          {showNew && canEdit && (
            <form className="repo-new-file" onSubmit={submitNew}>
              <input value={newPath} onChange={event => setNewPath(event.target.value)} placeholder="src/app.ts" autoFocus aria-label="New file path" />
              <button type="submit" disabled={!isValidRepoPath(newPath.trim()) || files[newPath.trim()] !== undefined}>Create</button>
            </form>
          )}
          <div>
            {names.map(name => (
              <button type="button" key={name} className={activeFile === name ? 'is-active' : ''} onClick={() => onOpenFile(name)}>
                <ChevronRight size={11} />
                <FileCode2 size={13} />
                <span>{name}</span>
                {dirtyPaths.includes(name) && <i className="repo-dirty-dot" />}
                {canEdit && !viewingCommit && onRenameFile && (
                  <b role="button" tabIndex={0} aria-label={`Rename ${name}`} onClick={event => {
                    event.stopPropagation()
                    const next = window.prompt('Rename file', name)?.trim()
                    if (next && next !== name && isValidRepoPath(next) && files[next] === undefined) onRenameFile(name, next)
                  }}><Pencil size={11} /></b>
                )}
                {canEdit && !viewingCommit && onDeleteFile && (
                  <i role="button" tabIndex={0} aria-label={`Delete ${name}`} onClick={event => {
                    event.stopPropagation()
                    if (window.confirm(`Delete ${name}?`)) onDeleteFile(name)
                  }}><Trash2 size={11} /></i>
                )}
              </button>
            ))}
            {empty && <p className="repo-tree-empty">No files yet</p>}
          </div>
        </aside>

        <section className="repo-main">
          {children}
        </section>

        <aside className="repo-history">
          <header>
            <span><GitCommitHorizontal size={13} /> Commits</span>
            <small>main</small>
          </header>
          {canEdit && !viewingCommit && (
            <form className="repo-commit-form" onSubmit={submitCommit}>
              <textarea value={message} maxLength={200} onChange={event => setMessage(event.target.value)} placeholder="Commit message, like on GitHub" />
              <button type="submit" disabled={!message.trim() || committing}><GitCommitHorizontal size={13} /> {committing ? 'Committing…' : 'Commit to main'}</button>
            </form>
          )}
          <div>
            {commits.map(commit => (
              <button type="button" key={commit.id} className={viewingCommit?.id === commit.id ? 'is-active' : ''} onClick={() => onViewCommit(commit)}>
                <strong>{commit.message}</strong>
                <small>{commit.author_name} · {new Date(commit.created_at).toLocaleString()}</small>
                <em>{commit.file_count} files</em>
              </button>
            ))}
            {commits.length === 0 && <p className="repo-tree-empty">No commits yet. Save a snapshot when the files look right.</p>}
          </div>
        </aside>
      </div>
      {nativeLabel && <span className="sr-only">{nativeLabel}</span>}
    </div>
  )
}

export function useProjectRepo(projectId: number | undefined, canEdit: boolean) {
  const [files, setFiles] = useState<Record<string, string>>({})
  const [commits, setCommits] = useState<ProjectCommit[]>([])
  const [ready, setReady] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [viewingCommit, setViewingCommit] = useState<ProjectCommit | null>(null)
  const [viewingFiles, setViewingFiles] = useState<Record<string, string> | null>(null)
  const persistedRef = useRef<Record<string, string>>({})
  const committedRef = useRef<Record<string, string>>({})
  const readyRef = useRef(false)
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    readyRef.current = false
    setReady(false)
    setViewingCommit(null)
    setViewingFiles(null)
    Promise.all([api.projects.files.list(projectId), api.projects.commits.list(projectId)]).then(([fileResult, commitResult]) => {
      if (cancelled) return
      const map = filesFromList(fileResult.files)
      persistedRef.current = map
      committedRef.current = commitResult.commits[0]?.id ? map : {}
      setFiles(map)
      setCommits(commitResult.commits)
      if (commitResult.commits[0]) {
        api.projects.commits.get(projectId, commitResult.commits[0].id).then(result => {
          if (!cancelled && result.commit.files) committedRef.current = result.commit.files
        }).catch(() => {})
      }
      readyRef.current = true
      setReady(true)
    }).catch(() => {
      if (!cancelled) {
        readyRef.current = true
        setReady(true)
      }
    })
    return () => {
      cancelled = true
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    }
  }, [projectId])

  function persist(next: Record<string, string>, deleted: string[] = []) {
    setFiles(next)
    if (!projectId || !canEdit || !readyRef.current) return
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null
      void api.projects.files.save(projectId, next, deleted).then(result => {
        persistedRef.current = filesFromList(result.files)
      }).catch(() => {})
    }, 700)
  }

  async function createFile(path: string, content = '') {
    if (!projectId || !canEdit) return
    const next = { ...files, [path]: content }
    setFiles(next)
    await api.projects.files.create(projectId, path, content)
    persistedRef.current = { ...persistedRef.current, [path]: content }
  }

  async function renameFile(from: string, to: string) {
    if (!projectId || !canEdit) return
    const next = { ...files }
    next[to] = next[from] ?? ''
    delete next[from]
    setFiles(next)
    await api.projects.files.rename(projectId, from, to)
    const persisted = { ...persistedRef.current }
    persisted[to] = persisted[from] ?? next[to]
    delete persisted[from]
    persistedRef.current = persisted
  }

  async function deleteFile(path: string) {
    if (!projectId || !canEdit) return
    const next = { ...files }
    delete next[path]
    persist(next, [path])
    await api.projects.files.remove(projectId, path).catch(() => {})
  }

  async function commit(message: string) {
    if (!projectId || !canEdit) return
    setCommitting(true)
    try {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current)
        saveTimer.current = null
        await api.projects.files.save(projectId, files)
      }
      const result = await api.projects.commits.create(projectId, message)
      committedRef.current = result.commit.files || files
      persistedRef.current = { ...files }
      setCommits(current => [result.commit, ...current])
    } finally {
      setCommitting(false)
    }
  }

  async function viewCommit(next: ProjectCommit | null) {
    if (!projectId || !next) {
      setViewingCommit(null)
      setViewingFiles(null)
      return
    }
    const result = await api.projects.commits.get(projectId, next.id)
    setViewingCommit(result.commit)
    setViewingFiles(result.commit.files || {})
  }

  async function restoreCommit(next: ProjectCommit) {
    if (!projectId || !canEdit) return {}
    const result = await api.projects.commits.restore(projectId, next.id)
    const map = filesFromList(result.files)
    persistedRef.current = map
    committedRef.current = map
    setFiles(map)
    setViewingCommit(null)
    setViewingFiles(null)
    return map
  }

  const visibleFiles = viewingFiles ?? files
  const dirtyPaths = Object.keys(files).filter(path => files[path] !== persistedRef.current[path])
  const uncommitted = JSON.stringify(files) !== JSON.stringify(committedRef.current)

  return {
    files: visibleFiles,
    workingFiles: files,
    commits,
    ready,
    committing,
    viewingCommit,
    dirtyPaths: viewingCommit ? [] : dirtyPaths,
    uncommitted: viewingCommit ? false : uncommitted,
    persist,
    createFile,
    renameFile,
    deleteFile,
    commit,
    viewCommit,
    restoreCommit,
    setWorkingFiles: setFiles,
  }
}

function serializeArtifact(kind: 'notebook' | 'writing' | 'spreadsheet', data: Record<string, unknown>) {
  if (kind === 'writing') return String(data.html || '')
  if (kind === 'notebook') return JSON.stringify({ cells: data.cells || [] }, null, 2)
  return JSON.stringify({ cells: data.cells || [] }, null, 2)
}

export function RepoBoundWorkspace({
  project, canEdit, kind, data, onChange, children,
}: {
  project: Project
  canEdit: boolean
  kind: 'notebook' | 'writing' | 'spreadsheet'
  data: Record<string, unknown>
  onChange: (data: Record<string, unknown>) => void
  children: React.ReactNode
}) {
  const repo = useProjectRepo(project.id, canEdit)
  const artifact = artifactPathForKind(kind)
  const [activeFile, setActiveFile] = useState(artifact)
  const seeded = useRef(false)
  const lastArtifact = useRef('')
  const persist = repo.persist
  const createFile = repo.createFile
  const workingFiles = repo.workingFiles
  const ready = repo.ready

  useEffect(() => {
    if (!ready || seeded.current || !canEdit) return
    seeded.current = true
    const serialized = serializeArtifact(kind, data)
    lastArtifact.current = serialized
    if (workingFiles[artifact] === undefined) {
      void createFile(artifact, serialized).catch(() => persist({ ...workingFiles, [artifact]: serialized }))
    }
  }, [ready, canEdit, artifact, kind, data, workingFiles, createFile, persist])

  useEffect(() => {
    if (!ready || !canEdit || repo.viewingCommit) return
    const serialized = serializeArtifact(kind, data)
    if (lastArtifact.current === serialized) return
    lastArtifact.current = serialized
    persist({ ...workingFiles, [artifact]: serialized })
  }, [data, artifact, canEdit, kind, ready, persist, workingFiles, repo.viewingCommit])

  const files = repo.files
  const selected = files[activeFile] !== undefined ? activeFile : Object.keys(files)[0] || ''
  const showNative = !selected || selected === artifact
  const empty = Object.keys(files).length === 0

  return (
    <RepoFrame
      project={project}
      canEdit={canEdit && !repo.viewingCommit}
      files={files}
      activeFile={selected}
      dirtyPaths={repo.dirtyPaths}
      uncommitted={repo.uncommitted}
      commits={repo.commits}
      viewingCommit={repo.viewingCommit}
      committing={repo.committing}
      nativeLabel={`${kind} repository`}
      onOpenFile={setActiveFile}
      onCreateFile={(path, content) => { void repo.createFile(path, content); setActiveFile(path) }}
      onRenameFile={(from, to) => { void repo.renameFile(from, to); if (activeFile === from) setActiveFile(to) }}
      onDeleteFile={path => { void repo.deleteFile(path); if (activeFile === path) setActiveFile(artifact) }}
      onCommit={message => void repo.commit(message)}
      onViewCommit={commit => void repo.viewCommit(commit)}
      onRestoreCommit={commit => void repo.restoreCommit(commit)}
    >
      {empty ? (
        <RepoEmptyState
          onAddFile={() => {
            const path = window.prompt('File name, including extension', artifact)?.trim()
            if (path && isValidRepoPath(path)) {
              void repo.createFile(path, path.toLowerCase() === 'readme.md' ? README_STARTER : '')
              setActiveFile(path)
            }
          }}
          onAddReadme={() => { void repo.createFile('README.md', README_STARTER); setActiveFile('README.md') }}
          onCommit={() => void repo.commit('Initial commit')}
          canEdit={canEdit}
        />
      ) : showNative ? children : (
        <div className="repo-file-editor">
          <div className="repo-file-meta"><FileCode2 size={13} /><span>{selected}</span></div>
          <div className="code-monaco">
            <Editor
              language={languageForFile(selected)}
              value={files[selected] || ''}
              onChange={next => {
                if (!canEdit || repo.viewingCommit) return
                const nextValue = next || ''
                persist({ ...workingFiles, [selected]: nextValue })
                if (selected === artifact && kind === 'writing') onChange({ ...data, html: nextValue })
              }}
              theme="vs-dark"
              options={{ automaticLayout: true, minimap: { enabled: false }, fontSize: 13, fontFamily: 'Fira Code, Menlo, monospace', padding: { top: 14 }, wordWrap: 'on', readOnly: !canEdit || Boolean(repo.viewingCommit) }}
            />
          </div>
        </div>
      )}
    </RepoFrame>
  )
}

export function RepoEmptyState({
  onAddFile, onAddReadme, onCommit, canEdit,
}: {
  onAddFile: () => void
  onAddReadme: () => void
  onCommit: () => void
  canEdit: boolean
}) {
  return (
    <div className="repo-empty">
      <FolderGit2 size={28} />
      <h2>Quick setup</h2>
      <p>This Project is a repository. Create a file, write a README, then make the first commit. Work stays on the server after refresh.</p>
      <div className="repo-empty-actions">
        <button type="button" onClick={onAddFile} disabled={!canEdit}><FilePlus2 size={14} /> Create a new file</button>
        <button type="button" onClick={onAddReadme} disabled={!canEdit}>Add a README</button>
        <button type="button" onClick={onCommit} disabled={!canEdit}><GitCommitHorizontal size={14} /> First commit</button>
      </div>
    </div>
  )
}

