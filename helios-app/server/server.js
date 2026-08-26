// Helios Space — application server
// Node.js v22 built-in node:sqlite (no native compilation needed)
import express from 'express'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import { DatabaseSync } from 'node:sqlite'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { EventEmitter } from 'node:events'
import { fileURLToPath } from 'node:url'
import {
  buildChatCompletionPayload,
  extractAssistantReply,
  mapAiUpstreamFailure,
  normalizeHeliosAssistantReply,
  resolveChatCompletionsUrl,
  summarizeAiProviderError,
} from './aiProvider.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number.parseInt(process.env.PORT || '8080', 10)
const HOST = process.env.HOST || '127.0.0.1'
const DATA_DIR = process.env.DATA_DIR || __dirname
const DIST_DIR = path.join(__dirname, '..', 'dist')
const ADMIN_HOST = 'admin.helioschat.space'

const PROJECT_TYPES = new Set([
  'code', 'doc', 'design', 'research', 'writing', 'spreadsheet', 'presentation',
  'drawing', 'survey', 'board', 'notebook', 'book', 'math',
])
const POST_CATEGORIES = new Set(['code', 'study', 'activity', 'reading', 'reflection'])
const POST_AUDIENCES = new Set(['public', 'private'])
const REACTION_EMOJIS = new Set(['👍', '❤️', '🙌', '💡', '✨', '🔥'])
const PROJECT_VISIBILITIES = new Set(['private', 'space', 'public'])
const LIVE_EVENT_KINDS = new Set(['comment', 'reaction', 'suggestion', 'collaboration_request', 'work', 'cursor'])
const CHAT_KINDS = new Set(['project', 'group', 'private'])
const SPACE_CATALOG = [
  ['coding', 'Coding', 'subject'], ['english', 'English', 'subject'], ['maths', 'Maths', 'subject'],
  ['science', 'Science', 'subject'], ['art', 'Art', 'subject'], ['business', 'Business', 'subject'],
  ['ai', 'AI', 'subject'], ['languages', 'Languages', 'subject'], ['history', 'History', 'subject'],
  ['geography', 'Geography', 'subject'], ['engineering', 'Engineering', 'subject'], ['design', 'Design', 'subject'],
  ['basketball', 'Basketball', 'hobby'], ['running', 'Running', 'hobby'], ['reading', 'Reading', 'hobby'],
  ['music', 'Music', 'hobby'], ['photography', 'Photography', 'hobby'], ['gaming', 'Gaming', 'hobby'],
  ['cooking', 'Cooking', 'hobby'], ['robotics', 'Robotics', 'hobby'], ['travel', 'Travel', 'hobby'],
]

const MAX_USER_NAME_LENGTH = 100
const MAX_EMAIL_LENGTH = 254
const MAX_PASSWORD_LENGTH = 128
const MAX_PROJECT_NAME_LENGTH = 120
const MAX_PROJECT_SPACE_LENGTH = 120
const MAX_PROJECT_CONTENT_LENGTH = 2_000_000
const MAX_POST_BODY_LENGTH = 2_000
const MAX_COMMENT_BODY_LENGTH = 600
const MAX_POST_SEARCH_LENGTH = 100
const MAX_SPACE_ID_LENGTH = 80
const MAX_APP_KIND_LENGTH = 80
const MAX_METADATA_LENGTH = 100_000
const MAX_FILE_CONTENT_LENGTH = 200_000
const MAX_PROJECT_FILES = 80
const MAX_COMMIT_MESSAGE_LENGTH = 200
const MAX_CHAT_MESSAGE_LENGTH = 4_000
const FILE_PATH_PATTERN = /^(?!.*\.\.)(?!\/)[\w./-]{1,120}$/
const FILE_EXTENSION_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|html|py|txt|csv|svg|ipynb)$/i
const MAX_LIVE_EVENT_LENGTH = 2_000
const DEFAULT_POST_PAGE_SIZE = 15
const MAX_POST_PAGE_SIZE = 50
const USER_SESSION_MS = 30 * 24 * 60 * 60 * 1000
const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000
const IS_PRODUCTION = process.env.NODE_ENV === 'production'

