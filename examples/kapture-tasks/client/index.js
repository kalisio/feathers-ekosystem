import { feathers } from '@feathersjs/feathers'
import socketio from '@feathersjs/socketio-client'
import io from 'socket.io-client'
import { Form } from '@pdfme/ui'
import { text, image, rectangle } from '@pdfme/schemas'

const SERVER_URL = 'http://localhost:3030'
const socket = io(SERVER_URL)
const api = feathers()
api.configure(socketio(socket))

const pdfPlugins = { text, image, rectangle }

// --- state ---
let pdfmeForm = null
const notifications = []
const allTasks = {}
const taskRows = {}

// ============================================================
// UI helpers
// ============================================================

const $ = id => document.getElementById(id)
function show (id) { $(id).classList.remove('hidden') }
function hide (id) { $(id).classList.add('hidden') }

// ============================================================
// Tabs
// ============================================================

window.switchTab = (name) => {
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === name)
  )
  document.querySelectorAll('.tab-content').forEach(t =>
    t.classList.toggle('active', t.id === `tab-${name}`)
  )
}

// ============================================================
// Burger menu
// ============================================================

$('burger-btn').addEventListener('click', e => {
  e.stopPropagation()
  $('burger-dropdown').classList.toggle('hidden')
})
document.addEventListener('click', () => hide('burger-dropdown'))

// ============================================================
// Modals
// ============================================================

window.openModal = (type) => {
  hide('burger-dropdown')
  if (type === 'history') {
    renderHistory()
    show('modal-history')
  } else if (type === 'db') {
    show('modal-db')
    renderDb()
  }
}

window.closeModal = (id) => hide(id)

;['modal-history', 'modal-db'].forEach(id => {
  $(id).addEventListener('click', e => { if (e.target === $(id)) hide(id) })
})

// ============================================================
// DB Viewer — task-store records
// ============================================================

async function renderDb () {
  const tbody = $('db-body')
  tbody.innerHTML = '<tr><td colspan="7" style="color:#9ca3af;text-align:center;padding:1rem">Loading…</td></tr>'
  try {
    const res = await api.service('task-store').find({ query: { $limit: 200 } })
    const records = res.data || res
    if (!records.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="color:#9ca3af;text-align:center;padding:1rem">Empty</td></tr>'
      return
    }
    tbody.innerHTML = records.map(r => {
      // Replace large base64 blobs with a size indicator so the table stays readable
      let resultCell = '—'
      if (r.result) {
        const result = typeof r.result === 'string' ? JSON.parse(r.result) : r.result
        if (result.image) resultCell = `PNG ~${Math.round(result.image.length * 0.75 / 1024)} kB`
        else if (result.pdf) resultCell = `PDF ~${Math.round(result.pdf.length * 0.75 / 1024)} kB`
        else resultCell = JSON.stringify(result).slice(0, 60)
      }
      return `<tr>
        <td><code style="font-size:0.72rem">${r.id}</code></td>
        <td>${r.type || '—'}</td>
        <td class="status-${r.status}">${r.status || '—'}</td>
        <td>${r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : '—'}</td>
        <td>${r.completedAt ? new Date(r.completedAt).toLocaleTimeString() : '—'}</td>
        <td style="font-size:0.78rem">${resultCell}</td>
        <td style="font-size:0.78rem;color:#dc2626">${r.error || ''}</td>
      </tr>`
    }).join('')
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#dc2626;padding:1rem">${err.message}</td></tr>`
  }
}

// ============================================================
// Sidebar notifications
// ============================================================

function addNotif (msg, level = 'info') {
  notifications.unshift({ msg, level, time: new Date().toLocaleTimeString() })
  if (notifications.length > 60) notifications.pop()
  renderSidebar()
}

function renderSidebar () {
  const ul = $('notif-list')
  if (!notifications.length) {
    ul.innerHTML = '<li style="color:#9ca3af;font-size:0.75rem;border:none;background:none">No notifications yet</li>'
    return
  }
  ul.innerHTML = notifications.slice(0, 30).map(n =>
    `<li class="${n.level}">
      <span class="notif-time">${n.time}</span>${n.msg}
    </li>`
  ).join('')
}

window.clearNotifications = () => {
  notifications.length = 0
  renderSidebar()
}

// ============================================================
// History modal — shows all tasks
// ============================================================

