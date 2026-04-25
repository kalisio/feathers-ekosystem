import { feathers } from '@feathersjs/feathers'
import express from '@feathersjs/express'
import socketio from '@feathersjs/socketio'
import { MemoryService } from '@feathersjs/memory'
import { TaskService, createQueue, setupQueueEvents, setupDashboard } from '@kalisio/feathers-tasks'
import { QueueEvents } from 'bullmq'

import { RunnersService } from './runners.service.js'
import { DockerDispatcher } from './dispatchers/docker.js'
import { KubernetesDispatcher } from './dispatchers/kubernetes.js'

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

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.configure(express.rest())
app.configure(socketio({ cors: { origin: '*' } }))

app.use('task-store', new MemoryService())
app.use('runners', new RunnersService())

const queue = createQueue(queueName, redis)

setupQueueEvents(queueName, redis, app, 'task-store')

setupDashboard(app, queue, '/admin/tasks')

app.use('tasks', new TaskService({ queue, persistenceService: 'task-store' }))

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

const queueEvents = new QueueEvents(queueName, { connection: redis })

queueEvents.on('waiting', async ({ jobId }) => {
  try {
    const job = await queue.getJob(jobId)
    if (!job) return

    const dispatcher = dispatchers[job.name]
    if (!dispatcher) {
      console.warn(`[dispatcher] no dispatcher for job type "${job.name}" (job ${jobId})`)
      return
    }

    console.log(`[dispatcher] Spawning ${job.name === 'k8s-job' ? 'K8s pod' : 'Docker container'} for job ${jobId}`)
    await dispatcher.dispatch(job)
  } catch (err) {
    console.error(`[dispatcher] Failed to dispatch job ${jobId}: ${err.message}`)
  }
})

app.on('connection', connection => app.channel('anonymous').join(connection))
app.publish(() => app.channel('anonymous'))

await app.setup()

await Promise.all([queue.waitUntilReady(), queueEvents.waitUntilReady()])

app.listen(port).then(() => {
  console.log(`Server listening on http://localhost:${port}`)
  console.log(`Bull Board:   http://localhost:${port}/admin/tasks`)
  console.log(`Redis:        ${redis.host}:${redis.port}`)
  console.log(`Queue:        ${queueName}`)
  console.log(`Worker image: ${workerImage}`)
  console.log()
  console.log('Submit a Docker job:')
  console.log(`  curl -X POST http://localhost:${port}/tasks -H 'Content-Type: application/json' \\`)
  console.log('    -d \'{"type":"docker-job","payload":{"label":"hello docker","steps":4}}\'')
  console.log()
  console.log('Submit a K8s job:')
  console.log(`  curl -X POST http://localhost:${port}/tasks -H 'Content-Type: application/json' \\`)
  console.log('    -d \'{"type":"k8s-job","payload":{"label":"hello k8s","steps":3}}\'')
  console.log()
  console.log('Inspect runners (containers / pods):')
  console.log(`  curl http://localhost:${port}/runners`)
})