// Admin credentials are read from environment variables.
// Set HELIOS_ADMIN_EMAIL and HELIOS_ADMIN_PASSWORD before starting the server.
// If not set, admin seeding is skipped and the admin panel remains inaccessible
// until the variables are provided.
const ADMIN_EMAIL    = process.env.HELIOS_ADMIN_EMAIL?.trim().toLowerCase() ?? null
const ADMIN_PASSWORD = process.env.HELIOS_ADMIN_PASSWORD ?? null

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------
fs.mkdirSync(DATA_DIR, { recursive: true })
const db = new DatabaseSync(path.join(DATA_DIR, 'helios.db'))
db.exec(`PRAGMA journal_mode = WAL;`)
db.exec(`PRAGMA foreign_keys = ON;`)
db.exec(`PRAGMA busy_timeout = 5000;`)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    handle        TEXT UNIQUE NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'active'
  );
  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token      TEXT PRIMARY KEY,
    kind       TEXT NOT NULL,
    subject_id INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS site_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    name        TEXT NOT NULL,
    space       TEXT NOT NULL DEFAULT '',
    type        TEXT NOT NULL DEFAULT 'code',
    content     TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS posts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    category    TEXT NOT NULL DEFAULT 'reflection',
    body        TEXT NOT NULL,
    project_id  INTEGER,
    audience    TEXT NOT NULL DEFAULT 'public',
    created_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reactions (
    post_id   INTEGER NOT NULL,
    user_id   INTEGER NOT NULL,
    emoji     TEXT NOT NULL,
    PRIMARY KEY (post_id, user_id, emoji)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id     INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS saved_posts (
    post_id     INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    created_at  TEXT NOT NULL,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS user_spaces (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    space_id    TEXT NOT NULL,
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL,
    custom      INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL,
    UNIQUE(user_id, space_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS project_versions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    label       TEXT NOT NULL DEFAULT '',
    content     TEXT NOT NULL,
    metadata    TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS project_comments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    body        TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS project_collaborators (
    project_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    role        TEXT NOT NULL DEFAULT 'viewer',
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TEXT NOT NULL,
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS live_sessions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id    INTEGER NOT NULL,
    project_id  INTEGER NOT NULL,
    space_id    TEXT NOT NULL,
    title       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'live',
    audience    TEXT NOT NULL DEFAULT 'public',
    permissions TEXT NOT NULL DEFAULT '{}',
    viewer_count INTEGER NOT NULL DEFAULT 0,
    started_at  TEXT NOT NULL,
    ended_at    TEXT,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS live_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    kind        TEXT NOT NULL,
    payload     TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES live_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS conversations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    kind        TEXT NOT NULL,
    title       TEXT NOT NULL,
    project_id  INTEGER,
    created_by  INTEGER NOT NULL,
    created_at  TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    role        TEXT NOT NULL DEFAULT 'member',
    last_read_at TEXT,
    created_at  TEXT NOT NULL,
    PRIMARY KEY (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id   INTEGER NOT NULL,
    body        TEXT NOT NULL DEFAULT '',
    attachment_type TEXT,
    attachment_id INTEGER,
    attachment_json TEXT NOT NULL DEFAULT '{}',
    created_at  TEXT NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS pinned_messages (
    conversation_id INTEGER NOT NULL,
    message_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    created_at  TEXT NOT NULL,
    PRIMARY KEY (conversation_id, message_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS solar_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_id   TEXT NOT NULL,
    amount      INTEGER NOT NULL,
    reason      TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    UNIQUE(user_id, source_type, source_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    actor_id    INTEGER,
    kind        TEXT NOT NULL,
    title       TEXT NOT NULL,
    detail      TEXT NOT NULL DEFAULT '',
    target_type TEXT,
    target_id   TEXT,
    read_at     TEXT,
    created_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER NOT NULL,
    followed_id INTEGER NOT NULL,
    created_at  TEXT NOT NULL,
    PRIMARY KEY (follower_id, followed_id),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS collaboration_requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL,
    requester_id INTEGER NOT NULL,
    message     TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    UNIQUE(project_id, requester_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_projects_user_updated ON projects(user_id, updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_visibility_id ON posts(audience, id DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category, id DESC);
  CREATE INDEX IF NOT EXISTS idx_reactions_post ON reactions(post_id);
  CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id, id ASC);
  CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
  CREATE INDEX IF NOT EXISTS idx_saved_posts_user_created ON saved_posts(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_project_versions_project ON project_versions(project_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(project_id, id ASC);
  CREATE INDEX IF NOT EXISTS idx_live_sessions_status_space ON live_sessions(status, space_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_live_events_session ON live_events(session_id, id ASC);
  CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id, conversation_id);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, id ASC);
  CREATE INDEX IF NOT EXISTS idx_solar_events_user ON solar_events(user_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, id DESC);
  CREATE INDEX IF NOT EXISTS idx_collaboration_requests_project ON collaboration_requests(project_id, status, id DESC);
  CREATE TABLE IF NOT EXISTS project_files (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL,
    path        TEXT NOT NULL,
    content     TEXT NOT NULL DEFAULT '',
    updated_at  TEXT NOT NULL,
    UNIQUE(project_id, path),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS project_commits (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id  INTEGER NOT NULL,
    user_id     INTEGER NOT NULL,
    message     TEXT NOT NULL,
    snapshot    TEXT NOT NULL,
    created_at  TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id, path);
  CREATE INDEX IF NOT EXISTS idx_project_commits_project ON project_commits(project_id, id DESC);
  CREATE TABLE IF NOT EXISTS billing_methods (
    user_id     INTEGER PRIMARY KEY,
    brand       TEXT NOT NULL,
    last4       TEXT NOT NULL,
    exp_month   INTEGER NOT NULL,
    exp_year    INTEGER NOT NULL,
    cardholder  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS billing_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    kind        TEXT NOT NULL,
    plan        TEXT NOT NULL,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    currency    TEXT NOT NULL DEFAULT 'usd',
    detail      TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_billing_events_user ON billing_events(user_id, id DESC);
  CREATE TABLE IF NOT EXISTS stripe_checkouts (
    session_id  TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL,
    plan        TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending',
    created_at  TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
`)

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all()
  if (!columns.some(item => item.name === column))
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

ensureColumn('projects', 'space_id', "TEXT NOT NULL DEFAULT 'coding'")
ensureColumn('projects', 'app_kind', "TEXT NOT NULL DEFAULT 'web-code'")
ensureColumn('projects', 'visibility', "TEXT NOT NULL DEFAULT 'private'")
ensureColumn('projects', 'metadata', "TEXT NOT NULL DEFAULT '{}'")
ensureColumn('posts', 'space_id', "TEXT NOT NULL DEFAULT 'lifestyle'")
ensureColumn('posts', 'post_type', "TEXT NOT NULL DEFAULT 'progress'")
ensureColumn('posts', 'media_url', "TEXT NOT NULL DEFAULT ''")
ensureColumn('chat_messages', 'attachment_json', "TEXT NOT NULL DEFAULT '{}'")
ensureColumn('users', 'plan', "TEXT NOT NULL DEFAULT 'free'")
ensureColumn('users', 'plan_updated_at', "TEXT NOT NULL DEFAULT ''")
ensureColumn('users', 'birthdate', "TEXT NOT NULL DEFAULT ''")
ensureColumn('users', 'audience', "TEXT NOT NULL DEFAULT ''")
ensureColumn('users', 'plan_selected', 'INTEGER NOT NULL DEFAULT 0')
ensureColumn('users', 'stripe_customer_id', "TEXT NOT NULL DEFAULT ''")
ensureColumn('users', 'stripe_subscription_id', "TEXT NOT NULL DEFAULT ''")
ensureColumn('billing_methods', 'source', "TEXT NOT NULL DEFAULT 'card'")

// Seed / reconcile the single owner admin from environment-provided credentials
if (ADMIN_EMAIL && ADMIN_PASSWORD) {
  const existing = db.prepare('SELECT * FROM admins WHERE username = ?').get(ADMIN_EMAIL)
  const hash = bcrypt.hashSync(ADMIN_PASSWORD, 10)
  if (!existing) {
    db.prepare('INSERT INTO admins (username, password_hash, created_at) VALUES (?,?,?)')
      .run(ADMIN_EMAIL, hash, new Date().toISOString())
    console.log('Seeded admin account.')
  } else if (!bcrypt.compareSync(ADMIN_PASSWORD, existing.password_hash)) {
    db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(hash, existing.id)
    db.prepare("DELETE FROM sessions WHERE kind = 'admin' AND subject_id = ?").run(existing.id)
    console.log('Reconciled admin credentials from the environment.')
  }
} else {
  db.prepare("DELETE FROM sessions WHERE kind = 'admin'").run()
  console.warn('HELIOS_ADMIN_EMAIL / HELIOS_ADMIN_PASSWORD not set — admin panel disabled.')
}
// A legacy development account must never survive an upgrade.
db.prepare("DELETE FROM admins WHERE username = 'admin'").run()

for (const [k, v] of [
  ['site_name', 'Helios Space'],
  ['tagline', 'A social operating system for meaningful work'],
  ['signup_open', 'true'],
  ['announcement', ''],
  ['openai_api_key', ''],
  ['openai_model', 'gpt-4o-mini'],
  ['openai_base_url', 'https://api.openai.com'],
]) {
  db.prepare('INSERT OR IGNORE INTO site_settings (key, value) VALUES (?,?)').run(k, v)
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getSetting = k => db.prepare('SELECT value FROM site_settings WHERE key = ?').get(k)?.value ?? null
const setSetting = (k, v) =>
  db.prepare('INSERT INTO site_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = ?')
    .run(k, String(v), String(v))

function positiveInt(value) {
  if (typeof value === 'string') {
    if (!/^[1-9]\d*$/.test(value)) return null
  } else if (typeof value !== 'number') {
    return null
  }
  const n = Number(value)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

function checkedString(value, label, maxLength, { required = false, trim = false } = {}) {
  if (typeof value !== 'string') return { error: `${label} must be a string` }
  const normalized = trim ? value.trim() : value
  if (required && !normalized) return { error: `${label} is required` }
  if (normalized.length > maxLength)
    return { error: `${label} must be ${maxLength} characters or fewer` }
  return { value: normalized }
}

function inTransaction(work) {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    try { db.exec('ROLLBACK') } catch {}
    throw error
  }
}

function newSession(kind, subjectId) {
  const maxAge = kind === 'admin' ? ADMIN_SESSION_MS : USER_SESSION_MS
  db.prepare("DELETE FROM sessions WHERE kind = ? AND created_at < ?")
    .run(kind, new Date(Date.now() - maxAge).toISOString())
  const token = crypto.randomBytes(32).toString('hex')
  db.prepare('INSERT INTO sessions (token, kind, subject_id, created_at) VALUES (?,?,?,?)')
    .run(token, kind, subjectId, new Date().toISOString())
  return token
}

function getFreshSession(token, kind, maxAge) {
  const session = token && db.prepare('SELECT * FROM sessions WHERE token = ? AND kind = ?').get(token, kind)
  if (!session) return null
  if (!Number.isFinite(Date.parse(session.created_at)) || Date.now() - Date.parse(session.created_at) > maxAge) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
    return null
  }
  return session
}

function cookieOptions(maxAge) {
  return { httpOnly: true, sameSite: 'lax', secure: IS_PRODUCTION, maxAge }
}

function rateLimit({ windowMs, max, key }) {
  const buckets = new Map()
  return (req, res, next) => {
    const now = Date.now()
    const bucketKey = `${key}:${req.user?.id ?? req.ip}`
    const previous = buckets.get(bucketKey)
    const bucket = !previous || now >= previous.resetAt ? { count: 0, resetAt: now + windowMs } : previous
    bucket.count += 1
    buckets.set(bucketKey, bucket)
    if (bucket.count > max) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))))
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
    }
    if (buckets.size > 10_000) {
      for (const [bucketId, value] of buckets) if (now >= value.resetAt) buckets.delete(bucketId)
    }
    next()
  }
}

const authRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, key: 'auth' })
const aiRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, key: 'ai' })
const socialRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 120, key: 'social' })
const billingRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, key: 'billing' })
const marketsRateLimit = rateLimit({ windowMs: 60 * 1000, max: 30, key: 'markets' })
const MARKETS_MOCK = process.env.HELIOS_MARKETS_MOCK === '1' || process.env.NODE_ENV === 'test'
const marketQuoteCache = new Map()
const liveCursorRateLimit = rateLimit({ windowMs: 60 * 1000, max: 900, key: 'live-cursor' })
const liveEventRateLimit = (req, res, next) => req.body?.kind === 'cursor'
  ? liveCursorRateLimit(req, res, next)
  : socialRateLimit(req, res, next)

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY?.trim() || ''
const STRIPE_PUBLISHABLE = process.env.STRIPE_PUBLISHABLE_KEY?.trim() || ''
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET?.trim() || ''
const STRIPE_ORBIT_PRICE_ID = process.env.STRIPE_ORBIT_PRICE_ID?.trim() || ''
const STRIPE_MOCK = process.env.HELIOS_STRIPE_MOCK === '1' || process.env.NODE_ENV === 'test'
const STRIPE_FULFILL_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
])
const STRIPE_CANCEL_EVENTS = new Set([
  'customer.subscription.deleted',
])
const mockStripeSessions = new Map()
const PAY_METHODS = ['card']

function envLimit(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number(raw)
  return Number.isFinite(value) && value >= 0 ? value : fallback
}

const FREE_DOCUMENT_LIMIT = envLimit('HELIOS_FREE_DOCUMENTS', 60)
const FREE_CHARACTER_LIMIT = envLimit('HELIOS_FREE_CHARACTERS', 40_000)
const ORBIT_CHARACTER_LIMIT = envLimit('HELIOS_ORBIT_CHARACTERS', 500_000)

const BILLING_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price_cents: 0,
    currency: 'cny',
    interval: 'month',
    description: 'Word, Excel, PowerPoint and OneNote stay included. Limits apply only to how much writing you create.',
    mini_apps: ['Word', 'Excel', 'PowerPoint', 'OneNote'],
    limits: { documents: FREE_DOCUMENT_LIMIT, characters: FREE_CHARACTER_LIMIT },
    features: [
      'Create an account in under a minute — no card',
      'Word, Excel, PowerPoint and OneNote — no paywall on tables or slides',
      `${FREE_DOCUMENT_LIMIT} writing documents`,
      `${FREE_CHARACTER_LIMIT.toLocaleString('en-US')} characters per document`,
      'Work saves to Projects and stays in your Spaces',
      'Every Subject and Hobby Space',
      'Lifestyle, Chat Hub and Live',
      'Helios AI when an administrator enables it',
      'Upgrade to Orbit any time from the top-left banner',
    ],
  },
  orbit: {
    id: 'orbit',
    name: 'Orbit',
    price_cents: 6800,
    currency: 'cny',
    interval: 'month',
    description: 'More writing room plus the rest of the suite. Pay with a card on Stripe.',
    mini_apps: [
      'Word', 'Excel', 'PowerPoint', 'OneNote', 'Stocks',
      'Essay', 'Gradebook', 'Lesson Slides', 'Lab Notebook', 'Forms',
      'Flashcards', 'Reader', 'Maths Lab', 'Homework Board', 'Study Guide',
      'Docs', 'Budget', 'Pitch Deck', 'Meeting Notes', 'Proposals',
      'Product Spec', 'OKRs', 'Planner', 'Reports',
    ],
    limits: { documents: null, characters: ORBIT_CHARACTER_LIMIT },
    features: [
      'Everything in Free, including spreadsheets and slides',
      'Unlimited writing documents',
      `${ORBIT_CHARACTER_LIMIT.toLocaleString('en-US')} characters per document`,
      'Stocks watchlist you can open any time',
      'School and work apps in the same account',
      'Docs, proposals, specs and reports',
      'Budget and OKR workbooks with formulas',
      'Pitch decks, meetings, planner and homework board',
      'Essay studio, gradebook, labs and study tools',
      'Priority Helios capacity when AI is configured',
      '3× Live session visibility for collaborators',
      'Pay with a bank card through Stripe',
      'Switch back to Free any time',
    ],
  },
}

function normalizePlan(plan) {
  return plan === 'orbit' || plan === 'alpha' ? 'orbit' : 'free'
}

function userEdition(user) {
  return normalizePlan(user?.plan)
}

function publicUser(user) {
  if (!user) return null
  return {
    id: Number(user.id),
    name: user.name,
    handle: user.handle,
    email: user.email,
    plan: normalizePlan(user.plan),
    plan_selected: Boolean(user.plan_selected),
    edition: userEdition(user),
    usage: usageSnapshot(user),
  }
}

function planLimits(user) {
  return BILLING_PLANS[normalizePlan(user?.plan)].limits
}

function isWritingProject(type, appKind) {
  return type === 'writing' || (type === 'doc' && appKind !== 'stocks')
}

function countWritingDocuments(userId) {
  return db.prepare(
    `SELECT COUNT(*) AS count FROM projects
     WHERE user_id = ? AND (type = 'writing' OR (type = 'doc' AND app_kind != 'stocks'))`,
  ).get(userId).count
}

function writingPlainText(content) {
  if (!content) return ''
  let raw = String(content)
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object') {
      const data = parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed
      const parts = [data.html, data.content, data.text, data.body]
        .filter(value => typeof value === 'string')
      if (parts.length) raw = parts.join('\n')
    }
  } catch {}
  return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function writingCharacterCount(content) {
  return [...writingPlainText(content)].length
}

function usageSnapshot(user) {
  const limits = planLimits(user)
  const userId = Number(user?.id)
  return {
    documents: {
      used: Number.isFinite(userId) ? countWritingDocuments(userId) : 0,
      limit: limits.documents,
    },
    characters: {
      limit: limits.characters,
    },
  }
}

function writingLimitError(user, code, characters = 0) {
  const limits = planLimits(user)
  const usage = usageSnapshot(user)
  if (code === 'document_limit') {
    return {
      error: `Free includes ${limits.documents} writing documents. Upgrade to Orbit for unlimited drafts. Spreadsheets and slides stay included.`,
      code,
      usage,
    }
  }
  const planName = normalizePlan(user.plan) === 'orbit' ? 'Orbit' : 'Free'
  return {
    error: `This draft is ${characters.toLocaleString('en-US')} characters. ${planName} allows ${limits.characters.toLocaleString('en-US')} per document.`,
    code,
    usage: { ...usage, characters: { used: characters, limit: limits.characters } },
  }
}

function billingCatalog() {
  return Object.values(BILLING_PLANS)
}

function stripeConfigured() {
  return STRIPE_MOCK || Boolean(STRIPE_SECRET && STRIPE_PUBLISHABLE)
}

function stripePublicConfig() {
  return {
    enabled: stripeConfigured(),
    publishable_key: stripeConfigured() ? (STRIPE_PUBLISHABLE || 'pk_test_mock') : null,
    auto_detect: true,
  }
}

function planEligibilityError(planId) {
  if (planId === 'free' || planId === 'orbit') return null
  return 'Choose Free or Orbit'
}

function normalizePayMethod(value) {
  const method = String(value || 'card').trim().toLowerCase()
  if (method === 'card' || method === 'stripe' || method === '') return 'card'
  return null
}

function serializePaymentMethod(row) {
  if (!row) return null
  const source = row.source === 'stripe' ? 'stripe' : 'card'
  return {
    brand: row.brand,
    last4: row.last4,
    exp_month: Number(row.exp_month),
    exp_year: Number(row.exp_year),
    cardholder: row.cardholder,
    source,
    updated_at: row.updated_at,
  }
}

function billingUserRow(userId) {
  return db.prepare('SELECT id,name,handle,email,status,plan,birthdate,audience,plan_selected FROM users WHERE id = ?').get(userId)
}

function getBillingSnapshot(userLike) {
  const user = typeof userLike === 'object' && userLike ? userLike : billingUserRow(userLike)
  const userId = Number(user.id)
  const method = db.prepare('SELECT brand,last4,exp_month,exp_year,cardholder,source,updated_at FROM billing_methods WHERE user_id = ?').get(userId)
  const events = db.prepare(
    'SELECT id,kind,plan,amount_cents,currency,detail,created_at FROM billing_events WHERE user_id = ? ORDER BY id DESC LIMIT 8'
  ).all(userId)
  const pending = db.prepare(
    "SELECT session_id,plan,status,created_at FROM stripe_checkouts WHERE user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
  ).get(userId)
  return {
    plan: normalizePlan(user.plan),
    edition: userEdition(user),
    plans: billingCatalog().map(plan => ({
      ...plan,
      eligible: true,
    })),
    payment_method: serializePaymentMethod(method),
    events,
    stripe: stripePublicConfig(),
    pay_methods: PAY_METHODS,
    pending_checkout: pending ? { session_id: pending.session_id, plan: pending.plan, status: pending.status, created_at: pending.created_at } : null,
    usage: usageSnapshot(user),
  }
}

function recordBillingEvent(userId, kind, plan, amountCents, detail) {
  db.prepare(
    'INSERT INTO billing_events (user_id,kind,plan,amount_cents,currency,detail,created_at) VALUES (?,?,?,?,?,?,?)'
  ).run(userId, kind, plan, amountCents, BILLING_PLANS[plan]?.currency || 'cny', detail || '', new Date().toISOString())
}

function savePaymentMethod(userId, method, now) {
  db.prepare(`
    INSERT INTO billing_methods (user_id,brand,last4,exp_month,exp_year,cardholder,updated_at,source)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET
      brand = excluded.brand,
      last4 = excluded.last4,
      exp_month = excluded.exp_month,
      exp_year = excluded.exp_year,
      cardholder = excluded.cardholder,
      updated_at = excluded.updated_at,
      source = excluded.source
  `).run(
    userId,
    method.brand,
    method.last4,
    method.exp_month,
    method.exp_year,
    method.cardholder,
    now,
    method.source || 'card',
  )
}

function activatePlan(user, planId, method, detail, now = new Date().toISOString()) {
  const catalog = BILLING_PLANS[planId]
  inTransaction(() => {
    if (method) savePaymentMethod(user.id, method, now)
    db.prepare('UPDATE users SET plan = ?, plan_updated_at = ?, plan_selected = 1 WHERE id = ?').run(planId, now, user.id)
    recordBillingEvent(
      user.id,
      user.plan === planId ? 'card_updated' : 'paid',
      planId,
      catalog?.price_cents || 0,
      detail,
    )
  })
  return publicUser({ ...user, plan: planId, plan_selected: 1 })
}

function requestOrigin(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '127.0.0.1').split(',')[0].trim()
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim()
  return proto + '://' + host
}

async function stripeForm(path, params, method = 'POST') {
  const headers = { Authorization: 'Bearer ' + STRIPE_SECRET }
  let body
  if (method !== 'GET') {
    body = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) body.set(key, String(value))
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }
  const response = await fetch('https://api.stripe.com/v1/' + path, {
    method,
    headers,
    body,
  })
  const json = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(json.error?.message || 'Stripe request failed')
    error.status = 502
    throw error
  }
  return json
}

async function createStripeCheckout(user, planId, origin) {
  const catalog = BILLING_PLANS[planId]
  if (STRIPE_MOCK) {
    const sessionId = 'cs_test_' + crypto.randomBytes(8).toString('hex')
    mockStripeSessions.set(sessionId, {
      id: sessionId,
      payment_status: 'paid',
      metadata: { user_id: String(user.id), plan: planId, method: 'card' },
      payment_method: { brand: 'visa', last4: '4242' },
    })
    db.prepare('INSERT INTO stripe_checkouts (session_id,user_id,plan,status,created_at) VALUES (?,?,?,?,?)')
      .run(sessionId, user.id, planId, 'pending', new Date().toISOString())
    return {
      session_id: sessionId,
      url: origin + '/pay?billing=success&session_id=' + encodeURIComponent(sessionId),
      mock: true,
    }
  }
  const params = {
    mode: 'subscription',
    success_url: origin + '/pay?billing=success&session_id={CHECKOUT_SESSION_ID}',
    cancel_url: origin + '/pay?billing=cancel',
    client_reference_id: String(user.id),
    'metadata[user_id]': String(user.id),
    'metadata[plan]': planId,
    'subscription_data[metadata][user_id]': String(user.id),
    'subscription_data[metadata][plan]': planId,
    'line_items[0][quantity]': '1',
  }
  if (user.email) params.customer_email = user.email
  if (STRIPE_ORBIT_PRICE_ID) {
    params['line_items[0][price]'] = STRIPE_ORBIT_PRICE_ID
  }
  params['line_items[0][price_data][currency]'] = catalog.currency
  params['line_items[0][price_data][unit_amount]'] = String(catalog.price_cents)
  params['line_items[0][price_data][recurring][interval]'] = 'month'
  params['line_items[0][price_data][product_data][name]'] = 'Helios ' + catalog.name
  if (STRIPE_ORBIT_PRICE_ID) {
    delete params['line_items[0][price_data][currency]']
    delete params['line_items[0][price_data][unit_amount]']
    delete params['line_items[0][price_data][recurring][interval]']
    delete params['line_items[0][price_data][product_data][name]']
  }
  const session = await stripeForm('checkout/sessions', params)
  db.prepare('INSERT INTO stripe_checkouts (session_id,user_id,plan,status,created_at) VALUES (?,?,?,?,?)')
    .run(session.id, user.id, planId, 'pending', new Date().toISOString())
  return { session_id: session.id, url: session.url }
}

function stripeObjectId(value) {
  if (!value) return ''
  return typeof value === 'string' ? value : String(value.id || '')
}

function cardFromStripeSession(session) {
  const method = session?.payment_intent?.payment_method
    || session?.subscription?.default_payment_method
    || session?.payment_method
    || {}
  const card = method.card || {}
  return {
    brand: card.brand || method.brand || 'card',
    last4: card.last4 || method.last4 || '0000',
    exp_month: Number(card.exp_month) || 12,
    exp_year: Number(card.exp_year) || new Date().getUTCFullYear() + 3,
  }
}

function sessionReadyToFulfill(session) {
  return Boolean(session) && (session.payment_status === 'paid' || session.payment_status === 'no_payment_required')
}

async function retrieveStripeSession(sessionId) {
  if (STRIPE_MOCK) return mockStripeSessions.get(sessionId) || null
  return stripeForm(
    'checkout/sessions/' + encodeURIComponent(sessionId)
      + '?expand[]=payment_intent.payment_method'
      + '&expand[]=subscription.default_payment_method',
    {},
    'GET',
  )
}

function verifyStripeWebhook(rawBody, signatureHeader, secret) {
  const items = String(signatureHeader || '').split(',').map(part => part.trim().split('='))
  const timestamp = items.find(item => item[0] === 't')?.[1]
  const signature = items.find(item => item[0] === 'v1')?.[1]
  if (!timestamp || !signature) return false
  const expected = crypto.createHmac('sha256', secret).update(timestamp + '.' + rawBody).digest('hex')
  const left = Buffer.from(signature, 'hex')
  const right = Buffer.from(expected, 'hex')
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

function fulfillPaidStripeSession(session, sessionId) {
  const pending = db.prepare('SELECT * FROM stripe_checkouts WHERE session_id = ?').get(sessionId)
  if (!pending) return { error: 'Payment session not found', status: 404 }
  const userRow = db.prepare('SELECT id,name,handle,email,status,plan,plan_selected FROM users WHERE id = ?').get(pending.user_id)
  if (!userRow || userRow.status !== 'active') return { error: 'Account unavailable', status: 403 }
  if (pending.status === 'paid') {
    const user = publicUser(userRow)
    return { user, billing: getBillingSnapshot(user) }
  }
  if (!sessionReadyToFulfill(session)) return { error: 'Payment is not complete', status: 402 }
  if (String(session.metadata?.user_id || pending.user_id) !== String(userRow.id))
    return { error: 'Payment session does not match this account', status: 403 }
  const planId = pending.plan
  const blocked = planEligibilityError(planId)
  if (blocked) return { error: blocked, status: 403 }
  const card = cardFromStripeSession(session)
  db.prepare('UPDATE stripe_checkouts SET status = ? WHERE session_id = ?').run('paid', sessionId)
  db.prepare('UPDATE users SET stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?').run(
    stripeObjectId(session.customer),
    stripeObjectId(session.subscription),
    userRow.id,
  )
  const user = activatePlan(
    userRow,
    planId,
    {
      brand: card.brand,
      last4: card.last4,
      exp_month: card.exp_month,
      exp_year: card.exp_year,
      cardholder: userRow.name,
      source: 'stripe',
    },
    'Paid with Stripe card · ' + planId,
  )
  return { user, billing: getBillingSnapshot(user) }
}

function cancelStripeSubscription(eventObject) {
  const subscriptionId = stripeObjectId(eventObject)
  if (!subscriptionId) return { error: 'Subscription is required', status: 400 }
  const userRow = db.prepare('SELECT id,name,handle,email,status,plan,plan_selected FROM users WHERE stripe_subscription_id = ?').get(subscriptionId)
  if (!userRow) return { ignored: true }
  const now = new Date().toISOString()
  db.prepare('UPDATE users SET plan = ?, plan_updated_at = ?, stripe_subscription_id = ? WHERE id = ?')
    .run('free', now, '', userRow.id)
  recordBillingEvent(userRow.id, 'plan_change', 'free', 0, 'Stripe subscription ended')
  const user = publicUser({ ...userRow, plan: 'free', plan_selected: 1, stripe_subscription_id: '' })
  return { user, billing: getBillingSnapshot(user) }
}

function requireAdmin(req, res, next) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin access is not configured' })
  const token = req.cookies.helios_admin
  const s = getFreshSession(token, 'admin', ADMIN_SESSION_MS)
  if (!s) return res.status(401).json({ error: 'Not authenticated' })
  req.adminId = s.subject_id
  next()
}

function requireUser(req, res, next) {
  const token = req.cookies.helios_user
  const s = getFreshSession(token, 'user', USER_SESSION_MS)
  if (!s) return res.status(401).json({ error: 'Not authenticated' })
  const user = db.prepare('SELECT id,name,handle,email,status,plan,birthdate,audience,plan_selected FROM users WHERE id = ?').get(s.subject_id)
  if (!user || user.status !== 'active') return res.status(403).json({ error: 'Account unavailable' })
  req.user = publicUser(user)
  next()
}

function normalizeSpaceId(value, fallback = 'coding') {
  const normalized = String(value ?? '').trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SPACE_ID_LENGTH)
  return normalized || fallback
}

function inferAppKind(type) {
  return ({
    code: 'web-code', doc: 'writing', writing: 'writing', research: 'lab-notebook',
    spreadsheet: 'spreadsheet', presentation: 'presentation', drawing: 'drawing',
    design: 'whiteboard', survey: 'survey', board: 'project-board', notebook: 'lab-notebook',
    book: 'reader', math: 'math-lab',
  })[type] || 'writing'
}

function parseJson(value, fallback = {}) {
  try { return value ? JSON.parse(value) : fallback } catch { return fallback }
}

const PROJECT_ACCESS_SELECT = [
  'SELECT p.*, u.name AS owner_name, u.handle AS owner_handle,',
  'pc.role AS collaborator_role, pc.status AS collaborator_status',
  'FROM projects p JOIN users u ON u.id = p.user_id',
  'LEFT JOIN project_collaborators pc ON pc.project_id = p.id AND pc.user_id = ?',
].join(' ')

function getProjectForUser(projectId, userId, { edit = false } = {}) {
  const row = db.prepare(PROJECT_ACCESS_SELECT + ' WHERE p.id = ?').get(userId, projectId)
  if (!row) return null
  const owner = row.user_id === userId
  const collaborator = row.collaborator_status === 'accepted'
  const canEdit = owner || (collaborator && ['owner', 'editor'].includes(row.collaborator_role))
  const sharedByPublicPost = !edit && Boolean(db.prepare(
    "SELECT 1 FROM posts WHERE project_id = ? AND audience = 'public' LIMIT 1"
  ).get(projectId))
  const canView = canEdit || collaborator || ['public', 'space'].includes(row.visibility) || sharedByPublicPost
  if ((edit && !canEdit) || (!edit && !canView)) return null
  return { ...row, can_edit: canEdit, can_manage: owner }
}

function serializeProject(row, userId) {
  if (!row) return null
  const owner = row.user_id === userId
  const collaborator = row.collaborator_status === 'accepted'
  return {
    id: Number(row.id),
    user_id: Number(row.user_id),
    name: row.name,
    space: row.space || '',
    space_id: row.space_id || normalizeSpaceId(row.space),
    type: row.type,
    app_kind: row.app_kind || inferAppKind(row.type),
    visibility: row.visibility || 'private',
    content: row.content || '',
    metadata: parseJson(row.metadata, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
    owner_name: row.owner_name || '',
    owner_handle: row.owner_handle || '',
    can_edit: owner || (collaborator && ['owner', 'editor'].includes(row.collaborator_role)),
    can_manage: owner,
    collaborator_role: collaborator ? row.collaborator_role : null,
  }
}

function normalizeFilePath(value) {
  const checked = checkedString(value, 'File path', 120, { required: true, trim: true })
  if (checked.error) return checked
  const normalized = checked.value.replace(/^\/+/, '')
  if (!FILE_PATH_PATTERN.test(normalized) || !FILE_EXTENSION_PATTERN.test(normalized))
    return { error: 'File path must use a supported extension and cannot include parent directories' }
  return { value: normalized }
}

function filesFromWorkspaceContent(content) {
  const parsed = parseJson(content, null)
  if (!parsed || parsed.schema !== 'helios-workspace-v1' || !parsed.data || typeof parsed.data !== 'object') return null
  const files = parsed.data.files
  if (!files || typeof files !== 'object' || Array.isArray(files)) return null
  return files
}

function listProjectFiles(projectId) {
  return db.prepare(
    'SELECT path, content, updated_at FROM project_files WHERE project_id = ? ORDER BY path COLLATE NOCASE'
  ).all(projectId)
}

function filesToMap(rows) {
  return Object.fromEntries(rows.map(row => [row.path, row.content]))
}

function replaceProjectFiles(projectId, filesMap) {
  const now = new Date().toISOString()
  inTransaction(() => {
    db.prepare('DELETE FROM project_files WHERE project_id = ?').run(projectId)
    const insert = db.prepare('INSERT INTO project_files (project_id, path, content, updated_at) VALUES (?,?,?,?)')
    for (const [filePath, content] of Object.entries(filesMap))
      insert.run(projectId, filePath, content, now)
    db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId)
  })
}

function upsertProjectFile(projectId, filePath, content) {
  const now = new Date().toISOString()
  db.prepare(
    'INSERT INTO project_files (project_id, path, content, updated_at) VALUES (?,?,?,?) ' +
    'ON CONFLICT(project_id, path) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at'
  ).run(projectId, filePath, content, now)
  db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(now, projectId)
}

function collectValidFiles(source) {
  const files = {}
  const entries = Array.isArray(source)
    ? source.map(item => [item?.path, item?.content])
    : Object.entries(source || {})
  for (const [filePath, content] of entries) {
    if (typeof content !== 'string') continue
    const checkedPath = normalizeFilePath(filePath)
    if (checkedPath.error) continue
    if (content.length > MAX_FILE_CONTENT_LENGTH) continue
    files[checkedPath.value] = content
  }
  return files
}

function syncWorkspaceContentFiles(projectId, content) {
  const extracted = filesFromWorkspaceContent(content)
  if (!extracted) return false
  const files = collectValidFiles(extracted)
  if (Object.keys(files).length > MAX_PROJECT_FILES) return false
  replaceProjectFiles(projectId, files)
  return true
}

function ensureProjectFiles(project) {
  const existing = listProjectFiles(project.id)
  if (existing.length) return existing
  syncWorkspaceContentFiles(project.id, project.content)
  return listProjectFiles(project.id)
}

function hydrateContentWithFiles(content, files, appKind) {
  if (!files.length) return content
  const map = filesToMap(files)
  const parsed = parseJson(content, null)
  if (parsed && parsed.schema === 'helios-workspace-v1' && parsed.data && typeof parsed.data === 'object') {
    parsed.data.files = map
    if (!parsed.data.activeFile || map[parsed.data.activeFile] === undefined)
      parsed.data.activeFile = Object.keys(map)[0] || ''
    if (!Array.isArray(parsed.data.openFiles)) parsed.data.openFiles = []
    return JSON.stringify(parsed)
  }
  return JSON.stringify({
    schema: 'helios-workspace-v1',
    appKind: appKind || 'web-code',
    data: {
      files: map,
      activeFile: Object.keys(map)[0] || '',
      openFiles: Object.keys(map).slice(0, 4),
      terminal: [],
    },
  })
}

function snapshotProjectFiles(projectId) {
  return JSON.stringify(filesToMap(listProjectFiles(projectId)))
}

function applyFileSnapshot(projectId, snapshot, content) {
  const files = collectValidFiles(parseJson(snapshot, {}))
  replaceProjectFiles(projectId, files)
  const project = db.prepare('SELECT content, app_kind FROM projects WHERE id = ?').get(projectId)
  const nextContent = hydrateContentWithFiles(content || project?.content || '', listProjectFiles(projectId), project?.app_kind)
  const now = new Date().toISOString()
  db.prepare('UPDATE projects SET content = ?, updated_at = ? WHERE id = ?').run(nextContent, now, projectId)
}

function serializeCommit(row, { files = false } = {}) {
  const snapshot = parseJson(row.snapshot, {})
  const commit = {
    id: Number(row.id),
    project_id: Number(row.project_id),
    user_id: Number(row.user_id),
    author_name: row.author_name,
    author_handle: row.author_handle,
    message: row.message,
    created_at: row.created_at,
    file_count: Object.keys(snapshot).length,
  }
  if (files) commit.files = snapshot
  return commit
}

function awardSolar(userId, sourceType, sourceId, amount, reason) {
  if (!Number.isInteger(amount) || amount <= 0) return false
  const result = db.prepare(
    'INSERT OR IGNORE INTO solar_events (user_id,source_type,source_id,amount,reason,created_at) VALUES (?,?,?,?,?,?)'
  ).run(userId, sourceType, String(sourceId), amount, reason, new Date().toISOString())
  return result.changes > 0
}

function solarIdentity(total) {
  if (total >= 2400) return 'Helios'
  if (total >= 1200) return 'Stellar'
  if (total >= 600) return 'Nova'
  if (total >= 280) return 'Radiant'
  if (total >= 100) return 'Orbit'
  return 'Dawn'
}

function createNotification(userId, actorId, kind, title, detail, targetType, targetId) {
  if (!userId || userId === actorId) return
  db.prepare(
    'INSERT INTO notifications (user_id,actor_id,kind,title,detail,target_type,target_id,created_at) VALUES (?,?,?,?,?,?,?,?)'
  ).run(userId, actorId || null, kind, title, detail || '', targetType || null,
    targetId === undefined || targetId === null ? null : String(targetId), new Date().toISOString())
}

const liveBus = new EventEmitter()
liveBus.setMaxListeners(0)

function emitLiveEvent(sessionId, userId, kind, payload) {
  const now = new Date().toISOString()
  const serialized = JSON.stringify(payload ?? {})
  const info = db.prepare(
    'INSERT INTO live_events (session_id,user_id,kind,payload,created_at) VALUES (?,?,?,?,?)'
  ).run(sessionId, userId, kind, serialized, now)
  const event = { id: Number(info.lastInsertRowid), session_id: sessionId, user_id: userId, kind, payload, created_at: now }
  liveBus.emit(String(sessionId), event)
  return event
}

function emitEphemeralLiveEvent(sessionId, userId, kind, payload) {
  const event = { id: `${kind}-${userId}-${Date.now()}`, session_id: sessionId, user_id: userId, kind, payload, created_at: new Date().toISOString() }
  liveBus.emit(String(sessionId), event)
  return event
}

function canWatchLive(session, userId) {
  if (!session) return false
  if (session.owner_id === userId || session.audience === 'public') return true
  return Boolean(getProjectForUser(session.project_id, userId))
}

function serializeLiveSession(row, userId) {
  if (!row) return null
  return {
    id: Number(row.id),
    owner_id: Number(row.owner_id),
    owner_name: row.owner_name || '',
    owner_handle: row.owner_handle || '',
    project_id: Number(row.project_id),
    project_name: row.project_name || '',
    app_kind: row.app_kind || '',
    space_id: row.space_id,
    title: row.title,
    status: row.status,
    audience: row.audience,
    permissions: parseJson(row.permissions, {}),
    viewer_count: Number(row.viewer_count || 0),
    started_at: row.started_at,
    ended_at: row.ended_at || null,
    can_manage: row.owner_id === userId,
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
const app = express()
app.disable('x-powered-by')
// Trust forwarded client information only from the local reverse proxy. A
// direct connection still uses its real peer address for rate limiting.
app.set('trust proxy', 'loopback')
app.use(express.json({
  limit: '2mb',
  verify: (req, _res, buf) => {
    if (req.originalUrl === '/api/billing/stripe/webhook') req.rawBody = buf
  },
}))
app.use(cookieParser())
app.use((req, res, next) => {
  res.set('X-Content-Type-Options', 'nosniff')
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.set('X-Frame-Options', 'SAMEORIGIN')
  if (req.path.startsWith('/api/')) res.set('Cache-Control', 'no-store')
  next()
})
app.use((error, _req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error)
    return res.status(400).json({ error: 'Request body must be valid JSON', code: 'INVALID_JSON' })
  next(error)
})

// ── Public site info ──
app.get('/api/site', (_req, res) => res.json({
  site_name: getSetting('site_name'),
  tagline: getSetting('tagline'),
  announcement: getSetting('announcement'),
  signup_open: getSetting('signup_open') === 'true',
  ai_enabled: !!getSetting('openai_api_key'),
  plans: billingCatalog(),
}))

// ── User auth ──
app.post('/api/signup', authRateLimit, (req, res) => {
  if (getSetting('signup_open') !== 'true')
    return res.status(403).json({ error: 'Signups are currently closed' })
  const { name, handle, email, password } = req.body || {}
  if (!name || !handle || !email || !password)
    return res.status(400).json({ error: 'Name, username, email and password are required' })
  const checkedName = checkedString(name, 'Name', MAX_USER_NAME_LENGTH, { required: true, trim: true })
  if (checkedName.error) return res.status(400).json({ error: checkedName.error })
  const checkedEmail = checkedString(email, 'Email', MAX_EMAIL_LENGTH, { required: true, trim: true })
  if (checkedEmail.error) return res.status(400).json({ error: checkedEmail.error })
  const checkedPassword = checkedString(password, 'Password', MAX_PASSWORD_LENGTH, { required: true })
  if (checkedPassword.error) return res.status(400).json({ error: checkedPassword.error })
  const normalizedEmail = checkedEmail.value.toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail))
    return res.status(400).json({ error: 'Invalid email address' })
  if (checkedPassword.value.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  const h = String(handle).trim().replace(/^@/, '').toLowerCase()
  if (!/^[a-zA-Z0-9_.]{3,30}$/.test(h))
    return res.status(400).json({ error: 'Handle must be 3-30 chars: letters, numbers, _ or .' })
  try {
    const duplicateHandle = db.prepare('SELECT 1 FROM users WHERE lower(handle) = lower(?)').get('@' + h)
    if (duplicateHandle) return res.status(409).json({ error: 'That handle or email is already registered' })
    const now = new Date().toISOString()
    const info = db.prepare(
      'INSERT INTO users (name, handle, email, password_hash, created_at, plan, plan_updated_at, plan_selected) VALUES (?,?,?,?,?,?,?,?)'
    ).run(checkedName.value, '@' + h, normalizedEmail,
          bcrypt.hashSync(checkedPassword.value, 10), now, 'free', now, 0)
    const token = newSession('user', info.lastInsertRowid)
    res.cookie('helios_user', token, cookieOptions(USER_SESSION_MS))
    res.json({
      ok: true,
      user: publicUser({
        id: info.lastInsertRowid,
        name: checkedName.value,
        handle: '@' + h,
        email: normalizedEmail,
        plan: 'free',
        plan_selected: 0,
      }),
    })
  } catch (e) {
    if (String(e.message).includes('UNIQUE'))
      return res.status(409).json({ error: 'That handle or email is already registered' })
    return res.status(500).json({ error: 'Registration failed' })
  }
})

app.post('/api/login', authRateLimit, (req, res) => {
  const { email, password } = req.body || {}
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').trim().toLowerCase())
  if (!user || !bcrypt.compareSync(String(password || ''), user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password' })
  if (user.status !== 'active')
    return res.status(403).json({ error: 'This account has been suspended' })
  const token = newSession('user', user.id)
  res.cookie('helios_user', token, cookieOptions(USER_SESSION_MS))
  res.json({ ok: true, user: publicUser(user) })
})

app.post('/api/logout', (req, res) => {
  const token = req.cookies.helios_user
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  res.clearCookie('helios_user', { sameSite: 'lax', secure: IS_PRODUCTION })
  res.json({ ok: true })
})

app.get('/api/session', (req, res) => {
  const session = getFreshSession(req.cookies.helios_user, 'user', USER_SESSION_MS)
  if (!session) return res.json({ user: null })
  const user = db.prepare('SELECT id,name,handle,email,status,plan,birthdate,audience,plan_selected FROM users WHERE id = ?').get(session.subject_id)
  if (!user || user.status !== 'active') return res.json({ user: null })
  res.json({ user: publicUser(user) })
})

app.get('/api/me', requireUser, (req, res) => res.json({ user: req.user }))

app.put('/api/me', requireUser, (req, res) => {
  res.json({ user: req.user })
})

app.get('/api/billing', requireUser, (req, res) => {
  res.json(getBillingSnapshot(req.user))
})

app.post('/api/billing/checkout', requireUser, billingRateLimit, async (req, res) => {
  const planId = String(req.body?.plan || '').trim().toLowerCase()
  const catalog = BILLING_PLANS[planId]
  if (!catalog) return res.status(400).json({ error: 'Choose Free or Orbit' })
  const blocked = planEligibilityError(planId)
  if (blocked) return res.status(403).json({ error: blocked })

  const now = new Date().toISOString()
  if (planId === 'free') {
    db.prepare('UPDATE users SET plan = ?, plan_updated_at = ?, plan_selected = 1 WHERE id = ?').run('free', now, req.user.id)
    if (req.user.plan !== 'free')
      recordBillingEvent(req.user.id, 'plan_change', 'free', 0, 'Switched to the Free edition')
    const user = publicUser({ ...req.user, plan: 'free', plan_selected: 1 })
    return res.json({ ok: true, user, billing: getBillingSnapshot(user) })
  }

  if (!stripeConfigured())
    return res.status(503).json({ error: 'Stripe is not configured', code: 'STRIPE_NOT_CONFIGURED' })
  try {
    const session = await createStripeCheckout(req.user, planId, requestOrigin(req))
    return res.json({ ok: true, method: 'card', ...session })
  } catch (error) {
    return res.status(error.status || 502).json({ error: error.message || 'Checkout failed' })
  }
})

app.post('/api/billing/stripe', requireUser, billingRateLimit, async (req, res) => {
  const planId = String(req.body?.plan || '').trim().toLowerCase()
  if (!BILLING_PLANS[planId] || planId === 'free')
    return res.status(400).json({ error: 'Checkout is for Orbit' })
  const blocked = planEligibilityError(planId)
  if (blocked) return res.status(403).json({ error: blocked })
  const payMethod = normalizePayMethod(req.body?.method)
  if (!payMethod) return res.status(400).json({ error: 'Orbit is paid with a Stripe card only' })
  if (!stripeConfigured())
    return res.status(503).json({ error: 'Stripe is not configured', code: 'STRIPE_NOT_CONFIGURED' })
  try {
    const session = await createStripeCheckout(req.user, planId, requestOrigin(req))
    res.json({ ok: true, method: 'card', ...session })
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'Checkout failed' })
  }
})

app.post('/api/billing/stripe/webhook', async (req, res) => {
  if (STRIPE_WEBHOOK_SECRET) {
    const raw = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {})
    if (!verifyStripeWebhook(raw, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET))
      return res.status(400).json({ error: 'Invalid Stripe signature' })
  } else if (!STRIPE_MOCK) {
    return res.status(503).json({ error: 'Stripe webhook is not configured', code: 'STRIPE_WEBHOOK_NOT_CONFIGURED' })
  }
  const event = req.body || {}
  if (event.type && STRIPE_CANCEL_EVENTS.has(event.type)) {
    const result = cancelStripeSubscription(event.data?.object || {})
    if (result.error) return res.status(result.status || 400).json({ error: result.error })
    return res.json({ received: true, ok: true, ...result })
  }
  if (event.type && !STRIPE_FULFILL_EVENTS.has(event.type))
    return res.json({ received: true, ignored: true })
  const sessionId = String(event.data?.object?.id || '').trim()
  if (!sessionId) return res.status(400).json({ error: 'Payment session is required' })
  try {
    const session = await retrieveStripeSession(sessionId) || event.data?.object || null
    const result = fulfillPaidStripeSession(session, sessionId)
    if (result.error) return res.status(result.status || 400).json({ error: result.error })
    res.json({ received: true, ok: true, user: result.user, billing: result.billing })
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'Webhook failed' })
  }
})

app.post('/api/billing/stripe/confirm', requireUser, billingRateLimit, async (req, res) => {
  const sessionId = String(req.body?.session_id || '').trim()
  if (!sessionId) return res.status(400).json({ error: 'Payment session is required' })
  const pending = db.prepare('SELECT * FROM stripe_checkouts WHERE session_id = ? AND user_id = ?').get(sessionId, req.user.id)
  if (!pending) return res.status(404).json({ error: 'Payment session not found' })
  try {
    const session = await retrieveStripeSession(sessionId)
    const result = fulfillPaidStripeSession(session, sessionId)
    if (result.error) return res.status(result.status || 400).json({ error: result.error })
    res.json({ ok: true, user: result.user, billing: result.billing })
  } catch (error) {
    res.status(error.status || 502).json({ error: error.message || 'Payment confirmation failed' })
  }
})

function normalizeMarketSymbol(value) {
  const symbol = String(value || '').trim().toUpperCase()
  if (!/^[A-Z0-9][A-Z0-9.^/-]{0,14}$/.test(symbol)) return null
  return symbol
}

function mockMarketQuotes(symbols) {
  return symbols.map((symbol, index) => ({
    symbol,
    name: symbol === 'AAPL' ? 'Apple Inc.' : symbol === 'MSFT' ? 'Microsoft Corporation' : symbol,
    price: 100 + index * 3.25,
    change: index % 2 === 0 ? 1.25 : -0.8,
    change_percent: index % 2 === 0 ? 1.1 : -0.6,
    currency: 'USD',
    market_state: 'REGULAR',
  }))
}

async function fetchYahooQuotes(symbols) {
  const cacheKey = symbols.join(',')
  const cached = marketQuoteCache.get(cacheKey)
  if (cached && Date.now() - cached.at < 20_000) return cached.quotes
  const response = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(cacheKey)}`, {
    headers: { 'User-Agent': 'HeliosSpace/1.0' },
  })
  if (!response.ok) throw new Error('Market data is unavailable')
  const body = await response.json()
  const rows = body?.quoteResponse?.result
  if (!Array.isArray(rows)) throw new Error('Market data is unavailable')
  const quotes = symbols.map(symbol => {
    const row = rows.find(item => String(item.symbol || '').toUpperCase() === symbol)
    return {
      symbol,
      name: row?.shortName || row?.longName || symbol,
      price: Number.isFinite(row?.regularMarketPrice) ? row.regularMarketPrice : null,
      change: Number.isFinite(row?.regularMarketChange) ? row.regularMarketChange : null,
      change_percent: Number.isFinite(row?.regularMarketChangePercent) ? row.regularMarketChangePercent : null,
      currency: row?.currency || 'USD',
      market_state: row?.marketState || '',
    }
  })
  marketQuoteCache.set(cacheKey, { at: Date.now(), quotes })
  return quotes
}

app.get('/api/markets/quotes', requireUser, marketsRateLimit, async (req, res) => {
  if (normalizePlan(req.user.plan) !== 'orbit')
    return res.status(403).json({ error: 'Stocks is included with Orbit' })
  const unique = [...new Set(String(req.query.symbols || '').split(',').map(normalizeMarketSymbol).filter(Boolean))].slice(0, 20)
  if (unique.length === 0) return res.status(400).json({ error: 'Add at least one ticker' })
  try {
    const quotes = MARKETS_MOCK ? mockMarketQuotes(unique) : await fetchYahooQuotes(unique)
    res.json({ quotes, updated_at: new Date().toISOString(), delayed: true })
  } catch (error) {
    res.status(502).json({ error: error.message || 'Market data is unavailable' })
  }
})

app.get('/api/export', requireUser, (req, res) => {
  const account = db.prepare('SELECT id,name,handle,email,created_at,status,plan,plan_updated_at,birthdate,audience FROM users WHERE id = ?').get(req.user.id)
  const projects = db.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY id').all(req.user.id)
  const collaborativeProjects = db.prepare(
    "SELECT p.*,pc.role AS collaborator_role FROM projects p JOIN project_collaborators pc ON pc.project_id = p.id WHERE pc.user_id = ? AND pc.status = 'accepted' ORDER BY p.id"
  ).all(req.user.id)
  const posts = db.prepare(
    'SELECT id,user_id,category,body,project_id,audience,space_id,post_type,media_url,created_at FROM posts WHERE user_id = ? ORDER BY id'
  ).all(req.user.id)
  const reactions = db.prepare(
    'SELECT post_id,emoji FROM reactions WHERE user_id = ? ORDER BY post_id,emoji'
  ).all(req.user.id)
  const comments = db.prepare('SELECT * FROM comments WHERE user_id = ? ORDER BY id').all(req.user.id)
  const projectComments = db.prepare('SELECT * FROM project_comments WHERE user_id = ? ORDER BY id').all(req.user.id)
  const projectVersions = db.prepare('SELECT * FROM project_versions WHERE user_id = ? ORDER BY id').all(req.user.id)
  const spaces = db.prepare('SELECT * FROM user_spaces WHERE user_id = ? ORDER BY created_at').all(req.user.id)
  const liveSessions = db.prepare('SELECT * FROM live_sessions WHERE owner_id = ? ORDER BY id').all(req.user.id)
  const liveEvents = db.prepare('SELECT * FROM live_events WHERE user_id = ? ORDER BY id').all(req.user.id)
  const solarEvents = db.prepare('SELECT * FROM solar_events WHERE user_id = ? ORDER BY id').all(req.user.id)
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id').all(req.user.id)
  const follows = db.prepare('SELECT * FROM follows WHERE follower_id = ? OR followed_id = ? ORDER BY created_at').all(req.user.id, req.user.id)
  const conversationIds = db.prepare('SELECT conversation_id FROM conversation_members WHERE user_id = ? ORDER BY conversation_id').all(req.user.id).map(row => row.conversation_id)
  const conversations = conversationIds.length ? db.prepare(`SELECT * FROM conversations WHERE id IN (${conversationIds.map(() => '?').join(',')}) ORDER BY id`).all(...conversationIds) : []
  const chatMessages = conversationIds.length ? db.prepare(`SELECT * FROM chat_messages WHERE conversation_id IN (${conversationIds.map(() => '?').join(',')}) ORDER BY id`).all(...conversationIds) : []
  const billing = getBillingSnapshot(account)
  res.set('Content-Disposition', 'attachment; filename="helios-data-export.json"')
  res.json({
    exported_at: new Date().toISOString(), account, projects, collaborative_projects: collaborativeProjects,
    posts, reactions, comments, project_comments: projectComments, project_versions: projectVersions,
    spaces, live_sessions: liveSessions, live_events: liveEvents, conversations, chat_messages: chatMessages,
    solar_events: solarEvents, notifications, follows, billing,
  })
})

// ── Projects (per-user, real storage) ──
app.get('/api/projects', requireUser, (req, res) => {
  const rows = db.prepare(
    PROJECT_ACCESS_SELECT + " WHERE p.user_id = ? OR pc.status = 'accepted' ORDER BY p.updated_at DESC"
  ).all(req.user.id, req.user.id)
  res.json({ projects: rows.map(row => serializeProject(row, req.user.id)) })
})

app.get('/api/projects/:id', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const files = ensureProjectFiles(project)
  const serialized = serializeProject(project, req.user.id)
  serialized.content = hydrateContentWithFiles(serialized.content, files, serialized.app_kind)
  res.json({ project: serialized })
})

app.post('/api/projects', requireUser, (req, res) => {
  const { name, space, space_id, type, app_kind, visibility, content, metadata } = req.body || {}
  const checkedName = checkedString(name, 'Project name', MAX_PROJECT_NAME_LENGTH, { required: true, trim: true })
  if (checkedName.error) return res.status(400).json({ error: checkedName.error })
  const checkedSpace = checkedString(space === undefined ? '' : space, 'Project space', MAX_PROJECT_SPACE_LENGTH, { trim: true })
  if (checkedSpace.error) return res.status(400).json({ error: checkedSpace.error })
  const checkedContent = checkedString(content === undefined ? '' : content, 'Project content', MAX_PROJECT_CONTENT_LENGTH)
  if (checkedContent.error) return res.status(400).json({ error: checkedContent.error })
  const projectType = type === undefined ? 'code' : type
  if (typeof projectType !== 'string' || !PROJECT_TYPES.has(projectType))
    return res.status(400).json({ error: 'Invalid project type' })
  const checkedAppKind = checkedString(
    app_kind === undefined ? inferAppKind(projectType) : app_kind,
    'Mini App kind', MAX_APP_KIND_LENGTH, { required: true, trim: true },
  )
  if (checkedAppKind.error) return res.status(400).json({ error: checkedAppKind.error })
  const projectVisibility = visibility === undefined ? 'private' : visibility
  if (typeof projectVisibility !== 'string' || !PROJECT_VISIBILITIES.has(projectVisibility))
    return res.status(400).json({ error: 'Invalid project visibility' })
  const projectSpaceId = normalizeSpaceId(space_id ?? checkedSpace.value, 'coding')
  const metadataString = metadata === undefined
    ? '{}'
    : typeof metadata === 'string' ? metadata : JSON.stringify(metadata)
  const checkedMetadata = checkedString(metadataString, 'Project metadata', MAX_METADATA_LENGTH)
  if (checkedMetadata.error) return res.status(400).json({ error: checkedMetadata.error })
  try { JSON.parse(checkedMetadata.value) } catch {
    return res.status(400).json({ error: 'Project metadata must be valid JSON' })
  }
  if (isWritingProject(projectType, checkedAppKind.value)) {
    const user = billingUserRow(req.user.id) || req.user
    const limits = planLimits(user)
    if (limits.documents != null && countWritingDocuments(req.user.id) >= limits.documents)
      return res.status(403).json(writingLimitError(user, 'document_limit'))
    const characters = writingCharacterCount(checkedContent.value)
    if (characters > limits.characters)
      return res.status(403).json(writingLimitError(user, 'character_limit', characters))
  }
  const now = new Date().toISOString()
  const info = db.prepare(
    'INSERT INTO projects (user_id,name,space,space_id,type,app_kind,visibility,content,metadata,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
  ).run(req.user.id, checkedName.value, checkedSpace.value || projectSpaceId, projectSpaceId,
    projectType, checkedAppKind.value, projectVisibility, checkedContent.value, checkedMetadata.value, now, now)
  const projectId = Number(info.lastInsertRowid)
  db.prepare(
    'INSERT INTO project_versions (project_id,user_id,label,content,metadata,created_at) VALUES (?,?,?,?,?,?)'
  ).run(projectId, req.user.id, 'Project created', checkedContent.value, checkedMetadata.value, now)
  awardSolar(req.user.id, 'project', projectId, 20, 'Created a project')
  syncWorkspaceContentFiles(projectId, checkedContent.value)
  const project = getProjectForUser(projectId, req.user.id)
  res.json({ project: serializeProject(project, req.user.id) })
})

app.put('/api/projects/:id', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id, { edit: true })
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const { name, space, space_id, type, app_kind, visibility, content, metadata } = req.body || {}
  const checkedName = name === undefined
    ? { value: project.name }
    : checkedString(name, 'Project name', MAX_PROJECT_NAME_LENGTH, { required: true, trim: true })
  if (checkedName.error) return res.status(400).json({ error: checkedName.error })
  const checkedSpace = space === undefined
    ? { value: project.space }
    : checkedString(space, 'Project space', MAX_PROJECT_SPACE_LENGTH, { trim: true })
  if (checkedSpace.error) return res.status(400).json({ error: checkedSpace.error })
  const checkedContent = content === undefined
    ? { value: project.content }
    : checkedString(content, 'Project content', MAX_PROJECT_CONTENT_LENGTH)
  if (checkedContent.error) return res.status(400).json({ error: checkedContent.error })
  const projectType = type === undefined ? project.type : type
  if (typeof projectType !== 'string' || !PROJECT_TYPES.has(projectType))
    return res.status(400).json({ error: 'Invalid project type' })
  const checkedAppKind = app_kind === undefined
    ? { value: project.app_kind || inferAppKind(projectType) }
    : checkedString(app_kind, 'Mini App kind', MAX_APP_KIND_LENGTH, { required: true, trim: true })
  if (checkedAppKind.error) return res.status(400).json({ error: checkedAppKind.error })
  const requestedVisibility = visibility === undefined ? project.visibility : visibility
  if (typeof requestedVisibility !== 'string' || !PROJECT_VISIBILITIES.has(requestedVisibility))
    return res.status(400).json({ error: 'Invalid project visibility' })
  const projectVisibility = project.can_manage ? requestedVisibility : project.visibility
  const projectSpaceId = project.can_manage
    ? normalizeSpaceId(space_id ?? project.space_id, project.space_id || 'coding')
    : project.space_id
  const metadataString = metadata === undefined
    ? (project.metadata || '{}')
    : typeof metadata === 'string' ? metadata : JSON.stringify(metadata)
  const checkedMetadata = checkedString(metadataString, 'Project metadata', MAX_METADATA_LENGTH)
  if (checkedMetadata.error) return res.status(400).json({ error: checkedMetadata.error })
  try { JSON.parse(checkedMetadata.value) } catch {
    return res.status(400).json({ error: 'Project metadata must be valid JSON' })
  }
  const willBeWriting = isWritingProject(projectType, checkedAppKind.value)
  const wasWriting = isWritingProject(project.type, project.app_kind)
  if (willBeWriting) {
    const user = billingUserRow(req.user.id) || req.user
    const limits = planLimits(user)
    if (!wasWriting && limits.documents != null && countWritingDocuments(req.user.id) >= limits.documents)
      return res.status(403).json(writingLimitError(user, 'document_limit'))
    if (content !== undefined) {
      const characters = writingCharacterCount(checkedContent.value)
      if (characters > limits.characters)
        return res.status(403).json(writingLimitError(user, 'character_limit', characters))
    }
  }
  const updatedAt = new Date().toISOString()
  db.prepare(
    'UPDATE projects SET name = ?, space = ?, space_id = ?, type = ?, app_kind = ?, visibility = ?, content = ?, metadata = ?, updated_at = ? WHERE id = ?'
  ).run(checkedName.value, checkedSpace.value, projectSpaceId, projectType, checkedAppKind.value,
    projectVisibility, checkedContent.value, checkedMetadata.value, updatedAt, project.id)
  if (checkedContent.value !== project.content || checkedMetadata.value !== project.metadata) {
    syncWorkspaceContentFiles(project.id, checkedContent.value)
    const sessions = db.prepare("SELECT id FROM live_sessions WHERE project_id = ? AND status = 'live'").all(project.id)
    for (const session of sessions) {
      emitLiveEvent(Number(session.id), req.user.id, 'work', {
        project_id: Number(project.id), content: checkedContent.value, metadata: parseJson(checkedMetadata.value, {}), updated_at: updatedAt,
      })
    }
  }
  res.json({ project: serializeProject(getProjectForUser(project.id, req.user.id), req.user.id) })
})

app.delete('/api/projects/:id', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = db.prepare('SELECT id FROM projects WHERE id = ? AND user_id = ?').get(projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  inTransaction(() => {
    db.prepare('UPDATE posts SET project_id = NULL WHERE project_id = ?').run(projectId)
    db.prepare('DELETE FROM projects WHERE id = ? AND user_id = ?').run(projectId, req.user.id)
  })
  res.json({ ok: true })
})

app.get('/api/projects/:id/versions', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  if (!getProjectForUser(projectId, req.user.id)) return res.status(404).json({ error: 'Project not found' })
  const versions = db.prepare(
    'SELECT v.id,v.project_id,v.user_id,v.label,v.content,v.metadata,v.created_at,u.name AS author_name ' +
    'FROM project_versions v JOIN users u ON u.id = v.user_id WHERE v.project_id = ? ORDER BY v.id DESC LIMIT 60'
  ).all(projectId).map(row => ({ ...row, metadata: parseJson(row.metadata, {}) }))
  res.json({ versions })
})

app.post('/api/projects/:id/versions', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id, { edit: true })
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const checkedLabel = checkedString(req.body?.label ?? 'Saved version', 'Version label', 120, { required: true, trim: true })
  if (checkedLabel.error) return res.status(400).json({ error: checkedLabel.error })
  const info = db.prepare(
    'INSERT INTO project_versions (project_id,user_id,label,content,metadata,created_at) VALUES (?,?,?,?,?,?)'
  ).run(projectId, req.user.id, checkedLabel.value, project.content, project.metadata || '{}', new Date().toISOString())
  res.status(201).json({ id: Number(info.lastInsertRowid), ok: true })
})

app.post('/api/projects/:id/versions/:versionId/restore', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  const versionId = positiveInt(req.params.versionId)
  if (!projectId || !versionId) return res.status(400).json({ error: 'Invalid project or version id' })
  const project = getProjectForUser(projectId, req.user.id, { edit: true })
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const version = db.prepare('SELECT * FROM project_versions WHERE id = ? AND project_id = ?').get(versionId, projectId)
  if (!version) return res.status(404).json({ error: 'Version not found' })
  const now = new Date().toISOString()
  db.prepare('UPDATE projects SET content = ?, metadata = ?, updated_at = ? WHERE id = ?')
    .run(version.content, version.metadata, now, projectId)
  syncWorkspaceContentFiles(projectId, version.content)
  res.json({ project: serializeProject(getProjectForUser(projectId, req.user.id), req.user.id) })
})

app.get('/api/projects/:id/files', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  res.json({ files: ensureProjectFiles(project) })
})

app.put('/api/projects/:id/files', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id, { edit: true })
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const incoming = req.body?.files
  if (incoming === undefined || incoming === null || typeof incoming !== 'object')
    return res.status(400).json({ error: 'Files are required' })
  const files = collectValidFiles(incoming)
  if (Object.keys(files).length > MAX_PROJECT_FILES)
    return res.status(400).json({ error: `A project can have at most ${MAX_PROJECT_FILES} files` })
  const deleted = Array.isArray(req.body?.deleted) ? req.body.deleted : []
  const current = filesToMap(ensureProjectFiles(project))
  for (const [filePath, content] of Object.entries(files)) current[filePath] = content
  for (const rawPath of deleted) {
    const checkedPath = normalizeFilePath(rawPath)
    if (!checkedPath.error) delete current[checkedPath.value]
  }
  if (Object.keys(current).length > MAX_PROJECT_FILES)
    return res.status(400).json({ error: `A project can have at most ${MAX_PROJECT_FILES} files` })
  replaceProjectFiles(projectId, current)
  const nextContent = hydrateContentWithFiles(project.content, listProjectFiles(projectId), project.app_kind)
  db.prepare('UPDATE projects SET content = ?, updated_at = ? WHERE id = ?')
    .run(nextContent, new Date().toISOString(), projectId)
  res.json({ files: listProjectFiles(projectId) })
})

app.post('/api/projects/:id/files', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id, { edit: true })
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const checkedPath = normalizeFilePath(req.body?.path)
  if (checkedPath.error) return res.status(400).json({ error: checkedPath.error })
  const checkedContent = checkedString(req.body?.content === undefined ? '' : req.body.content, 'File content', MAX_FILE_CONTENT_LENGTH)
  if (checkedContent.error) return res.status(400).json({ error: checkedContent.error })
  const existing = db.prepare('SELECT id FROM project_files WHERE project_id = ? AND path = ?').get(projectId, checkedPath.value)
  if (existing) return res.status(409).json({ error: 'A file with this path already exists' })
  const count = db.prepare('SELECT COUNT(*) AS n FROM project_files WHERE project_id = ?').get(projectId).n
  if (count >= MAX_PROJECT_FILES) return res.status(400).json({ error: `A project can have at most ${MAX_PROJECT_FILES} files` })
  upsertProjectFile(projectId, checkedPath.value, checkedContent.value)
  const nextContent = hydrateContentWithFiles(project.content, listProjectFiles(projectId), project.app_kind)
  db.prepare('UPDATE projects SET content = ?, updated_at = ? WHERE id = ?')
    .run(nextContent, new Date().toISOString(), projectId)
  res.status(201).json({ file: { path: checkedPath.value, content: checkedContent.value } })
})

