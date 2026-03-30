import { feathers } from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'
import { MemoryService } from '@feathersjs/memory'
import { feathersTasks } from '@kalisio/feathers-task'

const port = process.env.SERVER_PORT || 8081
const redisHost = process.env.REDIS_HOST || 'localhost'
const redisPort = Number(process.env.REDIS_PORT) || 6379

// Create the Feathers app
const app = express(feathers())

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.configure(socketio({ cors: { origin: '*' } }))

// Persistence backend
app.use('task-store', new MemoryService())

// Configure feathers-task
app.configure(feathersTasks({
  persistenceService: 'task-store',
  redis: { host: redisHost, port: redisPort },
  queue: { name: 'example-tasks', concurrency: 2 },
  handlers: {
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
  },
  dashboard: {
    enabled: true,
    basePath: '/admin/tasks'
  }
}))

app.listen(port).then(() => {
  console.log(`Server listening on http://localhost:${port}`)
  console.log(`Bull Board available at http://localhost:${port}/admin/tasks`)
})
