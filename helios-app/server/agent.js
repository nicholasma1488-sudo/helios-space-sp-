// Helios Agent: turns a natural-language goal into a short list of in-app
// actions (open a page, create / update a Mini App file, share a post, switch
// theme) plus generated content. Everything here is pure planning; the route
// in server.js applies permission checks and the browser executes the steps.
import {
  buildChatCompletionPayload,
  extractAssistantReply,
  mapAiUpstreamFailure,
  resolveChatCompletionsUrl,
  summarizeAiProviderError,
} from './aiProvider.js'

export const AGENT_APPS = {
  'word-docs': { name: 'Quill', type: 'writing', kind: 'writing', label: 'document' },
  spreadsheet: { name: 'Lattice', type: 'spreadsheet', kind: 'spreadsheet', label: 'spreadsheet' },
  presentation: { name: 'Stage', type: 'presentation', kind: 'presentation', label: 'slide deck' },
  notebook: { name: 'Folio', type: 'notebook', kind: 'notebook', label: 'notebook' },
  'homework-board': { name: 'Pulse', type: 'board', kind: 'board', label: 'homework board' },
  'planner-board': { name: 'Cascade', type: 'board', kind: 'board', label: 'project board' },
  lists: { name: 'Tally', type: 'board', kind: 'board', label: 'to-do list' },
  'calendar-plan': { name: 'Orbit', type: 'board', kind: 'calendar', label: 'schedule' },
  'mail-draft': { name: 'Dispatch', type: 'doc', kind: 'mail', label: 'email draft' },
  code: { name: 'Forge', type: 'code', kind: 'code', label: 'code project' },
}

/** Map any stored app_kind (including legacy aliases) onto an agent-capable Mini App. */
export function agentAppFor(appKind) {
  const kind = String(appKind || '').toLowerCase()
  if (AGENT_APPS[kind]) return kind
  if (/sheet|spreadsheet|budget|table|gradebook|data-visualization/.test(kind)) return 'spreadsheet'
  if (/deck|slides|presentation|poster/.test(kind)) return 'presentation'
  if (/notebook|journal|notes|-lab$/.test(kind)) return 'notebook'
  if (/homework/.test(kind)) return 'homework-board'
  if (/kanban|board|roadmap|tracker|planner/.test(kind)) return 'planner-board'
  if (/checklist|list/.test(kind)) return 'lists'
  if (/calendar|schedule/.test(kind)) return 'calendar-plan'
  if (/mail/.test(kind)) return 'mail-draft'
  if (/code|prototype|script|playground|algorithm|game/.test(kind)) return 'code'
  return 'word-docs'
}

export const AGENT_VIEWS = new Set(['home', 'lifestyle', 'apps', 'chat', 'profile'])
export const AGENT_THEMES = new Set(['light', 'dark', 'system'])
export const MAX_AGENT_STEPS = 5

export class AgentUpstreamError extends Error {
  constructor(status, body) {
    super(body.error || 'AI provider failed')
    this.status = status
    this.body = body
  }
}

export function isChinese(text) {
  return /[\u4e00-\u9fff]/.test(String(text || ''))
}

export function aiMode(ai) {
  if (!ai?.apiKey) return 'none'
  if (/helios-local/i.test(ai.apiKey) || /helios\.local/i.test(ai.baseUrl || '') || /helios-local/i.test(ai.model || '')) return 'local'
  if (/pollinations/i.test(ai.apiKey) || /pollinations\.ai/i.test(ai.baseUrl || '')) return 'pollinations'
  return 'openai'
}

// ── Model calls ─────────────────────────────────────────────────────────

/**
 * Small models served from a local machine (Ollama on CPU) get shorter briefs
 * and tighter token caps so steps finish in seconds, not minutes. Hosted
 * endpoints such as ollama.com run large models and get the full prompts.
 */
export function isCompactModel(ai) {
  const baseUrl = String(ai?.baseUrl || '')
  const localHost = /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?/i.test(baseUrl) || /:11434(\/|$)/.test(baseUrl)
  const tinyModel = /(^|[^0-9.])(0\.5|1|1\.5|2|3|4)b\b/i.test(ai?.model || '')
  return localHost || tinyModel
}

