import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../store/appStore'
import { Search, Home, Compass, Users, Zap, MessageCircle, User, Code, FileText, Sparkles, Plus, Radio, FolderGit2, BookOpen, CreditCard } from 'lucide-react'
import type { NavView } from '../store/appStore'
import { NewProjectModal } from './NewProjectModal'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { HOBBIES, SUBJECTS, getMiniApp, getSpaceDefinition } from '../product/catalog'

interface Cmd {
  id: string; label: string; subtitle?: string
  icon: React.ReactNode; action: () => void; group: string; shortcut?: string
}

export function CommandPalette() {
  const { state, dispatch } = useApp()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [showNewProject, setShowNewProject] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const trapRef = useFocusTrap<HTMLDivElement>(state.commandPaletteOpen)

  useEffect(() => {
    if (state.commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setActiveIdx(0)
    }
  }, [state.commandPaletteOpen])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && state.commandPaletteOpen) dispatch({ type: 'SET_COMMAND_PALETTE', open: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, state.commandPaletteOpen])

  const NAV: Cmd[] = ([
    ['home', 'Go to Home', <Home key="home" size={15} />],
    ['explore', 'Go to Explore', <Compass key="explore" size={15} />],
    ['spaces', 'Go to Spaces', <Users key="spaces" size={15} />],
    ['lifestyle', 'Go to Lifestyle', <Zap key="lifestyle" size={15} />],
    ['live', 'Go to Live work', <Radio key="live" size={15} />],
    ['chat', 'Go to Chat Hub', <MessageCircle key="chat" size={15} />],
    ['projects', 'Go to Projects', <FolderGit2 key="projects" size={15} />],
    ['profile', 'Go to Profile', <User key="profile" size={15} />],
  ] as [NavView, string, React.ReactNode][]).map(([view, label, icon]) => ({
    id: `nav-${view}`, label, icon, group: 'Navigate',
    action: () => { dispatch({ type: 'SET_VIEW', view }); dispatch({ type: 'SET_COMMAND_PALETTE', open: false }) },
  }))

  const PROJECTS: Cmd[] = state.projects.map(p => ({
    id: `proj-${p.id}`, label: `Open "${p.name}"`, subtitle: `${getSpaceDefinition(p.space_id).name} · ${getMiniApp(p.app_kind).name}`,
    icon: p.type === 'code' ? <Code size={15} /> : <FileText size={15} />, group: 'Projects',
    action: () => { dispatch({ type: 'OPEN_CODE_EDITOR', projectId: p.id }); dispatch({ type: 'SET_COMMAND_PALETTE', open: false }) },
  }))

  const SPACES: Cmd[] = [...SUBJECTS, ...HOBBIES].map(space => ({
    id: `space-${space.id}`,
    label: `Open ${space.name} Space`,
    subtitle: `${space.kind === 'subject' ? 'Subject' : 'Hobby'} · Feed, Projects, Mini Apps and Live`,
    icon: <BookOpen size={15} />,
    group: 'Spaces',
    action: () => { dispatch({ type: 'OPEN_SPACE', spaceId: space.id }); dispatch({ type: 'SET_COMMAND_PALETTE', open: false }) },
  }))

  const ACTIONS: Cmd[] = [
    { id: 'new-project', label: 'Create new project', subtitle: 'Choose a type and name', icon: <Plus size={15} />, group: 'Actions', action: () => { dispatch({ type: 'SET_COMMAND_PALETTE', open: false }); setShowNewProject(true) } },
    { id: 'helios', label: 'Ask Helios', subtitle: 'Open AI assistant', icon: <Sparkles size={15} />, group: 'Actions', shortcut: '⌘J', action: () => { dispatch({ type: 'OPEN_HELIOS_PANEL' }); dispatch({ type: 'SET_COMMAND_PALETTE', open: false }) } },
    { id: 'profile', label: 'My profile', icon: <User size={15} />, group: 'Actions', action: () => { dispatch({ type: 'SET_VIEW', view: 'profile' }); dispatch({ type: 'SET_COMMAND_PALETTE', open: false }) } },
    { id: 'billing', label: 'Payment and billing', subtitle: 'Free option or pay with card', icon: <CreditCard size={15} />, group: 'Actions', action: () => { try { sessionStorage.setItem('helios-open-settings', 'billing') } catch {} dispatch({ type: 'SET_VIEW', view: 'profile' }); dispatch({ type: 'SET_COMMAND_PALETTE', open: false }) } },
  ]

  const all = [...ACTIONS, ...NAV, ...SPACES, ...PROJECTS]
  const q = query.toLowerCase().trim()
  const filtered = q ? all.filter(c => c.label.toLowerCase().includes(q) || c.subtitle?.toLowerCase().includes(q) || c.group.toLowerCase().includes(q)) : all

  // Reset active index when filtered results change
  useEffect(() => { setActiveIdx(0) }, [q])

  const handleInputKey = useCallback((e: React.KeyboardEvent) => {
    if (!filtered.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => {
        const next = Math.min(i + 1, filtered.length - 1)
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => {
        const next = Math.max(i - 1, 0)
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      filtered[activeIdx]?.action()
    }
  }, [filtered, activeIdx])

  const grouped: Record<string, Cmd[]> = {}
  for (const c of filtered) { if (!grouped[c.group]) grouped[c.group] = []; grouped[c.group].push(c) }

  return (
    <>
      {showNewProject && <NewProjectModal initialSpaceId={state.activeSpaceId} initialSpace={getSpaceDefinition(state.activeSpaceId).name} onClose={() => setShowNewProject(false)} />}

      {state.commandPaletteOpen && (
        <div className="fixed inset-0 flex items-start justify-center pt-24 z-40"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => dispatch({ type: 'SET_COMMAND_PALETTE', open: false })}>
          <div className="flex flex-col rounded-2xl overflow-hidden w-full shadow-2xl"
            ref={trapRef}
            style={{ maxWidth: 600, background: 'var(--helios-surface)', border: '1px solid var(--helios-border)' }}
            onClick={e => e.stopPropagation()} role="dialog" aria-label="Command palette" aria-modal="true"
            aria-describedby="cmd-instructions">
            <span id="cmd-instructions" className="sr-only">Type to filter commands. Use arrow keys to navigate, Enter to run, Escape to close.</span>
            <div className="flex items-center gap-3 px-4 py-4 border-b" style={{ borderColor: 'var(--helios-border)' }}>
              <Search size={16} style={{ color: 'var(--helios-muted)', flexShrink: 0 }} />
              <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={handleInputKey}
                placeholder="Type a command or search…"
                className="flex-1 bg-transparent outline-none"
                style={{ border: 'none', color: 'var(--helios-text)', fontSize: 15 }}
                aria-label="Command search"
                aria-autocomplete="list"
                aria-activedescendant={filtered[activeIdx] ? `cmd-item-${filtered[activeIdx].id}` : undefined}
              />
              <kbd style={{ fontSize: 11, color: 'var(--helios-muted)', background: 'var(--helios-surface2)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--helios-border)' }}>ESC</kbd>
            </div>
            <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: 420 }} role="listbox" aria-label="Commands">
              {Object.keys(grouped).length === 0 && (
                <div className="p-8 text-center" style={{ color: 'var(--helios-muted)', fontSize: 13 }}>No matching commands</div>
              )}
              {Object.entries(grouped).map(([group, cmds]) => {
                return (
                <div key={group}>
                  <div className="px-4 py-2 sticky top-0" style={{ background: 'var(--helios-surface)', fontSize: 11, fontWeight: 600, color: 'var(--helios-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{group}</div>
                  {cmds.map(cmd => {
                    const globalIdx = filtered.indexOf(cmd)
                    const isActive = globalIdx === activeIdx
                    return (
                      <button
                        key={cmd.id}
                        id={`cmd-item-${cmd.id}`}
                        ref={el => { itemRefs.current[globalIdx] = el }}
                        onClick={cmd.action}
                        onMouseEnter={() => setActiveIdx(globalIdx)}
                        role="option"
                        aria-selected={isActive}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer"
                        style={{ background: isActive ? 'var(--helios-surface2)' : 'transparent', border: 'none', outline: 'none' }}>
                        <span style={{ color: isActive ? 'var(--helios-accent)' : 'var(--helios-muted)', flexShrink: 0 }}>{cmd.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div style={{ fontSize: 14, color: 'var(--helios-text)', fontWeight: isActive ? 600 : 400 }}>{cmd.label}</div>
                          {cmd.subtitle && <div style={{ fontSize: 12, color: 'var(--helios-muted)' }}>{cmd.subtitle}</div>}
                        </div>
                        {cmd.shortcut && <kbd style={{ fontSize: 10, color: 'var(--helios-muted)', background: 'var(--helios-surface2)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--helios-border)', flexShrink: 0 }}>{cmd.shortcut}</kbd>}
                      </button>
                    )
                  })}
                </div>
              )})}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
