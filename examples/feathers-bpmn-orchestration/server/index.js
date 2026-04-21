import { feathers } from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'
import { MemoryService } from '@feathersjs/memory'
import { TaskService, createQueue, setupDashboard } from '@kalisio/feathers-tasks'
import { QueueEvents } from 'bullmq'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { WorkflowsService } from './workflows.service.js'
import { RunnersService } from './runners.service.js'
import { DockerDispatcher } from './dispatchers/docker.js'
import { KubernetesDispatcher } from './dispatchers/kubernetes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const port = Number(process.env.SERVER_PORT) || 3030
const redis = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379
}
const queueName = process.env.QUEUE_NAME || 'orchestration-tasks'
const workerImage = process.env.WORKER_IMAGE || 'feathers-tasks-worker:latest'

const redisForDocker = {
  host: process.env.REDIS_HOST_FOR_DOCKER || 'host.docker.internal',
  port: redis.port
}
const redisForK8s = {
  host: process.env.REDIS_HOST_FOR_K8S || 'localhost',
  port: redis.port
}

const app = express(feathers())

app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))
app.configure(express.rest())
app.configure(socketio({ cors: { origin: '*' } }))

app.use('task-store', new MemoryService())
app.use('workflow-store', new MemoryService())
app.use('runners', new RunnersService())

const queue = createQueue(queueName, redis)

const queueEvents = new QueueEvents(queueName, { connection: redis })

queueEvents.on('completed', async ({ jobId, returnvalue }) => {
  const result = returnvalue ?? null

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

const runnersService = app.service('runners')

const dispatchers = {
  'docker-job': new DockerDispatcher({
    image: workerImage,
    queueName,
    redis: redisForDocker,
    runnersService
  }),
  'k8s-job': new KubernetesDispatcher({
    image: workerImage,
    queueName,
    redis: redisForK8s,
    namespace: process.env.K8S_NAMESPACE || 'default',
    imagePullPolicy: process.env.K8S_IMAGE_PULL_POLICY || 'Never',
    hostNetwork: process.env.K8S_HOST_NETWORK !== '0',
    runnersService
  })
}

queueEvents.on('waiting', async ({ jobId }) => {
  try {
    const job = await queue.getJob(jobId)
    if (!job) return

    const dispatcher = dispatchers[job.name]
    if (!dispatcher) {
      console.warn(`[dispatcher] no dispatcher for job type "${job.name}" (job ${jobId})`)
      return
    }

    console.log(`[dispatcher] Spawning ${job.name === 'k8s-job' ? 'K8s pod' : 'Docker container'} for job ${jobId} (${job.data.label || 'no label'})`)
    await dispatcher.dispatch(job)
  } catch (err) {
    console.error(`[dispatcher] Failed to dispatch job ${jobId}: ${err.message}`)
  }
})

app.on('connection', connection => app.channel('anonymous').join(connection))
app.publish(() => app.channel('anonymous'))

await app.setup()

await Promise.all([queue.waitUntilReady(), queueEvents.waitUntilReady()])

app.listen(port).then(async () => {
  console.log(`Server listening on http://localhost:${port}`)
  console.log(`Bull Board:   http://localhost:${port}/admin/tasks`)
  console.log(`Redis:        ${redis.host}:${redis.port}`)
  console.log(`Queue:        ${queueName}`)
  console.log(`Worker image: ${workerImage}`)
  console.log()
  console.log('── API ──────────────────────────────────────────────────────')
  console.log()
  console.log('Launch the example BPMN workflow:')
  console.log(`  curl -X POST http://localhost:${port}/workflows \\`)
  console.log('    -H \'Content-Type: application/json\' \\')
  console.log('    -d \'{"name":"Example workflow","bpmnFile":"./workflows/example.bpmn"}\'')
  console.log()
  console.log('Or submit a standalone job (no BPMN):')
  console.log(`  curl -X POST http://localhost:${port}/tasks \\`)
  console.log('    -H \'Content-Type: application/json\' \\')
  console.log('    -d \'{"type":"docker-job","payload":{"label":"manual job","steps":2}}\'')
  console.log()
  console.log('Inspect state:')
  console.log(`  curl http://localhost:${port}/workflows`)
  console.log(`  curl http://localhost:${port}/tasks`)
  console.log(`  curl http://localhost:${port}/runners`)
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
