import { useState, useRef, useEffect, useCallback } from 'react'
import { api } from '../api'
import type { Project } from '../api'
import { X, Send, Eye, Check, ChevronRight, Info, Loader, AlertTriangle, RotateCcw, Copy } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  ts: string
  proposal?: { label: string; cost: 'low' | 'medium' | 'high'; safety: 'safe' | 'review'; targetProjectId: number; plan: string }
  applied?: boolean
}

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
  const m = text.match(/```[\w]*\n([\s\S]+?)```/)
  return m ? m[1].trimEnd() : null
}

function readContext(fallback: HeliosContext): HeliosContext {
  try {
    const stored = JSON.parse(sessionStorage.getItem('helios-workspace-context') || '{}')
    sessionStorage.removeItem('helios-workspace-context')
    return stored && typeof stored === 'object' ? { ...fallback, ...stored } : fallback
  } catch { return fallback }
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

// Quick actions adapt to the open project's type so suggestions feel native to
// the medium (code vs. prose vs. design vs. research) rather than generic.
const NO_PROJECT_ACTIONS = [
  'What can you help me with?',
  'How does Helios keep my work private?',
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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [editingProposal, setEditingProposal] = useState<string | null>(null)
  const [planDraft, setPlanDraft] = useState('')
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
    setMessages([{
      id: 'welcome', role: 'assistant', ts: new Date().toISOString(),
      content: project
        ? 'I have ' + project.name + ' open (' + status + '). I am Helios, a real in-product AI feature: tell me what to write, improve, or explain, and I will prepare the work here with approval for significant changes.'
        : contextPacket.conversation_title
          ? `I have the permitted context for “${contextPacket.conversation_title}”. I can summarize it or draft replies, but I will not send anything without your approval.`
          : contextPacket.space_name || contextPacket.space_id
            ? `I understand that you are in the ${contextPacket.space_name || contextPacket.space_id} Space. Ask me to explain, improve, plan, or find problems in the current work.`
            : 'I\'m Helios, a real AI feature inside Helios Space. I can help with permitted work in your current context; I cannot control your computer or act outside this app.',
    }])
  }, [activeProject?.id, contextPacket.conversation_title, contextPacket.space_id, contextPacket.space_name])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, ts: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const history = [...messages, userMsg]
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))
      const targetProjectId = Number(contextPacket.project_id || activeProject?.id || 0) || undefined
      const r = await api.helios.chat(history, targetProjectId, contextPacket as Record<string, unknown>)
      const code = extractCode(r.reply)
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: r.reply,
        ts: new Date().toISOString(),
        ...(code && targetProjectId ? {
          proposal: {
            label: 'Modify “' + (contextPacket.project_name || activeProject?.name || 'the active Project') + '”',
            cost: 'medium' as const,
            safety: 'review' as const,
            targetProjectId,
            plan: 'Replace the current Project content with the complete reviewed version shown above. Nothing is applied until you approve.',
          },
        } : {}),
      }])
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
  }, [messages, loading, activeProject, contextPacket])

  useEffect(() => {
    if (pendingHandledRef.current || !aiEnabled) return
    const pending = sessionStorage.getItem('helios-pending-prompt')
    if (!pending) return
    pendingHandledRef.current = true
    sessionStorage.removeItem('helios-pending-prompt')
    const timer = window.setTimeout(() => { void sendMessage(pending) }, 80)
    return () => window.clearTimeout(timer)
  }, [aiEnabled, sendMessage])

  async function applyProposal(msgId: string) {
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.proposal) return
    const code = extractCode(msg.content)
    if (!code) return
    try {
      const target = activeProject?.id === msg.proposal.targetProjectId
        ? activeProject
        : (await api.projects.get(msg.proposal.targetProjectId)).project
      if (!target.can_edit) throw new Error('You do not have permission to edit this Project.')
      const content = validateUpdatedContent(target.content, code)
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
  const proposalHeaderBg = (applied?: boolean) => applied ? 'rgba(110,214,154,0.1)' : 'rgba(124,106,247,0.1)'
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
          style={{ background: 'linear-gradient(135deg, #7c6af7, #4fc3f7)', color: '#fff', fontSize: 16 }}
          aria-hidden="true">✦</div>
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 14, fontWeight: 700 }}>Helios</div>
          {contextPacket.project_name || activeProject
            ? <div style={{ fontSize: 11, color: '#7c6af7' }}>{contextPacket.project_name || activeProject?.name} · {contextPacket.app_name || contextPacket.app_kind || activeProject?.app_kind}</div>
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

      {/* Context packet */}
      {showContext && (
        <div className="mx-3 mt-2.5 mb-1 rounded-xl overflow-hidden" style={{ border: '1px solid var(--helios-border)', flexShrink: 0 }}>
          <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'rgba(124,106,247,0.08)', borderBottom: '1px solid var(--helios-border)' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--helios-accent)', flex: 1 }}>Context packet</span>
            <span style={{ fontSize: 10, color: 'var(--helios-muted)' }}>minimal · permission-filtered</span>
          </div>
          <div className="p-3 flex flex-col gap-1.5" style={{ background: 'var(--helios-surface)', fontSize: 12 }}>
            <CtxRow label="Active object" val={contextPacket.project_name || activeProject?.name || contextPacket.conversation_title || 'none'} ok={Boolean(contextPacket.project_id || activeProject || contextPacket.conversation_id)} />
            <CtxRow label="Space" val={contextPacket.space_name || contextPacket.space_id || activeProject?.space_id || 'current'} ok={Boolean(contextPacket.space_id || activeProject?.space_id)} />
            <CtxRow label="Mini App" val={contextPacket.app_name || contextPacket.app_kind || activeProject?.app_kind || 'none'} ok={Boolean(contextPacket.app_kind || activeProject?.app_kind)} />
            <CtxRow label="Conversation" val={contextPacket.conversation_title || 'none'} ok={Boolean(contextPacket.conversation_id)} />
            <CtxRow label="Content" val={contextChars > 0 ? contextChars + ' chars' : 'empty'} ok={contextChars > 0} />
            <CtxRow label="AI status" val={aiEnabled ? 'OpenAI connected' : 'Not configured'} ok={aiEnabled} />
            <CtxRow label="Access" val="Permission-filtered Helios data" ok />
            <CtxRow label="Computer control" val="Not permitted" ok={false} />
          </div>
          <div className="px-3 py-2" style={{ background: 'var(--helios-surface2)', fontSize: 11, color: 'var(--helios-muted)', lineHeight: 1.5 }}>
            Helios resolves Project and conversation access on the server, then sends only the permitted context to OpenAI.
          </div>
        </div>
      )}

      {/* AI disabled warning */}
      {!aiEnabled && (
        <div className="mx-3 mt-2 px-3 py-2.5 rounded-xl flex items-start gap-2 flex-shrink-0"
          style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.25)' }}>
          <AlertTriangle size={13} style={{ color: 'var(--helios-solar)', flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: 'var(--helios-solar)', lineHeight: 1.5 }}>
            Helios AI is not connected yet. Add an OpenAI-compatible API key in Admin settings before using the assistant.
          </div>
        </div>
      )}

      {/* Permission boundary */}
      <div className="mx-3 mt-2 px-3 py-2 rounded-lg flex-shrink-0"
        style={{ background: 'var(--helios-surface2)', fontSize: 11, color: 'var(--helios-muted)', lineHeight: 1.5 }}>
        ✦ Real Helios AI feature · Permission-filtered context · No computer control · Action Preview before significant changes
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4" role="log" aria-label="Conversation">
        {messages.map(msg => (
          <div key={msg.id} className={'flex items-end gap-2' + (msg.role === 'user' ? ' flex-row-reverse' : '')}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #7c6af7, #4fc3f7)', color: '#fff' }} aria-hidden="true">✦</div>
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
              </time>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-end gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #7c6af7, #4fc3f7)', color: '#fff', fontSize: 12 }}>✦</div>
            <div className="px-3 py-3 rounded-2xl flex items-center gap-1.5"
              style={{ background: 'var(--helios-surface2)', border: '1px solid var(--helios-border)' }}>
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full"
                  style={{ background: 'var(--helios-muted)', animationName: 'pulse-dot', animationDuration: '1.2s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite', animationDelay: i === 0 ? '0s' : i === 1 ? '0.18s' : '0.36s' }} />
              ))}
            </div>
            <span className="sr-only" aria-live="polite">Helios is thinking</span>
          </div>
        )}
        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {/* Quick action chips */}
      {messages.length <= 1 && aiEnabled && (
        <div className="px-4 pb-3 flex flex-col gap-1.5 flex-shrink-0">
          <div style={{ fontSize: 11, color: 'var(--helios-muted)', marginBottom: 4 }}>Try asking:</div>
          {contextualActions.map(q => (
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
        className="flex items-center gap-2 px-4 py-3 border-t flex-shrink-0"
        style={{ borderColor: 'var(--helios-border)' }}>
        <div className="flex-1 flex items-center rounded-xl px-3 py-2.5"
          style={{ background: 'var(--helios-surface2)', border: '1px solid var(--helios-border)' }}>
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder={aiEnabled ? 'Tell Helios what to do… (Enter to send)' : 'AI not configured'}
            disabled={!aiEnabled || loading} aria-label="Message to Helios"
            className="flex-1 bg-transparent outline-none"
            style={{ border: 'none', color: 'var(--helios-text)', fontSize: 13 }} />
        </div>
        <button type="submit" disabled={!aiEnabled || loading || !input.trim()} aria-label="Send message"
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer flex-shrink-0"
          style={{ background: 'var(--helios-accent)', border: 'none', color: '#fff', opacity: (!aiEnabled || loading || !input.trim()) ? 0.4 : 1 }}>
          {loading ? <Loader size={14} style={{ animation: 'spin 0.5s linear infinite' }} /> : <Send size={14} />}
        </button>
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