app.post('/api/projects/:id/files/rename', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id, { edit: true })
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const from = normalizeFilePath(req.body?.from)
  const to = normalizeFilePath(req.body?.to)
  if (from.error) return res.status(400).json({ error: from.error })
  if (to.error) return res.status(400).json({ error: to.error })
  if (from.value === to.value) return res.json({ ok: true, path: to.value })
  const current = db.prepare('SELECT content FROM project_files WHERE project_id = ? AND path = ?').get(projectId, from.value)
  if (!current) return res.status(404).json({ error: 'File not found' })
  const clash = db.prepare('SELECT id FROM project_files WHERE project_id = ? AND path = ?').get(projectId, to.value)
  if (clash) return res.status(409).json({ error: 'A file with this path already exists' })
  const now = new Date().toISOString()
  db.prepare('UPDATE project_files SET path = ?, updated_at = ? WHERE project_id = ? AND path = ?')
    .run(to.value, now, projectId, from.value)
  const nextContent = hydrateContentWithFiles(project.content, listProjectFiles(projectId), project.app_kind)
  db.prepare('UPDATE projects SET content = ?, updated_at = ? WHERE id = ?').run(nextContent, now, projectId)
  res.json({ ok: true, path: to.value })
})

app.delete('/api/projects/:id/files', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id, { edit: true })
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const checkedPath = normalizeFilePath(req.query.path ?? req.body?.path)
  if (checkedPath.error) return res.status(400).json({ error: checkedPath.error })
  const info = db.prepare('DELETE FROM project_files WHERE project_id = ? AND path = ?').run(projectId, checkedPath.value)
  if (!info.changes) return res.status(404).json({ error: 'File not found' })
  const nextContent = hydrateContentWithFiles(project.content, listProjectFiles(projectId), project.app_kind)
  db.prepare('UPDATE projects SET content = ?, updated_at = ? WHERE id = ?')
    .run(nextContent, new Date().toISOString(), projectId)
  res.json({ ok: true })
})

