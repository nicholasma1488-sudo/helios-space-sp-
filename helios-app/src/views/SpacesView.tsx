import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Code, FileText, FolderOpen, Palette, Plus, Search } from 'lucide-react'
import type { Project } from '../api'
import { useApp } from '../store/appStore'
import { NewProjectModal } from '../components/NewProjectModal'
import { getMiniApp, getSpaceDefinition } from '../product/catalog'

const TYPE_ICON: Partial<Record<Project['type'], React.ReactNode>> = {
  code: <Code size={15} />,
  doc: <FileText size={15} />,
  design: <Palette size={15} />,
  research: <BookOpen size={15} />,
}

const ALL = '__all__'

export function SpacesView() {
  const { state, dispatch } = useApp()
  const [activeSpace, setActiveSpace] = useState(() => {
    // Pre-select the active space if the user has projects in it
    return ALL
  })
  const [query, setQuery] = useState('')
  const [showNewProject, setShowNewProject] = useState(false)

  const spaces = useMemo(() => {
    return [...new Set(state.projects.map(project => project.space_id).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
  }, [state.projects])

  useEffect(() => {
    // If user navigated from a Space, pre-select it
    if (state.activeSpaceId && spaces.includes(state.activeSpaceId)) {
      setActiveSpace(state.activeSpaceId)
    }
  }, [state.activeSpaceId, spaces])

  const normalizedQuery = query.trim().toLowerCase()
  const visibleProjects = state.projects.filter(project => {
    const matchesSpace = activeSpace === ALL
      || project.space_id === activeSpace
    const matchesQuery = !normalizedQuery
      || project.name.toLowerCase().includes(normalizedQuery)
      || project.type.toLowerCase().includes(normalizedQuery)
      || project.app_kind.toLowerCase().includes(normalizedQuery)
      || project.content.toLowerCase().includes(normalizedQuery)
    return matchesSpace && matchesQuery
  })

  const selectedLabel = activeSpace === ALL
    ? 'All projects'
    : getSpaceDefinition(activeSpace).name

  const initialSpaceId = activeSpace !== ALL ? activeSpace : state.activeSpaceId
  const initialSpace = getSpaceDefinition(initialSpaceId).name

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <header className="helios-pg-header px-8 pt-7 pb-4 flex items-start justify-between gap-4" style={{ flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>Projects</h1>
          <p style={{ fontSize: 13, color: 'var(--helios-muted)', margin: 0 }}>
            Durable work shared by your Mini Apps, Spaces, Feed, Chat, Live and Helios.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewProject(true)}
          className="hs-btn-fill flex-shrink-0"
        >
          <Plus size={15} /> New workspace
        </button>
      </header>

      <div className="helios-cols flex gap-6 px-8 pb-8 flex-1 overflow-hidden">
        <aside className="helios-side flex flex-col gap-3 min-h-0 overflow-hidden" style={{ flex: '0 0 240px' }} aria-label="Project Space filters">
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--helios-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Filter by Space
          </div>
          <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 min-h-0">
            <SpaceButton
              label="All projects"
              count={state.projects.length}
              active={activeSpace === ALL}
              onClick={() => setActiveSpace(ALL)}
            />
            {spaces.map(spaceId => (
              <SpaceButton
                key={spaceId}
                label={getSpaceDefinition(spaceId).name}
                count={state.projects.filter(project => project.space_id === spaceId).length}
                active={activeSpace === spaceId}
                onClick={() => setActiveSpace(spaceId)}
              />
            ))}
          </div>
        </aside>

        <section className="flex flex-col flex-1 min-w-0 overflow-hidden" aria-labelledby="space-projects-heading">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex-1 min-w-48">
              <h2 id="space-projects-heading" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{selectedLabel}</h2>
              <div style={{ fontSize: 12, color: 'var(--helios-muted)', marginTop: 2 }}>
                {visibleProjects.length} matching project{visibleProjects.length === 1 ? '' : 's'}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl px-3" style={{ width: 'min(280px, 100%)', minHeight: 44, background: 'var(--helios-surface)', border: '1px solid var(--helios-border)' }} role="search">
              <Search size={15} style={{ color: 'var(--helios-muted)' }} aria-hidden="true" />
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="Search your projects"
                aria-label="Search your projects"
                className="flex-1 bg-transparent outline-none min-w-0"
                style={{ border: 'none', color: 'var(--helios-text)', fontSize: 13 }}
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search"
                  style={{ background: 'none', border: 'none', color: 'var(--helios-muted)', cursor: 'pointer' }}>×</button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {visibleProjects.length === 0 ? (
              <div className="rounded-2xl p-10 text-center"
                style={{ background: 'var(--helios-surface)', border: '1px dashed var(--helios-border)' }}>
                <FolderOpen size={30} style={{ margin: '0 auto 12px', color: 'var(--helios-muted)' }} />
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
                  {state.projects.length === 0 ? 'No projects yet' : 'No matching projects'}
                </div>
                <p style={{ fontSize: 13, color: 'var(--helios-muted)', margin: '0 auto 16px', maxWidth: 360, lineHeight: 1.55 }}>
                  {state.projects.length === 0
                    ? 'Start from a contextual Mini App inside a Subject or Hobby Space.'
                    : 'Try another space or clear the search.'}
                </p>
                {state.projects.length === 0 && (
                  <button type="button" onClick={() => setShowNewProject(true)} className="hs-btn-fill">
                    Begin first workspace
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))' }}>
                {visibleProjects.map(project => (
                  <article key={project.id} className="rounded-2xl p-4 flex flex-col gap-3"
                    style={{ background: 'var(--helios-surface)', border: '1px solid var(--helios-border)' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--helios-accent)' }}>{TYPE_ICON[project.type] ?? <FolderOpen size={15} />}</span>
                      <span style={{ fontSize: 12, color: 'var(--helios-muted)', textTransform: 'capitalize' }}>{getMiniApp(project.app_kind).name}</span>
                      <time className="ml-auto" dateTime={project.updated_at} style={{ fontSize: 11, color: 'var(--helios-muted)' }}>
                        {new Date(project.updated_at).toLocaleDateString()}
                      </time>
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>{project.name}</h3>
                      <div style={{ fontSize: 12, color: 'var(--helios-muted)' }}>
                        {getSpaceDefinition(project.space_id).name} · {project.visibility} · {project.collaborator_role ? `Shared as ${project.collaborator_role}` : 'Owned by you'}
                      </div>
                    </div>
                    <button type="button" onClick={() => dispatch({ type: 'OPEN_CODE_EDITOR', projectId: project.id })}
                      className="hs-btn mt-auto w-full">
                      Open
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {showNewProject && (
        <NewProjectModal initialSpace={initialSpace} initialSpaceId={initialSpaceId} onClose={() => setShowNewProject(false)} />
      )}
    </div>
  )
}

function SpaceButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className="w-full flex items-center gap-2 px-3 py-2.5 text-left cursor-pointer"
      style={{ background: active ? 'color-mix(in srgb, var(--helios-solar) 12%, var(--helios-surface))' : 'var(--helios-surface)', border: `1px solid ${active ? 'var(--helios-solar)' : 'var(--helios-border)'}`, color: active ? 'var(--helios-text)' : 'var(--helios-muted)', borderRadius: 3 }}>
      <FolderOpen size={14} style={{ color: active ? 'var(--helios-solar)' : 'currentColor' }} />
      <span className="flex-1 min-w-0" style={{ fontSize: 13, fontWeight: active ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 11 }}>{count}</span>
    </button>
  )
}
