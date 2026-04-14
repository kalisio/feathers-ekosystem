import { feathers } from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'
import { MemoryService } from '@feathersjs/memory'
import { TaskService, createQueue, setupQueueEvents, setupDashboard } from '@kalisio/feathers-tasks'

const port = Number(process.env.SERVER_PORT) || 3030
const redis = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379
}
const queueName = process.env.QUEUE_NAME || 'orchestration-tasks'

const app = express(feathers())

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.configure(express.rest())
app.configure(socketio({ cors: { origin: '*' } }))

app.use('task-store', new MemoryService())

const queue = createQueue(queueName, redis)

setupQueueEvents(queueName, redis, app, 'task-store')

setupDashboard(app, queue, '/admin/tasks')

app.use('tasks', new TaskService({ queue, persistenceService: 'task-store' }))

app.on('connection', connection => app.channel('anonymous').join(connection))
app.publish(() => app.channel('anonymous'))

await app.setup()

app.listen(port).then(() => {
  console.log(`Server listening on http://localhost:${port}`)
  console.log(`Bull Board:   http://localhost:${port}/admin/tasks`)
  console.log(`Redis:        ${redis.host}:${redis.port}`)
  console.log(`Queue:        ${queueName}`)
  console.log()
  console.log('Submit a swarm job:')
  console.log(`  curl -X POST http://localhost:${port}/tasks -H 'Content-Type: application/json' \\`)
  console.log('    -d \'{"type":"swarm-job","payload":{"label":"hello from swarm","steps":4}}\'')
  console.log()
  console.log('Submit a k8s job:')
  console.log(`  curl -X POST http://localhost:${port}/tasks -H 'Content-Type: application/json' \\`)
  console.log('    -d \'{"type":"k8s-job","payload":{"label":"hello from k8s","steps":3}}\'')
})