app.get('/api/projects/:id/commits', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  if (!getProjectForUser(projectId, req.user.id)) return res.status(404).json({ error: 'Project not found' })
  const commits = db.prepare(
    'SELECT c.id,c.project_id,c.user_id,c.message,c.snapshot,c.created_at,u.name AS author_name,u.handle AS author_handle ' +
    'FROM project_commits c JOIN users u ON u.id = c.user_id WHERE c.project_id = ? ORDER BY c.id DESC LIMIT 60'
  ).all(projectId).map(row => serializeCommit(row))
  res.json({ commits })
})

app.post('/api/projects/:id/commits', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id, { edit: true })
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const checkedMessage = checkedString(req.body?.message ?? '', 'Commit message', MAX_COMMIT_MESSAGE_LENGTH, { required: true, trim: true })
  if (checkedMessage.error) return res.status(400).json({ error: checkedMessage.error })
  ensureProjectFiles(project)
  const snapshot = snapshotProjectFiles(projectId)
  const now = new Date().toISOString()
  const info = db.prepare(
    'INSERT INTO project_commits (project_id,user_id,message,snapshot,created_at) VALUES (?,?,?,?,?)'
  ).run(projectId, req.user.id, checkedMessage.value, snapshot, now)
  db.prepare(
    'INSERT INTO project_versions (project_id,user_id,label,content,metadata,created_at) VALUES (?,?,?,?,?,?)'
  ).run(projectId, req.user.id, checkedMessage.value, hydrateContentWithFiles(project.content, listProjectFiles(projectId), project.app_kind), project.metadata || '{}', now)
  const row = db.prepare(
    'SELECT c.id,c.project_id,c.user_id,c.message,c.snapshot,c.created_at,u.name AS author_name,u.handle AS author_handle ' +
    'FROM project_commits c JOIN users u ON u.id = c.user_id WHERE c.id = ?'
  ).get(Number(info.lastInsertRowid))
  res.status(201).json({ commit: serializeCommit(row, { files: true }) })
})

