export function resolveChatCompletionsUrl(value) {
  const url = new URL(String(value || '').trim())
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('AI base URL must use http or https')
  url.search = ''
  url.hash = ''
  const pathname = url.pathname.replace(/\/+$/, '')
  if (pathname.endsWith('/chat/completions')) {
    url.pathname = pathname
  } else if (pathname.endsWith('/v1')) {
    url.pathname = pathname + '/chat/completions'
  } else {
    url.pathname = pathname + '/v1/chat/completions'
  }
  return url.toString()
}

export function mapAiUpstreamFailure(status) {
  if (status === 401 || status === 403)
    return { status: 502, error: 'Helios credentials were rejected by the AI provider.', code: 'AI_AUTH' }
  if (status === 429)
    return { status: 503, error: 'Helios is temporarily busy. Please try again shortly.', code: 'AI_RATE_LIMIT' }
  if (status >= 500)
    return { status: 502, error: 'The AI provider is temporarily unavailable.', code: 'AI_UPSTREAM' }
  return { status: 502, error: 'The AI provider rejected this request.', code: 'AI_REQUEST_REJECTED' }
}

export function buildChatCompletionPayload({ model, messages, temperature = 0.4 }) {
  const safeModel = String(model || '').trim() || 'gpt-4o-mini'
  const payload = { model: safeModel, messages, temperature }

  // Many OpenAI-compatible relay providers expose Claude/Gemini/Fable-style
  // models behind the chat-completions endpoint. Keep the request conservative:
  // no unsupported tool/schema/stream fields, and give relays a stable non-
  // streaming payload. Fable 5 relay deployments commonly work with this shape.
  if (/fable/i.test(safeModel)) {
    payload.temperature = Math.min(Math.max(Number(temperature) || 0.4, 0), 1)
  }

  return payload
}

export function extractAssistantReply(data) {
  if (!data || typeof data !== 'object') return ''

  const choice = Array.isArray(data.choices) ? data.choices[0] : null
  const message = choice?.message
  const content = message?.content
  if (typeof content === 'string') return content.trim()
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') return part
        if (typeof part?.text === 'string') return part.text
        if (typeof part?.content === 'string') return part.content
        return ''
      })
      .join('')
      .trim()
  }
  if (typeof choice?.text === 'string') return choice.text.trim()
  if (typeof data.output_text === 'string') return data.output_text.trim()
  if (typeof data.reply === 'string') return data.reply.trim()
  if (typeof data.content === 'string') return data.content.trim()
  if (typeof data.message === 'string') return data.message.trim()
  return ''
}

export function summarizeAiProviderError(rawBody, maxLength = 300) {
  if (!rawBody) return ''
  let text = String(rawBody)
  try {
    const parsed = JSON.parse(text)
    text = parsed?.error?.message || parsed?.message || parsed?.error || text
  } catch {}
  return String(text)
    .replace(/sk-[A-Za-z0-9_-]+/g, '[redacted-key]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

const SELF_NEGATION_RE = /(?:\b(?:i\s*(?:am|'m)\s+not\s+(?:real|a\s+real\s+(?:person|assistant|agent))|i\s*(?:am|'m)\s+(?:just|only)\s+(?:an?\s+)?(?:ai|language\s+model)|as\s+an?\s+(?:ai|language\s+model)|cannot\s+actually\s+(?:do|perform|edit|change|access)|can't\s+actually\s+(?:do|perform|edit|change|access)|do\s+not\s+have\s+the\s+ability\s+to\s+(?:do|perform|edit|change|access))\b|(?:我(?:只是|只是一?个|是一个)?(?:AI|人工智能|语言模型|模型)|我不(?:是真实|是人|能真正)|不是真实(?:的人|助手|智能体)?|不能真正(?:执行|操作|修改|完成|干活)|无法真正(?:执行|操作|修改|完成|干活)|没有(?:实体|真实能力)))/i

const ACTIONABLE_SIGNAL_RE = /(?:\x60\x60\x60|action preview|proposed action|\bi\s+can\b|\bi'll\b|\bi\s+will\b|here(?:'s| is)|steps?:|plan:|draft:|summary:|我可以|我会|下面|计划|步骤|草稿|建议|预览|可以这样|我先)/i

export function normalizeHeliosAssistantReply(reply, meta = {}) {
  const text = String(reply || '').trim()
  if (!text) return text
  if (!SELF_NEGATION_RE.test(text) || ACTIONABLE_SIGNAL_RE.test(text)) return text

  const hasProject = Boolean(meta.hasProject)
  const canEdit = Boolean(meta.canEdit)
  const hasConversation = Boolean(meta.hasConversation)
  const hasSelectedContent = Boolean(meta.hasSelectedContent)
  const currentTarget = hasProject
    ? canEdit
      ? '当前 Project / Mini App 工作区'
      : '当前只读 Project / Mini App 工作区'
    : hasConversation
      ? '当前 Chat / Project conversation'
      : hasSelectedContent
        ? '你明确选中的内容'
        : '当前 Helios Space 上下文'

  return [
    '我是 Helios Space 里的真实 AI 功能，但不是人，也不会控制你的电脑或偷偷替你执行外部操作。',
    '我可以基于' + currentTarget + '继续工作：解释、改写、排查问题、整理反馈、起草回复、生成计划，或在你有权限的 Project 中准备修改。',
    canEdit
      ? '如果要改项目内容，我会先给 Action Preview；你点 Approve 后才会应用。'
      : '如果当前内容是只读的，我会给你可复制的建议或草稿，不会假装已经修改。',
  ].join('\n')
}
