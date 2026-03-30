import { TaskService } from './service.js'
import { createQueue } from './queue.js'
import { createWorker } from './worker.js'
import { setupQueueEvents } from './events.js'
import { setupDashboard } from './dashboard.js'

export { TaskService }

export function feathersTasks (options = {}) {
  return function (app) {
    const {
      persistenceService,
      redis,
      queue: queueOptions = {},
      handlers = {},
      dashboard = {}
    } = options

    if (!persistenceService) throw new Error('feathers-task: persistenceService option is required')
    if (!redis) throw new Error('feathers-task: redis option is required')

    const queueName = queueOptions.name || 'tasks'
    const concurrency = queueOptions.concurrency || 1

    const queue = createQueue(queueName, redis)
    createWorker(queueName, redis, handlers, concurrency)
    setupQueueEvents(queueName, redis, app, persistenceService)

    if (dashboard.enabled) {
      setupDashboard(app, queue, dashboard.basePath || '/admin/tasks')
    }

    const service = new TaskService({ queue, persistenceService })
    service.app = app
    app.use('tasks', service)
  }
}