app.get('/api/projects/:id/commits/:commitId', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  const commitId = positiveInt(req.params.commitId)
  if (!projectId || !commitId) return res.status(400).json({ error: 'Invalid project or commit id' })
  if (!getProjectForUser(projectId, req.user.id)) return res.status(404).json({ error: 'Project not found' })
  const row = db.prepare(
    'SELECT c.id,c.project_id,c.user_id,c.message,c.snapshot,c.created_at,u.name AS author_name,u.handle AS author_handle ' +
    'FROM project_commits c JOIN users u ON u.id = c.user_id WHERE c.id = ? AND c.project_id = ?'
  ).get(commitId, projectId)
  if (!row) return res.status(404).json({ error: 'Commit not found' })
  res.json({ commit: serializeCommit(row, { files: true }) })
})

app.post('/api/projects/:id/commits/:commitId/restore', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  const commitId = positiveInt(req.params.commitId)
  if (!projectId || !commitId) return res.status(400).json({ error: 'Invalid project or commit id' })
  const project = getProjectForUser(projectId, req.user.id, { edit: true })
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const row = db.prepare('SELECT * FROM project_commits WHERE id = ? AND project_id = ?').get(commitId, projectId)
  if (!row) return res.status(404).json({ error: 'Commit not found' })
  applyFileSnapshot(projectId, row.snapshot, project.content)
  res.json({
    files: listProjectFiles(projectId),
    project: serializeProject(getProjectForUser(projectId, req.user.id), req.user.id),
  })
})

app.get('/api/projects/:id/comments', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  if (!getProjectForUser(projectId, req.user.id)) return res.status(404).json({ error: 'Project not found' })
  const comments = db.prepare(
    'SELECT c.*,u.name AS author_name,u.handle AS author_handle FROM project_comments c ' +
    'JOIN users u ON u.id = c.user_id WHERE c.project_id = ? ORDER BY c.id ASC LIMIT 200'
  ).all(projectId)
  res.json({ comments: comments.map(comment => ({ ...comment, can_delete: comment.user_id === req.user.id })) })
})

app.post('/api/projects/:id/comments', requireUser, socialRateLimit, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const checkedBody = checkedString(req.body?.body, 'Project comment', MAX_COMMENT_BODY_LENGTH, { required: true, trim: true })
  if (checkedBody.error) return res.status(400).json({ error: checkedBody.error })
  const now = new Date().toISOString()
  const info = db.prepare('INSERT INTO project_comments (project_id,user_id,body,created_at) VALUES (?,?,?,?)')
    .run(projectId, req.user.id, checkedBody.value, now)
  createNotification(project.user_id, req.user.id, 'project_comment', 'New project feedback',
    checkedBody.value.slice(0, 120), 'project', projectId)
  if (project.user_id !== req.user.id) awardSolar(req.user.id, 'help', `project-comment-${info.lastInsertRowid}`, 3, 'Helped another creator')
  res.status(201).json({ comment: {
    id: Number(info.lastInsertRowid), project_id: projectId, user_id: req.user.id,
    author_name: req.user.name, author_handle: req.user.handle, body: checkedBody.value, created_at: now, can_delete: true,
  } })
})

app.delete('/api/project-comments/:id', requireUser, (req, res) => {
  const commentId = positiveInt(req.params.id)
  if (!commentId) return res.status(400).json({ error: 'Invalid comment id' })
  const comment = db.prepare(
    'SELECT c.id FROM project_comments c JOIN projects p ON p.id = c.project_id WHERE c.id = ? AND (c.user_id = ? OR p.user_id = ?)'
  ).get(commentId, req.user.id, req.user.id)
  if (!comment) return res.status(404).json({ error: 'Comment not found' })
  db.prepare('DELETE FROM project_comments WHERE id = ?').run(commentId)
  res.json({ ok: true })
})

app.get('/api/projects/:id/collaborators', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const collaborators = db.prepare(
    'SELECT pc.user_id,pc.role,pc.status,pc.created_at,u.name,u.handle FROM project_collaborators pc ' +
    'JOIN users u ON u.id = pc.user_id WHERE pc.project_id = ? ORDER BY pc.created_at'
  ).all(projectId)
  res.json({ collaborators })
})

app.post('/api/projects/:id/collaborators', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id)
  if (!project?.can_manage) return res.status(404).json({ error: 'Project not found' })
  const role = req.body?.role ?? 'viewer'
  if (!['viewer', 'commenter', 'editor'].includes(role)) return res.status(400).json({ error: 'Invalid collaborator role' })
  const handle = String(req.body?.handle || '').trim().toLowerCase()
  const user = db.prepare('SELECT id,name,handle FROM users WHERE lower(handle) = lower(?) AND status = ?')
    .get(handle.startsWith('@') ? handle : '@' + handle, 'active')
  if (!user || user.id === req.user.id) return res.status(404).json({ error: 'User not found' })
  db.prepare(
    'INSERT INTO project_collaborators (project_id,user_id,role,status,created_at) VALUES (?,?,?,?,?) ' +
    'ON CONFLICT(project_id,user_id) DO UPDATE SET role = excluded.role, status = excluded.status'
  ).run(projectId, user.id, role, 'accepted', new Date().toISOString())
  createNotification(user.id, req.user.id, 'collaboration', 'Project collaboration invitation',
    `${req.user.name} invited you to ${project.name}`, 'project', projectId)
  res.status(201).json({ collaborator: { user_id: user.id, name: user.name, handle: user.handle, role, status: 'accepted' } })
})

app.delete('/api/projects/:id/collaborators/:userId', requireUser, (req, res) => {
  const projectId = positiveInt(req.params.id)
  const userId = positiveInt(req.params.userId)
  if (!projectId || !userId) return res.status(400).json({ error: 'Invalid project or user id' })
  const project = getProjectForUser(projectId, req.user.id)
  if (!project?.can_manage && userId !== req.user.id) return res.status(404).json({ error: 'Project not found' })
  db.prepare('DELETE FROM project_collaborators WHERE project_id = ? AND user_id = ?').run(projectId, userId)
  res.json({ ok: true })
})

app.post('/api/projects/:id/collaboration-requests', requireUser, socialRateLimit, (req, res) => {
  const projectId = positiveInt(req.params.id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id)
  if (!project || project.user_id === req.user.id) return res.status(400).json({ error: 'Collaboration request is not available' })
  const checkedMessage = checkedString(req.body?.message ?? 'I would like to help with this project.', 'Request message', 500, { required: true, trim: true })
  if (checkedMessage.error) return res.status(400).json({ error: checkedMessage.error })
  const now = new Date().toISOString()
  db.prepare(
    'INSERT INTO collaboration_requests (project_id,requester_id,message,status,created_at,updated_at) VALUES (?,?,?,?,?,?) ' +
    "ON CONFLICT(project_id,requester_id) DO UPDATE SET message = excluded.message, status = 'pending', updated_at = excluded.updated_at"
  ).run(projectId, req.user.id, checkedMessage.value, 'pending', now, now)
  createNotification(project.user_id, req.user.id, 'collaboration_request', 'New collaboration request',
    checkedMessage.value, 'project', projectId)
  res.status(201).json({ ok: true, status: 'pending' })
})

app.get('/api/collaboration-requests', requireUser, (req, res) => {
  const requests = db.prepare(
    'SELECT cr.*,p.name AS project_name,p.user_id AS owner_id,u.name AS requester_name,u.handle AS requester_handle ' +
    'FROM collaboration_requests cr JOIN projects p ON p.id = cr.project_id JOIN users u ON u.id = cr.requester_id ' +
    'WHERE p.user_id = ? OR cr.requester_id = ? ORDER BY cr.id DESC LIMIT 100'
  ).all(req.user.id, req.user.id)
  res.json({ requests })
})

app.post('/api/collaboration-requests/:id/respond', requireUser, (req, res) => {
  const requestId = positiveInt(req.params.id)
  if (!requestId) return res.status(400).json({ error: 'Invalid request id' })
  const request = db.prepare(
    'SELECT cr.*,p.user_id AS owner_id,p.name AS project_name FROM collaboration_requests cr ' +
    'JOIN projects p ON p.id = cr.project_id WHERE cr.id = ? AND p.user_id = ?'
  ).get(requestId, req.user.id)
  if (!request) return res.status(404).json({ error: 'Request not found' })
  const decision = req.body?.decision
  if (!['approve', 'decline'].includes(decision)) return res.status(400).json({ error: 'Decision must be approve or decline' })
  const now = new Date().toISOString()
  const status = decision === 'approve' ? 'approved' : 'declined'
  db.prepare('UPDATE collaboration_requests SET status = ?, updated_at = ? WHERE id = ?').run(status, now, requestId)
  if (decision === 'approve') {
    db.prepare(
      'INSERT INTO project_collaborators (project_id,user_id,role,status,created_at) VALUES (?,?,?,?,?) ' +
      "ON CONFLICT(project_id,user_id) DO UPDATE SET role = 'editor', status = 'accepted'"
    ).run(request.project_id, request.requester_id, 'editor', 'accepted', now)
  }
  createNotification(request.requester_id, req.user.id, 'collaboration_response',
    decision === 'approve' ? 'Collaboration approved' : 'Collaboration request declined',
    request.project_name, 'project', request.project_id)
  res.json({ ok: true, status })
})

app.post('/api/users/:id/follow', requireUser, socialRateLimit, (req, res) => {
  const followedId = positiveInt(req.params.id)
  if (!followedId || followedId === req.user.id) return res.status(400).json({ error: 'Invalid user to follow' })
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND status = 'active'").get(followedId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND followed_id = ?').get(req.user.id, followedId)
  if (existing) db.prepare('DELETE FROM follows WHERE follower_id = ? AND followed_id = ?').run(req.user.id, followedId)
  else {
    db.prepare('INSERT INTO follows (follower_id,followed_id,created_at) VALUES (?,?,?)').run(req.user.id, followedId, new Date().toISOString())
    createNotification(followedId, req.user.id, 'follow', `${req.user.name} followed your work`, '', 'profile', req.user.id)
  }
  res.json({ following: !existing })
})

// ── Posts, comments, reactions, and saves (Lifestyle) ──
const POST_SELECT = [
  'SELECT p.*, u.id AS author_id, u.name AS author_name, u.handle AS author_handle,',
  'pr.id AS linked_project_id, pr.name AS project_name, pr.app_kind AS project_app_kind,',
  'pr.type AS project_type, pr.visibility AS project_visibility,',
  'CASE WHEN sp.post_id IS NULL THEN 0 ELSE 1 END AS is_saved,',
  '(SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count',
  'FROM posts p',
  'LEFT JOIN users u ON u.id = p.user_id',
  'LEFT JOIN projects pr ON pr.id = p.project_id AND pr.user_id = p.user_id',
  'LEFT JOIN saved_posts sp ON sp.post_id = p.id AND sp.user_id = ?',
].join(' ')

function serializePosts(rows, userId) {
  if (rows.length === 0) return []
  const ids = rows.map(row => row.id)
  const placeholders = ids.map(() => '?').join(',')
  const reactionRows = db.prepare(
    'SELECT post_id, emoji, COUNT(*) AS n FROM reactions WHERE post_id IN (' +
    placeholders + ') GROUP BY post_id, emoji'
  ).all(...ids)
  const myReactionRows = db.prepare(
    'SELECT post_id, emoji FROM reactions WHERE user_id = ? AND post_id IN (' +
    placeholders + ')'
  ).all(userId, ...ids)

  const reactionsByPost = new Map()
  for (const reaction of reactionRows) {
    const reactions = reactionsByPost.get(reaction.post_id) || {}
    reactions[reaction.emoji] = Number(reaction.n)
    reactionsByPost.set(reaction.post_id, reactions)
  }
  const mineByPost = new Map()
  for (const reaction of myReactionRows) {
    const mine = mineByPost.get(reaction.post_id) || []
    mine.push(reaction.emoji)
    mineByPost.set(reaction.post_id, mine)
  }

  return rows.map(row => ({
    id: row.id,
    category: row.category,
    body: row.body,
    audience: row.audience,
    space_id: row.space_id || 'lifestyle',
    post_type: row.post_type || 'progress',
    media_url: row.media_url || '',
    created_at: row.created_at,
    project_id: row.linked_project_id ?? null,
    project_name: row.project_name ?? null,
    project_app_kind: row.project_app_kind ?? null,
    project_type: row.project_type ?? null,
    project_visibility: row.project_visibility ?? null,
    author_id: row.author_id ?? null,
    author_name: row.author_name ?? 'Unknown',
    author_handle: row.author_handle ?? '',
    reactions: reactionsByPost.get(row.id) || {},
    my_reactions: mineByPost.get(row.id) || [],
    comment_count: Number(row.comment_count || 0),
    is_saved: Boolean(row.is_saved),
    can_delete: row.user_id === userId,
  }))
}

function getVisiblePost(postId, userId) {
  return db.prepare(
    "SELECT * FROM posts WHERE id = ? AND (audience = 'public' OR user_id = ?)"
  ).get(postId, userId)
}

function getSerializedPost(postId, userId) {
  const row = db.prepare(
    POST_SELECT + " WHERE p.id = ? AND (p.audience = 'public' OR p.user_id = ?)"
  ).get(userId, postId, userId)
  return row ? serializePosts([row], userId)[0] : null
}

app.get('/api/posts', requireUser, (req, res) => {
  let limit = DEFAULT_POST_PAGE_SIZE
  if (req.query.limit !== undefined) {
    const requested = positiveInt(req.query.limit)
    if (!requested) return res.status(400).json({ error: 'Invalid page limit', code: 'INVALID_LIMIT' })
    limit = Math.min(requested, MAX_POST_PAGE_SIZE)
  }

  let cursor = null
  if (req.query.cursor !== undefined && req.query.cursor !== '') {
    cursor = positiveInt(req.query.cursor)
    if (!cursor) return res.status(400).json({ error: 'Invalid page cursor', code: 'INVALID_CURSOR' })
  }

  const category = req.query.category
  if (category !== undefined && category !== '' && category !== 'all' &&
      (typeof category !== 'string' || !POST_CATEGORIES.has(category)))
    return res.status(400).json({ error: 'Invalid post category', code: 'INVALID_CATEGORY' })

  const requestedSpaceId = req.query.space_id
  if (requestedSpaceId !== undefined && typeof requestedSpaceId !== 'string')
    return res.status(400).json({ error: 'Invalid Space id', code: 'INVALID_SPACE' })
  const spaceId = requestedSpaceId ? normalizeSpaceId(requestedSpaceId, '') : ''

  const checkedSearch = req.query.q === undefined
    ? { value: '' }
    : checkedString(req.query.q, 'Search query', MAX_POST_SEARCH_LENGTH, { trim: true })
  if (checkedSearch.error) return res.status(400).json({ error: checkedSearch.error, code: 'INVALID_SEARCH' })

  const savedValue = req.query.saved
  if (savedValue !== undefined && !['', '0', '1', 'false', 'true'].includes(savedValue))
    return res.status(400).json({ error: 'saved must be true or false', code: 'INVALID_SAVED_FILTER' })
  const savedOnly = savedValue === '1' || savedValue === 'true'

  const where = ["(p.audience = 'public' OR p.user_id = ?)"]
  const params = [req.user.id, req.user.id]
  if (cursor) {
    where.push('p.id < ?')
    params.push(cursor)
  }
  if (typeof category === 'string' && category && category !== 'all') {
    where.push('p.category = ?')
    params.push(category)
  }
  if (spaceId) {
    where.push('p.space_id = ?')
    params.push(spaceId)
  }
  if (checkedSearch.value) {
    const like = '%' + checkedSearch.value.toLowerCase() + '%'
    where.push('(lower(p.body) LIKE ? OR lower(u.name) LIKE ? OR lower(u.handle) LIKE ? OR lower(pr.name) LIKE ?)')
    params.push(like, like, like, like)
  }
  if (savedOnly) where.push('sp.post_id IS NOT NULL')

  const rows = db.prepare(
    POST_SELECT + ' WHERE ' + where.join(' AND ') + ' ORDER BY p.id DESC LIMIT ?'
  ).all(...params, limit + 1)
  const hasMore = rows.length > limit
  const pageRows = hasMore ? rows.slice(0, limit) : rows
  res.json({
    posts: serializePosts(pageRows, req.user.id),
    next_cursor: hasMore && pageRows.length > 0 ? pageRows[pageRows.length - 1].id : null,
  })
})