export async function completeText(ai, messages, { temperature = 0.3, json = false, timeoutMs = 120_000, maxTokens = 0 } = {}) {
  const mode = aiMode(ai)
  if (mode === 'none' || mode === 'local') return { text: '', model: ai?.model || 'helios-local', skipped: true }

  if (mode === 'pollinations') {
    const prompt = messages.map(m => `${m.role === 'system' ? 'Instructions' : m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n').slice(0, 6000)
    const endpoint = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=${encodeURIComponent(ai.model || 'openai')}${json ? '&json=true' : ''}`
    const r = await fetch(endpoint, { headers: { Accept: 'text/plain' }, signal: AbortSignal.timeout(timeoutMs) })
    const body = await r.text()
    if (!r.ok) throw new AgentUpstreamError(mapAiUpstreamFailure(r.status).status, { ...mapAiUpstreamFailure(r.status), detail: summarizeAiProviderError(body) })
    return { text: body.trim(), model: ai.model || 'openai' }
  }

  const endpoint = resolveChatCompletionsUrl(ai.baseUrl || 'https://api.openai.com')
  const send = async withJsonFormat => {
    const payload = buildChatCompletionPayload({ model: ai.model, messages, temperature })
    if (withJsonFormat) payload.response_format = { type: 'json_object' }
    if (maxTokens > 0) payload.max_tokens = maxTokens
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer ' + ai.apiKey },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const raw = await r.text()
    return { r, raw }
  }

  let { r, raw } = await send(json)
  // Some relays reject response_format; retry once as plain text.
  if (!r.ok && json && (r.status === 400 || r.status === 422)) ({ r, raw } = await send(false))
  if (!r.ok) {
    const failure = mapAiUpstreamFailure(r.status)
    throw new AgentUpstreamError(failure.status, { ...failure, detail: summarizeAiProviderError(raw) })
  }
  let data = {}
  try { data = raw ? JSON.parse(raw) : {} } catch {}
  const text = extractAssistantReply(data)
  if (!text) throw new AgentUpstreamError(502, { error: 'The AI provider returned an invalid response.', code: 'AI_INVALID_RESPONSE', detail: summarizeAiProviderError(raw) })
  return { text, model: data?.model || ai.model }
}

/**
 * Best-effort repair of almost-JSON from a model: escapes raw newlines/tabs
 * inside strings, closes an unterminated string, drops a dangling comma and
 * appends whatever closing brackets are still open (models writing long code
 * files regularly forget the final `}`).
 */
export function repairJson(text) {
  const src = String(text)
  let out = ''
  let inStr = false
  let esc = false
  const stack = []
  // A quote really closes a string only when JSON structure follows it;
  // otherwise it is an unescaped quote inside HTML/code (`name="viewport"`).
  const closesString = from => {
    let i = from
    while (i < src.length && /\s/.test(src[i])) i++
    const c1 = src[i]
    if (c1 === undefined || c1 === ':') return true
    if (c1 === ',') {
      let j = i + 1
      while (j < src.length && /\s/.test(src[j])) j++
      return j >= src.length || /["{[\-0-9tfn]/.test(src[j])
    }
    if (c1 === '}' || c1 === ']') {
      let j = i + 1
      while (j < src.length && /\s/.test(src[j])) j++
      return j >= src.length || /[,}\]]/.test(src[j]) || src.startsWith('```', j)
    }
    return false
  }
  for (let idx = 0; idx < src.length; idx++) {
    const ch = src[idx]
    if (inStr) {
      if (esc) { esc = false; out += ch; continue }
      if (ch === '\\') { esc = true; out += ch; continue }
      if (ch === '"') {
        if (closesString(idx + 1)) { inStr = false; out += ch } else out += '\\"'
        continue
      }
      if (ch === '\n') { out += '\\n'; continue }
      if (ch === '\r') continue
      if (ch === '\t') { out += '\\t'; continue }
      out += ch
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === '{') stack.push('}')
    else if (ch === '[') stack.push(']')
    else if ((ch === '}' || ch === ']') && stack.length && stack[stack.length - 1] === ch) stack.pop()
    out += ch
  }
  if (esc) out = out.slice(0, -1)
  if (inStr) out += '"'
  out = out.trimEnd().replace(/,\s*$/, '')
  while (stack.length) out += stack.pop()
  return out
}

export function extractJson(text) {
  if (!text) return null
  let body = String(text).trim()
  const fenced = body.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i)
  if (fenced) body = fenced[1].trim()
  const start = body.indexOf('{')
  if (start === -1) return null
  const end = body.lastIndexOf('}')
  const candidate = end > start ? body.slice(start, end + 1) : body.slice(start)
  try { return JSON.parse(candidate) } catch {}
  // Tolerate trailing commas, a common small-model slip.
  try { return JSON.parse(candidate.replace(/,\s*([}\]])/g, '$1')) } catch {}
  // Missing closing braces, raw newlines inside code strings, truncated output.
  for (const source of [candidate, body.slice(start)]) {
    try {
      const repaired = repairJson(source)
      const parsed = JSON.parse(repaired)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {}
  }
  return null
}

// ── Rule-based planner (fast path; no model round-trip) ─────────────────

const CREATE_RE = /\b(create|make|write|draft|build|start|new|generate|prepare|compose|design|plan|put together|set up)\b|新建|创建|做一?[个份张]|做|写|生成|准备|帮我|来一?[份个]|整理|制作|列一?[个份]|起草|拟/i
const EDIT_RE = /\b(improve|fix|rewrite|edit|expand|continue|add|update|polish|proofread|shorten|translate|summari[sz]e|change|revise|finish|complete|tighten|clean up)\b|改|修改|优化|润色|扩写|续写|添加|加上|更新|翻译|总结|缩短|完善|继续|补充|精简|检查/i
const THIS_RE = /\b(this|current|the open|my open)\s+(document|doc|file|project|sheet|deck|slides|notes|board|list|code|draft|page)\b|这(个|篇|份|张)|当前|本文|本项目|这里/i
const NAV_RE = /\b(open|go to|goto|show|take me to|switch to|navigate to|bring up|jump to)\b|打开|前往|去|切换到|进入|跳到|看看|回到/i
const POST_RE = /\b(post|publish|share)\b(?!\s*-?\s*it\s+notes)|发(一条|个|条)?(帖|动态|布)|分享到|发到/i
const QUESTION_RE = /^\s*(what|why|how|when|where|who|which|explain|is|are|can|could|does|do|should)\b|[?？]\s*$|什么|为什么|怎么|如何|解释|是不是|能不能|吗/i

