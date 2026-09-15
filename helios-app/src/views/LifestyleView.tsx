import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AppWindow, Bookmark, ChevronDown, FileText, Filter, FolderGit2, Globe2, Heart, Lock, MessageCircle, MoreHorizontal, PenLine, Plus, Search, Send, Share, Sparkles, Trash2, UserPlus, Users, X, Zap, Image as ImageIcon,
} from 'lucide-react'
import type { Comment, Post, User } from '../api'
import { api, type LiveSession } from '../api'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { useApp } from '../store/appStore'
import { getLocale, t, useT } from '../i18n'
import { getMiniApp } from '../product/catalog'
import { openCreatorProfile, openLiveSession, openProjectWorkspace } from '../product/flow'
import './LifestyleView.css'

const CATEGORIES = [
  { id: 'all', label: 'All', icon: <Sparkles size={14} />, color: '#c96442' },
  { id: 'reflection', label: 'Updates', icon: <PenLine size={14} />, color: '#5b8def' },
  { id: 'activity', label: 'Go Live', icon: <Zap size={14} />, color: '#3d8b6e' },
]


const REACTIONS = [
  { emoji: '👍', label: 'Like', color: '#68b7ff' },
  { emoji: '❤️', label: 'Love', color: '#ff6b7f' },
  { emoji: '🙌', label: 'Appreciate', color: '#f2b84b' },
  { emoji: '💡', label: 'Learned', color: '#ffd681' },
  { emoji: '✨', label: 'Inspired', color: '#b794ff' },
  { emoji: '🔥', label: 'Fire', color: '#ff9b6a' },
]

interface Props { currentUser: User }