app.get('/api/posts/:id', requireUser, (req, res) => {
  const postId = positiveInt(req.params.id)
  if (!postId) return res.status(400).json({ error: 'Invalid post id' })
  const post = getSerializedPost(postId, req.user.id)
  if (!post) return res.status(404).json({ error: 'Post not found' })
  res.json({ post })
})

app.post('/api/posts', requireUser, socialRateLimit, (req, res) => {
  const { category, body, project_id, audience, space_id, post_type, media_url } = req.body || {}
  const checkedBody = checkedString(body, 'Post body', MAX_POST_BODY_LENGTH, { required: true, trim: true })
  if (checkedBody.error) return res.status(400).json({ error: checkedBody.error })
  const postCategory = category === undefined ? 'reflection' : category
  if (typeof postCategory !== 'string' || !POST_CATEGORIES.has(postCategory))
    return res.status(400).json({ error: 'Invalid post category' })
  const postAudience = audience === undefined ? 'public' : audience
  if (typeof postAudience !== 'string' || !POST_AUDIENCES.has(postAudience))
    return res.status(400).json({ error: 'Audience must be public or private' })

  let linkedProjectId = null
  let linkedProject = null
  if (project_id !== undefined && project_id !== null && project_id !== '') {
    linkedProjectId = positiveInt(project_id)
    if (!linkedProjectId) return res.status(400).json({ error: 'Invalid project id' })
    linkedProject = getProjectForUser(linkedProjectId, req.user.id, { edit: true })
    if (!linkedProject) return res.status(400).json({ error: 'Linked project must belong to you or be editable by you' })
  }

  const checkedPostType = checkedString(post_type ?? 'progress', 'Post type', 60, { required: true, trim: true })
  if (checkedPostType.error) return res.status(400).json({ error: checkedPostType.error })
  const checkedMedia = checkedString(media_url ?? '', 'Media', 1_450_000, { trim: true })
  if (checkedMedia.error) return res.status(400).json({ error: checkedMedia.error })
  if (checkedMedia.value && !/^https:\/\//i.test(checkedMedia.value) &&
      !/^data:(image\/(png|jpeg|webp|gif)|video\/(mp4|webm|quicktime));base64,[A-Za-z0-9+/=]+$/i.test(checkedMedia.value))
    return res.status(400).json({ error: 'Media must be an HTTPS URL or a supported image/video upload' })
  if (checkedMedia.value && !checkedMedia.value.startsWith('data:')) {
    try {
      const url = new URL(checkedMedia.value)
      if (url.protocol !== 'https:') throw new Error('protocol')
    } catch { return res.status(400).json({ error: 'Media URL must be a valid HTTPS URL' }) }
  }
  const postSpaceId = normalizeSpaceId(space_id ?? linkedProject?.space_id, 'lifestyle')

  const info = db.prepare(
    'INSERT INTO posts (user_id,category,body,project_id,audience,space_id,post_type,media_url,created_at) VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(req.user.id, postCategory, checkedBody.value, linkedProjectId, postAudience,
    postSpaceId, checkedPostType.value, checkedMedia.value, new Date().toISOString())
  const postId = Number(info.lastInsertRowid)
  if (postAudience === 'public') awardSolar(req.user.id, 'post', postId, linkedProjectId ? 12 : 8,
    linkedProjectId ? 'Published project progress' : 'Shared meaningful progress')
  res.status(201).json({ post: getSerializedPost(postId, req.user.id) })
})

app.post('/api/posts/:id/react', requireUser, socialRateLimit, (req, res) => {
  const postId = positiveInt(req.params.id)
  if (!postId) return res.status(400).json({ error: 'Invalid post id' })
  const { emoji } = req.body || {}
  if (typeof emoji !== 'string' || !REACTION_EMOJIS.has(emoji))
    return res.status(400).json({ error: 'Invalid reaction emoji' })
  const row = getVisiblePost(postId, req.user.id)
  if (!row) return res.status(404).json({ error: 'Post not found' })
  inTransaction(() => {
    const current = db.prepare(
      'SELECT emoji FROM reactions WHERE post_id = ? AND user_id = ? LIMIT 1'
    ).get(postId, req.user.id)
    db.prepare('DELETE FROM reactions WHERE post_id = ? AND user_id = ?').run(postId, req.user.id)
    if (current?.emoji !== emoji)
      db.prepare('INSERT INTO reactions (post_id,user_id,emoji) VALUES (?,?,?)')
        .run(postId, req.user.id, emoji)
  })
  if (row.user_id !== req.user.id) {
    createNotification(row.user_id, req.user.id, 'reaction', `${req.user.name} reacted to your progress`,
      emoji, 'post', postId)
  }
  res.json({ post: getSerializedPost(postId, req.user.id) })
})

app.post('/api/posts/:id/save', requireUser, socialRateLimit, (req, res) => {
  const postId = positiveInt(req.params.id)
  if (!postId) return res.status(400).json({ error: 'Invalid post id' })
  if (!getVisiblePost(postId, req.user.id))
    return res.status(404).json({ error: 'Post not found' })

  const requested = req.body?.saved
  if (requested !== undefined && typeof requested !== 'boolean')
    return res.status(400).json({ error: 'saved must be a boolean' })
  const existing = db.prepare(
    'SELECT 1 FROM saved_posts WHERE post_id = ? AND user_id = ?'
  ).get(postId, req.user.id)
  const saved = requested === undefined ? !existing : requested
  if (saved) {
    db.prepare(
      'INSERT OR IGNORE INTO saved_posts (post_id,user_id,created_at) VALUES (?,?,?)'
    ).run(postId, req.user.id, new Date().toISOString())
  } else {
    db.prepare('DELETE FROM saved_posts WHERE post_id = ? AND user_id = ?')
      .run(postId, req.user.id)
  }
  res.json({ saved })
})

function serializeComments(rows, userId) {
  return rows.map(row => ({
    id: row.id,
    post_id: row.post_id,
    author_id: row.user_id,
    author_name: row.author_name ?? 'Unknown',
    author_handle: row.author_handle ?? '',
    body: row.body,
    created_at: row.created_at,
    can_delete: row.user_id === userId || row.post_author_id === userId,
  }))
}

const COMMENT_SELECT = [
  'SELECT c.*, u.name AS author_name, u.handle AS author_handle,',
  'p.user_id AS post_author_id FROM comments c',
  'LEFT JOIN users u ON u.id = c.user_id',
  'JOIN posts p ON p.id = c.post_id',
].join(' ')

app.get('/api/posts/:id/comments', requireUser, (req, res) => {
  const postId = positiveInt(req.params.id)
  if (!postId) return res.status(400).json({ error: 'Invalid post id' })
  if (!getVisiblePost(postId, req.user.id))
    return res.status(404).json({ error: 'Post not found' })
  const rows = db.prepare(
    COMMENT_SELECT + ' WHERE c.post_id = ? ORDER BY c.id ASC LIMIT 100'
  ).all(postId)
  res.json({ comments: serializeComments(rows, req.user.id) })
})

app.post('/api/posts/:id/comments', requireUser, socialRateLimit, (req, res) => {
  const postId = positiveInt(req.params.id)
  if (!postId) return res.status(400).json({ error: 'Invalid post id' })
  if (!getVisiblePost(postId, req.user.id))
    return res.status(404).json({ error: 'Post not found' })
  const checkedBody = checkedString(
    req.body?.body,
    'Comment',
    MAX_COMMENT_BODY_LENGTH,
    { required: true, trim: true },
  )
  if (checkedBody.error) return res.status(400).json({ error: checkedBody.error })
  const info = db.prepare(
    'INSERT INTO comments (post_id,user_id,body,created_at) VALUES (?,?,?,?)'
  ).run(postId, req.user.id, checkedBody.value, new Date().toISOString())
  const post = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(postId)
  createNotification(post?.user_id, req.user.id, 'comment', `${req.user.name} commented on your progress`,
    checkedBody.value.slice(0, 120), 'post', postId)
  if (post?.user_id && post.user_id !== req.user.id)
    awardSolar(req.user.id, 'help', `post-comment-${info.lastInsertRowid}`, 2, 'Helped with thoughtful feedback')
  const row = db.prepare(COMMENT_SELECT + ' WHERE c.id = ?').get(info.lastInsertRowid)
  res.status(201).json({ comment: serializeComments([row], req.user.id)[0] })
})

app.delete('/api/comments/:id', requireUser, socialRateLimit, (req, res) => {
  const commentId = positiveInt(req.params.id)
  if (!commentId) return res.status(400).json({ error: 'Invalid comment id' })
  const comment = db.prepare(
    'SELECT c.id FROM comments c JOIN posts p ON p.id = c.post_id ' +
    'WHERE c.id = ? AND (c.user_id = ? OR p.user_id = ?)'
  ).get(commentId, req.user.id, req.user.id)
  if (!comment) return res.status(404).json({ error: 'Comment not found' })
  db.prepare('DELETE FROM comments WHERE id = ?').run(commentId)
  res.json({ ok: true })
})

app.delete('/api/posts/:id', requireUser, (req, res) => {
  const postId = positiveInt(req.params.id)
  if (!postId) return res.status(400).json({ error: 'Invalid post id' })
  const post = db.prepare('SELECT id FROM posts WHERE id = ? AND user_id = ?').get(postId, req.user.id)
  if (!post) return res.status(404).json({ error: 'Post not found' })
  inTransaction(() => {
    db.prepare('DELETE FROM comments WHERE post_id = ?').run(postId)
    db.prepare('DELETE FROM saved_posts WHERE post_id = ?').run(postId)
    db.prepare('DELETE FROM reactions WHERE post_id = ?').run(postId)
    db.prepare('DELETE FROM posts WHERE id = ? AND user_id = ?').run(postId, req.user.id)
  })
  res.json({ ok: true })
})

// ── Subject / Hobby Spaces ──
app.get('/api/spaces', requireUser, (req, res) => {
  const custom = db.prepare(
    'SELECT space_id AS id,name,kind,custom,created_at FROM user_spaces WHERE user_id = ? ORDER BY created_at'
  ).all(req.user.id)
  const projectCounts = new Map(db.prepare(
    'SELECT space_id,COUNT(*) AS n FROM projects WHERE user_id = ? GROUP BY space_id'
  ).all(req.user.id).map(row => [row.space_id, Number(row.n)]))
  const liveCounts = new Map(db.prepare(
    "SELECT space_id,COUNT(*) AS n FROM live_sessions WHERE status = 'live' GROUP BY space_id"
  ).all().map(row => [row.space_id, Number(row.n)]))
  const builtIn = SPACE_CATALOG.map(([id, name, kind]) => ({
    id, name, kind, custom: false, project_count: projectCounts.get(id) || 0, live_count: liveCounts.get(id) || 0,
  }))
  res.json({ spaces: [...builtIn, ...custom.map(space => ({
    ...space, custom: Boolean(space.custom), project_count: projectCounts.get(space.id) || 0, live_count: liveCounts.get(space.id) || 0,
  }))] })
})

app.post('/api/spaces', requireUser, (req, res) => {
  const checkedName = checkedString(req.body?.name, 'Hobby name', 60, { required: true, trim: true })
  if (checkedName.error) return res.status(400).json({ error: checkedName.error })
  const base = normalizeSpaceId(checkedName.value, 'hobby')
  let spaceId = 'custom-' + base
  let suffix = 1
  while (db.prepare('SELECT 1 FROM user_spaces WHERE user_id = ? AND space_id = ?').get(req.user.id, spaceId)) {
    suffix += 1
    spaceId = `custom-${base}-${suffix}`
  }
  const now = new Date().toISOString()
  db.prepare('INSERT INTO user_spaces (user_id,space_id,name,kind,custom,created_at) VALUES (?,?,?,?,?,?)')
    .run(req.user.id, spaceId, checkedName.value, 'hobby', 1, now)
  res.status(201).json({ space: { id: spaceId, name: checkedName.value, kind: 'hobby', custom: true, project_count: 0, live_count: 0, created_at: now } })
})

app.delete('/api/spaces/:spaceId', requireUser, (req, res) => {
  const spaceId = normalizeSpaceId(req.params.spaceId, '')
  const result = db.prepare('DELETE FROM user_spaces WHERE user_id = ? AND space_id = ? AND custom = 1')
    .run(req.user.id, spaceId)
  if (!result.changes) return res.status(404).json({ error: 'Custom hobby not found' })
  res.json({ ok: true })
})

// ── Solar progression (meaningful, idempotent accomplishments only) ──
app.get('/api/solar', requireUser, (req, res) => {
  const total = Number(db.prepare('SELECT COALESCE(SUM(amount),0) AS total FROM solar_events WHERE user_id = ?').get(req.user.id).total)
  const events = db.prepare(
    'SELECT id,source_type,source_id,amount,reason,created_at FROM solar_events WHERE user_id = ? ORDER BY id DESC LIMIT 40'
  ).all(req.user.id)
  const thresholds = [100, 280, 600, 1200, 2400]
  const next = thresholds.find(value => value > total) ?? null
  res.json({ total, identity: solarIdentity(total), next_threshold: next, events })
})

// ── Persistent notifications with exact targets ──
app.get('/api/notifications', requireUser, (req, res) => {
  const notifications = db.prepare(
    'SELECT n.*,u.name AS actor_name,u.handle AS actor_handle FROM notifications n ' +
    'LEFT JOIN users u ON u.id = n.actor_id WHERE n.user_id = ? ORDER BY n.id DESC LIMIT 80'
  ).all(req.user.id).map(row => ({ ...row, read: Boolean(row.read_at) }))
  res.json({ notifications, unread: notifications.filter(item => !item.read).length })
})

app.post('/api/notifications/read', requireUser, (req, res) => {
  const ids = req.body?.ids
  const now = new Date().toISOString()
  if (ids === undefined) {
    db.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').run(now, req.user.id)
  } else {
    if (!Array.isArray(ids) || ids.length > 100) return res.status(400).json({ error: 'ids must be an array' })
    for (const value of ids) {
      const id = positiveInt(value)
      if (id) db.prepare('UPDATE notifications SET read_at = ? WHERE id = ? AND user_id = ?').run(now, id, req.user.id)
    }
  }
  res.json({ ok: true })
})

// ── Permission-aware global search ──
app.get('/api/search', requireUser, (req, res) => {
  const checked = checkedString(req.query.q ?? '', 'Search query', MAX_POST_SEARCH_LENGTH, { required: true, trim: true })
  if (checked.error) return res.status(400).json({ error: checked.error })
  const q = checked.value.toLowerCase()
  const like = `%${q}%`
  const candidateProjects = db.prepare(
    'SELECT id FROM projects WHERE lower(name) LIKE ? OR lower(space) LIKE ? ORDER BY updated_at DESC LIMIT 40'
  ).all(like, like)
  const projects = candidateProjects
    .map(row => getProjectForUser(Number(row.id), req.user.id))
    .filter(Boolean).slice(0, 12)
    .map(row => {
      const project = serializeProject(row, req.user.id)
      return { ...project, content: undefined }
    })
  const people = db.prepare(
    "SELECT DISTINCT u.id,u.name,u.handle FROM users u " +
    "LEFT JOIN posts p ON p.user_id = u.id AND p.audience = 'public' " +
    "LEFT JOIN projects pr ON pr.user_id = u.id AND pr.visibility = 'public' " +
    "WHERE u.status = 'active' AND (u.id = ? OR p.id IS NOT NULL OR pr.id IS NOT NULL) " +
    "AND (lower(u.name) LIKE ? OR lower(u.handle) LIKE ?) ORDER BY u.name LIMIT 10"
  ).all(req.user.id, like, like)
  const posts = db.prepare(
    POST_SELECT + " WHERE (p.audience = 'public' OR p.user_id = ?) AND (lower(p.body) LIKE ? OR lower(pr.name) LIKE ?) ORDER BY p.id DESC LIMIT 12"
  ).all(req.user.id, req.user.id, like, like)
  const liveRows = db.prepare(
    'SELECT ls.*,u.name AS owner_name,u.handle AS owner_handle,p.name AS project_name,p.app_kind ' +
    "FROM live_sessions ls JOIN users u ON u.id = ls.owner_id JOIN projects p ON p.id = ls.project_id " +
    "WHERE ls.status = 'live' AND (lower(ls.title) LIKE ? OR lower(p.name) LIKE ?) ORDER BY ls.id DESC LIMIT 12"
  ).all(like, like)
  const live = liveRows.filter(row => canWatchLive(row, req.user.id)).map(row => serializeLiveSession(row, req.user.id))
  const customSpaces = db.prepare('SELECT space_id AS id,name,kind FROM user_spaces WHERE user_id = ?').all(req.user.id)
  const spaces = [...SPACE_CATALOG.map(([id, name, kind]) => ({ id, name, kind })), ...customSpaces]
    .filter(space => space.name.toLowerCase().includes(q)).slice(0, 12)
  res.json({ projects, people, posts: serializePosts(posts, req.user.id), live, spaces })
})

