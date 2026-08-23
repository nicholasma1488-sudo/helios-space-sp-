import { useMemo, useState } from 'react'
import { FolderGit2, LayoutGrid, PenLine, Radio, Sparkles } from 'lucide-react'
import { NewProjectModal } from '../components/NewProjectModal'
import { AnimatedButton, GlassPanel, SpaceBackground } from '../components/ui/primitives'
import { getSpaceDefinition } from '../product/catalog'
import { useApp } from '../store/appStore'
import './CreateView.css'

export function CreateView() {
  const { state, dispatch } = useApp()
  const space = getSpaceDefinition(state.activeSpaceId)
  const [showProject, setShowProject] = useState(false)
  const recent = useMemo(
    () => [...state.projects].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 4),
    [state.projects],
  )

  return (
    <div className="os-page create-page">
      <SpaceBackground />
      {showProject && (
        <NewProjectModal
          initialSpace={space.name}
          initialSpaceId={space.id}
          onClose={() => setShowProject(false)}
        />
      )}
      <header className="create-hero">
        <span className="os-kicker"><Sparkles size={14} /> Create</span>
        <h1 className="os-title">Start something that can be shared.</h1>
        <p className="os-lede">Projects, posts, mini apps, and live sessions all stay connected inside Helios Space.</p>
      </header>
      <div className="create-grid">
        <button type="button" className="create-tile" onClick={() => setShowProject(true)}>
          <FolderGit2 size={22} />
          <strong>New project</strong>
          <span>Code, writing, art, labs, and more — with files, comments, and Go Live.</span>
        </button>
        <button type="button" className="create-tile" onClick={() => dispatch({ type: 'SET_VIEW', view: 'lifestyle' })}>
          <PenLine size={22} />
          <strong>Share progress</strong>
          <span>Post text, images, code, or a project preview to the public feed.</span>
        </button>
        <button type="button" className="create-tile" onClick={() => dispatch({ type: 'SET_VIEW', view: 'miniapps' })}>
          <LayoutGrid size={22} />
          <strong>Open a Mini App</strong>
          <span>Calculators, editors, timers, and canvases that actually work.</span>
        </button>
        <button type="button" className="create-tile" onClick={() => dispatch({ type: 'SET_VIEW', view: 'live' })}>
          <Radio size={22} />
          <strong>Go Live</strong>
          <span>Open a project workspace and start a real-time session. Presence uses server-sent events — not a fake socket.</span>
        </button>
      </div>
      <GlassPanel className="create-recent">
        <header>
          <div>
            <span className="os-kicker">Resume</span>
            <h2>Continue a project</h2>
          </div>
          <AnimatedButton onClick={() => dispatch({ type: 'SET_VIEW', view: 'projects' })}>All projects</AnimatedButton>
        </header>
        <div>
          {recent.map(project => (
            <button
              key={project.id}
              type="button"
              onClick={() => {
                dispatch({ type: 'SET_ACTIVE_SUBJECT', subjectId: project.space_id })
                dispatch({ type: 'OPEN_CODE_EDITOR', projectId: project.id })
              }}
            >
              <strong>{project.name}</strong>
              <span>{getSpaceDefinition(project.space_id).name} · {project.visibility}</span>
            </button>
          ))}
          {recent.length === 0 && <p>No projects yet. Create one above.</p>}
        </div>
      </GlassPanel>
    </div>
  )
}
