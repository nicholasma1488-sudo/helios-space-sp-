import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, Bookmark, Code2, Compass, Heart, Layers3,
  MessageCircle, Play, Radio, Repeat2, Share, Sparkles,
} from 'lucide-react'
import { Logo } from './Logo'
import { InteractiveOrbitScene, LANDING_STATIONS, type HeroPhase, type StageMode } from './InteractiveOrbitScene'
import './LandingPage.css'

interface Props {
  onGetStarted: () => void
  onSignIn: () => void
}

const STAGE_MODES: Array<{ id: StageMode; label: string }> = [
  { id: 'feed', label: 'Feed' },
  { id: 'project', label: 'Project' },
  { id: 'chat', label: 'Chat' },
  { id: 'live', label: 'Live' },
  { id: 'apps', label: 'Mini Apps' },
]

export function LandingPage({ onGetStarted, onSignIn }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [transitioning, setTransitioning] = useState<'register' | 'login' | null>(null)
  const [stageMode, setStageMode] = useState<StageMode>('feed')
  const [heroPhase, setHeroPhase] = useState<HeroPhase>('void')
  const [stationId, setStationId] = useState<StageMode>('feed')
  const [feedTab, setFeedTab] = useState<'foryou' | 'following'>('foryou')
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({ alex: true })
  const [activeFile, setActiveFile] = useState('OrbitStage.tsx')
  const rootRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const transitionTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current)
  }, [])

  useEffect(() => {
    const timers = [
      window.setTimeout(() => setHeroPhase('push'), 1000),
      window.setTimeout(() => setHeroPhase('flanks'), 2000),
      window.setTimeout(() => setHeroPhase('identity'), 3500),
      window.setTimeout(() => setHeroPhase('live'), 7000),
    ]
    return () => timers.forEach(id => window.clearTimeout(id))
  }, [])

  function skipIntro() {
    if (stickyRef.current) stickyRef.current.dataset.skipIntro = '1'
    setHeroPhase('live')
  }

  function enterAuth(mode: 'register' | 'login') {
    if (transitioning) return
    setTransitioning(mode)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    transitionTimer.current = window.setTimeout(
      mode === 'register' ? onGetStarted : onSignIn,
      reduced ? 180 : 720,
    )
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return
      event.preventDefault()
      root.scrollTop += event.deltaY * 0.32 + event.deltaX * 0.08
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [])

  function scrollToProgress(progress: number) {
    const root = rootRef.current
    const scene = sceneRef.current
    if (!root || !scene) return
    const runway = Math.max(240, scene.offsetHeight - root.clientHeight)
    root.classList.add('is-seeking')
    root.scrollTo({ top: progress * runway, behavior: 'smooth' })
    window.setTimeout(() => root.classList.remove('is-seeking'), 1400)
  }


  function selectStageMode(mode: StageMode) {
    setStageMode(mode)
  }

  function handleLandingScroll(event: React.UIEvent<HTMLDivElement>) {
    const scroller = event.currentTarget
    const scrollTop = scroller.scrollTop
    setScrolled(scrollTop > 24)
    const runway = Math.max(240, (sceneRef.current?.offsetHeight ?? 1) - scroller.clientHeight)
    const progress = Math.min(1, Math.max(0, scrollTop / runway))
    const sticky = stickyRef.current
    if (sticky) sticky.dataset.scrollProgress = progress.toFixed(4)
    sceneRef.current?.style.setProperty('--hero-scroll', progress.toFixed(4))
  }

  return (
    <div
      ref={rootRef}
      className={'landing-v2' + (transitioning ? ' is-entering-auth intent-' + transitioning : '')}
      onScroll={handleLandingScroll}
    >
      <div className="landing-noise" aria-hidden="true" />
      <header className={'landing-nav' + (scrolled ? ' is-scrolled' : '')}>
        <button type="button" className="landing-brand-button" onClick={() => rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Helios Space home">
          <Logo size="sm" />
        </button>
        <nav aria-label="Landing page">
          <button type="button" onClick={() => scrollToProgress(0.1)}>Feed</button>
          <button type="button" onClick={() => scrollToProgress(0.3)}>Project</button>
          <button type="button" onClick={() => scrollToProgress(0.9)}>Mini Apps</button>
        </nav>
        <div className="landing-nav-actions">
          <button type="button" onClick={() => enterAuth('login')}>Sign in</button>
          <button type="button" onClick={() => enterAuth('register')} className="landing-nav-primary">
            Create your space <ArrowRight size={13} />
          </button>
        </div>
      </header>

      <main>
        <section
          ref={sceneRef}
          className={`hero-scene phase-${heroPhase} stage-active-${stageMode}`}
          data-phase={heroPhase}
          data-active-mode={stageMode}
          data-testid="interactive-product-stage"
        >
          <div ref={stickyRef} className="hero-scene-sticky" data-scroll-progress="0">
            <InteractiveOrbitScene
              activeMode={stageMode}
              phase={heroPhase}
              hostRef={stickyRef}
              onInteract={() => undefined}
              onStationChange={mode => { setStageMode(mode); setStationId(mode) }}
              onSelectStation={mode => {
                setStageMode(mode)
                setStationId(mode)
                const station = LANDING_STATIONS.find(item => item.id === mode)
                if (station) scrollToProgress(station.scroll)
              }}
              windows={Object.fromEntries(STAGE_MODES.map(mode => [mode.id, (
                <div
                  key={mode.id}
                  ref={mode.id === 'feed' ? windowRef : undefined}
                  className="hero-app-window is-css3d"
                  onPointerDown={() => selectStageMode(mode.id)}
                >
                  <div className="hero-app-titlebar">
                    <i /><i /><i />
                    <strong>{mode.label}</strong>
                    <nav aria-label={`${mode.label} tools`}>
                      {STAGE_MODES.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          className={item.id === mode.id ? 'is-on' : ''}
                          data-testid={mode.id === 'feed' ? `stage-mode-${item.id}` : undefined}
                          onClick={() => {
                            selectStageMode(item.id)
                            const station = LANDING_STATIONS.find(entry => entry.id === item.id)
                            if (station) scrollToProgress(station.scroll)
                          }}
                        >
                          {item.label}
                        </button>
                      ))}
                    </nav>
                  </div>
                  <div className="hero-app-body">
                    <HeroPageScreen
                      page={mode.id}
                      compact
                      feedTab={feedTab}
                      onFeedTab={tab => setFeedTab(tab)}
                      likedPosts={likedPosts}
                      onLike={id => {
                        setLikedPosts(current => ({ ...current, [id]: !current[id] }))
                      }}
                      activeFile={activeFile}
                      onFile={file => setActiveFile(file)}
                    />
                  </div>
                </div>
              )]))}
            />
            <div className="hero-station-copy is-ready">
              <span className="landing-eyebrow"><Sparkles size={14} /> {LANDING_STATIONS.find(item => item.id === stationId)?.title}</span>
              <h1>
                {stationId === 'feed' ? <>The social OS<span>for real work.</span></> : LANDING_STATIONS.find(item => item.id === stationId)?.title}
              </h1>
              <p>{LANDING_STATIONS.find(item => item.id === stationId)?.body}</p>
              <div className="landing-hero-actions">
                <button
                  type="button"
                  className="landing-primary-cta"
                  onClick={() => enterAuth('register')}
                  data-testid="landing-create-account"
                >
                  <span>Create your space</span><ArrowRight size={16} />
                </button>
                <button type="button" className="landing-play-cta" onClick={() => scrollToProgress(Math.min(1, (LANDING_STATIONS.find(item => item.id === stationId)?.scroll ?? 0) + 0.2))}>
                  <i><Play size={13} fill="currentColor" /></i><span>Fly to the next room</span>
                </button>
              </div>
            </div>
            <button type="button" className="landing-skip-intro" onClick={skipIntro}>
              Skip approach
            </button>
            <button type="button" className="landing-scroll-cue" onClick={() => scrollToProgress(0.3)}>
              <span>Swipe to fly</span><i />
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <Logo size="sm" />
        <button type="button" onClick={() => enterAuth('login')}>Sign in</button>
      </footer>

      <div className="landing-auth-portal" aria-hidden="true">
        <span><Sparkles size={28} /></span>
      </div>
      {transitioning && (
        <div className="landing-transition-label" aria-live="polite">
          {transitioning === 'register' ? 'Creating your doorway…' : 'Opening your space…'}
        </div>
      )}
    </div>
  )
}