export function LifestyleView({ currentUser }: Props) {
  const { state, dispatch } = useApp()
  const t = useT()
  const [posts, setPosts] = useState<Post[]>([])
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [savedOnly, setSavedOnly] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [postText, setPostText] = useState('')
  const [postCategory, setPostCategory] = useState('reflection')
  const [audience, setAudience] = useState<'public' | 'private'>('public')
  const [linkedProjectId, setLinkedProjectId] = useState<number | null>(null)
  const [postKind, setPostKind] = useState<'text' | 'project' | 'live'>('text')
  const [feedTab, setFeedTab] = useState<'foryou' | 'following'>('foryou')
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([])
  const [linkedLiveId, setLinkedLiveId] = useState<number | null>(null)
  const [mediaData, setMediaData] = useState('')
  const [mediaName, setMediaName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [busyPost, setBusyPost] = useState<number | null>(null)
  const [friendPending, setFriendPending] = useState<Record<number, boolean>>({})
  const [friendBusyUser, setFriendBusyUser] = useState<number | null>(null)
  const [reactionPicker, setReactionPicker] = useState<number | null>(null)
  const [openComments, setOpenComments] = useState<Set<number>>(new Set())
  const [activeHighlight, setActiveHighlight] = useState<Post | null>(null)
  const requestId = useRef(0)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const mediaRef = useRef<HTMLInputElement>(null)
  const targetHandled = useRef(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 260)
    return () => window.clearTimeout(timeout)
  }, [query])

  const loadPosts = useCallback(async (cursor: number | null = null, append = false) => {
    const id = ++requestId.current
    if (append) setLoadingMore(true)
    else {
      setLoading(true)
      setLoadError('')
    }
    try {
      const result = await api.posts.list({
        limit: 12,
        cursor,
        category: categoryFilter,
        q: debouncedQuery,
        saved: savedOnly,
      })
      if (id !== requestId.current) return
      setPosts(current => {
        if (!append) return result.posts
        const known = new Set(current.map(post => post.id))
        return [...current, ...result.posts.filter(post => !known.has(post.id))]
      })
      setNextCursor(result.next_cursor)
    } catch (error) {
      if (id === requestId.current)
        setLoadError((error as Error).message || t('The feed could not be loaded.'))
    } finally {
      if (id === requestId.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [categoryFilter, debouncedQuery, savedOnly])

  useEffect(() => { void loadPosts() }, [loadPosts])

  useEffect(() => {
    let cancelled = false
    void api.live.list().then(result => {
      if (!cancelled) setLiveSessions(result.sessions || [])
    }).catch(() => {
      if (!cancelled) setLiveSessions([])
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (loading || targetHandled.current) return
    const targetId = Number(sessionStorage.getItem('helios-open-post') || 0)
    if (!targetId) return
    targetHandled.current = true
    sessionStorage.removeItem('helios-open-post')
    const reveal = (post: Post) => {
      setPosts(current => current.some(item => item.id === post.id) ? current : [post, ...current])
      window.setTimeout(() => {
        const element = document.querySelector(`[data-lifestyle-post-id="${post.id}"]`)
        element?.scrollIntoView({ behavior: state.reducedMotion ? 'auto' : 'smooth', block: 'center' })
        element?.classList.add('is-targeted')
        window.setTimeout(() => element?.classList.remove('is-targeted'), 2200)
      }, 80)
    }
    const existing = posts.find(post => post.id === targetId)
    if (existing) reveal(existing)
    else void api.posts.get(targetId).then(result => reveal(result.post)).catch(() => {})
  }, [loading, posts, state.reducedMotion])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setReactionPicker(null)
        setActiveHighlight(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!composerOpen) return
    const timeout = window.setTimeout(() => composerRef.current?.focus(), 120)
    return () => window.clearTimeout(timeout)
  }, [composerOpen])

  const timeline = useMemo(() => {
    if (feedTab === 'following') return posts.filter(post => post.author_id !== currentUser.id)
    return posts
  }, [posts, feedTab, currentUser.id])

  async function submitPost(event: React.FormEvent) {
    event.preventDefault()
    const body = postText.trim()
    if (!body || submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await api.posts.create({
        body,
        category: postCategory,
        audience,
        project_id: linkedProjectId ?? undefined,
        space_id: state.projects.find(project => project.id === linkedProjectId)?.space_id ?? state.activeSpaceId,
        post_type: postKind === 'live' ? 'live-watch' : linkedProjectId ? 'project-progress' : 'meaningful-progress',
        media_url: mediaData,
      })
      const visibleInFilter = !savedOnly &&
        (categoryFilter === 'all' || categoryFilter === result.post.category) &&
        (!debouncedQuery || result.post.body.toLowerCase().includes(debouncedQuery.toLowerCase()))
      if (visibleInFilter) setPosts(current => [result.post, ...current])
      setPostText('')
      setLinkedProjectId(null)
      setMediaData('')
      setMediaName('')
      setComposerOpen(false)
      dispatch({
        type: 'PUSH_TOAST',
        toast: {
          id: String(Date.now()),
          message: audience === 'public' ? t('Progress shared with your space') : t('Private reflection saved'),
          tone: 'success',
        },
      })
    } catch (error) {
      setSubmitError((error as Error).message || t('The update could not be saved.'))
    } finally {
      setSubmitting(false)
    }
  }

  async function chooseMedia(file: globalThis.File | undefined) {
    if (!file) return
    if (!/^(image\/(png|jpeg|webp|gif)|video\/(mp4|webm|quicktime))$/i.test(file.type)) {
      setSubmitError(t('Choose a PNG, JPEG, WebP, GIF, MP4, WebM or QuickTime file.'))
      return
    }
    if (file.size > 950_000) {
      setSubmitError(t('Photo and video uploads are limited to 950 KB in this build.'))
      return
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      setMediaData(data)
      setMediaName(file.name)
      setSubmitError('')
    } catch { setSubmitError(t('The selected media could not be read.')) }
  }

  async function openLinkedProject(projectId: number | null) {
    if (!projectId) return
    try { await openProjectWorkspace(projectId, state.projects, dispatch) }
    catch (error) { dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: (error as Error).message, tone: 'warning' } }) }
  }

  async function react(post: Post, emoji: string) {
    if (busyPost !== null) return
    setBusyPost(post.id)
    setReactionPicker(null)
    try {
      const result = await api.posts.react(post.id, emoji)
      setPosts(current => current.map(item => item.id === post.id ? result.post : item))
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: t('Reaction failed: {error}', { error: (error as Error).message }), tone: 'warning' },
      })
    } finally {
      setBusyPost(null)
    }
  }

  async function toggleSave(post: Post) {
    if (busyPost !== null) return
    setBusyPost(post.id)
    try {
      const result = await api.posts.save(post.id, !post.is_saved)
      if (savedOnly && !result.saved) {
        setPosts(current => current.filter(item => item.id !== post.id))
      } else {
        setPosts(current => current.map(item =>
          item.id === post.id ? { ...item, is_saved: result.saved } : item,
        ))
      }
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: result.saved ? t('Saved for later') : t('Removed from saved'), tone: 'info' },
      })
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: t('Save failed: {error}', { error: (error as Error).message }), tone: 'warning' },
      })
    } finally {
      setBusyPost(null)
    }
  }

  async function copyPost(post: Post) {
    try {
      await navigator.clipboard.writeText(post.body + '\n— ' + post.author_name + ' on Helios Space')
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: t('Update copied to clipboard'), tone: 'success' },
      })
    } catch {
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: t('Clipboard access was unavailable'), tone: 'warning' },
      })
    }
  }

  async function deletePost(post: Post) {
    if (!post.can_delete || !window.confirm(t('Delete this update? This cannot be undone.'))) return
    try {
      await api.posts.remove(post.id)
      setPosts(current => current.filter(item => item.id !== post.id))
      dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: t('Update deleted'), tone: 'info' } })
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: t('Delete failed: {error}', { error: (error as Error).message }), tone: 'warning' },
      })
    }
  }

  async function likePost(post: Post) {
    await react(post, '❤️')
  }

  async function addFriend(userId: number, name: string) {
    if (!userId || friendBusyUser !== null || friendPending[userId]) return
    setFriendBusyUser(userId)
    try {
      await api.friends.request({ user_id: userId })
      setFriendPending(current => ({ ...current, [userId]: true }))
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: `Friend request sent to ${name}`, tone: 'success' },
      })
    } catch (error) {
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: (error as Error).message || t('Could not send friend request'), tone: 'warning' },
      })
    } finally {
      setFriendBusyUser(null)
    }
  }

  function toggleComments(postId: number) {
    setOpenComments(current => {
      const next = new Set(current)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  function updateCommentCount(postId: number, delta: number) {
    setPosts(current => current.map(post =>
      post.id === postId ? { ...post, comment_count: Math.max(0, post.comment_count + delta) } : post,
    ))
  }

  return (
    <div className="lifestyle-view">
      <header className="lifestyle-topbar">
        <div className="lifestyle-title">
          <span className="lifestyle-title-mark"><Zap size={17} /></span>
          <div><strong>{t('Space')}</strong><small>{t('See what friends are up to, and share what you are shipping')}</small></div>
        </div>
        <label className="lifestyle-search">
          <Search size={16} />
          <span className="sr-only">{t('Search updates')}</span>
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder={t('Search')}
          />
          {query && <button type="button" onClick={() => setQuery('')} aria-label={t('Clear search')}><X size={14} /></button>}
        </label>
        <button type="button" className="lifestyle-compose-top liquid-glass-btn is-primary" onClick={() => setComposerOpen(true)}>
          <Plus size={16} /> Post
        </button>
      </header>

      <div className="lifestyle-layout">
        <aside className="lifestyle-left" aria-label={t('Lifestyle shortcuts')}>
          <button type="button" className="lifestyle-profile-shortcut" onClick={() => dispatch({ type: 'SET_VIEW', view: 'profile' })}>
            <Avatar name={currentUser.name} size="md" />
            <span><strong>{currentUser.name}</strong><small>{currentUser.handle}</small></span>
          </button>

          <nav className="lifestyle-side-nav" aria-label={t('Feed filters')}>
            <button type="button" className={!savedOnly && feedTab === 'foryou' ? 'is-active' : ''} onClick={() => { setSavedOnly(false); setFeedTab('foryou') }}>
              <Globe2 size={17} /><span>{t('For you')}</span>
            </button>
            <button type="button" className={!savedOnly && feedTab === 'following' ? 'is-active' : ''} onClick={() => { setSavedOnly(false); setFeedTab('following') }}>
              <Users size={17} /><span>{t('Buddies')}</span>
            </button>
            <button type="button" className={savedOnly ? 'is-active' : ''} onClick={() => setSavedOnly(true)}>
              <Bookmark size={17} /><span>{t('Saved')}</span>
            </button>
          </nav>
        </aside>

        <main className="lifestyle-feed twitter-feed" aria-live="polite">
          <section className="workbuddy-strip liquid-glass" aria-label={t('WorkBuddy activity')}>
            <header>
              <strong>{t('WorkBuddy')}</strong>
              <small>{t('Collaborating / just updated')}</small>
            </header>
            <div className="workbuddy-strip-row">
              <button type="button" className="workbuddy-chip is-you" onClick={() => setComposerOpen(true)}>
                <Avatar name={currentUser.name} size="sm" />
                <span>{t('Share progress')}</span>
              </button>
              {timeline.slice(0, 8).map(post => (
                <button
                  type="button"
                  key={`buddy-${post.id}`}
                  className="workbuddy-chip"
                  onClick={() => {
                    const el = document.querySelector(`[data-lifestyle-post-id="${post.id}"]`)
                    el?.scrollIntoView({ behavior: state.reducedMotion ? 'auto' : 'smooth', block: 'center' })
                  }}
                >
                  <Avatar name={post.author_name} size="sm" />
                  <span>{post.author_name.split(' ')[0]}</span>
                </button>
              ))}
              {timeline.length === 0 && (
                <button type="button" className="workbuddy-chip" onClick={() => dispatch({ type: 'SET_VIEW', view: 'chat' })}>
                  <Users size={14} />
                  <span>{t('Invite buddies')}</span>
                </button>
              )}
            </div>
          </section>

          <nav className="feed-home-tabs" aria-label={t('Feed timeline')}>
            <button type="button" className={feedTab === 'foryou' && !savedOnly ? 'is-active' : ''} onClick={() => { setSavedOnly(false); setFeedTab('foryou') }}>{t('For you')}</button>
            <button type="button" className={feedTab === 'following' && !savedOnly ? 'is-active' : ''} onClick={() => { setSavedOnly(false); setFeedTab('following') }}>{t('Buddies')}</button>
          </nav>

          <section className={'lifestyle-composer liquid-glass' + (composerOpen ? ' is-open' : '')}>
            {!composerOpen ? (
              <>
                <div className="composer-compact">
                  <Avatar name={currentUser.name} size="md" />
                  <button type="button" onClick={() => setComposerOpen(true)}>
                    {t('Share something in progress…')}
                  </button>
                </div>
                <div className="composer-quick-actions">
                  <button type="button" onClick={() => { setPostCategory('reflection'); setComposerOpen(true) }}><PenLine size={16} /> {t('Update')}</button>
                  <button type="button" onClick={() => { setPostCategory('activity'); setComposerOpen(true) }}><Zap size={16} /> {t('Go Live')}</button>
                </div>
              </>
            ) : (
              <form onSubmit={submitPost}>
                <input ref={mediaRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={event => { void chooseMedia(event.target.files?.[0]); event.currentTarget.value = '' }} />
                <header>
                  <div><Avatar name={currentUser.name} size="md" /><span><strong>{t('Create progress')}</strong><small>{audience === 'public' ? t('Visible to the community') : t('Visible only to you')}</small></span></div>
                  <button type="button" onClick={() => setComposerOpen(false)} aria-label={t('Close composer')}><X size={17} /></button>
                </header>
                <textarea
                  ref={composerRef}
                  value={postText}
                  onChange={event => setPostText(event.target.value)}
                  onKeyDown={event => {
                    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') event.currentTarget.form?.requestSubmit()
                  }}
                  maxLength={2000}
                  placeholder={t('Share something in progress…')}
                  aria-label={t('Post content')}
                />
                <div className="composer-category-row" role="group" aria-label={t('Update category')}>
                  {CATEGORIES.slice(1).map(item => (
                    <button
                      type="button"
                      key={item.id}
                      aria-pressed={postCategory === item.id}
                      onClick={() => setPostCategory(item.id)}
                      style={{ '--category-color': item.color } as React.CSSProperties}
                    >
                      {item.icon}<span>{t(item.label)}</span>
                    </button>
                  ))}
                </div>
                <div className="composer-kind-row" role="group" aria-label={t('What you are sharing')}>
                  {([['text', 'Text'], ['project', 'Work'], ['live', 'Go Live']] as const).map(([id, label]) => (
                    <button type="button" key={id} aria-pressed={postKind === id} onClick={() => setPostKind(id)}>{t(label)}</button>
                  ))}
                </div>
                <div className="composer-options">
                  <button type="button" className="composer-media-button" onClick={() => mediaRef.current?.click()}><ImageIcon size={14} /> {t('Photo / video')}</button>
                  <div className="composer-audience" role="group" aria-label={t('Post audience')}>
                    <button type="button" aria-pressed={audience === 'public'} onClick={() => setAudience('public')}>
                      <Users size={14} /> {t('Public')}
                    </button>
                    <button type="button" aria-pressed={audience === 'private'} onClick={() => setAudience('private')}>
                      <Lock size={14} /> {t('Only me')}
                    </button>
                  </div>
                  {(state.projects.length > 0 && postKind !== 'live') && (
                    <label className="composer-project">
                      <FolderGit2 size={14} />
                      <span className="sr-only">{t('Link a project')}</span>
                      <select value={linkedProjectId ?? ''} onChange={event => setLinkedProjectId(event.target.value ? Number(event.target.value) : null)}>
                        <option value="">{t('No linked project')}</option>
                        {state.projects.map(project => <option key={project.id} value={project.id}>{project.name} · {getMiniApp(project.app_kind).name}</option>)}
                      </select>
                      <ChevronDown size={13} />
                    </label>
                  )}
                  {postKind === 'live' && (
                    <label className="composer-project">
                      <Globe2 size={14} />
                      <select value={linkedLiveId ?? ''} onChange={event => {
                        const id = event.target.value ? Number(event.target.value) : null
                        setLinkedLiveId(id)
                        const session = liveSessions.find(item => item.id === id)
                        if (session) setLinkedProjectId(session.project_id)
                      }}>
                        <option value="">{t('Choose a live session')}</option>
                        {liveSessions.map(session => <option key={session.id} value={session.id}>{session.title}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                {mediaData && <div className="composer-media-preview">{mediaData.startsWith('data:video/') ? <video src={mediaData} controls /> : <img src={mediaData} alt={t('Progress upload preview')} />}<span><strong>{mediaName}</strong><small>{t('Attached to this progress post')}</small></span><button type="button" onClick={() => { setMediaData(''); setMediaName('') }} aria-label={t('Remove media')}><X size={14} /></button></div>}
                {submitError && <div className="composer-error" role="alert">{submitError}</div>}
                <footer>
                  <span>{t('{count}/2000 · ⌘ Enter to publish', { count: postText.length })}</span>
                  <button type="submit" className="liquid-glass-btn is-primary" disabled={!postText.trim() || submitting}>
                    <Send size={15} /> {submitting ? t('Posting…') : t('Post')}
                  </button>
                </footer>
              </form>
            )}
          </section>

          <section className="feed-filter-bar" aria-label={t('Feed controls')}>
            <div className="feed-filter-scroll">
              {CATEGORIES.map(item => (
                <button
                  type="button"
                  key={item.id}
                  className={categoryFilter === item.id ? 'is-active' : ''}
                  onClick={() => setCategoryFilter(item.id)}
                >
                  {item.icon}{t(item.label)}
                </button>
              ))}
            </div>
            <button type="button" className={savedOnly ? 'is-active' : ''} onClick={() => setSavedOnly(value => !value)}>
              <Filter size={14} /> {savedOnly ? t('Saved') : t('Filter')}
            </button>
          </section>

          {loading && <FeedState icon={<Sparkles size={22} />} title={t('Loading…')} detail={t('Pulling in the latest updates.')} />}
          {!loading && loadError && (
            <FeedState icon={<Zap size={22} />} title={t('Could not load updates')} detail={loadError}>
              <button type="button" className="liquid-glass-btn is-primary" onClick={() => void loadPosts()}>{t('Try again')}</button>
            </FeedState>
          )}
          {!loading && !loadError && timeline.length === 0 && (
            <FeedState
              icon={savedOnly ? <Bookmark size={22} /> : <FileText size={22} />}
              title={savedOnly ? t('Nothing saved yet') : feedTab === 'following' ? t('Your buddy feed is empty') : t('No updates yet')}
              detail={savedOnly ? t('Save an update and it will show up here.') : feedTab === 'following' ? t('Posts from others will show up here.') : t('Post your first update, or try a different filter.')}
            >
              {!savedOnly && <button type="button" onClick={() => setComposerOpen(true)}>{t('Post')}</button>}
            </FeedState>
          )}

          {!loading && !loadError && timeline.map(post => (
            <PostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              busy={busyPost === post.id}
              pickerOpen={reactionPicker === post.id}
              commentsOpen={openComments.has(post.id)}
              friendPending={Boolean(post.author_id && friendPending[post.author_id])}
              friendBusy={friendBusyUser === post.author_id}
              onTogglePicker={() => setReactionPicker(current => current === post.id ? null : post.id)}
              onReact={emoji => void react(post, emoji)}
              onLike={() => void likePost(post)}
              onAddFriend={() => {
                if (!post.author_id || post.author_id === currentUser.id) return
                void addFriend(post.author_id, post.author_name)
              }}
              onInvite={() => {
                if (post.author_id === currentUser.id) {
                  dispatch({ type: 'SET_VIEW', view: 'chat' })
                  return
                }
                sessionStorage.setItem('helios-invite-handle', post.author_handle || '')
                sessionStorage.setItem('helios-invite-name', post.author_name || '')
                dispatch({ type: 'SET_VIEW', view: 'chat' })
                dispatch({ type: 'PUSH_TOAST', toast: { id: String(Date.now()), message: `Invite ${post.author_name} to collaborate in Messages`, tone: 'success' } })
              }}
              onToggleComments={() => toggleComments(post.id)}
              onToggleSave={() => void toggleSave(post)}
              onCopy={() => void copyPost(post)}
              onDelete={() => void deletePost(post)}
              onOpenProject={() => { void openLinkedProject(post.project_id) }}
              onOpenMiniApp={() => { void openLinkedProject(post.project_id) }}
              onWatchLive={() => {
                const session = liveSessions.find(item => item.project_id === post.project_id)
                if (session) openLiveSession(session.id, dispatch)
                else dispatch({ type: 'SET_VIEW', view: 'lifestyle' })
              }}
              onOpenCreator={() => openCreatorProfile({ id: post.author_id || 0, name: post.author_name, handle: post.author_handle }, dispatch)}
              onCommentCountChange={delta => updateCommentCount(post.id, delta)}
            />
          ))}

          {!loading && !loadError && nextCursor && (
            <button
              type="button"
              className="feed-load-more"
              disabled={loadingMore}
              onClick={() => void loadPosts(nextCursor, true)}
            >
              {loadingMore ? 'Loading more…' : 'Load more progress'}
            </button>
          )}
          {!loading && !loadError && timeline.length > 0 && !nextCursor && (
            <div className="feed-end"><span>✦</span> You're all caught up.</div>
          )}
        </main>
      </div>

      {activeHighlight && <HighlightDialog post={activeHighlight} onClose={() => setActiveHighlight(null)} />}
    </div>
  )
}

function Avatar({ name, size }: { name: string; size: 'sm' | 'md' }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  return <span className={'lifestyle-avatar avatar-' + size} aria-hidden="true">{initials || '?'}</span>
}

function categoryLabel(category: string) {
  return CATEGORIES.find(item => item.id === category)?.label ?? category
}

function relativeTime(value: string) {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return t('recently')
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return t('Just now')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('{count}m ago', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('{count}h ago', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('{count}d ago', { count: days })
  return new Date(value).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' })
}

function PostCard({
  post, currentUser, busy, pickerOpen, commentsOpen, friendPending, friendBusy,
  onTogglePicker, onReact, onLike, onAddFriend, onInvite, onToggleComments, onToggleSave, onCopy, onDelete,
  onOpenProject, onOpenMiniApp, onWatchLive, onOpenCreator, onCommentCountChange,
}: {
  post: Post
  currentUser: User
  busy: boolean
  pickerOpen: boolean
  commentsOpen: boolean
  friendPending: boolean
  friendBusy: boolean
  onTogglePicker: () => void
  onReact: (emoji: string) => void
  onLike: () => void
  onAddFriend: () => void
  onInvite: () => void
  onToggleComments: () => void
  onToggleSave: () => void
  onCopy: () => void
  onDelete: () => void
  onOpenProject: () => void
  onOpenMiniApp: () => void
  onWatchLive: () => void
  onOpenCreator: () => void
  onCommentCountChange: (delta: number) => void
}) {
  const t = useT()
  const liked = post.my_reactions.includes('❤️')
  const likeCount = post.reactions?.['❤️'] || 0
  const reactionTotal = Object.values(post.reactions || {}).reduce((sum, count) => sum + count, 0)
  const showAddFriend = Boolean(post.author_id && post.author_id !== currentUser.id)

  return (
    <article className="lifestyle-post tweet-post" data-lifestyle-post-id={post.id}>
      <Avatar name={post.author_name} size="md" />
      <div className="tweet-main">
        <header className="post-header">
          <div className="post-author">
            <button type="button" className="post-author-button" onClick={onOpenCreator}>
              <strong>{post.author_name}</strong>
              <span>{post.author_handle}</span>
            </button>
            <time dateTime={post.created_at}>· {relativeTime(post.created_at)}</time>
            {post.audience === 'private' ? <Lock size={13} aria-label={t('Only visible to you')} /> : null}
          </div>
          {post.can_delete ? (
            <button type="button" className="post-more" onClick={onDelete} aria-label={t('Delete post')}><Trash2 size={15} /></button>
          ) : (
            <button type="button" className="post-more" aria-label={t('More')} disabled><MoreHorizontal size={17} /></button>
          )}
        </header>

        <p className="post-body">{post.body}</p>

        {post.media_url && (post.media_url.startsWith('data:video/') || /\.(mp4|webm|mov)(\?|$)/i.test(post.media_url)
          ? <video className="post-media" src={post.media_url} controls preload="metadata" />
          : <img className="post-media" src={post.media_url} alt="Collaboration post media" />)}

        {post.project_name && (
          <div className="post-project-row">
            <button type="button" onClick={onOpenProject} className="post-project">
              <FolderGit2 size={14} /><span>{post.post_type === 'live-replay' || post.post_type === 'live-watch' ? t('Live collab') : t('Work')}</span><strong>{post.project_name}</strong>
            </button>
            {post.project_app_kind && <button type="button" onClick={onOpenMiniApp} className="post-project"><AppWindow size={14} /><span>{t('Tool')}</span><strong>{getMiniApp(post.project_app_kind).name}</strong></button>}
            {(post.post_type === 'live-replay' || post.post_type === 'live-watch') && <button type="button" onClick={onWatchLive} className="post-project"><Globe2 size={14} /><span>{t('Watch')}</span><strong>{t('Live collab')}</strong></button>}
          </div>
        )}

        <div className="post-actions tweet-actions collab-actions">
          <button type="button" onClick={onToggleComments} aria-expanded={commentsOpen} title="Comment">
            <MessageCircle size={18} /> <span>{post.comment_count || ''}</span>
          </button>
          <button type="button" onClick={onLike} disabled={busy} aria-pressed={liked} className={liked ? 'is-liked' : ''} title="Like">
            <Heart size={18} fill={liked ? 'currentColor' : 'none'} /> <span>{likeCount || reactionTotal || ''}</span>
          </button>
          {showAddFriend && (
            <button
              type="button"
              onClick={onAddFriend}
              disabled={friendBusy || friendPending}
              className={friendPending ? 'is-friend-pending' : ''}
              title={friendPending ? 'Friend request pending' : 'Add friend'}
            >
              <UserPlus size={18} /> <span>{friendPending ? 'Pending' : 'Add friend'}</span>
            </button>
          )}
          <button type="button" onClick={onInvite} title="Invite to collaborate">
            <UserPlus size={18} /> <span>Invite</span>
          </button>
          <button type="button" onClick={onToggleSave} aria-pressed={post.is_saved} className={post.is_saved ? 'is-saved' : ''} disabled={busy} title="Save">
            <Bookmark size={18} fill={post.is_saved ? 'currentColor' : 'none'} />
          </button>
          <button type="button" onClick={onCopy} title="Copy link"><Share size={17} /></button>
          <button type="button" className="tweet-more-react" onClick={onTogglePicker} aria-haspopup="menu" aria-expanded={pickerOpen}>
            {pickerOpen ? 'Close' : 'React'}
          </button>
        </div>
        {pickerOpen && (
          <div className="reaction-picker tweet-picker" role="menu" aria-label="Choose a reaction">
            {REACTIONS.map(item => (
              <button
                key={item.emoji}
                type="button"
                role="menuitem"
                title={item.label}
                onClick={() => onReact(item.emoji)}
                className={post.my_reactions.includes(item.emoji) ? 'is-active' : ''}
              >
                <span>{item.emoji}</span><small>{item.label}</small>
              </button>
            ))}
          </div>
        )}

        {commentsOpen && (
          <CommentsSection
            postId={post.id}
            currentUser={currentUser}
            onCountChange={onCommentCountChange}
          />
        )}
      </div>
    </article>
  )
}

function CommentsSection({
  postId,
  currentUser,
  onCountChange,
}: {
  postId: number
  currentUser: User
  onCountChange: (delta: number) => void
}) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.posts.comments.list(postId)
      .then(result => { if (!cancelled) setComments(result.comments) })
      .catch(reason => { if (!cancelled) setError((reason as Error).message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [postId])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const body = draft.trim()
    if (!body || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const result = await api.posts.comments.create(postId, body)
      setComments(current => [...current, result.comment])
      setDraft('')
      onCountChange(1)
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(comment: Comment) {
    try {
      await api.posts.comments.remove(comment.id)
      setComments(current => current.filter(item => item.id !== comment.id))
      onCountChange(-1)
    } catch (reason) {
      setError((reason as Error).message)
    }
  }

  return (
    <section className="comments-section" aria-label="Comments">
      {loading && <div className="comments-loading">Loading comments…</div>}
      {!loading && comments.map(comment => (
        <article key={comment.id} className="comment-item">
          <Avatar name={comment.author_name} size="sm" />
          <div>
            <span><strong>{comment.author_name}</strong><time dateTime={comment.created_at}>{relativeTime(comment.created_at)}</time></span>
            <p>{comment.body}</p>
          </div>
          {comment.can_delete && (
            <button type="button" onClick={() => void remove(comment)} aria-label="Delete comment"><X size={13} /></button>
          )}
        </article>
      ))}
      {!loading && comments.length === 0 && <div className="comments-empty">No comments yet. Add something useful or kind.</div>}
      <form onSubmit={submit} className="comment-form">
        <Avatar name={currentUser.name} size="sm" />
        <label>
          <span className="sr-only">Write a comment</span>
          <textarea
            value={draft}
            maxLength={600}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={event => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') event.currentTarget.form?.requestSubmit()
            }}
            placeholder="Write a thoughtful comment…"
            rows={1}
          />
          <button type="submit" disabled={!draft.trim() || submitting} aria-label="Post comment"><Send size={14} /></button>
        </label>
      </form>
      {error && <div className="comments-error" role="alert">{error}</div>}
    </section>
  )
}

function FeedState({
  icon, title, detail, children,
}: {
  icon: React.ReactNode
  title: string
  detail: string
  children?: React.ReactNode
}) {
  return (
    <div className="lifestyle-feed-state">
      <span>{icon}</span><strong>{title}</strong><p>{detail}</p>{children}
    </div>
  )
}

function HighlightDialog({ post, onClose }: { post: Post; onClose: () => void }) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true)
  return (
    <div className="highlight-dialog-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className={'highlight-dialog category-' + post.category} role="dialog" aria-modal="true" aria-labelledby="highlight-dialog-title" ref={dialogRef}>
        <button type="button" onClick={onClose} className="highlight-dialog-close" aria-label="Close highlight"><X size={17} /></button>
        <div className="highlight-dialog-mark" aria-hidden="true"><Sparkles size={22} /></div>
        <span className="highlight-dialog-category">{categoryLabel(post.category)}</span>
        <h2 id="highlight-dialog-title">{post.author_name} took a step forward</h2>
        <p>{post.body}</p>
        <footer><Avatar name={post.author_name} size="sm" /><span><strong>{post.author_name}</strong><small>{post.author_handle} · {relativeTime(post.created_at)}</small></span></footer>
      </div>
    </div>
  )
}
