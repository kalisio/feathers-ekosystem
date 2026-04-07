import feathers from '@feathersjs/feathers'
import { MemoryService } from '@feathersjs/memory'
import { TaskService, createQueue, createWorker, setupQueueEvents } from '../../src/index.js'

export async function createApp (redisOptions, handlers = {}) {
  const app = feathers()

  // Persistence backend (in-memory for tests)
  app.use('task-store', new MemoryService())

  const queueName = 'test-tasks'
  const queue = createQueue(queueName, redisOptions)
  const worker = createWorker(queueName, redisOptions, handlers, 1)
  const queueEvents = setupQueueEvents(queueName, redisOptions, app, 'task-store')

  app.use('tasks', new TaskService({ queue, persistenceService: 'task-store' }))

  // Triggers setup(app) on all services
  await app.setup()

  // Wait for all Redis connections to be ready before running tests
  await Promise.all([
    queue.waitUntilReady(),
    worker.waitUntilReady(),
    queueEvents.waitUntilReady()
  ])

  // Drain the queue so no stale jobs from previous test runs interfere
  await queue.obliterate({ force: true })

  return app
}
