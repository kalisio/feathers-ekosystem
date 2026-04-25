import { feathers } from '@feathersjs/feathers'
import socketio from '@feathersjs/socketio-client'
import io from 'socket.io-client'

const api = feathers()
const socket = io('http://localhost:3030')
api.configure(socketio(socket))

// --- logging ---

function log (msg) {
  const el = document.getElementById('log')
  const line = document.createElement('div')
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`
  el.appendChild(line)
  el.scrollTop = el.scrollHeight
}

// --- table rendering ---

const rows = {}

function renderRow (task) {
  const tbody = document.getElementById('tasks-body')

  // Remove placeholder
  const placeholder = tbody.querySelector('td[colspan]')
  if (placeholder) placeholder.parentElement.remove()

  let tr = rows[task.id]
  if (!tr) {
    tr = document.createElement('tr')
    tbody.prepend(tr)
    rows[task.id] = tr
  }

  const progress = task.progress != null ? `${task.progress}%` : '—'
  const created = task.createdAt ? new Date(task.createdAt).toLocaleTimeString() : '—'
  tr.innerHTML = `
    <td><code>${task.id}</code></td>
    <td>${task.type}</td>
    <td class="status-${task.status}">${task.status}</td>
    <td>${progress}</td>
    <td>${created}</td>
    <td><button class="danger" onclick="removeTask('${task.id}')">Remove</button></td>
  `
}

// --- API calls ---

window.submitTask = async (type, payload) => {
  try {
    const task = await api.service('tasks').create({ type, payload })
    log(`Created task ${task.id} (${type})`)
    renderRow(task)
  } catch (err) {
    log(`Error: ${err.message}`)
  }
}

window.removeTask = async (id) => {
  try {
    await api.service('tasks').remove(id)
    if (rows[id]) rows[id].remove()
    delete rows[id]
    log(`Removed task ${id}`)
  } catch (err) {
    log(`Error removing ${id}: ${err.message}`)
  }
}

// --- real-time updates from the persistence service ---

api.service('task-store').on('patched', (record) => {
  log(`Task ${record.id} → ${record.status}${record.progress != null ? ` (${record.progress}%)` : ''}`)
  renderRow(record)
})

// --- initial load ---

async function loadTasks () {
  try {
    const result = await api.service('tasks').find({})
    const items = result.data || result
    if (items.length) items.forEach(renderRow)
  } catch (err) {
    log(`Could not load tasks: ${err.message}`)
  }
}

socket.on('connect', () => {
  log('Connected to server')
  loadTasks()
})
socket.on('disconnect', () => log('Disconnected'))