const APP_HINTS = [
  ['presentation', /\b(slides?|slide ?deck|deck|presentation|powerpoint|ppt|pitch deck)\b|幻灯|演示|课件|ppt/i],
  ['spreadsheet', /\b(spreadsheet|sheet|table|budget|excel|csv|tracker|gradebook|ledger)\b|表格|电子表|预算|报表|数据表|统计表|账本|excel/i],
  ['mail-draft', /\b(e-?mail|letter to|cover letter)\b|邮件|一封信|信件|求职信/i],
  ['calendar-plan', /\b(calendar|schedule|timetable|agenda|itinerary|study plan|weekly plan)\b|日程|日历|时间表|排期|行程|周计划|课程表/i],
  ['code', /\b(code|app|website|web ?page|landing page|html|css|javascript|typescript|python|c\+\+|java|script|program|game|function|api|component|algorithm)\b|代码|网页|程序|脚本|游戏|网站|函数|算法|页面/i],
  ['homework-board', /\bhomework\b|作业/i],
  ['planner-board', /\b(kanban|project board|roadmap|sprint|project plan|planner|milestones?)\b|看板|路线图|项目计划|里程碑/i],
  ['lists', /\b(to-?do|todo|tasks?|checklist|shopping list|packing list|list)\b|待办|清单|任务|列表|购物/i],
  ['notebook', /\b(notes?|notebook|journal|study notes|revision notes)\b|笔记|随笔|日记|复习/i],
  ['word-docs', /\b(doc(ument)?|essay|article|blog|report|story|poem|summary|outline|proposal|resume|cv|paragraph|paper|speech|announcement|text|write|draft)\b|文档|文章|作文|报告|故事|诗|总结|大纲|计划书|简历|方案|文案|论文|演讲稿|公告|段|写|草稿|介绍/i],
]

const VIEW_HINTS = [
  ['chat', /\b(messages?|chat|inbox|conversations?|dm)\b|消息|聊天|私信|对话/i],
  ['lifestyle', /\b(space feed|feed|community|posts?|timeline|space)\b|动态|社区|空间|广场|帖子|时间线/i],
  ['apps', /\b(mini ?apps?|apps?|tools|app store)\b|小应用|应用|工具/i],
  ['profile', /\b(settings?|profile|my page|account|preferences|appearance)\b|设置|个人主页|个人|我的|账户|外观/i],
  ['home', /\b(home|dashboard|start page)\b|主页|首页/i],
]

function detectApp(goal) {
  for (const [id, re] of APP_HINTS) if (re.test(goal)) return id
  return null
}

function detectView(goal) {
  for (const [view, re] of VIEW_HINTS) if (re.test(goal)) return view
  return null
}

function detectTheme(goal) {
  if (/(dark|night|black)\s*(mode|theme)|\b(mode|theme)\b[^.]*\bdark\b|深色|暗色|夜间|黑暗|暗黑/i.test(goal)) return 'dark'
  if (/(light|day|bright|white)\s*(mode|theme)|\b(mode|theme)\b[^.]*\blight\b|浅色|亮色|白天|明亮|日间/i.test(goal)) return 'light'
  if (/system\s*(theme|mode)|follow (the )?system|跟随系统|系统主题/i.test(goal)) return 'system'
  return null
}

