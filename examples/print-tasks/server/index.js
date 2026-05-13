import { feathers } from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'
import { MemoryService } from '@feathersjs/memory'
import { TaskService, createQueue, createWorker, setupQueueEvents, setupDashboard, QueueEvents } from '@kalisio/feathers-tasks'
import { generate } from '@pdfme/generator'
import { text, image, rectangle } from '@pdfme/schemas'
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Data
const port = process.env.SERVER_PORT || 3030
const redisHost = process.env.REDIS_HOST || 'localhost'
const redisPort = Number(process.env.REDIS_PORT) || 6379
const kaptureUrl = process.env.KAPTURE_URL || 'http://localhost:3000'
const DPI = Number(process.env.CAPTURE_DPI) || 96
const redis = { host: redisHost, port: redisPort }
const pdfPlugins = { text, image, rectangle }

// Templates PDFME
const templatesDir = join(__dirname, 'templates')

function loadTemplate (name) {
  return JSON.parse(readFileSync(join(templatesDir, `${name}.json`), 'utf-8'))
}

function listTemplates () {
  return readdirSync(templatesDir)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
}

// Map field pixel size derived from template schema (mm → px at DPI)
function mapSizeFromTemplate (template) {
  const mapField = template.schemas[0].find(s => s.name === 'map')
  if (!mapField) throw new Error("Template has no 'map' field")
  return {
    width: Math.round(mapField.width * DPI / 25.4),
    height: Math.round(mapField.height * DPI / 25.4)
  }
}

// kapture helper

async function callKapture (payload) {
  const res = await fetch(`${kaptureUrl}/capture`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error(`Kapture ${res.status}: ${await res.text()}`)
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('image/')) throw new Error(`Kapture returned '${ct}' instead of image — check APP_URL/APP_JWT`)
  return Buffer.from(await res.arrayBuffer()).toString('base64')
}

// App
const app = express(feathers())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.configure(socketio({ cors: { origin: '*' } }))

// CORS for REST endpoints called directly by the Vite client
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  next()
})

// Template endpoints (consumed by the client to initialise the pdfme Form)
app.get('/templates', (_req, res) => res.json(listTemplates()))
app.get('/templates/:name', (req, res) => {
  try {
    res.json(loadTemplate(req.params.name))
  } catch {
    res.status(404).json({ error: 'Template not found' })
  }
})

app.use('task-store', new MemoryService())

const queueName = 'print-tasks'
const queue = createQueue(queueName, redis)

// QueueEvents lets workers call waitUntilFinished() to block on a delegated job
const workerQueueEvents = new QueueEvents(queueName, { connection: redis })

