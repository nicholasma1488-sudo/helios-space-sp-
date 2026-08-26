import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildChatCompletionPayload,
  extractAssistantReply,
  mapAiUpstreamFailure,
  normalizeHeliosAssistantReply,
  resolveChatCompletionsUrl,
  summarizeAiProviderError,
} from './aiProvider.js'

const serverDir = path.dirname(fileURLToPath(import.meta.url))
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-api-test-'))
const port = 18_000 + Math.floor(Math.random() * 1_000)
const origin = 'http://127.0.0.1:' + port
const child = spawn(process.execPath, ['--experimental-sqlite', 'server.js'], {
  cwd: serverDir,
  env: {
    ...process.env,
    DATA_DIR: dataDir,
    PORT: String(port),
    HOST: '127.0.0.1',
    NODE_ENV: 'test',
    HELIOS_ADMIN_EMAIL: '',
    HELIOS_ADMIN_PASSWORD: '',
    HELIOS_STRIPE_MOCK: '1',
    STRIPE_PUBLISHABLE_KEY: 'pk_test_helios_mock',
    HELIOS_FREE_DOCUMENTS: '3',
    HELIOS_FREE_CHARACTERS: '200',
    HELIOS_ORBIT_CHARACTERS: '500',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
})

let serverOutput = ''
child.stdout.on('data', chunk => { serverOutput += chunk })
child.stderr.on('data', chunk => { serverOutput += chunk })

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null)
      throw new Error('Server exited before tests started:\n' + serverOutput)
    try {
      const response = await fetch(origin + '/api/site')
      if (response.ok) return
    } catch {}
    await sleep(100)
  }
  throw new Error('Timed out waiting for server:\n' + serverOutput)
}

class ApiClient {
  cookie = ''

  async request(pathname, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
    if (this.cookie) headers.Cookie = this.cookie
    const response = await fetch(origin + pathname, { ...options, headers })
    const setCookie = response.headers.get('set-cookie')
    if (setCookie) {
      const match = setCookie.match(/helios_user=[^;]*/)
      if (match) this.cookie = match[0]
    }
    const body = await response.json().catch(() => ({}))
    return { response, body }
  }

  get(pathname) {
    return this.request(pathname)
  }

  post(pathname, data) {
    return this.request(pathname, {
      method: 'POST',
      body: JSON.stringify(data === undefined ? {} : data),
    })
  }

  put(pathname, data) {
    return this.request(pathname, { method: 'PUT', body: JSON.stringify(data) })
  }

  delete(pathname) {
    return this.request(pathname, { method: 'DELETE' })
  }
}

function expectStatus(result, status, label) {
  assert.equal(
    result.response.status,
    status,
    label + ': expected ' + status + ', got ' + result.response.status + ' ' + JSON.stringify(result.body),
  )
}