function findProjectMention(goal, projects) {
  const lower = goal.toLowerCase()
  const hits = projects
    .filter(p => p.name && p.name.length >= 2 && lower.includes(String(p.name).toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length)
  return hits[0] || null
}

// Leading Chinese request framing + creation verb + measure word ("请帮我做一个…").
// Chinese verbs are single characters, so they are only stripped here at the
// start of the phrase — never from inside words like 贪吃蛇 or 写作业.
const ZH_LEAD_RE = /^(?:请|麻烦|帮我|给我|我要|我想|我需要|能不能|可以|来)*(?:新建|创建|制作|生成|准备|整理|起草|编写|开发|设计|搭建|实现|做|写|列|拟|画)?(?:一?[个份张篇条套段]|一下)?/
const EN_FILLER_RE = /\b(a|an|the|me|please|for me|quick|short|simple|new|my|some)\b/gi

export function deriveTitle(goal, app) {
  let cleaned = String(goal).replace(/\s+/g, ' ').trim()
    // Drop trailing "and post it…" / "然后发到动态" clauses; they are separate steps.
    .replace(/\s*[,，;；]?\s*(?:and then|then|and|after that)\s+(?:post|share|publish|open|go to|switch)\b.*$/i, '')
    .replace(/[,，;；]?\s*(?:然后|并且|并|再|接着|之后|顺便)?(?:发到|分享到|发一?条?动态|发布|发帖|打开|切换|去).*$/, '')
  // The first clause names the thing; the rest are instructions about it
  // ("做一个贪吃蛇游戏，所有代码写在一个文件里" → "做一个贪吃蛇游戏").
  const clause = cleaned.split(/[,，;；:：。!！?？]|\s[-–—]\s/)[0].trim()
  if (clause.length >= 2) cleaned = clause
  const about = cleaned.match(/\b(?:about|on|titled|called|named)\b\s*[:：“"']?\s*([^“”"'.,;!?。，；！？]+)/i)
    || cleaned.match(/(?:关于|题为|叫做|名为)\s*[:：“"']?\s*([^“”"'.,;!?。，；！？]+)/)
    || cleaned.match(/\b(?:to|for)\s+([^“”"'.,;!?。，；！？]+)/i)
  let title = about ? about[1].trim() : ''
  if (!title) {
    title = cleaned
      .replace(ZH_LEAD_RE, '')
      .replace(/\b(create|make|write|draft|build|start|generate|prepare|compose|design|plan|put together|set up)\b/gi, ' ')
      .replace(EN_FILLER_RE, ' ')
      .replace(/(?:吧|呢|啊|好吗|谢谢)+$/, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  title = title.replace(/^[\s,.:：，。]+|[\s,.:：，。]+$/g, '')
  if (title.length > 48) title = title.slice(0, 48).trim()
  if (!title) title = `${AGENT_APPS[app]?.name || 'Helios'} ${new Date().toISOString().slice(0, 10)}`
  return title.charAt(0).toUpperCase() + title.slice(1)
}

/**
 * Cheap deterministic planner. Returns `null` when the goal is not obviously
 * actionable so the model planner (or plain chat) can take over.
 */
export function planLocally(goal, ctx) {
  const text = String(goal || '').trim()
  if (!text) return null
  const projects = Array.isArray(ctx.projects) ? ctx.projects : []
  const steps = []

  const theme = detectTheme(text)
  if (theme && /\b(mode|theme|switch|turn|enable|use|set)\b|模式|主题|切换|开启|换成|改成|调成/i.test(text)) {
    steps.push({ tool: 'set_theme', theme })
    return { steps, planner: 'rules' }
  }

  const mentioned = findProjectMention(text, projects)
  const wantsCreate = CREATE_RE.test(text) && !QUESTION_RE.test(text.replace(/[?？]\s*$/, ''))
  const app = detectApp(text)

  if (mentioned && !wantsCreate && EDIT_RE.test(text)) {
    steps.push({ tool: 'update_file', project_id: mentioned.id, brief: text })
  } else if (mentioned && NAV_RE.test(text)) {
    steps.push({ tool: 'open_file', project_id: mentioned.id })
  } else if (ctx.activeProject && THIS_RE.test(text) && (EDIT_RE.test(text) || CREATE_RE.test(text)) && !POST_RE.test(text)) {
    steps.push({ tool: 'update_file', project_id: ctx.activeProject.id, brief: text })
  } else if (wantsCreate && app) {
    steps.push({ tool: 'create_file', app, name: deriveTitle(text, app), brief: text })
  }

  if (POST_RE.test(text)) {
    const quoted = text.match(/[“"']([^“”"']{3,400})[”"']/)
    steps.push({ tool: 'post', body: quoted ? quoted[1].trim() : '', brief: text })
  }

  if (steps.length === 0) {
    const view = detectView(text)
    if (view && NAV_RE.test(text) && !CREATE_RE.test(text.replace(/帮我|please/gi, ''))) {
      steps.push({ tool: 'navigate', view })
    }
  }

  return steps.length > 0 ? { steps: steps.slice(0, MAX_AGENT_STEPS), planner: 'rules' } : null
}

// ── Model planner ───────────────────────────────────────────────────────

function plannerPrompt(ctx) {
  const projects = (ctx.projects || []).slice(0, 25).map(p => `{"id":${p.id},"name":${JSON.stringify(p.name)},"app":"${p.app_kind}"}`).join(', ')
  return [
    'You are the planner of the Helios agent inside Helios Space (a learning and creating app with Mini Apps, a Space feed, and Messages).',
    'Turn the user goal into a JSON plan the app will execute automatically. Respond with ONLY a JSON object, no prose.',
    'Format: {"say": "<one short sentence to the user, same language as the goal>", "steps": [ ...at most 4 steps... ]}',
    'Available steps:',
    '- {"tool":"create_file","app":"<app id>","name":"<short title>","brief":"<what the content must contain>"}',
    '  app ids: word-docs (Quill, prose documents, essays, reports), spreadsheet (Lattice, tables and numbers), presentation (Stage, slides), notebook (Folio, study notes), homework-board (Pulse, homework tasks), planner-board (Cascade, kanban project board), lists (Tally, to-do lists), calendar-plan (Orbit, schedules), mail-draft (Dispatch, emails), code (Forge, code and web pages).',
    '- {"tool":"update_file","project_id":<id>,"brief":"<change to make>"}  only for the existing projects listed below',
    '- {"tool":"open_file","project_id":<id>}',
    '- {"tool":"navigate","view":"home|lifestyle|apps|chat|profile"}  lifestyle = Space feed and posts, apps = Mini Apps, chat = Messages, profile = Me and Settings',
    '- {"tool":"post","body":"<short post text>"}  share in the Space feed',
    '- {"tool":"set_theme","theme":"light|dark|system"}',
    'If the goal is a question, a request for explanation, or nothing in the app should change, return {"say":"","steps":[]}.',
    `Existing projects: [${projects}]`,
    ctx.activeProject ? `Currently open project: {"id":${ctx.activeProject.id},"name":${JSON.stringify(ctx.activeProject.name)},"app":"${ctx.activeProject.app_kind}"}` : 'No project is open.',
    `Current page: ${ctx.view || 'home'}`,
  ].join('\n')
}

export async function planWithModel(goal, ctx, ai) {
  const { text, model, skipped } = await completeText(ai, [
    { role: 'system', content: plannerPrompt(ctx) },
    { role: 'user', content: String(goal).slice(0, 3000) },
  ], { temperature: 0.1, json: true, timeoutMs: 90_000, maxTokens: 400 })
  if (skipped) return { steps: [], say: '', planner: 'none', model }
  const parsed = extractJson(text)
  if (!parsed || typeof parsed !== 'object') return { steps: [], say: '', planner: 'model', model, raw: text }
  const rawSteps = Array.isArray(parsed.steps) ? parsed.steps : Array.isArray(parsed.actions) ? parsed.actions : []
  return { steps: rawSteps, say: typeof parsed.say === 'string' ? parsed.say.trim() : '', planner: 'model', model }
}

/** Shape-check planner output; project permissions are verified by the route. */
export function sanitizeSteps(rawSteps) {
  const steps = []
  for (const raw of Array.isArray(rawSteps) ? rawSteps : []) {
    if (!raw || typeof raw !== 'object') continue
    const tool = String(raw.tool || raw.type || raw.action || '').trim()
    if (tool === 'create_file') {
      const app = String(raw.app || raw.app_kind || '').trim()
      if (!AGENT_APPS[app]) continue
      steps.push({
        tool,
        app,
        name: String(raw.name || raw.title || '').trim().slice(0, 80),
        brief: String(raw.brief || raw.content || raw.description || '').trim().slice(0, 2000),
      })
    } else if (tool === 'update_file' || tool === 'open_file') {
      const id = Number(raw.project_id ?? raw.id)
      if (!Number.isSafeInteger(id) || id <= 0) continue
      steps.push(tool === 'open_file' ? { tool, project_id: id } : { tool, project_id: id, brief: String(raw.brief || raw.change || '').trim().slice(0, 2000) })
    } else if (tool === 'navigate') {
      const view = String(raw.view || raw.page || '').trim().toLowerCase()
      if (AGENT_VIEWS.has(view)) steps.push({ tool, view })
    } else if (tool === 'post') {
      steps.push({ tool, body: String(raw.body || raw.text || '').trim().slice(0, 1800), brief: String(raw.brief || '').slice(0, 1000) })
    } else if (tool === 'set_theme') {
      const theme = String(raw.theme || raw.mode || '').trim().toLowerCase()
      if (AGENT_THEMES.has(theme)) steps.push({ tool, theme })
    }
    if (steps.length >= MAX_AGENT_STEPS) break
  }
  return steps
}

// ── Content generation ──────────────────────────────────────────────────

const uid = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2))

export function sanitizeHtml(html) {
  return String(html || '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|form|input|button)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|form|input|button)[^>]*\/?>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"')
    .trim()
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
}

export function markdownToHtml(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n')
  const out = []
  let list = null
  const flush = () => { if (list) { out.push(`</${list}>`); list = null } }
  const inline = s => escapeHtml(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) { flush(); continue }
    const heading = line.match(/^(#{1,3})\s+(.*)$/)
    if (heading) { flush(); out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); continue }
    const bullet = line.match(/^[-*•]\s+(.*)$/)
    const numbered = line.match(/^\d+[.)]\s+(.*)$/)
    if (bullet || numbered) {
      const tag = bullet ? 'ul' : 'ol'
      if (list !== tag) { flush(); out.push(`<${tag}>`); list = tag }
      out.push(`<li>${inline((bullet || numbered)[1])}</li>`)
      continue
    }
    flush()
    out.push(`<p>${inline(line)}</p>`)
  }
  flush()
  return out.join('')
}

function ensureHtml(text, title) {
  const body = String(text || '').trim()
  if (!body) return `<h1>${escapeHtml(title)}</h1><p></p>`
  const html = /<(h1|h2|p|ul|ol|li|strong|table)\b/i.test(body) ? body : markdownToHtml(body)
  const clean = sanitizeHtml(html)
  return /<h1/i.test(clean) ? clean : `<h1>${escapeHtml(title)}</h1>${clean}`
}

export function contentPrompt(app, kind, brief, goal, existing, zh, compact) {
  const language = zh ? 'Write everything in Simplified Chinese.' : 'Write in the same language as the request.'
  const base = `You are Helios, producing the actual content of a ${AGENT_APPS[app].name} ${AGENT_APPS[app].label} inside Helios Space. ${language} Be concrete and complete; never leave placeholders like "..." or "TBD". Respond with ONLY JSON.`
  const spec = compact ? {
    writing: 'JSON shape: {"html": "<h1>Title</h1><p>...</p>"} — a concise document (120-220 words): h1 title, 2-3 short h2 sections with p, one ul list. Only h1, h2, p, ul, li, strong tags.',
    spreadsheet: 'JSON shape: {"rows": [["Header A","Header B","Header C"], ["value","value","value"], ...]} — header row plus 5-8 data rows, 3-5 columns, numbers as plain numbers.',
    presentation: 'JSON shape: {"slides": [{"title": "...", "body": "2-3 short lines separated by \\n", "notes": ""}]} — exactly 5 slides, first is the title slide.',
    notebook: 'JSON shape: {"pages": [{"title": "...", "body": "short markdown with bullets", "tags": ["tag"]}]} — 2 pages.',
    board: 'JSON shape: {"columns": [{"name": "To do", "cards": ["task", "task"]}, {"name": "Doing", "cards": []}, {"name": "Done", "cards": []}]} — 6-8 short, specific cards in "To do".',
    calendar: `JSON shape: {"events": [{"title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "notes": ""}]} — 5-7 events starting from ${new Date().toISOString().slice(0, 10)}.`,
    mail: 'JSON shape: {"to": "", "subject": "...", "body": "short email (under 120 words) with greeting and sign-off"}.',
    code: 'JSON shape: {"language": "html|javascript|python|cpp", "files": {"<filename>": "<code>"}} — 1-2 small, complete, runnable files (under 60 lines each). For web pages use index.html with inline <style> and <script>.',
  }[kind] : {
    writing: 'JSON shape: {"html": "<h1>Title</h1><p>...</p>"} — a full document (300-700 words) using only h1, h2, h3, p, ul, ol, li, strong, em, blockquote tags.',
    spreadsheet: 'JSON shape: {"rows": [["Header A","Header B",...], ["value","value",...], ...]} — first row is headers, 5-20 data rows, at most 8 columns. Numbers as plain numbers. You may use formulas like "=SUM(B2:B6)" in a final total row.',
    presentation: 'JSON shape: {"slides": [{"title": "...", "body": "2-4 short lines separated by \\n", "notes": "speaker notes"}]} — 6-9 slides, first slide is the title slide.',
    notebook: 'JSON shape: {"pages": [{"title": "...", "body": "markdown text", "tags": ["tag"]}]} — 2-5 pages of clear study notes.',
    board: 'JSON shape: {"columns": [{"name": "To do", "cards": ["task", "task"]}, {"name": "Doing", "cards": []}, {"name": "Done", "cards": []}]} — 3 columns, 6-12 specific, actionable cards in total.',
    calendar: `JSON shape: {"events": [{"title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "notes": "..."}]} — 5-12 events starting from ${new Date().toISOString().slice(0, 10)}.`,
    mail: 'JSON shape: {"to": "", "subject": "...", "body": "full email text with greeting and sign-off"}.',
    code: 'JSON shape: {"language": "html|javascript|python|cpp", "files": {"index.html": "...", "styles.css": "...", "app.js": "..."}} — complete, runnable files. For web projects include index.html, styles.css and app.js.',
  }[kind]
  const context = existing ? `\nCurrent content (JSON, keep what is good and apply the change):\n${JSON.stringify(existing).slice(0, compact ? 2500 : 6000)}` : ''
  return `${base}\n${spec}\nOriginal request: ${goal}\nContent brief: ${brief || goal}${context}`
}

/** Instant placeholder so the file can open before the model finishes writing. */
/**
 * Content a freshly created agent file opens with while the model is still
 * writing. It must not look like a finished result (users read an echoed brief
 * as "it just copied my words"), so code projects show a clear placeholder.
 */
export function starterWorkspace(app, title, brief) {
  return JSON.stringify({ schema: 'helios-workspace-v1', appKind: app, data: fallbackData(app, title, brief, undefined, { pending: true }) })
}

function briefSentences(brief) {
  return String(brief || '').split(/[\n.;。；!！?？]+/).map(s => s.trim()).filter(Boolean)
}

export function fallbackData(app, title, brief, existing, { pending = false } = {}) {
  const kind = AGENT_APPS[app].kind
  const sentences = briefSentences(brief)
  const zh = isChinese(brief || title)
  const today = new Date()
  const iso = offset => { const d = new Date(today); d.setDate(today.getDate() + offset); return d.toISOString().slice(0, 10) }
  switch (kind) {
    case 'writing':
      return { html: `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(brief || title)}</p><h2>Outline</h2><ul>${(sentences.length ? sentences : ['Introduction', 'Key points', 'Conclusion']).slice(0, 6).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`, progress: 0, bookmarks: [], notes: [], readerMode: false }
    case 'spreadsheet': {
      const cells = [['Item', 'Detail', 'Value', 'Notes', '', '', '', ''], ...sentences.slice(0, 12).map(s => [s, '', '', '', '', '', '', ''])]
      while (cells.length < 24) cells.push(Array(8).fill(''))
      return { cells, selected: 'A1', chartColumn: 2 }
    }
    case 'presentation':
      return {
        slides: [
          { id: uid(), title, body: brief || '', notes: '', layout: 'title', theme: 'terracotta-glass', shapes: [], transition: 'none' },
          ...(sentences.length ? sentences : ['Key point', 'Next steps']).slice(0, 5).map(s => ({ id: uid(), title: s.slice(0, 60), body: '', notes: '', layout: 'title-content', theme: 'terracotta-glass', shapes: [], transition: 'fade' })),
        ],
        activeSlide: 0,
      }
    case 'notebook':
      return { title, activePageId: 'p1', pages: [{ id: 'p1', title, body: `# ${title}\n\n${sentences.map(s => `- ${s}`).join('\n') || '- '}`, tags: ['agent'], updatedAt: today.toISOString() }] }
    case 'board':
      return { columns: [
        { id: 'todo', name: 'To do', cards: (sentences.length ? sentences : [title]).slice(0, 10).map(s => ({ id: uid(), text: s, due: '', owner: 'You' })) },
        { id: 'doing', name: 'Doing', cards: [] },
        { id: 'done', name: 'Done', cards: [] },
      ], filter: '' }
    case 'calendar':
      return { view: 'month', focusDate: iso(0), events: (sentences.length ? sentences : [title]).slice(0, 8).map((s, i) => ({ id: uid(), title: s.slice(0, 80), date: iso(i), time: '09:00', notes: '' })) }
    case 'mail':
      return { to: '', cc: '', subject: title, body: `Hi,\n\n${brief || ''}\n\nThanks,\n`, savedAt: '' }
    case 'code': {
      const files = existing?.files && typeof existing.files === 'object' ? { ...existing.files } : {}
      if (!Object.keys(files).length) {
        const note = pending
          ? (zh ? 'Helios 正在编写这个项目，代码马上就会出现在这里…' : 'Helios is writing this project — the code will appear here in a moment…')
          : (zh ? 'Helios 没能生成这个项目，请再试一次。' : 'Helios could not generate this project. Please try again.')
        files['index.html'] = `<!doctype html>\n<html lang="${zh ? 'zh-CN' : 'en'}">\n<head>\n  <meta charset="utf-8" />\n  <title>${escapeHtml(title)}</title>\n  <link rel="stylesheet" href="styles.css" />\n</head>\n<body>\n  <main id="app">\n    <h1>${escapeHtml(title)}</h1>\n    <p class="note">${escapeHtml(note)}</p>\n    <!-- ${zh ? '需求' : 'Brief'}: ${escapeHtml(brief || '').replace(/--/g, '—')} -->\n  </main>\n  <script src="app.js"></script>\n</body>\n</html>\n`
        files['styles.css'] = 'body { font-family: system-ui, sans-serif; padding: 24px; background: #f6f5f2; color: #1c1917; }\n.note { color: #6b6560; }\n'
        files['app.js'] = `// ${pending ? (zh ? 'Helios 正在编写…' : 'Helios is writing…') : (zh ? '生成失败' : 'generation failed')}\nconsole.log(${JSON.stringify(title)})\n`
      }
      return { files, activeFile: 'index.html', openFiles: Object.keys(files).slice(0, 3), terminal: [], language: 'html' }
    }
    default:
      return { html: `<h1>${escapeHtml(title)}</h1><p>${escapeHtml(brief || '')}</p>` }
  }
}

/** Convert loosely-shaped model JSON into the exact workspace data each Mini App expects. */
export function shapeData(app, parsed, title, brief, existing) {
  const kind = AGENT_APPS[app].kind
  const fallback = fallbackData(app, title, brief, existing)
  if (!parsed || typeof parsed !== 'object') return fallback
  try {
    switch (kind) {
      case 'writing': {
        const html = typeof parsed.html === 'string' ? parsed.html : typeof parsed.markdown === 'string' ? markdownToHtml(parsed.markdown) : typeof parsed.content === 'string' ? parsed.content : ''
        if (!html.trim()) return fallback
        return { ...(existing || {}), html: ensureHtml(html, title), progress: existing?.progress || 0, bookmarks: existing?.bookmarks || [], notes: existing?.notes || [], readerMode: false }
      }
      case 'spreadsheet': {
        const rows = Array.isArray(parsed.rows) ? parsed.rows : Array.isArray(parsed.cells) ? parsed.cells : null
        if (!rows || !rows.length) return fallback
        const cells = rows.slice(0, 60).map(row => {
          const cols = (Array.isArray(row) ? row : [row]).slice(0, 8).map(v => v === null || v === undefined ? '' : String(v).slice(0, 200))
          while (cols.length < 8) cols.push('')
          return cols
        })
        while (cells.length < 24) cells.push(Array(8).fill(''))
        return { cells, selected: 'A1', chartColumn: 1 }
      }
      case 'presentation': {
        const slides = Array.isArray(parsed.slides) ? parsed.slides : null
        if (!slides || !slides.length) return fallback
        return {
          slides: slides.slice(0, 12).map((s, i) => ({
            id: uid(),
            title: String(s?.title || `Slide ${i + 1}`).slice(0, 120),
            body: String(s?.body || (Array.isArray(s?.bullets) ? s.bullets.join('\n') : '') || '').slice(0, 1200),
            notes: String(s?.notes || '').slice(0, 1500),
            layout: i === 0 ? 'title' : 'title-content',
            theme: i % 3 === 2 ? 'blue-glass' : 'terracotta-glass',
            shapes: [],
            transition: i === 0 ? 'none' : 'fade',
          })),
          activeSlide: 0,
        }
      }
      case 'notebook': {
        const pages = Array.isArray(parsed.pages) ? parsed.pages : null
        if (!pages || !pages.length) return fallback
        const now = new Date().toISOString()
        const shaped = pages.slice(0, 8).map((p, i) => ({ id: `p${i + 1}`, title: String(p?.title || `Page ${i + 1}`).slice(0, 120), body: String(p?.body || p?.content || '').slice(0, 8000), tags: Array.isArray(p?.tags) ? p.tags.map(String).slice(0, 5) : [], updatedAt: now }))
        return { title, activePageId: shaped[0].id, pages: shaped }
      }
      case 'board': {
        const columns = Array.isArray(parsed.columns) ? parsed.columns : Array.isArray(parsed.tasks) ? [{ name: 'To do', cards: parsed.tasks }] : null
        if (!columns || !columns.length) return fallback
        const shaped = columns.slice(0, 5).map((c, i) => ({
          id: i === 0 ? 'todo' : i === 1 ? 'doing' : i === 2 ? 'done' : `col${i}`,
          name: String(c?.name || c?.title || ['To do', 'Doing', 'Done'][i] || `Column ${i + 1}`).slice(0, 60),
          cards: (Array.isArray(c?.cards) ? c.cards : Array.isArray(c?.items) ? c.items : []).slice(0, 20).map(card => ({
            id: uid(),
            text: String(typeof card === 'string' ? card : card?.text || card?.title || '').slice(0, 300),
            due: typeof card?.due === 'string' ? card.due.slice(0, 10) : '',
            owner: 'You',
          })).filter(card => card.text),
        }))
        while (shaped.length < 3) shaped.push({ id: ['todo', 'doing', 'done'][shaped.length], name: ['To do', 'Doing', 'Done'][shaped.length], cards: [] })
        return { columns: shaped, filter: '' }
      }
      case 'calendar': {
        const events = Array.isArray(parsed.events) ? parsed.events : null
        if (!events || !events.length) return fallback
        const shaped = events.slice(0, 30).map(e => ({
          id: uid(),
          title: String(e?.title || 'Event').slice(0, 120),
          date: /^\d{4}-\d{2}-\d{2}$/.test(String(e?.date || '')) ? String(e.date) : new Date().toISOString().slice(0, 10),
          time: /^\d{1,2}:\d{2}$/.test(String(e?.time || '')) ? String(e.time).padStart(5, '0') : '09:00',
          notes: String(e?.notes || '').slice(0, 500),
        }))
        return { view: 'month', focusDate: shaped[0].date, events: shaped }
      }
      case 'mail':
        if (!parsed.body && !parsed.subject) return fallback
        return { to: String(parsed.to || '').slice(0, 300), cc: '', subject: String(parsed.subject || title).slice(0, 200), body: String(parsed.body || '').slice(0, 20000), savedAt: '' }
      case 'code': {
        const files = parsed.files && typeof parsed.files === 'object' && !Array.isArray(parsed.files) ? parsed.files : null
        if (!files) return fallback
        const clean = {}
        for (const [path, content] of Object.entries(files)) {
          if (/^[\w./-]{1,120}$/.test(path) && typeof content === 'string') clean[path.replace(/^\.?\//, '')] = content.slice(0, 200_000)
        }
        if (!Object.keys(clean).length) return fallback
        const merged = { ...(existing?.files || {}), ...clean }
        const active = clean['index.html'] ? 'index.html' : Object.keys(clean)[0]
        return { files: merged, activeFile: active, openFiles: Object.keys(clean).slice(0, 4), terminal: [], language: String(parsed.language || (active.endsWith('.py') ? 'python' : active.endsWith('.cpp') ? 'cpp' : active.endsWith('.js') ? 'javascript' : 'html')).slice(0, 20) }
      }
      default:
        return fallback
    }
  } catch {
    return fallback
  }
}

export function parseFencedFiles(text) {
  const files = {}
  const re = /```([^\n`]*)\n([\s\S]*?)```/g
  let m
  while ((m = re.exec(text))) {
    const meta = m[1].trim()
    let path = ''
    const eq = meta.match(/(?:path\s*=\s*|file\s*=\s*)["']?([^\s"']+)/i)
    if (eq) path = eq[1]
    else if (meta.includes(':')) path = meta.slice(meta.indexOf(':') + 1).trim()
    else if (/\.\w+$/.test(meta)) path = meta.replace(/^[\w+-]+\s+/, '').trim()
    if (path && /^[\w./-]+$/.test(path)) files[path] = m[2].replace(/\n$/, '')
  }
  return files
}

/**
 * Generate the workspace payload for a Mini App file. Falls back to a
 * structured starter built from the brief when the model is unavailable or
 * returns something unusable, so the agent always finishes the task.
 */
export async function generateWorkspace({ app, title, brief, goal, ai, existing }) {
  const kind = AGENT_APPS[app].kind
  const zh = isChinese(goal || brief)
  const compact = isCompactModel(ai)
  let generated = null
  let model = ai?.model || ''
  try {
    const { text, model: used, skipped } = await completeText(ai, [
      { role: 'system', content: contentPrompt(app, kind, brief, goal, existing, zh, compact) },
      { role: 'user', content: `Title: ${title}\nProduce the ${AGENT_APPS[app].label} now.` },
    // CPU-bound local models slow down sharply under load; the file is already
    // open with starter content, so waiting longer beats giving up.
    // Games and small apps easily run past 4k tokens; a truncated app.js is a broken project.
    ], { temperature: 0.5, json: true, timeoutMs: compact ? 240_000 : 150_000, maxTokens: compact ? 800 : (kind === 'code' ? 7000 : 4000) })
    if (!skipped) {
      model = used || model
      generated = extractJson(text)
      if (!generated && kind === 'code') {
        const files = parseFencedFiles(text)
        if (Object.keys(files).length) generated = { files }
      }
      if (!generated && kind === 'writing' && text.trim()) generated = { html: ensureHtml(text, title) }
      if (!generated) console.warn(`agent content: unusable ${kind} output from ${model} (${text.length} chars), tail: ${JSON.stringify(text.slice(-160))}`)
    }
  } catch (error) {
    if (error instanceof AgentUpstreamError) throw error
    console.warn('agent content generation fell back to starter data:', error?.message || error)
  }
  const data = shapeData(app, generated, title, brief, existing)
  return { content: JSON.stringify({ schema: 'helios-workspace-v1', appKind: app, data }), model, generated: Boolean(generated) }
}

export async function generatePostBody({ brief, goal, ai, project }) {
  const zh = isChinese(goal || brief)
  try {
    const { text, skipped } = await completeText(ai, [
      { role: 'system', content: `Write one short, friendly social post (max 60 words, 1-2 sentences, optionally one hashtag) for the Helios Space community feed. ${zh ? 'Write in Simplified Chinese.' : 'Match the language of the request.'} Output only the post text.` },
      { role: 'user', content: `${brief || goal}${project ? `\nThe post shares the project "${project.name}".` : ''}` },
    ], { temperature: 0.7, timeoutMs: 60_000, maxTokens: 160 })
    if (!skipped && text.trim()) return text.trim().replace(/^["“]|["”]$/g, '').slice(0, 1800)
  } catch (error) {
    if (error instanceof AgentUpstreamError) throw error
    console.warn('agent post generation fell back to a template:', error?.message || error)
  }
  return (project ? `${zh ? '刚用 Helios 完成了' : 'Just finished'} “${project.name}” ${zh ? '，欢迎来看看！' : 'with Helios — take a look!'}` : String(goal).slice(0, 280))
}

export function describePlan(steps, zh) {
  const parts = steps.map(step => {
    switch (step.tool) {
      case 'create_file': return zh ? `新建 ${AGENT_APPS[step.app].name} 文件《${step.name}》并写入内容` : `create the ${AGENT_APPS[step.app].name} file “${step.name}” and fill it in`
      case 'update_file': return zh ? `修改《${step.project_name || '当前文件'}》` : `update “${step.project_name || 'the current file'}”`
      case 'open_file': return zh ? `打开《${step.project_name || '文件'}》` : `open “${step.project_name || 'the file'}”`
      case 'navigate': return zh ? `切换到「${{ home: '主页', lifestyle: 'Space 动态', apps: '小应用', chat: '消息', profile: '我的 / 设置' }[step.view]}」页面` : `go to the ${{ home: 'Home', lifestyle: 'Space feed', apps: 'Mini Apps', chat: 'Messages', profile: 'Me / Settings' }[step.view]} page`
      case 'post': return zh ? '在 Space 动态发布一条帖子' : 'share a post in the Space feed'
      case 'set_theme': return zh ? `切换到${{ light: '浅色', dark: '深色', system: '跟随系统' }[step.theme]}主题` : `switch to the ${step.theme} theme`
      default: return step.tool
    }
  })
  if (!parts.length) return ''
  return zh ? `好，我来${parts.join('，然后')}。` : `On it: I will ${parts.join(', then ')}.`
}
