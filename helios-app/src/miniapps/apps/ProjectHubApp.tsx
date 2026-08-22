import { useCallback, useEffect, useState } from 'react'
import { FolderGit2, Plus, Users } from 'lucide-react'
import { api, type Collaborator, type Project } from '../../api'
import { MiniAppEmpty, MiniAppError, MiniAppLoading } from '../MiniAppStates'
import { useAccountState } from '../persistence'
import type { MiniAppProps } from '../types'

interface HubTask { id: string; text: string; done: boolean }

export default function ProjectHubApp({ accountId, onToast, onOpenProject, onCreateProject }: MiniAppProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeId, setActiveId] = useState<number | null>(null)
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('active')
  const [link, setLink] = useState('')
  const [tasks, setTasks] = useAccountState<Record<string, HubTask[]>>(accountId, 'project-hub-tasks', {})
  const [taskText, setTaskText] = useState('')

  const active = projects.find(project => project.id === activeId) ?? projects[0] ?? null
  const activeTasks = active ? (tasks[String(active.id)] ?? []) : []
  const progress = activeTasks.length ? Math.round(activeTasks.filter(task => task.done).length / activeTasks.length * 100) : 0

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await api.projects.list()
      setProjects(result.projects)
      setActiveId(current => current ?? result.projects[0]?.id ?? null)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!active) return
    const meta = (active.metadata ?? {}) as Record<string, string>
    setName(active.name)
    setDescription(meta.description ?? '')
    setStatus(meta.status ?? 'active')
    setLink(meta.link ?? '')
    let cancelled = false
    api.projects.collaborators.list(active.id)
      .then(result => { if (!cancelled) setCollaborators(result.collaborators) })
      .catch(() => { if (!cancelled) setCollaborators([]) })
    return () => { cancelled = true }
  }, [active])

  const upcoming = activeTasks.filter(task => !task.done)

  async function saveMeta() {
    if (!active) return
    try {
      const result = await api.projects.update(active.id, {
        name,
        metadata: { ...(active.metadata ?? {}), description, status, link },
      })
      setProjects(current => current.map(project => project.id === result.project.id ? result.project : project))
      onToast('Project updated', 'success')
    } catch (reason) {
      onToast((reason as Error).message, 'warning')
    }
  }

  if (loading) return <MiniAppLoading label="Loading projects" />
  if (error) return <MiniAppError message={error} onRetry={() => void load()} />

  return (
    <div className="hub-app">
      <aside>
        <button type="button" className="hub-new" onClick={onCreateProject}><Plus size={14} /> New project</button>
        {projects.map(project => (
          <button key={project.id} type="button" className={active?.id === project.id ? 'is-on' : ''} onClick={() => setActiveId(project.id)}>
            <FolderGit2 size={14} />
            <span>
              <strong>{project.name}</strong>
              <small>{project.visibility}</small>
            </span>
          </button>
        ))}
        {projects.length === 0 && <MiniAppEmpty title="No projects yet" detail="Create one to track tasks and collaborators." />}
      </aside>
      {active && (
        <section>
          <label>Name<input value={name} onChange={event => setName(event.target.value)} /></label>
          <label>Description<textarea value={description} onChange={event => setDescription(event.target.value)} /></label>
          <div className="hub-meta">
            <label>Status
              <select value={status} onChange={event => setStatus(event.target.value)}>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="done">Done</option>
              </select>
            </label>
            <label>Link<input value={link} onChange={event => setLink(event.target.value)} placeholder="https://" /></label>
          </div>
          <div className="progress-bar"><span style={{ width: progress + '%' }} /></div>
          <small>{progress}% of local tasks · {upcoming.length} open</small>
          <form onSubmit={event => {
            event.preventDefault()
            if (!taskText.trim()) return
            setTasks(current => ({
              ...current,
              [String(active.id)]: [{ id: crypto.randomUUID(), text: taskText.trim(), done: false }, ...(current[String(active.id)] ?? [])],
            }))
            setTaskText('')
          }}>
            <input value={taskText} onChange={event => setTaskText(event.target.value)} placeholder="Add a project task" />
            <button type="submit">Add</button>
          </form>
          <div className="todo-list">
            {activeTasks.map(task => (
              <article key={task.id} className={task.done ? 'is-done' : ''}>
                <button type="button" onClick={() => setTasks(current => ({
                  ...current,
                  [String(active.id)]: (current[String(active.id)] ?? []).map(item => item.id === task.id ? { ...item, done: !item.done } : item),
                }))} />
                <div><strong>{task.text}</strong></div>
              </article>
            ))}
          </div>
          <div className="hub-people">
            <Users size={14} />
            {collaborators.length ? collaborators.map(person => <span key={person.user_id}>{person.name}</span>) : <em>No collaborators yet</em>}
          </div>
          <footer>
            <button type="button" onClick={() => void saveMeta()}>Save details</button>
            <button type="button" onClick={() => onOpenProject(active.id)}>Open full workspace</button>
          </footer>
        </section>
      )}
    </div>
  )
}
