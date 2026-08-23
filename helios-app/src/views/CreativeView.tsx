import { useEffect, useMemo, useState } from 'react'
import { Palette } from 'lucide-react'
import { api, type Project } from '../api'
import { SpaceBackground, StatusState } from '../components/ui/primitives'
import { getMiniApp, getSpaceDefinition } from '../product/catalog'
import { useApp } from '../store/appStore'
import './CreativeView.css'

const ART_KINDS = new Set([
  'drawing', 'illustration', 'comic-studio', 'comic-maker', 'manga-studio',
  'storyboard', 'character-design', 'concept-art', 'color-study', 'zine-maker',
  'graphic-novel', 'moodboard', 'poster-design', 'whiteboard', 'ui-wireframe',
])

export function CreativeView() {
  const { state, dispatch } = useApp()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.explore()
      .then(result => { if (!cancelled) setProjects(result.projects) })
      .catch(reason => { if (!cancelled) setError((reason as Error).message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const gallery = useMemo(
    () => projects.filter(project => ART_KINDS.has(project.app_kind) || project.type === 'drawing' || project.type === 'design'),
    [projects],
  )

  async function open(project: Project) {
    if (!state.projects.some(item => item.id === project.id)) dispatch({ type: 'ADD_PROJECT', project })
    dispatch({ type: 'SET_ACTIVE_SUBJECT', subjectId: project.space_id })
    dispatch({ type: 'OPEN_CODE_EDITOR', projectId: project.id })
  }

  return (
    <div className="os-page creative-page">
      <SpaceBackground />
      <header>
        <span className="os-kicker"><Palette size={14} /> Studio</span>
        <h1 className="os-title">Drawings, comics, and experiments.</h1>
        <p className="os-lede">A quieter gallery for visual work. Motion stays subtle so the pieces can breathe.</p>
      </header>
      {loading && <StatusState kind="loading" title="Loading studio" />}
      {error && <StatusState kind="error" title="Studio could not load" detail={error} />}
      {!loading && !error && gallery.length === 0 && (
        <StatusState
          kind="empty"
          title="No public visual work yet"
          detail="Create a drawing or design project, then share it."
        />
      )}
      <div className="creative-gallery">
        {gallery.map((project, index) => (
          <button
            key={project.id}
            type="button"
            className={'creative-card delay-' + (index % 6)}
            onClick={() => void open(project)}
            style={{ '--accent': getSpaceDefinition(project.space_id).accent } as React.CSSProperties}
          >
            <b>{getMiniApp(project.app_kind).shortName}</b>
            <strong>{project.name}</strong>
            <span>{project.owner_name} · {getSpaceDefinition(project.space_id).name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
