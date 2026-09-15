import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, Bookmark, Check, Code2, Compass, Gift, Grid3X3, Heart, Layers3,
  MessageCircle, Play, Radio, Repeat2, Share, Sparkles, Users,
} from 'lucide-react'
import { Logo } from './Logo'
import { InteractiveOrbitScene, type HeroPhase, type StageMode } from './InteractiveOrbitScene'
import { useT } from '../i18n'
import { LanguageSwitcher } from '../i18n/LanguageSwitcher'
import './LandingPage.css'

interface Props {
  onGetStarted: () => void
  onSignIn: () => void
}

const MODES = [
  {
    n: '01',
    icon: <Code2 size={20} />,
    title: 'Make the work visible',
    body: 'Projects, notes, designs, and research stay connected to the progress you share.',
    accent: '#4fc3f7',
  },
  {
    n: '02',
    icon: <Users size={20} />,
    title: 'A feed with a purpose',
    body: 'React, comment, save, and learn from real updates without turning the work into a performance.',
    accent: '#8576f5',
  },
  {
    n: '03',
    icon: <Grid3X3 size={20} />,
    title: 'Workspaces, not toys',
    body: 'Word, Excel, PowerPoint and OneNote open real files — the kind you can keep working in, not a scratch pad.',
    accent: '#f2b84b',
  },
]

const PRINCIPLES = [
  ['Projects first', 'Your work is the source of truth.'],
  ['Public or private', 'You choose who sees each update.'],
  ['Useful reactions', 'Appreciate, learn, and inspire.'],
  ['Workspaces', 'Apps open Word, Excel, slides and notebooks that save to Projects.'],
]

const STAGE_MODES: Array<{ id: StageMode; label: string }> = [
  { id: 'feed', label: 'Feed' },
  { id: 'project', label: 'Project' },
  { id: 'chat', label: 'Chat' },
  { id: 'live', label: 'Live' },
  { id: 'apps', label: 'Apps' },
]