function renderHistory () {
  const tbody = $('history-body')
  const tasks = Object.values(allTasks)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  if (!tasks.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="color:#9ca3af;text-align:center;padding:1rem">No tasks yet</td></tr>'
    return
  }

  tbody.innerHTML = tasks.map(t => {
    const fmt = t.result?.pdf ? 'PDF' : t.result?.image ? 'PNG' : '—'
    // Show download button for any completed task regardless of cached result
    const canDl = t.status === 'completed'
    return `<tr>
      <td>${t.type}</td>
      <td class="status-${t.status}">${t.status}</td>
      <td>${t.createdAt ? new Date(t.createdAt).toLocaleTimeString() : '—'}</td>
      <td>${fmt}</td>
      <td>${canDl ? `<button class="btn btn-sm btn-dl" onclick="downloadTask('${t.id}')">&#8595; Download</button>` : '—'}</td>
    </tr>`
  }).join('')
}

// ============================================================
// Download — fetches task from server if result not cached
// ============================================================

window.downloadTask = (id) => {
  // Use the dedicated REST endpoint — bypasses socket.io size limits entirely.
  // The server reads from task-store and streams the file with correct headers.
  const a = document.createElement('a')
  a.href = `${SERVER_URL}/download/${id}`
  document.body.appendChild(a)
  a.click()
  a.remove()
}

// ============================================================
// Task table (shared)
// ============================================================

function renderTaskRow (task) {
  const tbody = $('tbody-tasks')
  if (!tbody) return

  const placeholder = tbody.querySelector('td[colspan]')
  if (placeholder) placeholder.parentElement.remove()

  let tr = taskRows[task.id]
  if (!tr) {
    tr = document.createElement('tr')
    tbody.prepend(tr)
    taskRows[task.id] = tr
  }

  const created = task.createdAt ? new Date(task.createdAt).toLocaleTimeString() : '—'
  const shortId = task.id.substring(0, 8)
  const canDl = task.status === 'completed'

  tr.innerHTML = `
    <td><code style="font-size:0.75rem">${shortId}…</code></td>
    <td>${task.type}</td>
    <td class="status-${task.status}">${task.status}</td>
    <td>${created}</td>
    <td>${canDl ? `<button class="btn btn-sm btn-dl" onclick="downloadTask('${task.id}')">&#8595;</button>` : '—'}</td>
  `
}

// ============================================================
// Real-time task updates
// ============================================================

api.service('task-store').on('patched', record => {
  allTasks[record.id] = record
  renderTaskRow(record)

  const short = record.id.substring(0, 8)
  if (record.status === 'completed') {
    addNotif(`Task ${short} (${record.type}) terminée`, 'success')
  } else if (record.status === 'failed') {
    addNotif(`Task ${short} échouée : ${record.error}`, 'error')
  } else if (record.status === 'active') {
    addNotif(`Task ${short} (${record.type}) démarrée`)
  }
})

// ============================================================
// Initial task load
// ============================================================

async function loadTasks () {
  try {
    const result = await api.service('tasks').find({})
    const items = result.data || result
    items.forEach(t => {
      allTasks[t.id] = t
      renderTaskRow(t)
    })
  } catch (err) {
    addNotif(`Chargement tasks : ${err.message}`, 'error')
  }
}

// ============================================================
// Tab Kapture
// ============================================================

function readKapturePayload () {
  return {
    layers: $('k-layers').value.split(',').map(s => s.trim()).filter(Boolean),
    bbox: [
      parseFloat($('k-bbox-w').value),
      parseFloat($('k-bbox-s').value),
      parseFloat($('k-bbox-e').value),
      parseFloat($('k-bbox-n').value)
    ]
  }
}

window.submitKapture = async () => {
  const payload = readKapturePayload()
  try {
    const task = await api.service('tasks').create({ type: 'kapture', payload })
    addNotif(`Task kapture créée : ${task.id.substring(0, 8)}`)
    renderTaskRow(task)
  } catch (err) {
    addNotif(`Erreur : ${err.message}`, 'error')
  }
}

// ============================================================
// Tab PDFme
// ============================================================

async function loadTemplates () {
  const res = await fetch(`${SERVER_URL}/templates`)
  if (!res.ok) throw new Error('Cannot load templates')
  return res.json()
}

async function initPdfmeForm (templateName) {
  const container = $('pdfme-container')
  if (pdfmeForm) { pdfmeForm.destroy(); pdfmeForm = null }
  container.innerHTML = '<div id="pdfme-placeholder">Loading…</div>'

  const res = await fetch(`${SERVER_URL}/templates/${templateName}`)
  if (!res.ok) throw new Error(`Template '${templateName}' not found`)
  const template = await res.json()

  // Build initial inputs — editable fields only (map is filled by the server)
  const inputs = [{}]
  template.schemas[0].forEach(field => {
    if (!field.readOnly) {
      inputs[0][field.name] = field.name === 'date'
        ? new Date().toLocaleDateString('fr-FR')
        : ''
    }
  })

  container.innerHTML = ''
  pdfmeForm = new Form({ domContainer: container, template, inputs, plugins: pdfPlugins })
}

window.onTemplateChange = () => {
  const name = $('p-template').value
  if (name) initPdfmeForm(name).catch(err => addNotif(`Template : ${err.message}`, 'error'))
}

function readPdfmeCaptureParams () {
  return {
    layers: $('p-layers').value.split(',').map(s => s.trim()).filter(Boolean),
    bbox: [
      parseFloat($('p-bbox-w').value),
      parseFloat($('p-bbox-s').value),
      parseFloat($('p-bbox-e').value),
      parseFloat($('p-bbox-n').value)
    ],
    time: new Date().toISOString()
  }
}

window.submitPdfme = async () => {
  if (!pdfmeForm) {
    addNotif('Sélectionner un template d\'abord', 'error')
    return
  }

  // Collect form values — server fills the map field via kapture
  const inputs = { ...pdfmeForm.getInputs()[0] }
  delete inputs.map

  const templateName = $('p-template').value
  const captureParams = readPdfmeCaptureParams()

  try {
    const task = await api.service('tasks').create({
      type: 'pdfme',
      payload: { templateName, inputs, captureParams }
    })
    addNotif(`Task PDF créée : ${task.id.substring(0, 8)}`)
    renderTaskRow(task)
  } catch (err) {
    addNotif(`Erreur : ${err.message}`, 'error')
  }
}

// ============================================================
// Bootstrap
// ============================================================

socket.on('connect', async () => {
  addNotif('Connecté au serveur')
  await loadTasks()

  try {
    const templates = await loadTemplates()
    const sel = $('p-template')
    sel.innerHTML = ''
    templates.forEach(name => {
      const opt = document.createElement('option')
      opt.value = name
      opt.textContent = name.toUpperCase()
      sel.appendChild(opt)
    })
    if (templates.length) await initPdfmeForm(templates[0])
  } catch (err) {
    addNotif(`Templates : ${err.message}`, 'error')
  }
})

socket.on('disconnect', () => addNotif('Déconnecté', 'error'))
