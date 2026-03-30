import feathers from '@feathersjs/feathers'
import { MemoryService } from '@feathersjs/memory'
import { feathersTasks } from '../../src/index.js'

export function createApp (redisOptions, handlers = {}) {
  const app = feathers()

  // Persistence backend (in-memory for tests)
  app.use('task-store', new MemoryService({ id: '_id' }))

  app.configure(feathersTasks({
    persistenceService: 'task-store',
    redis: redisOptions,
    queue: { name: 'test-tasks', concurrency: 1 },
    handlers
  }))

  return app
}