export function LandingPage({ onGetStarted, onSignIn }: Props) {
  const t = useT()
  const [scrolled, setScrolled] = useState(false)
  const [transitioning, setTransitioning] = useState<'register' | 'login' | null>(null)
  const [stageMode, setStageMode] = useState<StageMode>('feed')
  const [stageInteracted, setStageInteracted] = useState(false)
  const [heroPhase, setHeroPhase] = useState<HeroPhase>('void')
  const [feedTab, setFeedTab] = useState<'foryou' | 'following'>('foryou')
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({ alex: true })
  const [activeFile, setActiveFile] = useState('HeliosSpace.tsx')
  const rootRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<HTMLElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)
  const windowRef = useRef<HTMLDivElement>(null)
  const transitionTimer = useRef<number | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (!('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.add('is-visible'))
      return
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    }, { root, threshold: 0.14, rootMargin: '0px 0px -5% 0px' })
    elements.forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => {
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current)
  }, [])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setHeroPhase('live')
      return
    }
    const timers = [
      window.setTimeout(() => setHeroPhase('push'), 1000),
      window.setTimeout(() => setHeroPhase('flanks'), 2000),
      window.setTimeout(() => setHeroPhase('live'), 3000),
    ]
    return () => timers.forEach(id => window.clearTimeout(id))
  }, [])

  function enterAuth(mode: 'register' | 'login') {
    if (transitioning) return
    setTransitioning(mode)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    transitionTimer.current = window.setTimeout(
      mode === 'register' ? onGetStarted : onSignIn,
      reduced ? 180 : 720,
    )
  }

  function scrollTo(id: string) {
    rootRef.current?.querySelector(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function selectStageMode(mode: StageMode) {
    setStageInteracted(true)
    setStageMode(mode)
  }

  function handleLandingScroll(event: React.UIEvent<HTMLDivElement>) {
    const scroller = event.currentTarget
    const scrollTop = scroller.scrollTop
    setScrolled(scrollTop > 24)
    const runway = Math.max(1, (sceneRef.current?.offsetHeight ?? 1) - scroller.clientHeight)
    const progress = Math.min(1, Math.max(0, scrollTop / runway))
    const sticky = stickyRef.current
    if (sticky) sticky.dataset.scrollProgress = progress.toFixed(4)
    sceneRef.current?.style.setProperty('--hero-scroll', progress.toFixed(4))
  }

  return (
    <div
      ref={rootRef}
      data-theme="light"
      className={'landing-v2' + (transitioning ? ' is-entering-auth intent-' + transitioning : '')}
      onScroll={handleLandingScroll}
    >
      <div className="landing-noise" aria-hidden="true" />
      <header className={'landing-nav' + (scrolled ? ' is-scrolled' : '')}>
        <button type="button" className="landing-brand-button" onClick={() => rootRef.current?.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={t('Helios Space home')}>
          <Logo size="sm" />
        </button>
        <nav aria-label={t('Landing page')}>
          <button type="button" onClick={() => scrollTo('#why-helios')}>{t('Why Helios')}</button>
          <button type="button" onClick={() => scrollTo('#connected-modes')}>{t('Product')}</button>
          <button type="button" onClick={() => scrollTo('#mini-app-preview')}>{t('Apps')}</button>
          <button type="button" onClick={() => scrollTo('#pricing')}>{t('Pricing')}</button>
        </nav>
        <div className="landing-nav-actions">
          <button type="button" onClick={() => enterAuth('login')}>{t('Sign in')}</button>
          <button type="button" onClick={() => enterAuth('register')} className="landing-nav-primary">
            {t('Create your space')} <ArrowRight size={13} />
          </button>
          <LanguageSwitcher compact />
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
              windowRef={windowRef}
              onInteract={() => setStageInteracted(true)}
            >
              <div ref={windowRef} className="hero-app-window is-css3d" onPointerDown={() => setStageInteracted(true)}>
                <div className="hero-app-titlebar">
                  <i /><i /><i />
                  <strong>Helios Space</strong>
                  <nav aria-label={t('Product views')}>
                    {STAGE_MODES.map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        className={stageMode === mode.id ? 'is-on' : ''}
                        data-testid={`stage-mode-${mode.id}`}
                        onClick={() => selectStageMode(mode.id)}
                      >
                        {t(mode.label)}
                      </button>
                    ))}
                  </nav>
                </div>
                <div className="hero-app-body">
                  <HeroPageScreen
                    page={stageMode}
                    feedTab={feedTab}
                    onFeedTab={tab => { setStageInteracted(true); setFeedTab(tab) }}
                    likedPosts={likedPosts}
                    onLike={id => {
                      setStageInteracted(true)
                      setLikedPosts(current => ({ ...current, [id]: !current[id] }))
                    }}
                    activeFile={activeFile}
                    onFile={file => { setStageInteracted(true); setActiveFile(file) }}
                  />
                </div>
              </div>
            </InteractiveOrbitScene>
            <div className="hero-copy-layer">
              <span className="landing-eyebrow"><Sparkles size={14} /> HELIOS SPACE</span>
              <h1>
                {t('The social OS')}
                <span>{t('for real work.')}</span>
              </h1>
              <p>{t('Scroll to fly into the product. Click inside to use it.')}</p>
              <div className="landing-hero-actions">
                <button
                  type="button"
                  className="landing-primary-cta"
                  onClick={() => enterAuth('register')}
                  data-testid="landing-create-account"
                >
                  <span>{t('Create your space')}</span><ArrowRight size={16} />
                </button>
                <button type="button" className="landing-play-cta" onClick={() => scrollTo('#connected-modes')}>
                  <i><Play size={13} fill="currentColor" /></i><span>{t('See how it connects')}</span>
                </button>
              </div>
            </div>
            <p className="stage-interaction-hint">
              {stageInteracted ? t('You’re inside Helios') : t('Scroll forward · the camera enters Helios')}
            </p>
            <button type="button" className="landing-scroll-cue" onClick={() => scrollTo('#why-helios')}>
              <span>{t('Scroll to enter')}</span><i />
            </button>
          </div>
        </section>

        <section className="landing-principles" id="why-helios" data-reveal>
          <div className="landing-section-label"><span>01</span> {t('WHY HELIOS')}</div>
          <div className="principles-heading">
            <h2>{t('Social should move the work forward.')}</h2>
            <p>{t('A familiar feed, rebuilt around progress instead of endless consumption.')}</p>
          </div>
          <div className="principles-grid">
            {PRINCIPLES.map((principle, index) => (
              <article key={principle[0]} style={{ '--principle-delay': String(index * 70) + 'ms' } as React.CSSProperties}>
                <span>0{index + 1}</span>
                <strong>{t(principle[0])}</strong>
                <p>{t(principle[1])}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-connected" id="connected-modes">
          <div className="connected-intro" data-reveal>
            <div className="landing-section-label"><span>02</span> {t('ONE CONNECTED SPACE')}</div>
            <h2>{t('Move through the day.')}<br />{t('Keep the context.')}</h2>
            <p>{t('Your project, the update it became, and the tool that helped you finish it remain part of the same story.')}</p>
          </div>

          <div className="connected-modes">
            {MODES.map((mode, index) => (
              <article
                key={mode.n}
                className="connected-mode"
                data-reveal
                style={{ '--mode-color': mode.accent } as React.CSSProperties}
              >
                <div className="mode-visual">
                  {index === 0 && <ProjectModeVisual />}
                  {index === 1 && <SocialModeVisual />}
                  {index === 2 && <AppsModeVisual />}
                </div>
                <div className="mode-copy">
                  <span>{mode.n} / {mode.icon} {t('CONNECT')}</span>
                  <h3>{t(mode.title)}</h3>
                  <p>{t(mode.body)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-mini-app-band" id="mini-app-preview" data-reveal>
          <div className="mini-band-orbit" aria-hidden="true"><Grid3X3 size={30} /></div>
          <div>
            <span>{t('CREATE SUITE')}</span>
            <h2>{t('Docs, Sheets, Slides, Code.')}<br />{t('Make something, then share it in Space.')}</h2>
          </div>
          <div className="mini-band-list">
            <span><MessageCircle size={15} /> {t('Docs')}</span>
            <span><Compass size={15} /> {t('Sheets')}</span>
            <span><Layers3 size={15} /> {t('Slides')}</span>
            <span><Code2 size={15} /> {t('Code')}</span>
          </div>
        </section>

        <section className="landing-pricing" id="pricing">
          <div className="pricing-intro" data-reveal>
            <div className="landing-section-label"><span>03</span> {t('FREE')}</div>
            <h2>{t('One Helios.')}<br />{t('Completely free.')}</h2>
            <p>{t('No plans, no upgrades, no card. Create an account and use the full social collaboration space.')}</p>
          </div>
          <div className="pricing-grid">
            <article className="pricing-card is-child" data-reveal>
              <span><Gift size={15} /> {t('FREE FOREVER')}</span>
              <h3>Helios Space</h3>
              <b>$0 <small>{t('completely free')}</small></b>
              <p>{t('No plans, no upgrades. Create an account and use everything.')}</p>
              <ul>
                <li><Check size={13} /> {t('Docs, Sheets, Slides, Notebook, Code, and more')}</li>
                <li><Check size={13} /> {t('Space feed and WorkBuddy collab')}</li>
                <li><Check size={13} /> {t('Messages')}</li>
                <li><Check size={13} /> {t('Free Helios AI in your files')}</li>
                <li><Check size={13} /> {t('No card required')}</li>
              </ul>
              <button type="button" onClick={() => enterAuth('register')}>
                {t('Start free')} <ArrowRight size={15} />
              </button>
            </article>
          </div>
        </section>

        <section className="landing-final-cta" data-reveal>
          <div className="final-cta-light" aria-hidden="true" />
          <span className="landing-eyebrow"><Sparkles size={13} /> {t('YOUR SPACE STARTS QUIET')}</span>
          <h2>{t('Make one thing.')}<br />{t('Share one honest update.')}</h2>
          <p>{t('That is enough to begin an orbit.')}</p>
          <button type="button" onClick={() => enterAuth('register')}>
            {t('Start building free')} <ArrowRight size={16} />
          </button>
        </section>
      </main>

      <footer className="landing-footer">
        <Logo size="sm" />
        <span>{t('Projects · Workspaces · Live work · Feed')}</span>
        <button type="button" onClick={() => enterAuth('login')}>{t('Sign in')}</button>
      </footer>

      <div className="landing-auth-portal" aria-hidden="true">
        <span><Sparkles size={28} /></span>
      </div>
      {transitioning && (
        <div className="landing-transition-label" aria-live="polite">
          {transitioning === 'register' ? t('Creating your doorway…') : t('Opening your space…')}
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
  activeFile = 'HeliosSpace.tsx',
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
  const t = useT()
  return (
    <div className="hero-feed-ui">
      <header className="hero-feed-top">
        <strong>{t('Home')}</strong>
        <nav>
          <button type="button" className={tab === 'foryou' ? 'is-on' : ''} onClick={() => onTab?.('foryou')}>{t('For you')}</button>
          <button type="button" className={tab === 'following' ? 'is-on' : ''} onClick={() => onTab?.('following')}>{t('Following')}</button>
        </nav>
      </header>
      <div className="hero-tweet compose">
        <b>DF</b>
        <div>
          <p className="hero-compose-copy">{t('What’s happening?')}</p>
          <span>{t('Post')}</span>
        </div>
      </div>
      <div className="hero-tweet">
        <b>AM</b>
        <div>
          <header><strong>Alex Morgan</strong><small>@alexm · 2m</small></header>
          <p>Shipped the orbit camera. The feed now stays readable while the scene still moves like a trailer.</p>
          <div className="hero-tweet-card"><Layers3 size={14} /> Project · Helios Space</div>
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
  const t = useT()
  const files = ['HeliosSpace.tsx', 'FeedHome.tsx', 'LiveRoom.tsx', 'chat.ts']
  return (
    <div className="hero-project-ui">
      <aside>
        <strong>{t('Files')}</strong>
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
        <header><span><Code2 size={14} /> {t('Web Code Editor')}</span><em>{activeFile}</em><b>{t('LIVE')}</b></header>
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
        <footer><i /><span>{t('Saved just now')}</span><Radio size={13} /> {t('{count} watching', { count: 12 })}</footer>
      </main>
    </div>
  )
}

function HeroChatScreen() {
  const t = useT()
  return (
    <div className="hero-chat-ui">
      <header>
        <strong>My Basketball Training</strong>
        <small>{t('Project Chat · {count} collaborators · {messages} messages', { count: 3, messages: 12 })}</small>
      </header>
      <div className="hero-chat-log">
        <p className="in"><b>Jordan</b>Can we keep the drill notes next to the clip?</p>
        <p className="out"><b>You</b>Yes — I linked File tree → session-04.md</p>
        <p className="in is-late"><b>Maya</b>Helios summary: 2 tasks, 1 Live blocker.</p>
      </div>
      <footer>{t('Message → Helios can draft the reply…')}</footer>
    </div>
  )
}

function HeroLiveScreen() {
  const t = useT()
  return (
    <div className="hero-live-ui">
      <header>
        <b>{t('LIVE')}</b>
        <strong>Watching Alex build Helios Space</strong>
        <span>{t('{count} viewers', { count: 12 })}</span>
      </header>
      <div className="hero-live-stage">
        <em className="hero-cursor">Alex</em>
        <p>{t('Editing {file} · line {line}', { file: 'HeliosSpace.tsx', line: 42 })}</p>
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
  const t = useT()
  return (
    <div className="hero-apps-ui">
      <header>{t('Apps · Word · Excel · PowerPoint · OneNote')}</header>
      <div>
        <span><MessageCircle size={18} /><strong>Word</strong><small>{t('Documents that stay saved')}</small></span>
        <span><Compass size={18} /><strong>Excel</strong><small>{t('Cells · Formulas · Charts')}</small></span>
        <span><Layers3 size={18} /><strong>PowerPoint</strong><small>{t('Slides · Present · Share')}</small></span>
        <span><Code2 size={18} /><strong>OneNote</strong><small>{t('Sections you keep adding to')}</small></span>
      </div>
    </div>
  )
}

function ProjectModeVisual() {
  const t = useT()
  return (
    <div className="mode-project-ui">
      <aside><i /><i /><i /><i /></aside>
      <main>
        <header><span>orbit-interface.tsx</span><small>{t('Saved')}</small></header>
        <div><i /><i /><i /><i /><i /><i /></div>
      </main>
      <section><Sparkles size={16} /><strong>Helios</strong><p>{t('Clarify this transition')}</p><span>{t('Thinking through the flow…')}</span></section>
    </div>
  )
}

function SocialModeVisual() {
  const t = useT()
  return (
    <div className="mode-social-ui twitter-like">
      <nav><span className="is-on">{t('For you')}</span><span>{t('Following')}</span></nav>
      <article>
        <header><span className="stage-avatar">LS</span><span><strong>Lea Stone</strong><small>@lea · 12m</small></span></header>
        <p>I stopped optimizing the plan and tested the uncomfortable assumption.</p>
        <footer><span>{t('Reply {count}', { count: 7 })}</span><span>{t('Repost {count}', { count: 3 })}</span><span>{t('Like {count}', { count: 24 })}</span></footer>
      </article>
    </div>
  )
}

function AppsModeVisual() {
  const t = useT()
  return (
    <div className="mode-apps-ui">
      <div><MessageCircle size={22} /><strong>Word</strong><small>{t('WRITE')}</small></div>
      <div><Compass size={22} /><strong>Excel</strong><small>{t('CALC')}</small></div>
      <div><Layers3 size={22} /><strong>PowerPoint</strong><small>{t('PRESENT')}</small></div>
      <div><Code2 size={22} /><strong>OneNote</strong><small>{t('NOTES')}</small></div>
    </div>
  )
}