// ── Permission-aware discovery overview ──
app.get('/api/explore', requireUser, (req, res) => {
  const candidateProjects = db.prepare('SELECT id FROM projects ORDER BY updated_at DESC LIMIT 160').all()
  const projects = candidateProjects
    .map(row => getProjectForUser(Number(row.id), req.user.id))
    .filter(Boolean)
    .slice(0, 30)
    .map(row => {
      const project = serializeProject(row, req.user.id)
      return { ...project, content: undefined }
    })
  const postRows = db.prepare(
    POST_SELECT + " WHERE p.audience = 'public' OR p.user_id = ? ORDER BY p.id DESC LIMIT 36"
  ).all(req.user.id, req.user.id)
  const liveRows = db.prepare(
    'SELECT ls.*,u.name AS owner_name,u.handle AS owner_handle,p.name AS project_name,p.app_kind ' +
    "FROM live_sessions ls JOIN users u ON u.id = ls.owner_id JOIN projects p ON p.id = ls.project_id " +
    "WHERE ls.status = 'live' ORDER BY ls.id DESC LIMIT 30"
  ).all()
  const live = liveRows.filter(row => canWatchLive(row, req.user.id)).map(row => serializeLiveSession(row, req.user.id))
  const creators = db.prepare(
    "SELECT u.id,u.name,u.handle," +
    "(SELECT COUNT(*) FROM projects p WHERE p.user_id = u.id AND p.visibility = 'public') AS project_count," +
    "(SELECT COUNT(*) FROM posts po WHERE po.user_id = u.id AND po.audience = 'public') AS post_count " +
    "FROM users u WHERE u.status = 'active' AND (u.id = ? OR EXISTS(SELECT 1 FROM posts po WHERE po.user_id = u.id AND po.audience = 'public') " +
    "OR EXISTS(SELECT 1 FROM projects p WHERE p.user_id = u.id AND p.visibility = 'public')) " +
    'ORDER BY (project_count + post_count) DESC,u.name LIMIT 20'
  ).all(req.user.id).map(row => ({ ...row, project_count: Number(row.project_count), post_count: Number(row.post_count) }))
  const customSpaces = db.prepare('SELECT space_id AS id,name,kind FROM user_spaces WHERE user_id = ?').all(req.user.id)
  const spaces = [...SPACE_CATALOG.map(([id, name, kind]) => ({ id, name, kind })), ...customSpaces].map(space => ({
    ...space,
    project_count: projects.filter(project => project.space_id === space.id).length,
    post_count: postRows.filter(post => post.space_id === space.id).length,
    live_count: live.filter(session => session.space_id === space.id).length,
  }))
  res.json({ projects, posts: serializePosts(postRows, req.user.id), live, creators, spaces })
})

// ── Live collaborative project sessions (SSE event stream) ──
const LIVE_SELECT = [
  'SELECT ls.*,u.name AS owner_name,u.handle AS owner_handle,p.name AS project_name,p.app_kind',
  'FROM live_sessions ls JOIN users u ON u.id = ls.owner_id JOIN projects p ON p.id = ls.project_id',
].join(' ')

app.get('/api/live', requireUser, (req, res) => {
  const requestedSpace = req.query.space_id ? normalizeSpaceId(req.query.space_id, '') : ''
  const params = []
  let where = "WHERE ls.status = 'live'"
  if (requestedSpace) { where += ' AND ls.space_id = ?'; params.push(requestedSpace) }
  const rows = db.prepare(LIVE_SELECT + ' ' + where + ' ORDER BY ls.id DESC LIMIT 80').all(...params)
  res.json({ sessions: rows.filter(row => canWatchLive(row, req.user.id)).map(row => serializeLiveSession(row, req.user.id)) })
})

app.post('/api/live', requireUser, (req, res) => {
  const projectId = positiveInt(req.body?.project_id)
  if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
  const project = getProjectForUser(projectId, req.user.id, { edit: true })
  if (!project) return res.status(404).json({ error: 'Project not found' })
  const existing = db.prepare("SELECT id FROM live_sessions WHERE project_id = ? AND status = 'live'").get(projectId)
  if (existing) {
    const row = db.prepare(LIVE_SELECT + ' WHERE ls.id = ?').get(existing.id)
    return res.json({ session: serializeLiveSession(row, req.user.id) })
  }
  const checkedTitle = checkedString(req.body?.title ?? `Building ${project.name}`, 'Live title', 140, { required: true, trim: true })
  if (checkedTitle.error) return res.status(400).json({ error: checkedTitle.error })
  const audience = req.body?.audience ?? 'public'
  if (!POST_AUDIENCES.has(audience)) return res.status(400).json({ error: 'Audience must be public or private' })
  const requestedPermissions = req.body?.permissions && typeof req.body.permissions === 'object' ? req.body.permissions : {}
  const permissions = {
    comment: requestedPermissions.comment !== false,
    suggest: requestedPermissions.suggest !== false,
    request_edit: requestedPermissions.request_edit !== false,
    voice: Boolean(requestedPermissions.voice),
  }
  const now = new Date().toISOString()
  const info = db.prepare(
    'INSERT INTO live_sessions (owner_id,project_id,space_id,title,status,audience,permissions,started_at) VALUES (?,?,?,?,?,?,?,?)'
  ).run(req.user.id, projectId, project.space_id || 'coding', checkedTitle.value, 'live', audience, JSON.stringify(permissions), now)
  const sessionId = Number(info.lastInsertRowid)
  awardSolar(req.user.id, 'live', sessionId, 10, 'Shared a live work session')
  const row = db.prepare(LIVE_SELECT + ' WHERE ls.id = ?').get(sessionId)
  res.status(201).json({ session: serializeLiveSession(row, req.user.id) })
})

app.get('/api/live/:id', requireUser, (req, res) => {
  const sessionId = positiveInt(req.params.id)
  if (!sessionId) return res.status(400).json({ error: 'Invalid live session id' })
  const row = db.prepare(LIVE_SELECT + ' WHERE ls.id = ?').get(sessionId)
  if (!canWatchLive(row, req.user.id)) return res.status(404).json({ error: 'Live session not found' })
  const project = getProjectForUser(row.project_id, req.user.id) || getProjectForUser(row.project_id, row.owner_id)
  const events = db.prepare(
    'SELECT e.*,u.name AS author_name,u.handle AS author_handle FROM live_events e ' +
    'JOIN users u ON u.id = e.user_id WHERE e.session_id = ? ORDER BY e.id DESC LIMIT 120'
  ).all(sessionId).reverse().map(event => ({ ...event, payload: parseJson(event.payload, {}) }))
  res.json({ session: serializeLiveSession(row, req.user.id), project: serializeProject(project, req.user.id), events })
})

app.put('/api/live/:id', requireUser, (req, res) => {
  const sessionId = positiveInt(req.params.id)
  if (!sessionId) return res.status(400).json({ error: 'Invalid live session id' })
  const session = db.prepare('SELECT * FROM live_sessions WHERE id = ? AND owner_id = ?').get(sessionId, req.user.id)
  if (!session) return res.status(404).json({ error: 'Live session not found' })
  const audience = req.body?.audience ?? session.audience
  if (!POST_AUDIENCES.has(audience)) return res.status(400).json({ error: 'Audience must be public or private' })
  const currentPermissions = parseJson(session.permissions, {})
  const requested = req.body?.permissions && typeof req.body.permissions === 'object' ? req.body.permissions : currentPermissions
  const permissions = {
    comment: requested.comment !== false,
    suggest: requested.suggest !== false,
    request_edit: requested.request_edit !== false,
    voice: Boolean(requested.voice),
  }
  db.prepare('UPDATE live_sessions SET audience = ?, permissions = ? WHERE id = ?').run(audience, JSON.stringify(permissions), sessionId)
  const row = db.prepare(LIVE_SELECT + ' WHERE ls.id = ?').get(sessionId)
  res.json({ session: serializeLiveSession(row, req.user.id) })
})

app.get('/api/live/:id/events', requireUser, (req, res) => {
  const sessionId = positiveInt(req.params.id)
  if (!sessionId) return res.status(400).end()
  const session = db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(sessionId)
  if (!canWatchLive(session, req.user.id)) return res.status(404).end()
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  })
  res.flushHeaders?.()
  db.prepare('UPDATE live_sessions SET viewer_count = viewer_count + 1 WHERE id = ?').run(sessionId)
  const send = event => res.write(`id: ${event.id}\nevent: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`)
  const channel = String(sessionId)
  liveBus.on(channel, send)
  res.write(`event: ready\ndata: ${JSON.stringify({ session_id: sessionId })}\n\n`)
  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 20_000)
  req.on('close', () => {
    clearInterval(heartbeat)
    liveBus.off(channel, send)
    db.prepare('UPDATE live_sessions SET viewer_count = MAX(0, viewer_count - 1) WHERE id = ?').run(sessionId)
  })
})

