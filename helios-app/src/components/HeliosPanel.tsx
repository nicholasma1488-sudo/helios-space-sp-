import { useState, useRef, useEffect } from 'react'
import { api } from '../api'
import type { AgentStep, AiProviderChoice, Project, UserAiSettings } from '../api'
import { useApp } from '../store/appStore'
import { createSuiteProject } from '../product/flow'
import { getSuiteApp, nextSuiteFileName, spaceForSuiteApp } from '../product/miniApps'
import {
  X, Send, Eye, Check, ChevronRight, Info, Loader, AlertTriangle, RotateCcw, Copy,
  Bot, MessageSquare, KeyRound, Sparkles, Circle, Undo2, ExternalLink,
} from 'lucide-react'

type StepStatus = 'pending' | 'running' | 'done' | 'failed' | 'undone'

interface AgentStepState {
  step: AgentStep
  status: StepStatus
  detail?: string
  undo?: () => Promise<void>
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: string
  proposal?: { label: string; cost: 'low' | 'medium' | 'high'; safety: 'safe' | 'review'; targetProjectId: number; plan: string }
  applied?: boolean
  steps?: AgentStepState[]
  finished?: boolean
  meta?: { model: string; source: 'user' | 'site'; planner?: string }
}

type PanelMode = 'agent' | 'chat'

const VIEW_LABELS: Record<'home' | 'lifestyle' | 'apps' | 'chat' | 'profile', string> = {
  home: 'Home',
  lifestyle: 'Space feed',
  apps: 'Mini Apps',
  chat: 'Messages',
  profile: 'Me / Settings',
}

const AGENT_SUGGESTIONS = [
  'Write a short essay about the solar system and share it to the Space feed',
  'Make a slide deck about photosynthesis for grade 8',
  'Create a to-do list for this week',
  '帮我做一个月度预算表格',
  'Open my messages',
]

function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value && (allowed as readonly string[]).includes(value) ? value as T : fallback
  } catch { return fallback }
}

