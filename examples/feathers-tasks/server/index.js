import { feathers } from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'
import { MemoryService } from '@feathersjs/memory'
import { TaskService, createQueue, createWorker, setupQueueEvents, setupDashboard } from '@kalisio/feathers-tasks'

const port = process.env.SERVER_PORT || 3030
const redisHost = process.env.REDIS_HOST || 'localhost'
const redisPort = Number(process.env.REDIS_PORT) || 6379
const redis = { host: redisHost, port: redisPort }

// Create the Feathers app
const app = express(feathers())

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.configure(socketio({ cors: { origin: '*' } }))

// Persistence backend
app.use('task-store', new MemoryService())

// Queue and worker setup
const queueName = 'example-tasks'

const queue = createQueue(queueName, redis)

createWorker(queueName, redis, {
  // Simulates a slow task with progress reporting
  'process-data': async (job) => {
    const steps = job.data.steps || 3
    for (let i = 1; i <= steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 500))
      await job.updateProgress(Math.round((i / steps) * 100))
    }
    return { processed: steps }
  },
  // Simulates a task that can fail
  'risky-job': async (job) => {
    if (job.data.shouldFail) throw new Error('Intentional failure')
    return { ok: true }
  }
}, 2)

setupQueueEvents(queueName, redis, app, 'task-store')

setupDashboard(app, queue, '/admin/tasks')

// Mount the task service at the desired path
app.use('tasks', new TaskService({ queue, persistenceService: 'task-store' }))

// Publish all service events to connected Socket.IO clients
app.on('connection', connection => app.channel('anonymous').join(connection))
app.publish(() => app.channel('anonymous'))

app.listen(port).then(() => {
  console.log(`Server listening on http://localhost:${port}`)
  console.log(`Bull Board available at http://localhost:${port}/admin/tasks`)
})