app.post('/api/live/:id/events', requireUser, liveEventRateLimit, (req, res) => {
  const sessionId = positiveInt(req.params.id)
  if (!sessionId) return res.status(400).json({ error: 'Invalid live session id' })
  const session = db.prepare('SELECT * FROM live_sessions WHERE id = ?').get(sessionId)
  if (!canWatchLive(session, req.user.id) || session.status !== 'live')
    return res.status(404).json({ error: 'Live session not found' })
  const kind = req.body?.kind
  if (!LIVE_EVENT_KINDS.has(kind)) return res.status(400).json({ error: 'Invalid live event kind' })
  const permissions = parseJson(session.permissions, {})
  if (kind === 'comment' && permissions.comment === false && session.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Comments are disabled for this session' })
  if (kind === 'suggestion' && permissions.suggest === false && session.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Suggestions are disabled for this session' })
  if (kind === 'collaboration_request' && permissions.request_edit === false && session.owner_id !== req.user.id)
    return res.status(403).json({ error: 'Edit requests are disabled for this session' })
  if (['work', 'cursor'].includes(kind) && !getProjectForUser(session.project_id, req.user.id, { edit: true }))
    return res.status(403).json({ error: 'Editing is not permitted' })
  const payload = req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {}
  const text = payload.text === undefined ? '' : String(payload.text).trim()
  if (!['work', 'cursor'].includes(kind) && (!text || text.length > MAX_LIVE_EVENT_LENGTH))
    return res.status(400).json({ error: `Live message must contain 1-${MAX_LIVE_EVENT_LENGTH} characters` })
  if (kind === 'cursor') {
    const x = Number(payload.x)
    const y = Number(payload.y)
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100)
      return res.status(400).json({ error: 'Invalid collaborator cursor position' })
    const event = emitEphemeralLiveEvent(sessionId, req.user.id, kind, { x, y, author_name: req.user.name, author_handle: req.user.handle })
    return res.status(201).json({ event })
  }
  const event = emitLiveEvent(sessionId, req.user.id, kind, { ...payload, text, author_name: req.user.name, author_handle: req.user.handle })
  if (session.owner_id !== req.user.id && ['suggestion', 'collaboration_request'].includes(kind))
    createNotification(session.owner_id, req.user.id, 'live_request', 'New Live collaboration request', text.slice(0, 120), 'live', sessionId)
  res.status(201).json({ event })
})

app.post('/api/live/:id/end', requireUser, (req, res) => {
  const sessionId = positiveInt(req.params.id)
  if (!sessionId) return res.status(400).json({ error: 'Invalid live session id' })
  const session = db.prepare('SELECT * FROM live_sessions WHERE id = ? AND owner_id = ?').get(sessionId, req.user.id)
  if (!session) return res.status(404).json({ error: 'Live session not found' })
  const endedAt = new Date().toISOString()
  db.prepare("UPDATE live_sessions SET status = 'ended', ended_at = ?, viewer_count = 0 WHERE id = ?").run(endedAt, sessionId)
  liveBus.emit(String(sessionId), { id: `end-${Date.now()}`, kind: 'ended', payload: {}, created_at: endedAt })
  res.json({ ok: true, ended_at: endedAt })
})

// ── Persistent Chat Hub ──
function conversationForUser(conversationId, userId) {
  return db.prepare(
    'SELECT c.*,cm.role AS member_role,cm.last_read_at FROM conversations c ' +
    'JOIN conversation_members cm ON cm.conversation_id = c.id WHERE c.id = ? AND cm.user_id = ?'
  ).get(conversationId, userId)
}

function serializeChatMessage(row, userId) {
  const message = {
    id: Number(row.id), conversation_id: Number(row.conversation_id), sender_id: Number(row.sender_id),
    sender_name: row.sender_name || '', sender_handle: row.sender_handle || '', body: row.body,
    attachment_type: row.attachment_type || null, attachment_id: row.attachment_id ? Number(row.attachment_id) : null,
    created_at: row.created_at, pinned: Boolean(row.pinned), mine: row.sender_id === userId,
  }
  if (row.attachment_type === 'project' && row.attachment_id) {
    const project = getProjectForUser(Number(row.attachment_id), userId)
    if (project) {
      const serialized = serializeProject(project, userId)
      message.attachment = { id: serialized.id, name: serialized.name, type: serialized.type, app_kind: serialized.app_kind, space_id: serialized.space_id, updated_at: serialized.updated_at }
    }
  }
  if (row.attachment_type === 'post' && row.attachment_id) {
    const post = getSerializedPost(Number(row.attachment_id), userId)
    if (post) message.attachment = post
  }
  if (row.attachment_type === 'file') {
    const file = parseJson(row.attachment_json, {})
    if (typeof file.name === 'string' && typeof file.data === 'string') {
      message.attachment = {
        name: file.name.slice(0, 180),
        mime: typeof file.mime === 'string' ? file.mime.slice(0, 100) : 'application/octet-stream',
        size: Number(file.size || 0),
        data: file.data,
      }
    }
  }
  return message
}

const CHAT_MESSAGE_SELECT = [
  'SELECT m.*,u.name AS sender_name,u.handle AS sender_handle,',
  'CASE WHEN pm.message_id IS NULL THEN 0 ELSE 1 END AS pinned',
  'FROM chat_messages m JOIN users u ON u.id = m.sender_id',
  'LEFT JOIN pinned_messages pm ON pm.conversation_id = m.conversation_id AND pm.message_id = m.id',
].join(' ')

app.get('/api/conversations', requireUser, (req, res) => {
  const rows = db.prepare(
    'SELECT c.*,cm.last_read_at,p.name AS project_name,p.space_id,p.app_kind,' +
    '(SELECT body FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message,' +
    '(SELECT created_at FROM chat_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message_at,' +
    '(SELECT COUNT(*) FROM chat_messages m WHERE m.conversation_id = c.id AND (cm.last_read_at IS NULL OR m.created_at > cm.last_read_at) AND m.sender_id != ?) AS unread ' +
    'FROM conversations c JOIN conversation_members cm ON cm.conversation_id = c.id ' +
    'LEFT JOIN projects p ON p.id = c.project_id WHERE cm.user_id = ? ORDER BY COALESCE(last_message_at,c.created_at) DESC'
  ).all(req.user.id, req.user.id)
  res.json({ conversations: rows.map(row => ({ ...row, unread: Number(row.unread || 0) })) })
})

app.post('/api/conversations', requireUser, (req, res) => {
  const kind = req.body?.kind ?? 'group'
  if (!CHAT_KINDS.has(kind)) return res.status(400).json({ error: 'Invalid conversation kind' })
  let project = null
  const projectId = req.body?.project_id === undefined || req.body.project_id === null ? null : positiveInt(req.body.project_id)
  if (kind === 'project') {
    if (!projectId) return res.status(400).json({ error: 'Project chat requires a project' })
    project = getProjectForUser(projectId, req.user.id)
    if (!project) return res.status(404).json({ error: 'Project not found' })
    const existing = db.prepare(
      "SELECT c.id FROM conversations c JOIN conversation_members cm ON cm.conversation_id = c.id WHERE c.kind = 'project' AND c.project_id = ? AND cm.user_id = ?"
    ).get(projectId, req.user.id)
    if (existing) return res.json({ conversation: conversationForUser(Number(existing.id), req.user.id) })
  }
  const checkedTitle = checkedString(req.body?.title ?? (project ? project.name : kind === 'private' ? 'Private chat' : 'New group'),
    'Conversation title', 120, { required: true, trim: true })
  if (checkedTitle.error) return res.status(400).json({ error: checkedTitle.error })
  const handles = Array.isArray(req.body?.member_handles) ? req.body.member_handles.slice(0, 30) : []
  const members = []
  for (const value of handles) {
    const handle = String(value).trim().toLowerCase()
    const user = db.prepare("SELECT id,name,handle FROM users WHERE lower(handle) = lower(?) AND status = 'active'")
      .get(handle.startsWith('@') ? handle : '@' + handle)
    if (user && user.id !== req.user.id && !members.some(item => item.id === user.id)) members.push(user)
  }
  const now = new Date().toISOString()
  const conversationId = inTransaction(() => {
    const info = db.prepare('INSERT INTO conversations (kind,title,project_id,created_by,created_at) VALUES (?,?,?,?,?)')
      .run(kind, checkedTitle.value, projectId, req.user.id, now)
    const id = Number(info.lastInsertRowid)
    db.prepare('INSERT INTO conversation_members (conversation_id,user_id,role,last_read_at,created_at) VALUES (?,?,?,?,?)')
      .run(id, req.user.id, 'owner', now, now)
    for (const member of members) {
      db.prepare('INSERT INTO conversation_members (conversation_id,user_id,role,last_read_at,created_at) VALUES (?,?,?,?,?)')
        .run(id, member.id, 'member', null, now)
      createNotification(member.id, req.user.id, 'chat_invite', 'New conversation', checkedTitle.value, 'conversation', id)
    }
    if (projectId) {
      const collaborators = db.prepare("SELECT user_id FROM project_collaborators WHERE project_id = ? AND status = 'accepted'").all(projectId)
      for (const collaborator of collaborators) {
        db.prepare('INSERT OR IGNORE INTO conversation_members (conversation_id,user_id,role,last_read_at,created_at) VALUES (?,?,?,?,?)')
          .run(id, collaborator.user_id, 'member', null, now)
      }
    }
    return id
  })
  res.status(201).json({ conversation: conversationForUser(conversationId, req.user.id) })
})

app.get('/api/conversations/:id/messages', requireUser, (req, res) => {
  const conversationId = positiveInt(req.params.id)
  if (!conversationId) return res.status(400).json({ error: 'Invalid conversation id' })
  if (!conversationForUser(conversationId, req.user.id)) return res.status(404).json({ error: 'Conversation not found' })
  const rows = db.prepare(CHAT_MESSAGE_SELECT + ' WHERE m.conversation_id = ? ORDER BY m.id ASC LIMIT 300').all(conversationId)
  res.json({ messages: rows.map(row => serializeChatMessage(row, req.user.id)) })
})

app.post('/api/conversations/:id/messages', requireUser, socialRateLimit, (req, res) => {
  const conversationId = positiveInt(req.params.id)
  if (!conversationId) return res.status(400).json({ error: 'Invalid conversation id' })
  const conversation = conversationForUser(conversationId, req.user.id)
  if (!conversation) return res.status(404).json({ error: 'Conversation not found' })
  const checkedBody = checkedString(req.body?.body ?? '', 'Message', MAX_CHAT_MESSAGE_LENGTH, { trim: true })
  if (checkedBody.error) return res.status(400).json({ error: checkedBody.error })
  const attachmentType = req.body?.attachment_type ?? null
  const attachmentId = req.body?.attachment_id === undefined || req.body.attachment_id === null ? null : positiveInt(req.body.attachment_id)
  if (attachmentType !== null && !['project', 'post', 'file'].includes(attachmentType)) return res.status(400).json({ error: 'Invalid attachment type' })
  if (!checkedBody.value && !attachmentType) return res.status(400).json({ error: 'Message or attachment is required' })
  if (attachmentType === 'project' && (!attachmentId || !getProjectForUser(attachmentId, req.user.id)))
    return res.status(404).json({ error: 'Attached project not found' })
  if (attachmentType === 'post' && (!attachmentId || !getVisiblePost(attachmentId, req.user.id)))
    return res.status(404).json({ error: 'Attached post not found' })
  let attachmentJson = '{}'
  if (attachmentType === 'file') {
    const file = req.body?.file && typeof req.body.file === 'object' ? req.body.file : {}
    const checkedFileName = checkedString(file.name, 'File name', 180, { required: true, trim: true })
    if (checkedFileName.error) return res.status(400).json({ error: checkedFileName.error })
    const data = typeof file.data === 'string' ? file.data : ''
    if (!/^data:[\w.+-]+\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/.test(data) || data.length > 1_450_000)
      return res.status(400).json({ error: 'File must be a supported base64 attachment under 1 MB' })
    attachmentJson = JSON.stringify({
      name: checkedFileName.value,
      mime: String(file.mime || 'application/octet-stream').slice(0, 100),
      size: Math.max(0, Number(file.size || 0)),
      data,
    })
  }
  const now = new Date().toISOString()
  const info = db.prepare(
    'INSERT INTO chat_messages (conversation_id,sender_id,body,attachment_type,attachment_id,attachment_json,created_at) VALUES (?,?,?,?,?,?,?)'
  ).run(conversationId, req.user.id, checkedBody.value, attachmentType, attachmentId, attachmentJson, now)
  db.prepare('UPDATE conversation_members SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?')
    .run(now, conversationId, req.user.id)
  const members = db.prepare('SELECT user_id FROM conversation_members WHERE conversation_id = ? AND user_id != ?').all(conversationId, req.user.id)
  for (const member of members) {
    createNotification(member.user_id, req.user.id, 'chat_message', `${req.user.name} sent a message`,
      checkedBody.value.slice(0, 120) || 'Shared a project', 'conversation', conversationId)
  }
  const row = db.prepare(CHAT_MESSAGE_SELECT + ' WHERE m.id = ?').get(info.lastInsertRowid)
  res.status(201).json({ message: serializeChatMessage(row, req.user.id) })
})

app.post('/api/conversations/:id/read', requireUser, (req, res) => {
  const conversationId = positiveInt(req.params.id)
  if (!conversationId || !conversationForUser(conversationId, req.user.id)) return res.status(404).json({ error: 'Conversation not found' })
  db.prepare('UPDATE conversation_members SET last_read_at = ? WHERE conversation_id = ? AND user_id = ?')
    .run(new Date().toISOString(), conversationId, req.user.id)
  res.json({ ok: true })
})

app.post('/api/conversations/:conversationId/messages/:messageId/pin', requireUser, (req, res) => {
  const conversationId = positiveInt(req.params.conversationId)
  const messageId = positiveInt(req.params.messageId)
  if (!conversationId || !messageId || !conversationForUser(conversationId, req.user.id))
    return res.status(404).json({ error: 'Conversation or message not found' })
  const message = db.prepare('SELECT id FROM chat_messages WHERE id = ? AND conversation_id = ?').get(messageId, conversationId)
  if (!message) return res.status(404).json({ error: 'Message not found' })
  const existing = db.prepare('SELECT 1 FROM pinned_messages WHERE conversation_id = ? AND message_id = ?').get(conversationId, messageId)
  if (existing) db.prepare('DELETE FROM pinned_messages WHERE conversation_id = ? AND message_id = ?').run(conversationId, messageId)
  else db.prepare('INSERT INTO pinned_messages (conversation_id,message_id,user_id,created_at) VALUES (?,?,?,?)')
    .run(conversationId, messageId, req.user.id, new Date().toISOString())
  res.json({ pinned: !existing })
})

// ── Helios agent (OpenAI-compatible proxy, shared administrator key) ──
app.post('/api/helios/chat', requireUser, aiRateLimit, async (req, res) => {
  const apiKey = getSetting('openai_api_key')
  if (!apiKey) return res.status(503).json({
    error: 'Helios is not configured yet. An administrator must add an OpenAI API key.',
    code: 'AI_NOT_CONFIGURED',
  })
  const model = getSetting('openai_model') || 'gpt-4o-mini'
  const baseUrl = getSetting('openai_base_url') || 'https://api.openai.com'
  const { messages, project_id, context } = req.body || {}
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 30)
    return res.status(400).json({ error: 'messages must contain between 1 and 30 items' })
  let totalMessageLength = 0
  const safeMessages = []
  for (const message of messages) {
    if (!message || !['user', 'assistant'].includes(message.role) || typeof message.content !== 'string')
      return res.status(400).json({ error: 'Each message must have a valid role and text content' })
    const content = message.content.trim()
    if (!content || content.length > 12_000)
      return res.status(400).json({ error: 'Each message must contain 1-12000 characters' })
    totalMessageLength += content.length
    if (totalMessageLength > 50_000)
      return res.status(400).json({ error: 'Conversation is too large' })
    safeMessages.push({ role: message.role, content })
  }

  // Assemble context exclusively from server-side permission checks. Values in
  // the client context packet identify the current Helios object; they never
  // grant access by themselves.
  let projectContext = ''
  let permittedProject = null
  if (project_id !== undefined && project_id !== null) {
    const projectId = positiveInt(project_id)
    if (!projectId) return res.status(400).json({ error: 'Invalid project id' })
    permittedProject = getProjectForUser(projectId, req.user.id)
    if (!permittedProject) return res.status(404).json({ error: 'Project not found' })
    projectContext = `\n\nActive permitted project:\nName: ${permittedProject.name}\nSpace ID: ${permittedProject.space_id}\nMini App: ${permittedProject.app_kind}\nType: ${permittedProject.type}\nPermission: ${permittedProject.can_edit ? 'may edit' : 'view only'}\nCurrent serialized content:\n\`\`\`\n${(permittedProject.content || '').slice(0, 9000)}\n\`\`\``
  }

  let appContext = ''
  if (context !== undefined && (context === null || typeof context !== 'object' || Array.isArray(context)))
    return res.status(400).json({ error: 'context must be an object' })
  const contextObject = context && typeof context === 'object' ? context : {}
  if (contextObject.project_id !== undefined && contextObject.project_id !== null) {
    const contextProjectId = positiveInt(contextObject.project_id)
    if (!contextProjectId || (permittedProject && contextProjectId !== Number(permittedProject.id)))
      return res.status(400).json({ error: 'Context project does not match the active project' })
  }
  const requestedSpaceId = contextObject.space_id === undefined ? '' : normalizeSpaceId(contextObject.space_id, '')
  if (requestedSpaceId) {
    const knownSpace = STATIC_SPACES.some(space => space.id === requestedSpaceId)
      || db.prepare('SELECT 1 FROM user_spaces WHERE user_id = ? AND id = ?').get(req.user.id, requestedSpaceId)
    if (knownSpace) appContext += `\nCurrent Space: ${requestedSpaceId}`
  }
  if (permittedProject) {
    appContext += `\nCurrent Mini App: ${permittedProject.app_kind}`
  } else if (typeof contextObject.app_kind === 'string' && contextObject.app_kind.length <= MAX_APP_KIND_LENGTH) {
    appContext += `\nCurrent Mini App: ${contextObject.app_kind.replace(/[^a-z0-9-]/gi, '')}`
  }

  const conversationId = contextObject.conversation_id === undefined || contextObject.conversation_id === null
    ? null : positiveInt(contextObject.conversation_id)
  if (contextObject.conversation_id !== undefined && contextObject.conversation_id !== null && !conversationId)
    return res.status(400).json({ error: 'Invalid conversation context' })
  if (conversationId) {
    const conversation = conversationForUser(conversationId, req.user.id)
    if (!conversation) return res.status(404).json({ error: 'Conversation context not found' })
    const conversationMessages = db.prepare(
      'SELECT m.body,m.attachment_type,u.name AS sender_name FROM chat_messages m ' +
      'JOIN users u ON u.id = m.sender_id WHERE m.conversation_id = ? ORDER BY m.id DESC LIMIT 40'
    ).all(conversationId).reverse()
    const transcript = conversationMessages.map(item =>
      `${item.sender_name}: ${String(item.body || '').slice(0, 500)}${item.attachment_type ? ` [shared ${item.attachment_type}]` : ''}`
    ).join('\n').slice(0, 10_000)
    appContext += `\n\nPermitted conversation context:\nTitle: ${conversation.title}\nKind: ${conversation.kind}\nRecent messages:\n${transcript || '(no messages yet)'}`
  }

  if (typeof contextObject.selected_content === 'string' && contextObject.selected_content.trim()) {
    appContext += `\n\nContent explicitly selected by the user in the current Helios view:\n${contextObject.selected_content.trim().slice(0, 4000)}`
  }

  const system = {
    role: 'system',
    content:
      `You are Helios, the assistant inside Helios Space, a platform where people learn, build, and share projects. ` +
      `You are a real in-product AI feature, not a human. Never answer that you are "not real" or that you cannot help merely because you are an AI model. ` +
      `When the user asks you to do work, do the useful Helios-scoped part immediately: explain, draft, improve, diagnose, plan, summarize, or prepare an edit preview. ` +
      `You act only inside the authenticated user's permission-filtered Helios context: Spaces, Projects, Mini Apps, conversations, comments, and files supplied below. ` +
      `Your limitation is scope, not reality: you cannot control the user's mouse, operating system, unrelated apps, arbitrary local files, or secretly act outside Helios Space. ` +
      `Never imply that you sent a message, published, deleted, changed permissions, or applied work unless the Helios UI confirms it. ` +
      `For message help, summarize or draft replies but do not send them. For a requested project modification, first explain the intended change in one concise line, then return the full updated serialized project content in one fenced code block so the UI can show an Action Preview. ` +
      `If you cannot perform an external action, state the boundary in one short clause and then provide the best Helios-scoped next action or preview. ` +
      `If the current content has schema "helios-workspace-v1", preserve that complete JSON structure and return valid JSON—not only one nested file or paragraph. Respect view-only permissions. Be concise, concrete, and honest.` +
      projectContext + appContext,
  }

  try {
    const endpoint = resolveChatCompletionsUrl(baseUrl)
    const payload = buildChatCompletionPayload({
      model,
      messages: [system, ...safeMessages],
      temperature: 0.4,
    })
    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: 'Bearer ' + apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    })
    const rawBody = await r.text()
    let data = {}
    try { data = rawBody ? JSON.parse(rawBody) : {} } catch {}
    if (!r.ok) {
      const failure = mapAiUpstreamFailure(r.status)
      const detail = summarizeAiProviderError(rawBody)
      return res.status(failure.status).json({
        error: failure.error,
        code: failure.code,
        ...(detail ? { detail } : {}),
      })
    }
    const rawReply = extractAssistantReply(data)
    if (!rawReply)
      return res.status(502).json({
        error: 'The AI provider returned an invalid response.',
        code: 'AI_INVALID_RESPONSE',
        detail: summarizeAiProviderError(rawBody) || 'No assistant text was found in the relay response.',
      })
    const reply = normalizeHeliosAssistantReply(rawReply, {
      hasProject: Boolean(permittedProject),
      canEdit: Boolean(permittedProject?.can_edit),
      hasConversation: Boolean(conversationId),
      hasSelectedContent: typeof contextObject.selected_content === 'string' && Boolean(contextObject.selected_content.trim()),
    })
    res.json({ reply, model })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError')
      return res.status(504).json({ error: 'Helios timed out while waiting for the AI provider.', code: 'AI_TIMEOUT' })
    if (error instanceof TypeError || String(error?.message || '').includes('base URL'))
      return res.status(503).json({ error: 'Helios has an invalid AI provider configuration.', code: 'AI_CONFIGURATION' })
    res.status(502).json({ error: 'Helios could not reach the AI provider.', code: 'AI_NETWORK' })
  }
})

// ── Admin auth ──
app.post('/api/admin/login', authRateLimit, (req, res) => {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return res.status(503).json({ error: 'Admin access is not configured' })
  const { username, password } = req.body || {}
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(String(username || '').trim().toLowerCase())
  if (!admin || !bcrypt.compareSync(String(password || ''), admin.password_hash))
    return res.status(401).json({ error: 'Invalid credentials' })
  const token = newSession('admin', admin.id)
  res.cookie('helios_admin', token, cookieOptions(ADMIN_SESSION_MS))
  res.json({ ok: true, username: admin.username })
})

app.post('/api/admin/logout', (req, res) => {
  const token = req.cookies.helios_admin
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token)
  res.clearCookie('helios_admin', { sameSite: 'lax', secure: IS_PRODUCTION })
  res.json({ ok: true })
})

app.get('/api/admin/me', requireAdmin, (req, res) => {
  const admin = db.prepare('SELECT username FROM admins WHERE id = ?').get(req.adminId)
  res.json({ username: admin.username })
})

app.get('/api/admin/stats', requireAdmin, (_req, res) => {
  const q = s => db.prepare(s).get()
  res.json({
    total: q('SELECT COUNT(*) AS n FROM users').n,
    active: q("SELECT COUNT(*) AS n FROM users WHERE status='active'").n,
    suspended: q("SELECT COUNT(*) AS n FROM users WHERE status='suspended'").n,
    last7: q("SELECT COUNT(*) AS n FROM users WHERE created_at >= datetime('now','-7 days')").n,
    projects: q('SELECT COUNT(*) AS n FROM projects').n,
    posts: q('SELECT COUNT(*) AS n FROM posts').n,
  })
})

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  const rows = q
    ? db.prepare("SELECT id,name,handle,email,created_at,status FROM users WHERE lower(name) LIKE ? OR lower(handle) LIKE ? OR lower(email) LIKE ? ORDER BY id DESC LIMIT 500")
        .all(`%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare('SELECT id,name,handle,email,created_at,status FROM users ORDER BY id DESC LIMIT 500').all()
  res.json({ users: rows })
})

app.post('/api/admin/users/:id/status', requireAdmin, (req, res) => {
  const userId = positiveInt(req.params.id)
  if (!userId) return res.status(400).json({ error: 'Invalid user id' })
  const { status } = req.body || {}
  if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid status' })
  const result = db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId)
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' })
  if (status === 'suspended')
    db.prepare("DELETE FROM sessions WHERE kind = 'user' AND subject_id = ?").run(userId)
  res.json({ ok: true })
})

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  const userId = positiveInt(req.params.id)
  if (!userId) return res.status(400).json({ error: 'Invalid user id' })
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  inTransaction(() => {
    db.prepare('UPDATE posts SET project_id = NULL WHERE project_id IN (SELECT id FROM projects WHERE user_id = ?)').run(userId)
    db.prepare('DELETE FROM saved_posts WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)').run(userId)
    db.prepare('DELETE FROM comments WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)').run(userId)
    db.prepare('DELETE FROM reactions WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)').run(userId)
    db.prepare('DELETE FROM saved_posts WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM comments WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM reactions WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM posts WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM projects WHERE user_id = ?').run(userId)
    db.prepare("DELETE FROM sessions WHERE kind = 'user' AND subject_id = ?").run(userId)
    db.prepare('DELETE FROM users WHERE id = ?').run(userId)
  })
  res.json({ ok: true })
})

app.get('/api/admin/settings', requireAdmin, (_req, res) => {
  const key = getSetting('openai_api_key') || ''
  res.json({
    site_name: getSetting('site_name'),
    tagline: getSetting('tagline'),
    announcement: getSetting('announcement'),
    signup_open: getSetting('signup_open') === 'true',
    openai_model: getSetting('openai_model'),
    openai_key_set: !!key,
    openai_key_preview: key ? key.slice(0, 7) + '…' + key.slice(-4) : '',
    openai_base_url: getSetting('openai_base_url') || 'https://api.openai.com',
  })
})

app.post('/api/admin/settings', requireAdmin, (req, res) => {
  const { site_name, tagline, announcement, signup_open, openai_api_key, openai_model, openai_base_url } = req.body || {}
  const updates = [
    ['site_name', site_name, 100],
    ['tagline', tagline, 240],
    ['announcement', announcement, 1_000],
  ]
  for (const [key, value, maxLength] of updates) {
    if (value === undefined) continue
    const checked = checkedString(value, key, maxLength, { trim: true })
    if (checked.error) return res.status(400).json({ error: checked.error })
    setSetting(key, checked.value)
  }
  if (signup_open !== undefined) {
    if (typeof signup_open !== 'boolean')
      return res.status(400).json({ error: 'signup_open must be a boolean' })
    setSetting('signup_open', signup_open ? 'true' : 'false')
  }
  if (openai_model !== undefined) {
    const checked = checkedString(openai_model, 'AI model', 120, { required: true, trim: true })
    if (checked.error) return res.status(400).json({ error: checked.error })
    setSetting('openai_model', checked.value)
  }
  if (openai_base_url !== undefined) {
    const checked = checkedString(openai_base_url, 'AI base URL', 500, { required: true, trim: true })
    if (checked.error) return res.status(400).json({ error: checked.error })
    try { resolveChatCompletionsUrl(checked.value) } catch {
      return res.status(400).json({ error: 'AI base URL must be a valid http or https URL' })
    }
    setSetting('openai_base_url', checked.value.replace(/\/+$/, ''))
  }
  if (openai_api_key !== undefined) {
    const checked = checkedString(openai_api_key, 'AI API key', 500, { trim: true })
    if (checked.error) return res.status(400).json({ error: checked.error })
    if (checked.value) setSetting('openai_api_key', checked.value)
  }
  res.json({ ok: true })
})

app.post('/api/admin/settings/clear-key', requireAdmin, (_req, res) => {
  setSetting('openai_api_key', '')
  res.json({ ok: true })
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'API route not found', code: 'API_NOT_FOUND' })
})

app.use((error, req, res, _next) => {
  console.error('Unhandled request error', req.method, req.path, error)
  if (res.headersSent) return
  res.status(500).json({ error: 'Unexpected server error', code: 'INTERNAL_ERROR' })
})

// ── Static: admin subdomain → admin panel; otherwise → SPA ──
app.use((req, res, next) => {
  const host = (req.headers.host || '').split(':')[0]
  if (host === ADMIN_HOST && req.method === 'GET' && !req.path.startsWith('/api/'))
    return res.sendFile(path.join(__dirname, 'admin', 'index.html'))
  next()
})

app.use(express.static(DIST_DIR))

app.get('*', (req, res) => {
  const host = (req.headers.host || '').split(':')[0]
  if (host === ADMIN_HOST) return res.sendFile(path.join(__dirname, 'admin', 'index.html'))
  res.sendFile(path.join(DIST_DIR, 'index.html'))
})

app.listen(PORT, HOST, () => console.log(`Helios Space listening ${HOST}:${PORT}`))