function HeroPageScreen({
  page,
  compact = false,
  feedTab = 'foryou',
  onFeedTab,
  likedPosts = {},
  onLike,
  activeFile = 'OrbitStage.tsx',
  onFile,
}: {
  page: StageMode
  compact?: boolean
  feedTab?: 'foryou' | 'following'
  onFeedTab?: (tab: 'foryou' | 'following') => void
  likedPosts?: Record<string, boolean>
  onLike?: (id: string) => void
  activeFile?: string
  onFile?: (file: string) => void
}) {
  return (
    <div className={'hero-page-screen is-' + page + (compact ? ' is-compact' : '')} data-page={page}>
      {page === 'feed' && <HeroFeedScreen tab={feedTab} onTab={onFeedTab} likedPosts={likedPosts} onLike={onLike} />}
      {page === 'project' && <HeroProjectScreen activeFile={activeFile} onFile={onFile} />}
      {page === 'chat' && <HeroChatScreen />}
      {page === 'live' && <HeroLiveScreen />}
      {page === 'apps' && <HeroAppsScreen />}
    </div>
  )
}

function HeroFeedScreen({
  tab,
  onTab,
  likedPosts,
  onLike,
}: {
  tab: 'foryou' | 'following'
  onTab?: (tab: 'foryou' | 'following') => void
  likedPosts: Record<string, boolean>
  onLike?: (id: string) => void
}) {
  return (
    <div className="hero-feed-ui">
      <header className="hero-feed-top">
        <strong>Home</strong>
        <nav>
          <button type="button" className={tab === 'foryou' ? 'is-on' : ''} onClick={() => onTab?.('foryou')}>For you</button>
          <button type="button" className={tab === 'following' ? 'is-on' : ''} onClick={() => onTab?.('following')}>Following</button>
        </nav>
      </header>
      <div className="hero-tweet compose">
        <b>DF</b>
        <div>
          <p className="hero-compose-copy">What’s happening?</p>
          <span>Post</span>
        </div>
      </div>
      <div className="hero-tweet">
        <b>AM</b>
        <div>
          <header><strong>Alex Morgan</strong><small>@alexm · 2m</small></header>
          <p>Shipped the orbit camera. The feed now stays readable while the scene still moves like a trailer.</p>
          <div className="hero-tweet-card"><Layers3 size={14} /> Project · Orbit interface</div>
          <footer>
            <span><MessageCircle size={14} /> 11</span>
            <span><Repeat2 size={14} /> 24</span>
            <button type="button" className={likedPosts.alex ? 'is-liked' : ''} onClick={() => onLike?.('alex')}>
              <Heart size={14} fill={likedPosts.alex ? 'currentColor' : 'none'} /> {likedPosts.alex ? 187 : 186}
            </button>
            <span><Bookmark size={14} /></span>
            <span><Share size={14} /></span>
          </footer>
        </div>
      </div>
      {tab === 'foryou' && (
        <div className="hero-tweet">
          <b>LS</b>
          <div>
            <header><strong>Lea Stone</strong><small>@lea · 18m</small></header>
            <p>Stopped polishing the plan and tested the uncomfortable assumption.</p>
            <footer>
              <span><MessageCircle size={14} /> 8</span>
              <span><Repeat2 size={14} /> 3</span>
              <button type="button" className={likedPosts.lea ? 'is-liked' : ''} onClick={() => onLike?.('lea')}>
                <Heart size={14} fill={likedPosts.lea ? 'currentColor' : 'none'} /> {likedPosts.lea ? 42 : 41}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}

function HeroProjectScreen({
  activeFile,
  onFile,
}: {
  activeFile: string
  onFile?: (file: string) => void
}) {
  const files = ['OrbitStage.tsx', 'FeedHome.tsx', 'LiveRoom.tsx', 'chat.ts']
  return (
    <div className="hero-project-ui">
      <aside>
        <strong>Files</strong>
        {files.map(file => (
          <button
            key={file}
            type="button"
            className={activeFile === file ? 'is-active' : ''}
            onClick={() => onFile?.(file)}
          >
            {file}
          </button>
        ))}
      </aside>
      <main>
        <header><span><Code2 size={14} /> Web Code Editor</span><em>{activeFile}</em><b>LIVE</b></header>
        <pre>
          <code>
            <span className="ln">1</span><span className="kw">export function</span> HeliosSpace() {'{\n'}
            <span className="ln">2</span>{'  '}<span className="kw">return</span> {'(\n'}
            <span className="ln">3</span>{'    '}&lt;<span className="tg">Feed</span> /&gt;{'\n'}
            <span className="ln">4</span>{'    '}&lt;<span className="tg">ProjectChat</span> /&gt;{'\n'}
            <span className="ln">5</span>{'    '}&lt;<span className="tg">GoLive</span> /&gt;{'\n'}
            <span className="ln">6</span>{'  )\n'}
            <span className="ln">7</span>{'}'}<i className="hero-caret" />
          </code>
        </pre>
        <footer><i /><span>Saved just now</span><Radio size={13} /> 12 watching</footer>
      </main>
    </div>
  )
}

function HeroChatScreen() {
  return (
    <div className="hero-chat-ui">
      <header>
        <strong>My Basketball Training</strong>
        <small>Project Chat · 3 collaborators · 12 messages</small>
      </header>
      <div className="hero-chat-log">
        <p className="in"><b>Jordan</b>Can we keep the drill notes next to the clip?</p>
        <p className="out"><b>You</b>Yes — I linked File tree → session-04.md</p>
        <p className="in is-late"><b>Maya</b>Helios summary: 2 tasks, 1 Live blocker.</p>
      </div>
      <footer>Message → Helios can draft the reply…</footer>
    </div>
  )
}

function HeroLiveScreen() {
  return (
    <div className="hero-live-ui">
      <header>
        <b>LIVE</b>
        <strong>Watching Alex build Orbit interface</strong>
        <span>12 viewers</span>
      </header>
      <div className="hero-live-stage">
        <em className="hero-cursor">Alex</em>
        <p>Editing <b>OrbitStage.tsx</b> · line 42</p>
        <div className="hero-live-bar" />
      </div>
      <ul>
        <li><b>Lea</b> Keep the headline sharp, drop the blur.</li>
        <li className="is-late"><b>Sam</b> Camera travel feels right now.</li>
      </ul>
    </div>
  )
}

function HeroAppsScreen() {
  return (
    <div className="hero-apps-ui">
      <header>Mini Apps · bound to this Project</header>
      <div>
        <span><Code2 size={18} /><strong>Web Code Editor</strong><small>Edit · Preview · Go Live</small></span>
        <span><Layers3 size={18} /><strong>Lab Notebook</strong><small>Cells · Results · Share</small></span>
        <span><Compass size={18} /><strong>Data Visualization</strong><small>Tables · Charts · Save</small></span>
        <span><MessageCircle size={18} /><strong>Writing Studio</strong><small>Draft · Comments · Live</small></span>
      </div>
    </div>
  )
}

