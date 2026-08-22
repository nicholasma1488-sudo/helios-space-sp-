import { BookOpen, ChevronRight, GraduationCap } from 'lucide-react'
import { LEARNING_SUBJECTS, getUtilityMiniApp, requestOpenMiniApp } from '../miniapps'
import { MiniAppIcon } from '../miniapps/MiniAppIcon'
import { useApp } from '../store/appStore'
import './LearnView.css'

export function LearnView() {
  const { dispatch } = useApp()

  return (
    <div className="learn-page">
      <header>
        <span><GraduationCap size={14} /> LEARNING SPACE</span>
        <h1>Study with the tools already in Helios.</h1>
        <p>Each subject opens the relevant Mini Apps and the matching Space. Nothing here is a dead end.</p>
      </header>
      <div className="learn-grid">
        {LEARNING_SUBJECTS.map(subject => (
          <article key={subject.id} style={{ '--learn-accent': subject.accent } as React.CSSProperties}>
            <small>{subject.name.toUpperCase()}</small>
            <h2>{subject.name}</h2>
            <p>{subject.description}</p>
            <div className="learn-apps">
              {subject.apps.map(id => {
                const app = getUtilityMiniApp(id)
                if (!app) return null
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      requestOpenMiniApp(id)
                      dispatch({ type: 'SET_VIEW', view: 'apps' })
                    }}
                  >
                    <i style={{ color: app.accent }}><MiniAppIcon name={app.icon} /></i>
                    <span>{app.name}</span>
                  </button>
                )
              })}
            </div>
            <button type="button" className="learn-space" onClick={() => dispatch({ type: 'OPEN_SPACE', spaceId: subject.spaceId })}>
              <BookOpen size={14} /> Open {subject.name} Space <ChevronRight size={14} />
            </button>
          </article>
        ))}
      </div>
    </div>
  )
}
