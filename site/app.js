const NOTES_KEY = 'helios-public-site-notes'

const nav = document.getElementById('nav')
const liveHost = document.getElementById('live-host')
const liveNote = document.getElementById('live-note')
const hereUrl = document.getElementById('here-url')
const copyBtn = document.getElementById('copy-url')
const form = document.getElementById('note-form')
const notesEl = document.getElementById('notes')
const emptyEl = document.getElementById('notes-empty')

function pageUrl() {
  if (location.protocol === 'file:') return 'Opened from the zip on this computer'
  return location.href
}

function describeHost() {
  if (location.protocol === 'file:') {
    liveHost.textContent = 'local file (from the zip)'
    liveNote.textContent = 'Unzipped and opened as index.html. Publish the folder to get a free public domain.'
    hereUrl.textContent = 'This local copy'
    return
  }
  liveHost.textContent = location.host || location.href
  liveNote.textContent = location.host.includes('github.io')
    ? 'GitHub Pages free subdomain — same idea as your-app.base44.app.'
    : location.host.includes('netlify.app')
      ? 'Netlify free subdomain — same idea as your-app.base44.app.'
      : 'Public URL for this static site. You can still download the zip and republish it.'
  if (hereUrl) {
    hereUrl.href = location.href
    hereUrl.textContent = location.href
  }
}

function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]')
  } catch {
    return []
  }
}

function renderNotes() {
  const notes = loadNotes()
  notesEl.innerHTML = ''
  emptyEl.classList.toggle('is-hidden', notes.length > 0)
  notes.forEach((note) => {
    const item = document.createElement('li')
    const meta = document.createElement('small')
    meta.textContent = `${note.space} · ${new Date(note.at).toLocaleString()}`
    const title = document.createElement('strong')
    title.textContent = note.title
    const body = document.createElement('p')
    body.textContent = note.body
    item.append(meta, title, body)
    notesEl.append(item)
  })
}

window.addEventListener('scroll', () => {
  nav.classList.toggle('is-scrolled', window.scrollY > 8)
}, { passive: true })

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    const field = document.createElement('textarea')
    field.value = value
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.left = '-9999px'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    field.remove()
    return ok
  }
}

copyBtn.addEventListener('click', async () => {
  const value = location.protocol === 'file:' ? 'Open index.html from the unzipped folder' : location.href
  const ok = await copyText(value)
  copyBtn.textContent = ok ? 'Copied' : 'Copy unavailable'
  setTimeout(() => { copyBtn.textContent = 'Copy URL' }, 1400)
})

form.addEventListener('submit', (event) => {
  event.preventDefault()
  const data = new FormData(form)
  const notes = loadNotes()
  notes.unshift({
    title: String(data.get('title') || '').trim(),
    body: String(data.get('body') || '').trim(),
    space: String(data.get('space') || 'Maths'),
    at: Date.now(),
  })
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes.slice(0, 12)))
  form.reset()
  renderNotes()
})

describeHost()
renderNotes()
void pageUrl
