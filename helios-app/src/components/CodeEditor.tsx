import { useCallback, useEffect, useRef, useState } from 'react'
import Editor from '@monaco-editor/react'
import { Save, Send, Sparkles, X } from 'lucide-react'
import { api } from '../api'
import type { Project } from '../api'
import { useApp } from '../store/appStore'
import { PublishModal } from './PublishModal'

interface Props {
  activeProject: Project | null
  onProjectUpdate: (project: Project) => void
}

type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error'

const EDITOR_LABEL: Partial<Record<Project['type'], string>> = {
  code: 'Code editor',
  doc: 'Writing editor',
  design: 'Design notes',
  research: 'Research log',
}

function languageFor(project: Project | null): string {
  if (!project) return 'plaintext'
  if (project.type === 'code') return 'typescript'
  if (project.type === 'doc' || project.type === 'research') return 'markdown'
  return 'plaintext'
}

export function CodeEditorView({ activeProject, onProjectUpdate }: Props) {
  const { state, dispatch } = useApp()
  const [editorContent, setEditorContent] = useState(activeProject?.content ?? '')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [saveError, setSaveError] = useState('')
  const [showPublish, setShowPublish] = useState(false)
  const [closing, setClosing] = useState(false)
  const [openingPublish, setOpeningPublish] = useState(false)

  const mountedRef = useRef(true)
  const projectRef = useRef<Project | null>(activeProject)
  const contentRef = useRef(activeProject?.content ?? '')
  const dirtyRef = useRef(false)
  const savedContentByProjectRef = useRef(new Map<number, string>())
  const pendingSaveByProjectRef = useRef(new Map<number, { content: string; token: symbol }>())
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const onProjectUpdateRef = useRef(onProjectUpdate)

  if (activeProject && !savedContentByProjectRef.current.has(activeProject.id)) {
    savedContentByProjectRef.current.set(activeProject.id, activeProject.content)
  }
  onProjectUpdateRef.current = onProjectUpdate

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
  }, [])

  const enqueueSave = useCallback((project: Project, content: string): Promise<boolean> => {
    let result = false
    const token = Symbol('project-save')
    pendingSaveByProjectRef.current.set(project.id, { content, token })

    const clearPendingSave = () => {
      if (pendingSaveByProjectRef.current.get(project.id)?.token === token) {
        pendingSaveByProjectRef.current.delete(project.id)
      }
    }

    const task = async () => {
      if (savedContentByProjectRef.current.get(project.id) === content) {
        result = true
        if (mountedRef.current && projectRef.current?.id === project.id && contentRef.current === content) {
          dirtyRef.current = false
          setSaveStatus('saved')
          setSaveError('')
        }
        clearPendingSave()
        return
      }

      if (mountedRef.current && projectRef.current?.id === project.id) {
        setSaveStatus('saving')
        setSaveError('')
      }

      try {
        const response = await api.projects.update(project.id, { content })
        savedContentByProjectRef.current.set(project.id, response.project.content)
        onProjectUpdateRef.current(response.project)
        result = true

        if (mountedRef.current && projectRef.current?.id === project.id) {
          if (contentRef.current === content) {
            dirtyRef.current = false
            setSaveStatus('saved')
          } else {
            dirtyRef.current = true
            setSaveStatus('dirty')
          }
        }
      } catch (error) {
        if (mountedRef.current && projectRef.current?.id === project.id) {
          dirtyRef.current = true
          setSaveStatus('error')
          setSaveError((error as Error).message || 'Could not save this project.')
        }
      } finally {
        clearPendingSave()
      }
    }

    const queued = saveQueueRef.current.then(task, task)
    saveQueueRef.current = queued.then(() => undefined, () => undefined)
    return queued.then(() => result)
  }, [])

  const flushLatest = useCallback(async (): Promise<boolean> => {
    clearAutosaveTimer()
    const project = projectRef.current
    if (!project) return true
    return enqueueSave(project, contentRef.current)
  }, [clearAutosaveTimer, enqueueSave])

  const scheduleAutosave = useCallback(() => {
    clearAutosaveTimer()
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null
      const project = projectRef.current
      if (project && dirtyRef.current) void enqueueSave(project, contentRef.current)
    }, 1500)
  }, [clearAutosaveTimer, enqueueSave])

  // Pick up Helios/server changes whenever the local editor has no unsaved work.
  // If the selected project changes, queue the old project's latest content first.
  useEffect(() => {
    const previousProject = projectRef.current
    const projectChanged = previousProject?.id !== activeProject?.id

    if (projectChanged) {
      clearAutosaveTimer()
      if (previousProject && dirtyRef.current) {
        void enqueueSave(previousProject, contentRef.current)
      }

      projectRef.current = activeProject
      const nextContent = activeProject?.content ?? ''
      contentRef.current = nextContent
      dirtyRef.current = false
      if (activeProject) savedContentByProjectRef.current.set(activeProject.id, nextContent)
      setEditorContent(nextContent)
      setSaveStatus('saved')
      setSaveError('')
      return
    }

    projectRef.current = activeProject
    if (activeProject && !dirtyRef.current && activeProject.content !== contentRef.current) {
      savedContentByProjectRef.current.set(activeProject.id, activeProject.content)
      contentRef.current = activeProject.content
      setEditorContent(activeProject.content)
      setSaveStatus('saved')
      setSaveError('')
    }
  }, [activeProject, clearAutosaveTimer, enqueueSave])

  // A keepalive request is the final safety net for navigation, refresh, or a
  // parent unmount that cannot await the normal serialized save queue.
  useEffect(() => {
    const savedContentByProject = savedContentByProjectRef.current
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearAutosaveTimer()

      const project = projectRef.current
      const latestContent = contentRef.current
      if (!project || savedContentByProject.get(project.id) === latestContent) return

      void fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        credentials: 'same-origin',
        keepalive: true,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: latestContent }),
      }).catch(() => {})
    }
  }, [clearAutosaveTimer])

  function handleEditorChange(value: string | undefined) {
    if (value === undefined || !projectRef.current) return
    contentRef.current = value
    setEditorContent(value)

    const projectId = projectRef.current.id
    const savedContent = savedContentByProjectRef.current.get(projectId) ?? ''
    const pendingContent = pendingSaveByProjectRef.current.get(projectId)?.content
    const isDirty = value !== savedContent || (pendingContent !== undefined && pendingContent !== value)
    dirtyRef.current = isDirty
    setSaveError('')
    setSaveStatus(isDirty ? 'dirty' : 'saved')

    if (isDirty) scheduleAutosave()
    else clearAutosaveTimer()
  }

  async function handleSave() {
    await flushLatest()
  }

  async function handleClose() {
    if (closing) return
    setClosing(true)
    const saved = await flushLatest()
    if (saved) dispatch({ type: 'CLOSE_CODE_EDITOR' })
    else setClosing(false)
  }

  async function handleOpenPublish() {
    if (!activeProject || openingPublish) return
    setOpeningPublish(true)
    const saved = await flushLatest()
    if (saved) setShowPublish(true)
    setOpeningPublish(false)
  }

  const statusText = saveStatus === 'dirty'
    ? 'Unsaved changes'
    : saveStatus === 'saving'
      ? 'Saving…'
      : saveStatus === 'error'
        ? 'Save failed'
        : 'Saved'

  return (
    <>
      <div className="flex flex-col flex-1 overflow-hidden" style={{ background: '#0d0d10' }}>
        <header className="helios-editor-header flex items-center gap-3 px-5 py-3 border-b"
          style={{ borderColor: 'var(--helios-border)', flexShrink: 0, background: 'var(--helios-surface)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--helios-accent)', color: '#fff', fontSize: 13 }} aria-hidden="true">
            {'</>'}
          </div>
          <div className="helios-editor-project flex-1 min-w-0">
            <div style={{ fontSize: 14, fontWeight: 600 }}>{activeProject?.name ?? 'No project open'}</div>
            <div style={{ fontSize: 11, color: 'var(--helios-muted)' }}>
              {activeProject
                ? `${activeProject.space || 'No space'} · ${EDITOR_LABEL[activeProject.type] ?? 'Project editor'}`
                : 'Choose a project from Home to start editing'}
            </div>
          </div>

          <span className="helios-editor-status" role="status" aria-live="polite"
            style={{ fontSize: 11, color: saveStatus === 'error' ? 'var(--helios-danger)' : 'var(--helios-muted)' }}>
            {statusText}
          </span>

          <div className="helios-editor-actions flex items-center gap-2">
            <button onClick={() => dispatch({ type: 'TOGGLE_HELIOS_PANEL' })} title="Ask Helios"
              aria-pressed={state.heliosPanelOpen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              style={{ background: state.heliosPanelOpen ? 'var(--helios-accent)' : 'var(--helios-surface2)', color: state.heliosPanelOpen ? '#fff' : 'var(--helios-accent)', border: 'none' }}>
              <Sparkles size={12} /> Helios
            </button>

            <button onClick={handleSave} disabled={!activeProject || saveStatus === 'saving' || closing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              style={{ background: 'var(--helios-success)', color: '#fff', border: 'none', opacity: (!activeProject || saveStatus === 'saving' || closing) ? 0.55 : 1 }}>
              <Save size={12} /> Save
            </button>

            <button onClick={handleOpenPublish} disabled={!activeProject || openingPublish || closing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              style={{ background: 'var(--helios-accent2)', color: '#1a1a1a', border: 'none', opacity: (!activeProject || openingPublish || closing) ? 0.55 : 1 }}>
              <Send size={12} /> {openingPublish ? 'Saving…' : 'Publish'}
            </button>

            <button onClick={handleClose} disabled={closing} aria-label="Save and close editor" title="Save and close"
              className="p-2 rounded-lg cursor-pointer flex items-center justify-center"
              style={{ background: 'var(--helios-surface2)', border: 'none', color: 'var(--helios-muted)', opacity: closing ? 0.55 : 1 }}>
              <X size={15} />
            </button>
          </div>
        </header>

        {saveError && (
          <div role="alert" className="flex items-center justify-between gap-3 px-5 py-2 border-b"
            style={{ borderColor: 'rgba(255,107,107,0.3)', background: 'rgba(255,107,107,0.08)', color: 'var(--helios-danger)', fontSize: 12 }}>
            <span>{saveError} Your changes are still in this editor.</span>
            <button onClick={handleSave} className="px-2.5 py-1 rounded-lg cursor-pointer"
              style={{ background: 'var(--helios-danger)', color: '#fff', border: 'none', fontSize: 11 }}>
              Retry save
            </button>
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          <Editor
            language={languageFor(activeProject)}
            value={activeProject ? editorContent : 'Open a project from Home to start editing.'}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              wordWrap: 'on',
              padding: { top: 16, bottom: 16 },
              fontFamily: 'Fira Code, Menlo, monospace',
              readOnly: !activeProject,
              lineNumbers: activeProject ? 'on' : 'off',
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {showPublish && activeProject && (
        <PublishModal project={activeProject} onClose={() => setShowPublish(false)} />
      )}
    </>
  )
}
