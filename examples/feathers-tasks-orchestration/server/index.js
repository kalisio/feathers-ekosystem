import { feathers } from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'
import { MemoryService } from '@feathersjs/memory'
import { TaskService, createQueue, setupDashboard } from '@kalisio/feathers-tasks'
import { WorkflowsService } from './workflows.service.js'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const port = Number(process.env.SERVER_PORT) || 3030
const redis = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379
}
const queueName = process.env.QUEUE_NAME || 'orchestration-tasks'

const app = express(feathers())

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.configure(express.rest())
app.configure(socketio({ cors: { origin: '*' } }))

app.use('task-store', new MemoryService())
app.use('workflow-store', new MemoryService())

const queue = createQueue(queueName, redis)

const { QueueEvents } = await import('bullmq')
const queueEvents = new QueueEvents(queueName, { connection: redis })

queueEvents.on('completed', async ({ jobId, returnvalue }) => {
  const result = returnvalue ?? null

  // 1. Update the task-store (standard feathers-tasks behavior)
  try {
    const taskStore = app.service('task-store')
    const items = await taskStore.find({ query: { id: jobId } })
    const records = items.data || items
    if (records.length) {
      await taskStore.patch(records[0]._id || records[0].id, {
        status: 'completed',
        result,
        completedAt: new Date().toISOString()
      })
    }
  } catch (err) {
    console.error(`[queue-events] Failed to patch task-store for job ${jobId}:`, err.message)
  }

  // 2. Notify the workflow engine so it advances to the next BPMN element
  const workflowInstanceId = result?.workflowInstanceId
  if (workflowInstanceId) {
    try {
      await app.service('workflows').notifyJobCompleted(jobId, result)
    } catch (err) {
      console.error(`[queue-events] Failed to notify workflow engine for job ${jobId}:`, err.message)
    }
  }
})

queueEvents.on('failed', async ({ jobId, failedReason }) => {
  // Update task-store
  try {
    const taskStore = app.service('task-store')
    const items = await taskStore.find({ query: { id: jobId } })
    const records = items.data || items
    if (records.length) {
      const record = records[0]
      const workflowInstanceId = record.payload?.workflowInstanceId
      await taskStore.patch(record._id || record.id, {
        status: 'failed',
        error: failedReason,
        failedAt: new Date().toISOString()
      })
      // Notify workflow engine of failure
      if (workflowInstanceId) {
        await app.service('workflows').notifyJobFailed(jobId, failedReason, workflowInstanceId)
      }
    }
  } catch (err) {
    console.error(`[queue-events] Failed to patch task-store on failure for job ${jobId}:`, err.message)
  }
})

queueEvents.on('active', async ({ jobId }) => {
  try {
    const taskStore = app.service('task-store')
    const items = await taskStore.find({ query: { id: jobId } })
    const records = items.data || items
    if (records.length) {
      await taskStore.patch(records[0]._id || records[0].id, {
        status: 'active',
        startedAt: new Date().toISOString()
      })
    }
  } catch { /* non-critical */ }
})

queueEvents.on('progress', async ({ jobId, data }) => {
  try {
    const taskStore = app.service('task-store')
    const items = await taskStore.find({ query: { id: jobId } })
    const records = items.data || items
    if (records.length) {
      await taskStore.patch(records[0]._id || records[0].id, { progress: data })
    }
  } catch { /* non-critical */ }
})

setupDashboard(app, queue, '/admin/tasks')

app.use('tasks', new TaskService({ queue, persistenceService: 'task-store' }))
app.use('workflows', new WorkflowsService({ store: app.service('workflow-store') }))

app.on('connection', connection => app.channel('anonymous').join(connection))
app.publish(() => app.channel('anonymous'))

await app.setup()

await Promise.all([
  queue.waitUntilReady(),
  queueEvents.waitUntilReady()
])

app.listen(port).then(async () => {
  console.log(`Server listening on http://localhost:${port}`)
  console.log(`Bull Board:   http://localhost:${port}/admin/tasks`)
  console.log(`Redis:        ${redis.host}:${redis.port}`)
  console.log(`Queue:        ${queueName}`)
  console.log()
  console.log('── API ──────────────────────────────────────────────────────')
  console.log()
  console.log('Launch the example BPMN workflow (auto-detects example.bpmn):')
  console.log(`  curl -X POST http://localhost:${port}/workflows \\`)
  console.log('    -H \'Content-Type: application/json\' \\')
  console.log('    -d \'{"name":"Example workflow","bpmnFile":"./workflows/example.bpmn"}\'')
  console.log()
  console.log('Or submit a standalone job (no BPMN):')
  console.log(`  curl -X POST http://localhost:${port}/tasks \\`)
  console.log('    -H \'Content-Type: application/json\' \\')
  console.log('    -d \'{"type":"swarm-job","payload":{"label":"manual job","steps":2}}\'')
  console.log()
  console.log('List workflow instances:')
  console.log(`  curl http://localhost:${port}/workflows`)
  console.log()
  console.log('List all tasks:')
  console.log(`  curl http://localhost:${port}/tasks`)
  console.log()

  if (process.env.AUTORUN) {
    console.log('── AUTORUN — launching example workflow ──────────────────────')
    const bpmnFile = join(__dirname, '..', 'workflows', 'example.bpmn')
    const bpmnXml = await readFile(bpmnFile, 'utf-8')
    const wf = await app.service('workflows').create({
      name: 'Example workflow (auto)',
      bpmnXml
    })
    console.log(`Workflow launched — id: ${wf.id}, instance: ${wf.instances[0]?.instanceId}`)
  }
})