async function run() {
  assert.equal(
    resolveChatCompletionsUrl('https://api.openai.com'),
    'https://api.openai.com/v1/chat/completions',
  )
  assert.equal(
    resolveChatCompletionsUrl('https://provider.example/v1/'),
    'https://provider.example/v1/chat/completions',
  )
  assert.equal(
    resolveChatCompletionsUrl('https://provider.example/custom/chat/completions?ignored=true'),
    'https://provider.example/custom/chat/completions',
  )
  assert.throws(() => resolveChatCompletionsUrl('file:///tmp/provider'))
  assert.equal(mapAiUpstreamFailure(401).code, 'AI_AUTH')
  assert.equal(mapAiUpstreamFailure(429).code, 'AI_RATE_LIMIT')
  assert.equal(mapAiUpstreamFailure(503).code, 'AI_UPSTREAM')
  assert.equal(buildChatCompletionPayload({
    model: 'fable-5',
    messages: [{ role: 'user', content: 'hi' }],
    temperature: 1.7,
  }).temperature, 1)
  assert.equal(
    extractAssistantReply({ choices: [{ message: { content: [{ type: 'text', text: 'hello' }] } }] }),
    'hello',
  )
  assert.equal(extractAssistantReply({ choices: [{ text: 'legacy text' }] }), 'legacy text')
  assert.equal(extractAssistantReply({ output_text: 'relay output' }), 'relay output')
  assert.equal(
    summarizeAiProviderError(JSON.stringify({ error: { message: 'bad key sk-secret' } })),
    'bad key [redacted-key]',
  )
  assert.match(
    normalizeHeliosAssistantReply('I am not real, so I cannot actually do that.', { hasProject: true, canEdit: true }),
    /真实 AI 功能/,
  )
  assert.match(
    normalizeHeliosAssistantReply('我只是一个语言模型，不能真正修改。', { hasConversation: true }),
    /Helios Space/,
  )
  assert.equal(
    normalizeHeliosAssistantReply('I cannot control your operating system, but here is the Action Preview: ' + String.fromCharCode(96, 96, 96) + 'json {}' + String.fromCharCode(96, 96, 96)),
    'I cannot control your operating system, but here is the Action Preview: ' + String.fromCharCode(96, 96, 96) + 'json {}' + String.fromCharCode(96, 96, 96),
  )

  await waitForServer()
  const anonymous = new ApiClient()
  const alice = new ApiClient()
  const bob = new ApiClient()

  const site = await anonymous.get('/api/site')
  expectStatus(site, 200, 'site info')
  assert.equal(site.body.ai_enabled, false)

  const aliceSignup = await alice.post('/api/signup', {
    name: 'Alice Orbit',
    handle: 'alice.orbit',
    email: 'alice@example.test',
    password: 'correct-horse',
  })
  expectStatus(aliceSignup, 200, 'alice signup')
  assert.equal(aliceSignup.body.user.name, 'Alice Orbit')
  assert.equal(aliceSignup.body.user.plan, undefined)
  assert.equal(site.body.plans, undefined)

  const missingPassword = await anonymous.post('/api/signup', {
    name: 'No Password',
    handle: 'no.password',
    email: 'nopass@example.test',
  })
  expectStatus(missingPassword, 400, 'signup requires password')

  const bobSignup = await bob.post('/api/signup', {
    name: 'Bob Solar',
    handle: 'bob.solar',
    email: 'bob@example.test',
    password: 'correct-battery',
  })
  expectStatus(bobSignup, 200, 'bob signup')
  assert.equal(bobSignup.body.user.plan, undefined)

  const duplicate = await anonymous.post('/api/signup', {
    name: 'Duplicate',
    handle: 'alice.orbit',
    email: 'other@example.test',
    password: 'correct-staple',
  })
  expectStatus(duplicate, 409, 'duplicate account')

  const badLogin = await anonymous.post('/api/login', {
    email: 'alice@example.test',
    password: 'incorrect-password',
  })
  expectStatus(badLogin, 401, 'bad login')

  const projectResult = await alice.post('/api/projects', {
    name: 'Solar Journal',
    type: 'doc',
    space: 'Lifestyle Lab',
    content: 'First light',
  })
  expectStatus(projectResult, 200, 'create project')
  const projectId = projectResult.body.project.id

  const updateProject = await alice.put('/api/projects/' + projectId, { content: 'Second light' })
  expectStatus(updateProject, 200, 'update project')
  assert.equal(updateProject.body.project.content, 'Second light')

  const connectedProject = await alice.post('/api/projects', {
    name: 'Realtime Orbit Editor',
    type: 'code',
    space: 'Coding',
    space_id: 'coding',
    app_kind: 'web-code',
    visibility: 'public',
    content: JSON.stringify({ schema: 'helios-workspace-v1', appKind: 'web-code', data: { files: { 'index.html': '<h1>Orbit</h1>' }, activeFile: 'index.html', openFiles: ['index.html'], terminal: [] } }),
    metadata: { source: 'integration-test' },
  })
  expectStatus(connectedProject, 200, 'create contextual project')
  const connectedProjectId = connectedProject.body.project.id
  assert.equal(connectedProject.body.project.space_id, 'coding')
  assert.equal(connectedProject.body.project.app_kind, 'web-code')

  const publicProjectForBob = await bob.get('/api/projects/' + connectedProjectId)
  expectStatus(publicProjectForBob, 200, 'public project permission')
  assert.equal(publicProjectForBob.body.project.can_edit, false)

  const migratedFiles = await alice.get('/api/projects/' + connectedProjectId + '/files')
  expectStatus(migratedFiles, 200, 'list project files')
  assert.equal(migratedFiles.body.files.some(file => file.path === 'index.html'), true)

  const createdFile = await alice.post('/api/projects/' + connectedProjectId + '/files', {
    path: 'README.md',
    content: '# Realtime Orbit Editor\n',
  })
  expectStatus(createdFile, 201, 'create project file')

  const savedFiles = await alice.put('/api/projects/' + connectedProjectId + '/files', {
    files: { 'src/app.ts': 'export const ready = true\n' },
  })
  expectStatus(savedFiles, 200, 'upsert project files')
  assert.equal(savedFiles.body.files.some(file => file.path === 'src/app.ts'), true)

  const renamedFile = await alice.post('/api/projects/' + connectedProjectId + '/files/rename', {
    from: 'src/app.ts',
    to: 'src/main.ts',
  })
  expectStatus(renamedFile, 200, 'rename project file')

  const firstCommit = await alice.post('/api/projects/' + connectedProjectId + '/commits', {
    message: 'Add repository files',
  })
  expectStatus(firstCommit, 201, 'create project commit')
  assert.equal(firstCommit.body.commit.message, 'Add repository files')
  assert.ok(firstCommit.body.commit.files['README.md'])

  const commitList = await alice.get('/api/projects/' + connectedProjectId + '/commits')
  expectStatus(commitList, 200, 'list project commits')
  assert.equal(commitList.body.commits[0].message, 'Add repository files')

  const openedCommit = await alice.get('/api/projects/' + connectedProjectId + '/commits/' + firstCommit.body.commit.id)
  expectStatus(openedCommit, 200, 'open project commit')
  assert.ok(openedCommit.body.commit.files['src/main.ts'])

  const laterSave = await alice.put('/api/projects/' + connectedProjectId + '/files', {
    files: { 'src/main.ts': 'export const ready = false\n' },
  })
  expectStatus(laterSave, 200, 'edit after commit')
  const restoredCommit = await alice.post('/api/projects/' + connectedProjectId + '/commits/' + firstCommit.body.commit.id + '/restore')
  expectStatus(restoredCommit, 200, 'restore project commit')
  assert.match(restoredCommit.body.files.find(file => file.path === 'src/main.ts').content, /ready = true/)

  const bobCannotEditFiles = await bob.put('/api/projects/' + connectedProjectId + '/files', {
    files: { 'hack.ts': 'nope' },
  })
  expectStatus(bobCannotEditFiles, 404, 'file write requires edit access')

  const checkpoint = await alice.post('/api/projects/' + connectedProjectId + '/versions', { label: 'First runnable preview' })
  expectStatus(checkpoint, 201, 'create project version')
  const versions = await alice.get('/api/projects/' + connectedProjectId + '/versions')
  expectStatus(versions, 200, 'list project versions')
  assert.equal(versions.body.versions[0].label, 'First runnable preview')
  const changedConnectedProject = await alice.put('/api/projects/' + connectedProjectId, { content: 'temporary changed content' })
  expectStatus(changedConnectedProject, 200, 'change versioned project')
  const restored = await alice.post('/api/projects/' + connectedProjectId + '/versions/' + checkpoint.body.id + '/restore')
  expectStatus(restored, 200, 'restore project version')
  assert.match(restored.body.project.content, /helios-workspace-v1/)

  const projectFeedback = await bob.post('/api/projects/' + connectedProjectId + '/comments', { body: 'The runnable preview makes the idea easy to understand.' })
  expectStatus(projectFeedback, 201, 'project-level feedback')
  const projectComments = await alice.get('/api/projects/' + connectedProjectId + '/comments')
  expectStatus(projectComments, 200, 'list project comments')
  assert.equal(projectComments.body.comments.length, 1)

  const collaborator = await alice.post('/api/projects/' + connectedProjectId + '/collaborators', { handle: '@bob.solar', role: 'editor' })
  expectStatus(collaborator, 201, 'invite project collaborator')
  const bobProjects = await bob.get('/api/projects')
  expectStatus(bobProjects, 200, 'collaborator project list')
  assert.equal(bobProjects.body.projects.find(project => project.id === connectedProjectId).can_edit, true)

  const customHobby = await alice.post('/api/spaces', { name: 'Woodworking' })
  expectStatus(customHobby, 201, 'create custom hobby Space')
  const spacesAfterCreate = await alice.get('/api/spaces')
  expectStatus(spacesAfterCreate, 200, 'list Subject and Hobby Spaces')
  assert.equal(spacesAfterCreate.body.spaces.some(space => space.id === customHobby.body.space.id), true)

  const liveCreate = await alice.post('/api/live', {
    project_id: connectedProjectId,
    title: 'Building the Orbit Editor',
    audience: 'public',
    permissions: { comment: true, suggest: true, request_edit: true },
  })
  expectStatus(liveCreate, 201, 'start Live workspace')
  const liveId = liveCreate.body.session.id
  const liveDiscovery = await bob.get('/api/live?space_id=coding')
  expectStatus(liveDiscovery, 200, 'discover Live workspace')
  assert.equal(liveDiscovery.body.sessions.some(session => session.id === liveId), true)
  const liveSuggestion = await bob.post('/api/live/' + liveId + '/events', { kind: 'suggestion', payload: { text: 'Add keyboard navigation to the file tree.' } })
  expectStatus(liveSuggestion, 201, 'send Live suggestion')
  const liveBundle = await alice.get('/api/live/' + liveId)
  expectStatus(liveBundle, 200, 'open actual Live project session')
  assert.equal(liveBundle.body.project.id, connectedProjectId)
  assert.equal(liveBundle.body.events.some(event => event.kind === 'suggestion'), true)

  const projectConversation = await alice.post('/api/conversations', { kind: 'project', project_id: connectedProjectId })
  expectStatus(projectConversation, 201, 'create Project Chat')
  const conversationId = projectConversation.body.conversation.id
  const bobConversations = await bob.get('/api/conversations')
  expectStatus(bobConversations, 200, 'collaborator Project Chat membership')
  assert.equal(bobConversations.body.conversations.some(conversation => conversation.id === conversationId), true)
  const projectMessage = await bob.post('/api/conversations/' + conversationId + '/messages', {
    body: 'I attached the work I am reviewing.', attachment_type: 'project', attachment_id: connectedProjectId,
  })
  expectStatus(projectMessage, 201, 'send Project rich preview')
  const fileMessage = await bob.post('/api/conversations/' + conversationId + '/messages', {
    body: 'Here are the notes.', attachment_type: 'file',
    file: { name: 'review.txt', mime: 'text/plain', size: 5, data: 'data:text/plain;base64,aGVsbG8=' },
  })
  expectStatus(fileMessage, 201, 'send file in Chat Hub')
  const conversationMessages = await alice.get('/api/conversations/' + conversationId + '/messages')
  expectStatus(conversationMessages, 200, 'load persistent Chat messages')
  assert.equal(conversationMessages.body.messages.some(message => message.attachment_type === 'project' && message.attachment.name === 'Realtime Orbit Editor'), true)
  assert.equal(conversationMessages.body.messages.some(message => message.attachment_type === 'file' && message.attachment.name === 'review.txt'), true)
  const pinned = await alice.post('/api/conversations/' + conversationId + '/messages/' + projectMessage.body.message.id + '/pin')
  expectStatus(pinned, 200, 'pin Chat content')
  assert.equal(pinned.body.pinned, true)

  const exploration = await bob.get('/api/explore')
  expectStatus(exploration, 200, 'permission-aware Explore')
  assert.equal(exploration.body.projects.some(project => project.id === connectedProjectId), true)
  assert.equal(exploration.body.live.some(session => session.id === liveId), true)
  const globalSearch = await bob.get('/api/search?q=Orbit%20Editor')
  expectStatus(globalSearch, 200, 'permission-aware global search')
  assert.equal(globalSearch.body.projects.some(project => project.id === connectedProjectId), true)

  const bobSolar = await bob.get('/api/solar')
  expectStatus(bobSolar, 200, 'Solar progression')
  assert.ok(bobSolar.body.total >= 3)

  const aliceNotifications = await alice.get('/api/notifications')
  expectStatus(aliceNotifications, 200, 'targeted notifications')
  assert.equal(aliceNotifications.body.notifications.some(notification => notification.target_type === 'live' && Number(notification.target_id) === liveId), true)
  const markNotificationRead = await alice.post('/api/notifications/read', { ids: aliceNotifications.body.notifications.slice(0, 2).map(notification => notification.id) })
  expectStatus(markNotificationRead, 200, 'mark targeted notifications read')

  const endLive = await alice.post('/api/live/' + liveId + '/end')
  expectStatus(endLive, 200, 'end Live and retain replay')
  const removeCustomHobby = await alice.delete('/api/spaces/' + customHobby.body.space.id)
  expectStatus(removeCustomHobby, 200, 'remove custom hobby Space')

  const privatePost = await alice.post('/api/posts', {
    category: 'reflection',
    body: 'A private orbital note',
    audience: 'private',
    project_id: projectId,
  })
  expectStatus(privatePost, 201, 'create private post')

  const publicPost = await alice.post('/api/posts', {
    category: 'study',
    body: 'Learning orbital interaction design',
    audience: 'public',
    project_id: projectId,
  })
  expectStatus(publicPost, 201, 'create public post')
  const publicPostId = publicPost.body.post.id
  assert.equal(publicPost.body.post.comment_count, 0)
  assert.equal(publicPost.body.post.is_saved, false)

  const mediaPost = await alice.post('/api/posts', {
    category: 'activity',
    body: 'Finished a meaningful 5 km practice.',
    audience: 'public',
    space_id: 'running',
    post_type: 'meaningful-progress',
    media_url: 'data:image/png;base64,iVBORw0KGgo=',
  })
  expectStatus(mediaPost, 201, 'create Lifestyle media progress')
  const exactMediaPost = await bob.get('/api/posts/' + mediaPost.body.post.id)
  expectStatus(exactMediaPost, 200, 'open exact Lifestyle notification target')
  assert.equal(exactMediaPost.body.post.space_id, 'running')
  assert.match(exactMediaPost.body.post.media_url, /^data:image\/png/)

  for (let index = 0; index < 12; index += 1) {
    const created = await alice.post('/api/posts', {
      category: index % 2 === 0 ? 'code' : 'reading',
      body: 'Pagination sample ' + index,
      audience: 'public',
    })
    expectStatus(created, 201, 'pagination post ' + index)
  }

  const bobFeed = await bob.get('/api/posts?limit=50')
  expectStatus(bobFeed, 200, 'bob feed')
  assert.equal(bobFeed.body.posts.some(post => post.id === privatePost.body.post.id), false)
  assert.equal(bobFeed.body.posts.some(post => post.id === publicPostId), true)

  const aliceFeed = await alice.get('/api/posts?limit=50')
  expectStatus(aliceFeed, 200, 'alice feed')
  assert.equal(aliceFeed.body.posts.some(post => post.id === privatePost.body.post.id), true)

  const pageOne = await bob.get('/api/posts?limit=5')
  expectStatus(pageOne, 200, 'page one')
  assert.equal(pageOne.body.posts.length, 5)
  assert.ok(pageOne.body.next_cursor)
  const pageTwo = await bob.get('/api/posts?limit=5&cursor=' + pageOne.body.next_cursor)
  expectStatus(pageTwo, 200, 'page two')
  const firstIds = new Set(pageOne.body.posts.map(post => post.id))
  assert.equal(pageTwo.body.posts.some(post => firstIds.has(post.id)), false)

  const categoryFeed = await bob.get('/api/posts?category=study')
  expectStatus(categoryFeed, 200, 'category filter')
  assert.ok(categoryFeed.body.posts.every(post => post.category === 'study'))

  const searchFeed = await bob.get('/api/posts?q=orbital%20interaction')
  expectStatus(searchFeed, 200, 'search filter')
  assert.equal(searchFeed.body.posts.some(post => post.id === publicPostId), true)

  const like = await bob.post('/api/posts/' + publicPostId + '/react', { emoji: '👍' })
  expectStatus(like, 200, 'like')
  assert.deepEqual(like.body.post.my_reactions, ['👍'])
  const love = await bob.post('/api/posts/' + publicPostId + '/react', { emoji: '❤️' })
  expectStatus(love, 200, 'replace reaction')
  assert.deepEqual(love.body.post.my_reactions, ['❤️'])
  assert.equal(love.body.post.reactions['👍'] || 0, 0)
  const removeLove = await bob.post('/api/posts/' + publicPostId + '/react', { emoji: '❤️' })
  expectStatus(removeLove, 200, 'remove reaction')
  assert.deepEqual(removeLove.body.post.my_reactions, [])

  const invalidReaction = await bob.post('/api/posts/' + publicPostId + '/react', { emoji: '💣' })
  expectStatus(invalidReaction, 400, 'invalid reaction')

  const commentResult = await bob.post('/api/posts/' + publicPostId + '/comments', {
    body: 'This interaction study is useful.',
  })
  expectStatus(commentResult, 201, 'create comment')
  const commentId = commentResult.body.comment.id

  const comments = await alice.get('/api/posts/' + publicPostId + '/comments')
  expectStatus(comments, 200, 'list comments')
  assert.equal(comments.body.comments.length, 1)
  assert.equal(comments.body.comments[0].can_delete, true)

  const privateComments = await bob.get('/api/posts/' + privatePost.body.post.id + '/comments')
  expectStatus(privateComments, 404, 'private comments hidden')

  const deleteComment = await alice.delete('/api/comments/' + commentId)
  expectStatus(deleteComment, 200, 'post author deletes comment')

  const save = await bob.post('/api/posts/' + publicPostId + '/save', { saved: true })
  expectStatus(save, 200, 'save post')
  assert.equal(save.body.saved, true)
  const savedFeed = await bob.get('/api/posts?saved=true')
  expectStatus(savedFeed, 200, 'saved feed')
  assert.deepEqual(savedFeed.body.posts.map(post => post.id), [publicPostId])
  const unsave = await bob.post('/api/posts/' + publicPostId + '/save', { saved: false })
  expectStatus(unsave, 200, 'unsave post')
  assert.equal(unsave.body.saved, false)

  const invalidCursor = await bob.get('/api/posts?cursor=not-a-number')
  expectStatus(invalidCursor, 400, 'invalid cursor')
  const invalidPostId = await bob.get('/api/posts/nope/comments')
  expectStatus(invalidPostId, 400, 'invalid post id')

  const malformed = await fetch(origin + '/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  })
  assert.equal(malformed.status, 400)
  assert.equal((await malformed.json()).code, 'INVALID_JSON')

  const aiNotConfigured = await alice.post('/api/helios/chat', {
    messages: [{ role: 'user', content: 'Hello' }],
  })
  expectStatus(aiNotConfigured, 503, 'AI not configured')
  assert.equal(aiNotConfigured.body.code, 'AI_NOT_CONFIGURED')

  const billingDenied = await anonymous.get('/api/billing')
  expectStatus(billingDenied, 401, 'billing requires a session')

  const aliceBilling = await alice.get('/api/billing')
  expectStatus(aliceBilling, 410, 'billing is gone')
  assert.equal(aliceBilling.body.code, 'NO_PLANS')

  const stayFree = await alice.post('/api/billing/checkout', { plan: 'free' })
  expectStatus(stayFree, 410, 'checkout is gone')
  assert.equal(stayFree.body.code, 'NO_PLANS')

  const wordDoc = await alice.post('/api/projects', {
    name: 'Document',
    type: 'writing',
    space_id: 'business',
    app_kind: 'word-docs',
    visibility: 'private',
    content: JSON.stringify({
      schema: 'helios-workspace-v1',
      appKind: 'word-docs',
      data: { html: '<h1>Work document</h1><h2>Purpose</h2><p></p>' },
    }),
  })
  expectStatus(wordDoc, 200, 'create Word workspace')
  assert.equal(wordDoc.body.project.app_kind, 'word-docs')
  assert.equal(wordDoc.body.project.type, 'writing')
  assert.equal(wordDoc.body.project.content.includes('Work document'), true)

  const workbook = await alice.post('/api/projects', {
    name: 'Workbook',
    type: 'spreadsheet',
    space_id: 'business',
    app_kind: 'spreadsheet',
    visibility: 'private',
  })
  expectStatus(workbook, 200, 'create Excel workspace')
  assert.equal(workbook.body.project.app_kind, 'spreadsheet')
  assert.equal(workbook.body.project.type, 'spreadsheet')

  const overChars = await alice.put('/api/projects/' + wordDoc.body.project.id, {
    content: JSON.stringify({
      schema: 'helios-workspace-v1',
      appKind: 'word-docs',
      data: { html: '<p>' + '字'.repeat(201) + '</p>' },
    }),
  })
  expectStatus(overChars, 200, 'writing character caps are open')

  const thirdWriting = await alice.post('/api/projects', {
    name: 'Third draft',
    type: 'writing',
    space_id: 'business',
    app_kind: 'word-docs',
    visibility: 'private',
  })
  expectStatus(thirdWriting, 200, 'free allows 3 writing documents')

  const fourthWriting = await alice.post('/api/projects', {
    name: 'Fourth draft',
    type: 'writing',
    space_id: 'business',
    app_kind: 'word-docs',
    visibility: 'private',
  })
  expectStatus(fourthWriting, 200, 'writing document caps are open')

  const extraWorkbook = await alice.post('/api/projects', {
    name: 'Another workbook',
    type: 'spreadsheet',
    space_id: 'business',
    app_kind: 'spreadsheet',
    visibility: 'private',
  })
  expectStatus(extraWorkbook, 200, 'spreadsheets stay free after writing limit')

  const stocksProject = await alice.post('/api/projects', {
    name: 'Watchlist',
    type: 'doc',
    space_id: 'business',
    app_kind: 'stocks',
    visibility: 'private',
    content: JSON.stringify({
      schema: 'helios-workspace-v1',
      appKind: 'stocks',
      data: { symbols: ['AAPL', 'MSFT'] },
    }),
  })
  expectStatus(stocksProject, 200, 'create Stocks watchlist')
  assert.equal(stocksProject.body.project.app_kind, 'stocks')

  const aliceQuotesDenied = await alice.get('/api/markets/quotes?symbols=AAPL,MSFT')
  expectStatus(aliceQuotesDenied, 200, 'stock quotes are open')

  const bobQuotes = await bob.get('/api/markets/quotes?symbols=AAPL')
  expectStatus(bobQuotes, 200, 'stock quotes are open')

  const missingSymbols = await alice.get('/api/markets/quotes')
  expectStatus(missingSymbols, 400, 'quotes still require tickers')

  const unknownPlan = await alice.post('/api/billing/checkout', { plan: 'alpha' })
  expectStatus(unknownPlan, 410, 'paid plans are gone')
  const rejectedWallet = await alice.post('/api/billing/stripe', { plan: 'orbit', method: 'wechat' })
  expectStatus(rejectedWallet, 410, 'stripe checkout is gone')
  const rejectedWebhook = await anonymous.post('/api/billing/stripe/webhook', {
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_gone' } },
  })
  expectStatus(rejectedWebhook, 410, 'stripe webhook is gone')

  const sessionAfterPay = await alice.get('/api/session')
  expectStatus(sessionAfterPay, 200, 'session has no plan field')
  assert.equal(sessionAfterPay.body.user.plan, undefined)

  const exportAfterPay = await alice.get('/api/export')
  expectStatus(exportAfterPay, 200, 'export has no billing')
  assert.equal(exportAfterPay.body.account.plan, undefined)
  assert.equal(exportAfterPay.body.billing, undefined)

  const aliceQuotes = await alice.get('/api/markets/quotes?symbols=AAPL,MSFT')
  expectStatus(aliceQuotes, 200, 'any account can read stock quotes')
  assert.equal(aliceQuotes.body.quotes.some(quote => quote.symbol === 'AAPL' && quote.price > 0), true)

  const longDraft = await alice.put('/api/projects/' + wordDoc.body.project.id, {
    content: JSON.stringify({
      schema: 'helios-workspace-v1',
      appKind: 'word-docs',
      data: { html: '<p>' + '字'.repeat(501) + '</p>' },
    }),
  })
  expectStatus(longDraft, 200, 'long writing stays allowed')

  const extraWriting = await alice.post('/api/projects', {
    name: 'Another draft',
    type: 'writing',
    space_id: 'business',
    app_kind: 'word-docs',
    visibility: 'private',
  })
  expectStatus(extraWriting, 200, 'more writing documents stay allowed')

  const tickerRequired = await alice.get('/api/markets/quotes')
  expectStatus(tickerRequired, 400, 'quotes require tickers')

  const unknownApi = await alice.get('/api/does-not-exist')
  expectStatus(unknownApi, 404, 'unknown API')
  assert.equal(unknownApi.body.code, 'API_NOT_FOUND')

  const deleteProject = await alice.delete('/api/projects/' + projectId)
  expectStatus(deleteProject, 200, 'delete project')
  const feedAfterProjectDelete = await alice.get('/api/posts?q=Learning%20orbital')
  expectStatus(feedAfterProjectDelete, 200, 'feed after project deletion')
  assert.equal(feedAfterProjectDelete.body.posts[0].project_id, null)

  const logout = await bob.post('/api/logout')
  expectStatus(logout, 200, 'logout')
  const afterLogout = await bob.get('/api/me')
  expectStatus(afterLogout, 401, 'session cleared')

  console.log('Helios API integration: all auth, social, AI-helper, and edge-case checks passed')
}

try {
  await run()
} finally {
  child.kill('SIGTERM')
  await Promise.race([
    new Promise(resolve => child.once('exit', resolve)),
    sleep(2_000),
  ])
  if (child.exitCode === null) child.kill('SIGKILL')
  fs.rmSync(dataDir, { recursive: true, force: true })
}
