import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import { feathersTasks, TaskService } from '../src/index.js'
import { createApp } from './helpers/app.js'

const REDIS = { host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT) || 6379 }

// Skip all tests if Redis is not reachable
async function isRedisAvailable () {
  const { default: Redis } = await import('ioredis')
  const client = new Redis({ ...REDIS, lazyConnect: true, enableOfflineQueue: false })
  try {
    await client.connect()
    await client.ping()
    return true
  } catch {
    return false
  } finally {
    client.disconnect()
  }
}

describe('feathers-task', () => {
  it('exports feathersTasks and TaskService', () => {
    expect(typeof feathersTasks).toBe('function')
    expect(typeof TaskService).toBe('function')
  })

  describe('integration (requires Redis)', () => {
    let app
    let redisAvailable

    beforeAll(async () => {
      redisAvailable = await isRedisAvailable()
      if (!redisAvailable) return

      app = createApp(REDIS, {
        echo: async (job) => ({ echoed: job.data })
      })
    })

    afterAll(async () => {
    })

    it('creates a task and persists it', async () => {
      if (!redisAvailable) return
      const task = await app.service('tasks').create({ type: 'echo', payload: { msg: 'hello' } })
      expect(task.id).toBeDefined()
      expect(task.type).toBe('echo')
      expect(task.status).toBe('waiting')
    })

    it('finds tasks from persistence', async () => {
      if (!redisAvailable) return
      const result = await app.service('tasks').find({})
      expect(Array.isArray(result.data || result)).toBe(true)
    })

    it('gets a task by id', async () => {
      if (!redisAvailable) return
      const created = await app.service('tasks').create({ type: 'echo', payload: {} })
      const found = await app.service('tasks').get(created.id)
      expect(found.id).toBe(created.id)
    })

    it('removes a task', async () => {
      if (!redisAvailable) return
      const created = await app.service('tasks').create({ type: 'echo', payload: {} })
      const removed = await app.service('tasks').remove(created.id)
      expect(removed).toBeDefined()
    })
  })
})