createWorker(queueName, redis, {
  // Worker kapture — direct screenshot via the Kapture service.
  // Accepts optional size and layout overrides so it can be called
  // both from the client (default 1024×768) and from the pdfme worker
  // (template-derived size + clean layout).
  kapture: async (job) => {
    console.log(`[worker:kapture] job ${job.id}`)
    try {
      const {
        layers,
        bbox,
        time,
        delay = 2000,
        size = { width: 1024, height: 768 },
        layout
      } = job.data
      const payload = { layers, bbox, time, size, delay }
      if (layout) payload.layout = layout
      console.log(`[worker:kapture] calling ${kaptureUrl} — size ${size.width}×${size.height}`)
      const imageBase64 = await callKapture(payload)
      console.log(`[worker:kapture] done — base64 length: ${imageBase64.length}`)
      return { image: imageBase64, contentType: 'image/png', filename: `kapture-${Date.now()}.png` }
    } catch (err) {
      console.error('[worker:kapture] FAILED:', err.message)
      throw err
    }
  },

  // Worker pdfme — delegates the map capture to the kapture worker via a real
  // BullMQ job, then waits for its result with waitUntilFinished() before
  // building the PDF. No shared helper function — true job delegation.
  pdfme: async (job) => {
    console.log(`[worker:pdfme] job ${job.id} — template: ${job.data?.templateName}`)
    try {
      const { templateName, inputs, maps } = job.data

      const template = loadTemplate(templateName)
      const mapSize = mapSizeFromTemplate(template)
      console.log(`[worker:pdfme] map size: ${mapSize.width}×${mapSize.height}px`)

      // Delegate to the kapture worker — enqueue a real BullMQ job
      const kaptureJob = await queue.add('kapture', {
        ...maps,
        size: mapSize,
        layout: { panes: { left: false, top: false, right: false, bottom: false }, fab: { visible: false } }
      })
      console.log(`[worker:pdfme] delegated kapture job ${kaptureJob.id} — waiting…`)

      // Block until the kapture job finishes (completed or failed)
      const kaptureResult = await kaptureJob.waitUntilFinished(workerQueueEvents)
      const { image: mapBase64 } = typeof kaptureResult === 'string'
        ? JSON.parse(kaptureResult)
        : kaptureResult
      console.log(`[worker:pdfme] kapture job ${kaptureJob.id} done — base64 length: ${mapBase64.length}`)

      // Inject image via schema.content + inputs to cover all pdfme version behaviours
      const mapDataUrl = `data:image/png;base64,${mapBase64}`
      const templateForGen = {
        ...template,
        schemas: template.schemas.map(page =>
          page.map(f =>
            f.name === 'map'
              ? { ...f, readOnly: false, content: mapDataUrl }
              : f
          )
        )
      }
      const pdfInputs = [{ ...inputs, map: mapDataUrl }]
      console.log('[worker:pdfme] generating PDF…')
      const pdfBytes = await generate({ template: templateForGen, inputs: pdfInputs, plugins: pdfPlugins })
      console.log(`[worker:pdfme] PDF done — ${pdfBytes.length} bytes`)

      return {
        pdf: Buffer.from(pdfBytes).toString('base64'),
        contentType: 'application/pdf',
        filename: `${templateName}-${Date.now()}.pdf`
      }
    } catch (err) {
      console.error('[worker:pdfme] FAILED:', err.message)
      throw err
    }
  }
}, 2)

setupQueueEvents(queueName, redis, app, 'task-store')
setupDashboard(app, queue, '/admin/tasks')

app.use('tasks', new TaskService({ queue, persistenceService: 'task-store' }))

// Download endpoint — reads from task-store directly and streams the file.
// Bypasses socket.io entirely so large PNG/PDF payloads are never an issue.
app.get('/download/:id', async (req, res) => {
  const id = req.params.id
  try {
    const task = await app.service('task-store').get(id)
    console.log(`[download] task ${id}: status=${task?.status}, hasResult=${!!task?.result}`)

    // BullMQ may serialise returnvalue to JSON string — parse defensively
    const result = typeof task?.result === 'string'
      ? JSON.parse(task.result)
      : task?.result

    if (!result) {
      console.warn(`[download] task ${id}: no result stored`)
      return res.status(404).json({ error: 'No result for this task' })
    }

    const data = result.pdf || result.image
    if (!data) {
      console.warn(`[download] task ${id}: result has no data`, Object.keys(result))
      return res.status(404).json({ error: 'Result has no data' })
    }

    res.set('Content-Type', result.contentType || 'application/octet-stream')
    res.set('Content-Disposition', `attachment; filename="${result.filename || `capture-${id}`}"`)
    res.send(Buffer.from(data, 'base64'))
  } catch (err) {
    console.error(`[download] error for task ${id}:`, err.message)
    res.status(404).json({ error: err.message })
  }
})

app.on('connection', connection => app.channel('anonymous').join(connection))
app.publish(() => app.channel('anonymous'))

app.listen(port).then(() => {
  console.log(`Server  → http://localhost:${port}`)
  console.log(`Board   → http://localhost:${port}/admin/tasks`)
  console.log(`Kapture → ${kaptureUrl}  (DPI: ${DPI})`)
})