function stepTitle(step: AgentStep): string {
  switch (step.tool) {
    case 'navigate': return `Open ${VIEW_LABELS[step.view]}`
    case 'set_theme': return `Switch to ${step.theme} theme`
    case 'create_file': return `Create ${step.app_name} file “${step.name}”`
    case 'update_file': return `Update “${step.project_name}” in ${step.app_name}`
    case 'open_file': return `Open “${step.project_name}”`
    case 'post': return 'Share a post in the Space feed'
    default: return 'Step'
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface Props {
  onClose: () => void
  activeProject?: Project | null
  onProjectContentChange?: (projectId: number, content: string) => void
  aiEnabled: boolean
  spaceId?: string
  currentView?: string
}

interface HeliosContext {
  space_id?: string
  space_name?: string
  project_id?: number
  project_name?: string
  app_kind?: string
  app_name?: string
  conversation_id?: number
  conversation_title?: string
  selected_content?: string
  current_view?: string
}

function extractCode(text: string): string | null {
  const m = text.match(/```[\w.-]*\n([\s\S]+?)```/)
  return m ? m[1].trimEnd() : null
}

function extractFilePatches(text: string): Array<{ path: string; content: string }> {
  const patches: Array<{ path: string; content: string }> = []
  const re = /```([^\n`]*)\n([\s\S]*?)```/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text))) {
    const meta = match[1].trim()
    const content = match[2].replace(/\n$/, '')
    if (!meta && !content) continue
    if (/helios-workspace-v1/.test(content) || content.trim().startsWith('{')) continue
    let path = ''
    const pathEq = meta.match(/(?:path\s*=\s*|file\s*=\s*)["']?([^\s"']+)/i)
    if (pathEq) path = pathEq[1]
    else if (meta.includes(':')) path = meta.slice(meta.indexOf(':') + 1).trim()
    else if (meta.includes('/') || /\.\w+$/.test(meta)) path = meta.replace(/^[\w+-]+\s+/, '').trim()
    if (path && /^[\w./-]+$/.test(path)) patches.push({ path, content })
  }
  return patches
}

function applyFilePatchesToWorkspace(current: string, patches: Array<{ path: string; content: string }>, fallbackAppKind = 'code') {
  let payload: { schema: string; appKind: string; data: Record<string, unknown> }
  try {
    const parsed = JSON.parse(current)
    if (parsed?.schema === 'helios-workspace-v1' && parsed.data && typeof parsed.data === 'object') {
      payload = {
        schema: 'helios-workspace-v1',
        appKind: parsed.appKind || fallbackAppKind,
        data: { ...parsed.data },
      }
    } else {
      throw new Error('not workspace')
    }
  } catch {
    payload = {
      schema: 'helios-workspace-v1',
      appKind: fallbackAppKind,
      data: { files: {}, activeFile: '', openFiles: [], terminal: [] },
    }
  }
  const files = { ...((payload.data.files as Record<string, string>) || {}) }
  for (const patch of patches) files[patch.path] = patch.content
  const active = patches[0]?.path || String(payload.data.activeFile || Object.keys(files)[0] || '')
  const openFiles = Array.from(new Set([...(Array.isArray(payload.data.openFiles) ? payload.data.openFiles as string[] : []), ...patches.map(item => item.path)]))
  payload.data = { ...payload.data, files, activeFile: active, openFiles }
  return JSON.stringify(payload)
}

function validateUpdatedContent(current: string, proposed: string) {
  try {
    const existing = JSON.parse(current)
    if (existing?.schema !== 'helios-workspace-v1') return proposed
    const next = JSON.parse(proposed)
    if (next?.schema !== 'helios-workspace-v1' || typeof next?.appKind !== 'string' || !next?.data || typeof next.data !== 'object')
      throw new Error('Helios must preserve the complete Mini App workspace structure.')
    return JSON.stringify(next)
  } catch (error) {
    if (current.trim().startsWith('{') && current.includes('helios-workspace-v1')) {
      throw error instanceof Error ? error : new Error('The proposed workspace data is invalid.')
    }
    return proposed
  }
}

function readContext(fallback: HeliosContext): HeliosContext {
  try {
    const stored = JSON.parse(sessionStorage.getItem('helios-workspace-context') || '{}')
    sessionStorage.removeItem('helios-workspace-context')
    return stored && typeof stored === 'object' ? { ...fallback, ...stored } : fallback
  } catch { return fallback }
}

// Quick actions adapt to the open project's type so suggestions feel native to
// the medium (code vs. prose vs. design vs. research) rather than generic.
const NO_PROJECT_ACTIONS = [
  'What is in this file?',
  'Do not open the file yet — tell me what it is about in plain language',
]

const QUICK_ACTIONS_BY_TYPE: Partial<Record<Project['type'], string[]>> = {
  code: [
    'Write the first draft of this project',
    'Review my code and suggest improvements',
    'Add comments and documentation',
    'Find and fix potential bugs',
    'Explain what this code does',
  ],
  doc: [
    'Write the first draft of this document',
    'Improve clarity and flow',
    'Tighten the structure and headings',
    'Proofread grammar and style',
    'Summarize the key points',
  ],
  design: [
    'Draft a design brief for this project',
    'Suggest a layout and visual hierarchy',
    'Propose an accessible color palette',
    'Critique the current direction',
    'List next design steps',
  ],
  research: [
    'Outline a reproducible research plan',
    'Draft the methodology section',
    'Suggest sources and citations to gather',
    'Summarize findings so far',
    'Identify gaps and next experiments',
  ],
}

const QUICK_ACTIONS_BY_APP: Record<string, string[]> = {
  'web-code': ['Find problems in this project code', 'Explain the selected code', 'Plan the next implementation step', 'Improve documentation and API usage'],
  writing: ['Improve this passage', 'Give paragraph-level feedback', 'Strengthen structure and citations', 'Continue this draft in my voice'],
  reader: ['Explain the selected passage', 'Create vocabulary notes', 'Summarize this chapter', 'Turn my notes into discussion questions'],
  'math-lab': ['Explain this maths work', 'Check the reasoning step by step', 'Show another solution', 'Turn this formula into an interactive graph'],
  spreadsheet: ['Analyze this spreadsheet', 'Find data quality problems', 'Suggest useful formulas', 'Explain the chart and findings'],
  'lab-notebook': ['Review the experiment method', 'Find uncontrolled variables', 'Summarize findings', 'Draft the report discussion'],
  drawing: ['Critique composition and hierarchy', 'Suggest the next visual pass', 'Create a concise art direction', 'Check accessibility and contrast'],
  'comic-studio': ['Improve panel pacing', 'Tighten dialogue', 'Suggest the next page', 'Check visual continuity'],
  presentation: ['Improve this slide', 'Tighten the narrative', 'Draft speaker notes', 'Find missing evidence'],
  'business-planner': ['Pressure-test this business idea', 'Find risky assumptions', 'Draft the next validation task', 'Summarize market feedback'],
  'project-board': ['Turn feedback into tasks', 'Prioritize the next work', 'Find blockers', 'Draft a practical project plan'],
}

export function HeliosPanel({ onClose, activeProject, onProjectContentChange, aiEnabled, spaceId, currentView }: Props) {
  const { state, dispatch } = useApp()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [editingProposal, setEditingProposal] = useState<string | null>(null)
  const [planDraft, setPlanDraft] = useState('')
  const [mode, setMode] = useState<PanelMode>(() => readStored('helios-panel-mode', ['agent', 'chat'] as const, 'agent'))
  const [modelTab, setModelTab] = useState<Exclude<AiProviderChoice, 'auto'>>(() => readStored('helios-model-tab', ['site', 'user'] as const, 'site'))
  const [userAi, setUserAi] = useState<UserAiSettings | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  // Load the user's provider on mount, whenever the My API tab is chosen, and
  // when Settings saves or removes a key (the panel stays open across views).
  useEffect(() => {
    let cancelled = false
    const refresh = () => { api.ai.get().then(result => { if (!cancelled) setUserAi(result) }).catch(() => {}) }
    refresh()
    window.addEventListener('helios-ai-settings-changed', refresh)
    return () => { cancelled = true; window.removeEventListener('helios-ai-settings-changed', refresh) }
  }, [modelTab])

  useEffect(() => { try { localStorage.setItem('helios-panel-mode', mode) } catch {} }, [mode])
  useEffect(() => { try { localStorage.setItem('helios-model-tab', modelTab) } catch {} }, [modelTab])

  const userAiReady = Boolean(userAi?.configured)
  // The site flag only knows about the administrator key; a user's own key
  // makes Helios usable even when no site default exists.
  const aiReady = modelTab === 'user' ? userAiReady : (aiEnabled || userAiReady)
  const siteModelLabel = userAi?.site_default?.model || 'Helios default'
  const userModelLabel = userAi?.configured ? `${userAi.presets?.[userAi.provider]?.label || userAi.provider} · ${userAi.model}` : 'Not set up'

  function openAiSettings() {
    try { sessionStorage.setItem('helios-open-settings', 'ai') } catch {}
    if (stateRef.current.codeEditorOpen) dispatch({ type: 'CLOSE_CODE_EDITOR' })
    dispatch({ type: 'SET_VIEW', view: 'profile' })
  }
  const [contextPacket] = useState<HeliosContext>(() => readContext({
    space_id: activeProject?.space_id ?? spaceId,
    project_id: activeProject?.id,
    project_name: activeProject?.name,
    app_kind: activeProject?.app_kind,
    current_view: currentView,
  }))
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeProjectRef = useRef(activeProject)
  const pendingHandledRef = useRef(false)
  activeProjectRef.current = activeProject

  useEffect(() => {
    const project = activeProjectRef.current
    const chars = project?.content.length ?? 0
    const status = chars > 0 ? chars + ' chars of content' : 'empty project'
    // Only (re)write the welcome while no conversation exists: the agent opens
    // files mid-run, and that must not wipe the step list the user is watching.
    setMessages(prev => prev.some(m => m.id !== 'welcome') ? prev : [{
      id: 'welcome', role: 'assistant', ts: new Date().toISOString(),
      content: project
        ? 'I have ' + project.name + ' open (' + status + '). In Agent mode I can rewrite or extend it directly; in Chat mode I prepare a preview you approve first.'
        : contextPacket.conversation_title
          ? `I have the permitted context for “${contextPacket.conversation_title}”. I can summarize it or draft replies, but I will not send anything without your approval.`
          : 'I\'m Helios, the agent for this Space. Tell me what you need — I will open the right page, create the Mini App file, fill it in, and share it if you ask. Pick the Free model or your own API above.',
    }])
  }, [activeProject?.id, contextPacket.conversation_title, contextPacket.space_id, contextPacket.space_name])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  function updateStep(msgId: string, index: number, patch: Partial<AgentStepState>) {
    setMessages(prev => prev.map(m => m.id === msgId && m.steps
      ? { ...m, steps: m.steps.map((s, i) => i === index ? { ...s, ...patch } : s) }
      : m))
  }

  // Executes one planned step against the live app: navigation and theme go
  // through the store, files and posts go through the API (server re-checks
  // permissions). `created` links follow-up steps (e.g. a post) to a new file.
  async function executeStep(
    step: AgentStep,
    created: Project | null,
    goal: string,
    report: (detail: string) => void,
  ): Promise<{ detail: string; project?: Project; undo?: () => Promise<void> }> {
    const current = stateRef.current
    const modelName = modelTab === 'user' ? (userAi?.model || 'your model') : siteModelLabel
    switch (step.tool) {
      case 'navigate': {
        if (current.codeEditorOpen) dispatch({ type: 'CLOSE_CODE_EDITOR' })
        dispatch({ type: 'SET_VIEW', view: step.view })
        return { detail: `Switched to ${VIEW_LABELS[step.view]}` }
      }
      case 'set_theme': {
        dispatch({ type: 'SET_THEME', theme: step.theme })
        return { detail: `Theme is now ${step.theme}` }
      }
      case 'create_file': {
        // Open the Mini App immediately with starter content, then let the
        // model fill it in while the user watches the page.
        const suite = getSuiteApp(step.app)
        const project = await createSuiteProject({
          name: nextSuiteFileName(step.name, current.projects, step.app),
          spaceId: suite ? spaceForSuiteApp(suite) : 'english',
          type: step.type,
          appKind: step.app,
          content: step.starter_content,
        }, dispatch)
        report(`${step.app_name} is open — ${modelName} is writing the content…`)
        try {
          const generated = await api.helios.agentContent({ kind: 'file', project_id: project.id, brief: step.brief, goal, fresh: true }, modelTab)
          if (generated.content) {
            const updated = await api.projects.update(project.id, { content: generated.content })
            dispatch({ type: 'UPDATE_PROJECT', project: updated.project })
            onProjectContentChange?.(project.id, updated.project.content)
            return { detail: generated.generated ? `“${project.name}” written by ${generated.model}` : `“${project.name}” created with a starter outline (model output was unusable)`, project: updated.project }
          }
        } catch (error) {
          return { detail: `“${project.name}” created with a starter outline — ${(error as Error).message}`, project }
        }
        return { detail: `“${project.name}” created`, project }
      }
      case 'open_file': {
        dispatch({ type: 'OPEN_CODE_EDITOR', projectId: step.project_id })
        return { detail: `Opened “${step.project_name}”` }
      }
      case 'update_file': {
        dispatch({ type: 'OPEN_CODE_EDITOR', projectId: step.project_id })
        report(`${modelName} is writing the new version…`)
        const before = (await api.projects.get(step.project_id)).project
        const generated = await api.helios.agentContent({ kind: 'file', project_id: step.project_id, brief: step.brief, goal }, modelTab)
        if (!generated.content) throw new Error('No content was generated')
        const updated = await api.projects.update(step.project_id, { content: generated.content })
        dispatch({ type: 'UPDATE_PROJECT', project: updated.project })
        onProjectContentChange?.(step.project_id, updated.project.content)
        return {
          detail: `Wrote the new version of “${step.project_name}” with ${generated.model}`,
          project: updated.project,
          undo: async () => {
            const restored = await api.projects.update(step.project_id, { content: before.content })
            dispatch({ type: 'UPDATE_PROJECT', project: restored.project })
            onProjectContentChange?.(step.project_id, restored.project.content)
          },
        }
      }
      case 'post': {
        let body = step.body
        if (!body) {
          report(`${modelName} is drafting the post…`)
          const generated = await api.helios.agentContent({ kind: 'post', brief: step.brief, goal, project_name: created?.name }, modelTab)
          body = generated.body || ''
        }
        if (!body.trim()) throw new Error('No post text was generated')
        await api.posts.create({
          body,
          category: 'reflection',
          post_type: 'progress',
          audience: 'public',
          ...(step.link_previous && created ? { project_id: created.id } : {}),
        })
        if (stateRef.current.codeEditorOpen) dispatch({ type: 'CLOSE_CODE_EDITOR' })
        dispatch({ type: 'SET_VIEW', view: 'lifestyle' })
        return { detail: `Posted: “${body.slice(0, 80)}${body.length > 80 ? '…' : ''}”` }
      }
      default:
        return { detail: 'Skipped' }
    }
  }

  async function runAgent(text: string, history: { role: 'user' | 'assistant'; content: string }[], targetProjectId?: number) {
    const plan = await api.helios.agent(text, { project_id: targetProjectId, view: currentView }, modelTab)
    if (!plan.steps.length) {
      // Nothing to do in the app: answer like a normal chat turn instead.
      await chatReply(history, targetProjectId)
      return
    }
    const msgId = (Date.now() + 1).toString()
    setMessages(prev => [...prev, {
      id: msgId,
      role: 'assistant',
      content: plan.say,
      ts: new Date().toISOString(),
      steps: plan.steps.map(step => ({ step, status: 'pending' as StepStatus })),
      meta: { model: plan.model, source: plan.source, planner: plan.planner },
    }])
    let created: Project | null = null
    for (let index = 0; index < plan.steps.length; index += 1) {
      updateStep(msgId, index, { status: 'running' })
      await sleep(350)
      try {
        const result = await executeStep(plan.steps[index], created, plan.goal || text, detail => updateStep(msgId, index, { detail }))
        if (result.project) created = result.project
        updateStep(msgId, index, { status: 'done', detail: result.detail, undo: result.undo })
      } catch (error) {
        updateStep(msgId, index, { status: 'failed', detail: (error as Error).message || 'Step failed' })
      }
    }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, finished: true } : m))
  }

  async function chatReply(history: { role: 'user' | 'assistant'; content: string }[], targetProjectId?: number) {
    const r = await api.helios.chat(history, targetProjectId, contextPacket as Record<string, unknown>, modelTab)
    const patches = extractFilePatches(r.reply)
    const code = extractCode(r.reply)
    const canPropose = Boolean(targetProjectId && (patches.length > 0 || code))
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: r.reply,
      ts: new Date().toISOString(),
      meta: { model: r.model, source: r.source },
      ...(canPropose ? {
        proposal: {
          label: patches.length > 0
            ? `Write ${patches.length} file${patches.length > 1 ? 's' : ''} into “${contextPacket.project_name || activeProject?.name || 'the Project'}”`
            : 'Modify “' + (contextPacket.project_name || activeProject?.name || 'the active Project') + '”',
          cost: 'medium' as const,
          safety: 'review' as const,
          targetProjectId: targetProjectId!,
          plan: patches.length > 0
            ? `Write files: ${patches.map(item => item.path).join(', ')}. Nothing is applied until you approve.`
            : 'Replace the current Project content with the complete reviewed version shown above. Nothing is applied until you approve.',
        },
      } : {}),
    }])
  }

  async function sendMessage(text: string, forceMode?: PanelMode) {
    if (!text.trim() || loading) return
    const runMode = forceMode ?? mode
    if (forceMode && forceMode !== mode) setMode(forceMode)
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, ts: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const history = [...messages, userMsg]
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      const targetProjectId = Number(contextPacket.project_id || activeProject?.id || 0) || undefined
      if (runMode === 'agent') await runAgent(text, history, targetProjectId)
      else await chatReply(history, targetProjectId)
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: 'Error: ' + ((err as Error).message || 'Request failed.'),
        ts: new Date().toISOString(),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }
  const sendMessageRef = useRef(sendMessage)
  sendMessageRef.current = sendMessage

  useEffect(() => {
    if (pendingHandledRef.current || !aiReady) return
    const pending = sessionStorage.getItem('helios-pending-prompt')
    if (!pending) return
    pendingHandledRef.current = true
    sessionStorage.removeItem('helios-pending-prompt')
    const timer = window.setTimeout(() => { void sendMessageRef.current(pending) }, 80)
    return () => window.clearTimeout(timer)
  }, [aiReady])

  // The Home page agent bar (and other views) can hand a goal to an already
  // open panel; it always runs in Agent mode.
  useEffect(() => {
    const onPrompt = (event: Event) => {
      const text = (event as CustomEvent<{ text?: string }>).detail?.text
      if (text) void sendMessageRef.current(text, 'agent')
    }
    window.addEventListener('helios-agent-prompt', onPrompt)
    return () => window.removeEventListener('helios-agent-prompt', onPrompt)
  }, [])

  async function undoStep(msgId: string, index: number) {
    const msg = messages.find(m => m.id === msgId)
    const target = msg?.steps?.[index]
    if (!target?.undo) return
    try {
      await target.undo()
      updateStep(msgId, index, { status: 'undone', detail: 'Restored the previous version', undo: undefined })
    } catch (error) {
      updateStep(msgId, index, { detail: 'Undo failed: ' + ((error as Error).message || 'unknown error') })
    }
  }

  async function applyProposal(msgId: string) {
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.proposal) return
    const patches = extractFilePatches(msg.content)
    const code = extractCode(msg.content)
    if (!patches.length && !code) return
    try {
      const target = activeProject?.id === msg.proposal.targetProjectId
        ? activeProject
        : (await api.projects.get(msg.proposal.targetProjectId)).project
      if (!target.can_edit) throw new Error('You do not have permission to edit this Project.')
      let content: string
      if (patches.length > 0) {
        content = applyFilePatchesToWorkspace(target.content, patches, target.app_kind || 'code')
      } else {
        content = validateUpdatedContent(target.content, code!)
      }
      const updated = await api.projects.update(target.id, { content })
      onProjectContentChange?.(target.id, updated.project.content)
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, applied: true } : m))
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === msgId
        ? { ...m, content: m.content + '\n\nError applying: ' + (err as Error).message }
        : m))
    }
  }

  function editPlan(message: Message) {
    if (!message.proposal) return
    setEditingProposal(message.id)
    setPlanDraft(message.proposal.plan)
  }

  function submitEditedPlan(message: Message) {
    const plan = planDraft.trim()
    if (!plan) return
    setEditingProposal(null)
    setMessages(prev => prev.map(item => item.id === message.id ? { ...item, proposal: undefined } : item))
    void sendMessage(`Revise your proposed Project change using this edited plan. Do not apply it; return a new complete preview for approval:\n${plan}`)
  }

  function copyContent(text: string, id: string) {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const contextChars = activeProject?.content.length ?? 0
  const contextualActions = contextPacket.conversation_id
    ? ['Summarize unread and recent messages', 'Group messages into questions, feedback, and requests', 'Draft replies without sending', 'Create tasks from this discussion']
    : QUICK_ACTIONS_BY_APP[contextPacket.app_kind || activeProject?.app_kind || '']
      ?? (activeProject ? (QUICK_ACTIONS_BY_TYPE[activeProject.type] ?? QUICK_ACTIONS_BY_TYPE.doc ?? NO_PROJECT_ACTIONS) : NO_PROJECT_ACTIONS)

  // Helper: get border color for proposal card
  const proposalBorder = (applied?: boolean) => applied ? 'var(--helios-success)' : 'var(--helios-accent)'
  const proposalHeaderBg = (applied?: boolean) => applied ? 'rgba(61,139,110,0.1)' : 'rgba(201,100,66,0.1)'
  const proposalIconColor = (applied?: boolean) => applied ? 'var(--helios-success)' : 'var(--helios-accent)'
  const proposalTextColor = (applied?: boolean) => applied ? 'var(--helios-success)' : 'var(--helios-accent)'
  const safetyBg = (s: string) => s === 'safe' ? 'var(--helios-success)' : 'var(--helios-solar)'
  const safetyColor = (s: string) => s === 'safe' ? '#fff' : 'var(--helios-surface)'

  return (
    <div className="flex flex-col border-l overflow-hidden"
      style={{ width: 360, flexShrink: 0, borderColor: 'var(--helios-border)', background: 'var(--helios-surface)' }}
      role="complementary" aria-label="Helios AI assistant">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: 'var(--helios-border)', flexShrink: 0 }}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold flex-shrink-0"
          style={{
            background: 'linear-gradient(145deg, rgba(var(--glass-rgb),0.7), rgba(120,128,140,0.25))',
            color: 'var(--codex-gray)',
            fontSize: 16,
            border: '1px solid var(--glass-stroke)',
            boxShadow: 'var(--glass-shadow)',
          }}
          aria-hidden="true">✦</div>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 14, fontWeight: 700 }}>Helios</div>
          {contextPacket.project_name || activeProject
            ? <div style={{ fontSize: 11, color: 'var(--helios-accent)' }}>{contextPacket.project_name || activeProject?.name} · {contextPacket.app_name || contextPacket.app_kind || activeProject?.app_kind}</div>
            : <div style={{ fontSize: 11, color: 'var(--helios-muted)' }}>{contextPacket.conversation_title || contextPacket.space_name || contextPacket.space_id || 'Current Helios context'}</div>}
        </div>
        <button onClick={() => setShowContext(v => !v)} title="Context packet" aria-expanded={showContext}
          className="p-1.5 rounded-lg cursor-pointer" aria-label="Toggle context"
          style={{ background: showContext ? 'var(--helios-surface2)' : 'none', border: 'none', color: 'var(--helios-muted)' }}>
          <Info size={14} />
        </button>
        <button onClick={onClose} aria-label="Close Helios" className="p-1.5 rounded-lg cursor-pointer"
          style={{ background: 'none', border: 'none', color: 'var(--helios-muted)' }}>
          <X size={16} />
        </button>
      </div>

      {/* Model tabs: free site model vs. the user's own API (VS Code-style) */}
      <div className="flex border-b flex-shrink-0" role="tablist" aria-label="Model" style={{ borderColor: 'var(--helios-border)' }}>
        {([
          { id: 'site' as const, icon: <Sparkles size={12} />, title: 'Free · Helios', sub: siteModelLabel, ready: aiEnabled },
          { id: 'user' as const, icon: <KeyRound size={12} />, title: 'My API', sub: userModelLabel, ready: userAiReady },
        ]).map(tab => {
          const active = modelTab === tab.id
          return (
            <button key={tab.id} type="button" role="tab" aria-selected={active}
              onClick={() => { setModelTab(tab.id); if (tab.id === 'user' && !userAiReady) openAiSettings() }}
              className="flex-1 cursor-pointer text-left px-3 py-2"
              style={{
                background: active ? 'color-mix(in srgb, var(--helios-accent) 7%, transparent)' : 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid var(--helios-accent)' : '2px solid transparent',
                color: active ? 'var(--helios-text)' : 'var(--helios-muted)',
              }}>
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 650 }}>
                <span style={{ color: active ? 'var(--helios-accent)' : 'var(--helios-muted)', display: 'flex' }}>{tab.icon}</span>
                {tab.title}
                {!tab.ready && <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 999, background: 'var(--helios-surface3)', color: 'var(--helios-muted)' }}>{tab.id === 'user' ? 'set up' : 'off'}</span>}
              </span>
              <span className="block truncate" style={{ fontSize: 10, color: 'var(--helios-muted)', marginTop: 2, maxWidth: 150 }}>{tab.sub}</span>
            </button>
          )
        })}
      </div>

      {/* Context packet */}
      {showContext && (
        <div className="mx-3 mt-2.5 mb-1 rounded-xl overflow-hidden" style={{ border: '1px solid var(--helios-border)', flexShrink: 0 }}>
          <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'color-mix(in srgb, var(--helios-accent) 8%, transparent)', borderBottom: '1px solid var(--helios-border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--helios-accent)', flex: 1 }}>Context packet</span>
            <span style={{ fontSize: 10, color: 'var(--helios-muted)' }}>minimal · permission-filtered</span>
          </div>
          <div className="p-3 flex flex-col gap-1.5" style={{ background: 'var(--helios-surface)', fontSize: 12 }}>
            <CtxRow label="Active object" val={contextPacket.project_name || activeProject?.name || contextPacket.conversation_title || 'none'} ok={Boolean(contextPacket.project_id || activeProject || contextPacket.conversation_id)} />
            <CtxRow label="Space" val={contextPacket.space_name || contextPacket.space_id || activeProject?.space_id || 'current'} ok={Boolean(contextPacket.space_id || activeProject?.space_id)} />
            <CtxRow label="Mini App" val={contextPacket.app_name || contextPacket.app_kind || activeProject?.app_kind || 'none'} ok={Boolean(contextPacket.app_kind || activeProject?.app_kind)} />
            <CtxRow label="Conversation" val={contextPacket.conversation_title || 'none'} ok={Boolean(contextPacket.conversation_id)} />
            <CtxRow label="Content" val={contextChars > 0 ? contextChars + ' chars' : 'empty'} ok={contextChars > 0} />
            <CtxRow label="Model" val={modelTab === 'user' ? `My API · ${userModelLabel}` : `Free · ${siteModelLabel}`} ok={aiReady} />
            <CtxRow label="Mode" val={mode === 'agent' ? 'Agent — acts inside this Space' : 'Chat — previews, you approve'} ok />
            <CtxRow label="Access" val="Permission-filtered Helios data" ok />
            <CtxRow label="Computer control" val="Not permitted" ok={false} />
          </div>
          <div className="px-3 py-2" style={{ background: 'var(--helios-surface2)', fontSize: 11, color: 'var(--helios-muted)', lineHeight: 1.5 }}>
            Helios resolves Project and conversation access on the server, then sends only the permitted context to the selected model.
          </div>
        </div>
      )}

      {/* AI not available for the selected tab */}
      {!aiReady && (
        <div className="mx-3 mt-2 px-3 py-2.5 rounded-xl flex items-start gap-2 flex-shrink-0"
          style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)' }}>
          <AlertTriangle size={13} style={{ color: 'var(--helios-solar)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: 'var(--helios-solar)', lineHeight: 1.5 }}>
            {modelTab === 'user'
              ? <>No personal API key yet. <button type="button" onClick={openAiSettings} className="cursor-pointer" style={{ background: 'none', border: 'none', padding: 0, color: 'var(--helios-accent)', fontWeight: 650, fontSize: 12, textDecoration: 'underline' }}>Add one in Settings</button> (Groq, OpenAI, Gemini, DeepSeek, Ollama…) or use the Free tab.</>
              : 'The free Helios model is not connected yet. Ask an administrator to set a site key, or switch to My API with your own key.'}
          </div>
        </div>
      )}

      {/* Permission boundary */}
      <div className="mx-3 mt-2 px-3 py-2 rounded-lg flex-shrink-0"
        style={{ background: 'var(--helios-surface2)', fontSize: 11, color: 'var(--helios-muted)', lineHeight: 1.5 }}>
        {mode === 'agent'
          ? '✦ Agent for this Space · opens pages, creates and fills Mini App files, shares posts · edits can be undone · no computer control'
          : '✦ Chat · Permission-filtered context · No computer control · Action Preview before significant changes'}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4" role="log" aria-label="Conversation">
        {messages.map(msg => (
          <div key={msg.id} className={'flex items-end gap-2' + (msg.role === 'user' ? ' flex-row-reverse' : '')}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background: 'linear-gradient(145deg, rgba(var(--glass-rgb),0.7), rgba(120,128,140,0.28))',
                  color: 'var(--codex-gray)',
                  border: '1px solid var(--glass-stroke)',
                }} aria-hidden="true">✦</div>
            )}
            <div className={'flex flex-col gap-2' + (msg.role === 'user' ? ' items-end' : ' items-start')} style={{ maxWidth: 272 }}>

              {/* Bubble */}
              <div className="px-3 py-2.5 relative group/msg"
                style={{
                  background: msg.role === 'user' ? 'var(--helios-accent)' : 'var(--helios-surface2)',
                  color: msg.role === 'user' ? '#fff' : 'var(--helios-text)',
                  border: msg.role === 'assistant' ? '1px solid var(--helios-border)' : 'none',
                  lineHeight: 1.6, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  borderRadius: msg.role === 'user' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                }}>
                {msg.content.startsWith('Error:')
                  ? <span style={{ color: 'var(--helios-danger)' }}>{msg.content}</span>
                  : msg.content}
                {msg.role === 'assistant' && !msg.content.startsWith('Error:') && (
                  <button onClick={() => copyContent(msg.content, msg.id)}
                    className="absolute opacity-0 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 focus:opacity-100 cursor-pointer"
                    style={{ top: 6, right: 6, background: 'var(--helios-surface3)', border: 'none', borderRadius: 4, padding: '2px 4px', color: 'var(--helios-muted)' }}
                    title="Copy" aria-label="Copy message">
                    {copied === msg.id ? <Check size={10} style={{ color: 'var(--helios-success)' }} /> : <Copy size={10} />}
                  </button>
                )}
              </div>

              {/* Agent steps */}
              {msg.steps && (
                <div className="rounded-xl overflow-hidden w-full" style={{ border: '1px solid var(--helios-border)', background: 'var(--helios-surface)' }}>
                  <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--helios-accent) 8%, transparent)', borderBottom: '1px solid var(--helios-border)' }}>
                    <Bot size={12} style={{ color: 'var(--helios-accent)' }} />
                    <span style={{ fontSize: 12, fontWeight: 650, color: 'var(--helios-accent)', flex: 1 }}>
                      {msg.finished ? 'Done' : 'Working…'} · {msg.steps.filter(s => s.status === 'done' || s.status === 'undone').length}/{msg.steps.length} steps
                    </span>
                  </div>
                  <ol className="flex flex-col" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {msg.steps.map((item, index) => (
                      <li key={index} className="px-3 py-2 flex items-start gap-2" style={{ borderBottom: index < msg.steps!.length - 1 ? '1px solid var(--helios-border)' : 'none', fontSize: 12 }}>
                        <span style={{ flexShrink: 0, marginTop: 2, display: 'flex' }} aria-hidden="true">
                          {item.status === 'done' && <Check size={12} style={{ color: 'var(--helios-success)' }} />}
                          {item.status === 'running' && <Loader size={12} style={{ color: 'var(--helios-accent)', animation: 'spin 0.8s linear infinite' }} />}
                          {item.status === 'failed' && <AlertTriangle size={12} style={{ color: 'var(--helios-danger)' }} />}
                          {item.status === 'undone' && <Undo2 size={12} style={{ color: 'var(--helios-muted)' }} />}
                          {item.status === 'pending' && <Circle size={10} style={{ color: 'var(--helios-muted)', marginTop: 1 }} />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span style={{ display: 'block', color: item.status === 'pending' ? 'var(--helios-muted)' : 'var(--helios-text)', fontWeight: item.status === 'running' ? 650 : 500 }}>
                            {stepTitle(item.step)}
                          </span>
                          {item.detail && <span style={{ display: 'block', fontSize: 11, color: item.status === 'failed' ? 'var(--helios-danger)' : 'var(--helios-muted)', marginTop: 2, lineHeight: 1.4 }}>{item.detail}</span>}
                        </span>
                        {item.status === 'done' && item.step.tool === 'update_file' && item.undo && (
                          <button type="button" onClick={() => undoStep(msg.id, index)} className="cursor-pointer flex items-center gap-1"
                            style={{ background: 'var(--helios-surface2)', border: '1px solid var(--helios-border)', borderRadius: 6, padding: '2px 6px', fontSize: 10, color: 'var(--helios-text)' }}>
                            <Undo2 size={10} /> Undo
                          </button>
                        )}
                        {item.status === 'done' && (item.step.tool === 'create_file' || item.step.tool === 'update_file' || item.step.tool === 'open_file') && (
                          <button type="button" title="Open in workspace" aria-label="Open in workspace" className="cursor-pointer"
                            onClick={() => {
                              const step = item.step
                              if (step.tool === 'create_file') {
                                const match = stateRef.current.projects.find(p => p.app_kind === step.app && p.name.startsWith(step.name))
                                if (match) dispatch({ type: 'OPEN_CODE_EDITOR', projectId: match.id })
                              } else if (step.tool === 'update_file' || step.tool === 'open_file') {
                                dispatch({ type: 'OPEN_CODE_EDITOR', projectId: step.project_id })
                              }
                            }}
                            style={{ background: 'none', border: 'none', padding: 2, color: 'var(--helios-muted)' }}>
                            <ExternalLink size={11} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Proposal card */}
              {msg.proposal && (
                <div className="rounded-xl overflow-hidden w-full"
                  style={{ border: '1px solid ' + proposalBorder(msg.applied) }}>
                  <div className="px-3 py-2 flex items-center gap-2"
                    style={{ background: proposalHeaderBg(msg.applied), fontSize: 12 }}>
                    <Eye size={12} style={{ color: proposalIconColor(msg.applied), flexShrink: 0 }} />
                    <span style={{ color: proposalTextColor(msg.applied), fontWeight: 600, flex: 1 }}>
                      {msg.applied ? 'Applied' : 'Proposed action'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full"
                      style={{ fontSize: 9, fontWeight: 600, background: safetyBg(msg.proposal.safety), color: safetyColor(msg.proposal.safety) }}>
                      {msg.proposal.safety === 'safe' ? 'Safe' : 'Review'}
                    </span>
                  </div>
                  <div className="px-3 py-2" style={{ background: 'var(--helios-surface)', fontSize: 12, color: 'var(--helios-muted)' }}>
                    {msg.proposal.label}
                  </div>
                  {!msg.applied ? (
                    <>
                      <div className="px-3 py-2" style={{ borderTop: '1px solid var(--helios-border)', background: 'var(--helios-surface2)', fontSize: 11, color: 'var(--helios-muted)', lineHeight: 1.45 }}>
                        <strong style={{ color: 'var(--helios-text)', display: 'block', marginBottom: 3 }}>Action Preview</strong>
                        {msg.proposal.plan}
                      </div>
                      {editingProposal === msg.id && <div className="p-2" style={{ borderTop: '1px solid var(--helios-border)', background: 'var(--helios-surface)' }}><textarea value={planDraft} onChange={event => setPlanDraft(event.target.value)} aria-label="Edit Helios action plan" style={{ width: '100%', minHeight: 72, resize: 'vertical', border: '1px solid var(--helios-border)', borderRadius: 8, padding: 8, background: 'var(--helios-surface2)', color: 'var(--helios-text)', fontSize: 11 }} /><div className="flex gap-2 mt-2"><button type="button" onClick={() => submitEditedPlan(msg)} className="flex-1 py-2 cursor-pointer" style={{ border: 0, borderRadius: 7, background: 'var(--helios-accent)', color: '#fff', fontSize: 11 }}>Preview revised plan</button><button type="button" onClick={() => setEditingProposal(null)} className="px-3 cursor-pointer" style={{ border: '1px solid var(--helios-border)', borderRadius: 7, background: 'transparent', color: 'var(--helios-muted)', fontSize: 11 }}>Back</button></div></div>}
                      {editingProposal !== msg.id && <div className="flex border-t" style={{ borderColor: 'var(--helios-border)' }}>
                        <button onClick={() => applyProposal(msg.id)} className="flex-1 py-2 cursor-pointer" style={{ background: 'var(--helios-surface)', border: 'none', color: 'var(--helios-accent)', fontSize: 11, borderRight: '1px solid var(--helios-border)', fontWeight: 650 }}>Approve</button>
                        <button onClick={() => editPlan(msg)} className="flex-1 py-2 cursor-pointer" style={{ background: 'var(--helios-surface)', border: 'none', color: 'var(--helios-text)', fontSize: 11, borderRight: '1px solid var(--helios-border)' }}>Edit Plan</button>
                        <button onClick={() => setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, proposal: undefined } : m))} className="flex-1 py-2 cursor-pointer" style={{ background: 'var(--helios-surface)', border: 'none', color: 'var(--helios-muted)', fontSize: 11 }}>Cancel</button>
                      </div>}
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-1.5 py-2"
                      style={{ background: 'var(--helios-surface)', fontSize: 12, color: 'var(--helios-success)' }}>
                      <Check size={12} /> Applied to project
                    </div>
                  )}
                </div>
              )}

              <time dateTime={msg.ts} style={{ fontSize: 10, color: 'var(--helios-muted)' }}>
                {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {msg.meta && <span> · {msg.meta.source === 'user' ? 'My API' : 'Free'} · {msg.meta.model}</span>}
              </time>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(145deg, rgba(var(--glass-rgb),0.7), rgba(120,128,140,0.28))',
                color: 'var(--codex-gray)',
                fontSize: 12,
                border: '1px solid var(--glass-stroke)',
              }}>✦</div>
            <div className="px-3 py-3 rounded-2xl flex items-center gap-1.5"
              style={{ background: 'var(--helios-surface2)', border: '1px solid var(--helios-border)' }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full helios-typing-dot"
                  style={{
                    background: 'var(--helios-muted)',
                    animationDelay: i === 0 ? '0s' : i === 1 ? '0.18s' : '0.36s',
                  }} />
              ))}
            </div>
            <span className="sr-only" aria-live="polite">Helios is thinking</span>
          </div>
        )}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Quick action chips */}
      {messages.length <= 1 && aiReady && (
        <div className="px-4 pb-3 flex flex-col gap-1.5 flex-shrink-0">
          <div style={{ fontSize: 11, color: 'var(--helios-muted)', marginBottom: 4 }}>{mode === 'agent' && !activeProject ? 'Try telling the agent:' : 'Try asking:'}</div>
          {(mode === 'agent' && !activeProject && !contextPacket.conversation_id ? AGENT_SUGGESTIONS : contextualActions).map(q => (
            <button key={q} onClick={() => sendMessage(q)}
              className="w-full text-left px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2"
              style={{ background: 'var(--helios-surface2)', border: '1px solid var(--helios-border)', color: 'var(--helios-muted)', fontSize: 12 }}>
              <ChevronRight size={10} style={{ flexShrink: 0 }} /> {q}
            </button>
          ))}
        </div>
      )}

      {/* Retry on error */}
      {messages.length > 1 && messages[messages.length - 1]?.content.startsWith('Error:') && (
        <div className="px-4 pb-2 flex-shrink-0">
          <button onClick={() => { const prev = [...messages].reverse().find(m => m.role === 'user'); if (prev) sendMessage(prev.content) }}
            className="flex items-center gap-1.5 text-xs cursor-pointer px-3 py-2 rounded-lg"
            style={{ background: 'var(--helios-surface2)', border: '1px solid var(--helios-border)', color: 'var(--helios-muted)' }}>
            <RotateCcw size={11} /> Retry last message
          </button>
        </div>
      )}

      {/* Input */}
      <form onSubmit={e => { e.preventDefault(); sendMessage(input) }}
        className="flex flex-col gap-2 px-4 py-3 border-t flex-shrink-0"
        style={{ borderColor: 'var(--helios-border)' }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center rounded-xl px-3 py-2.5"
            style={{ background: 'var(--helios-surface2)', border: '1px solid var(--helios-border)' }}>
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
              placeholder={!aiReady ? 'Model not available on this tab' : mode === 'agent' ? 'Tell the agent what to do — it opens the page and does it…' : 'Ask Helios… (Enter to send)'}
              disabled={!aiReady || loading} aria-label="Message to Helios"
              className="flex-1 bg-transparent outline-none"
              style={{ border: 'none', color: 'var(--helios-text)', fontSize: 13 }} />
          </div>
          <button type="submit" disabled={!aiReady || loading || !input.trim()} aria-label="Send message"
            className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
            style={{ background: 'var(--helios-accent)', border: 'none', color: '#fff', opacity: (!aiReady || loading || !input.trim()) ? 0.4 : 1 }}>
            {loading ? <Loader size={14} style={{ animation: 'spin 0.5s linear infinite' }} /> : <Send size={14} />}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex rounded-lg p-0.5" role="radiogroup" aria-label="Helios mode"
            style={{ background: 'var(--helios-surface2)', border: '1px solid var(--helios-border)' }}>
            {([
              { id: 'agent' as const, label: 'Agent', icon: <Bot size={11} /> },
              { id: 'chat' as const, label: 'Chat', icon: <MessageSquare size={11} /> },
            ]).map(option => (
              <button key={option.id} type="button" role="radio" aria-checked={mode === option.id} onClick={() => setMode(option.id)}
                className="flex items-center gap-1 cursor-pointer px-2.5 py-1 rounded-md"
                style={{
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 650,
                  background: mode === option.id ? 'var(--helios-surface)' : 'transparent',
                  color: mode === option.id ? 'var(--helios-accent)' : 'var(--helios-muted)',
                  boxShadow: mode === option.id ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                }}>
                {option.icon} {option.label}
              </button>
            ))}
          </div>
          <span className="truncate" style={{ fontSize: 10, color: 'var(--helios-muted)' }}>
            {modelTab === 'user' ? userModelLabel : `Free · ${siteModelLabel}`}
          </span>
        </div>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function CtxRow({ label, val, ok }: { label: string; val: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span style={{ color: 'var(--helios-muted)' }}>{label}</span>
      <span style={{ color: ok ? 'var(--helios-text)' : 'var(--helios-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: ok ? 'var(--helios-success)' : 'var(--helios-danger)', fontSize: 9 }}>{ok ? '+' : '-'}</span>
        {val}
      </span>
    </div>
  )
}
