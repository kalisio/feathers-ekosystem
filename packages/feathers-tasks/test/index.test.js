import { describe, it, beforeAll, afterAll, expect } from 'vitest'
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

async function waitForStatus (app, taskId, status, timeout = 5000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const task = await app.service('tasks').get(taskId)
    if (task.status === status) return task
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Task ${taskId} did not reach status "${status}" within ${timeout}ms`)
}

describe('feathers-tasks', () => {
  it('exports TaskService, createQueue, createWorker, setupQueueEvents, setupDashboard', async () => {
    const mod = await import('../src/index.js')
    expect(typeof mod.TaskService).toBe('function')
    expect(typeof mod.createQueue).toBe('function')
    expect(typeof mod.createWorker).toBe('function')
    expect(typeof mod.setupQueueEvents).toBe('function')
    expect(typeof mod.setupDashboard).toBe('function')
  })

  describe('integration (requires Redis)', () => {
    let app
    let redisAvailable

    beforeAll(async () => {
      redisAvailable = await isRedisAvailable()
      if (!redisAvailable) return

      app = await createApp(REDIS, {
        echo: async (job) => ({ echoed: job.data }),
        'always-fail': async () => { throw new Error('forced failure') }
      })
    })

    afterAll(async () => {
    })

    // --- happy path ---

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

    // --- edge cases ---

    it('transitions to completed status after successful execution', async () => {
      if (!redisAvailable) return
      const task = await app.service('tasks').create({ type: 'echo', payload: { x: 1 } })
      const updated = await waitForStatus(app, task.id, 'completed')
      expect(updated.status).toBe('completed')
    })

    it('transitions to failed status when handler throws', async () => {
      if (!redisAvailable) return
      const task = await app.service('tasks').create({ type: 'always-fail', payload: {} })
      const updated = await waitForStatus(app, task.id, 'failed')
      expect(updated.status).toBe('failed')
      expect(updated.error).toMatch(/forced failure/)
    })

    it('does not crash when handler is not registered for a task type', async () => {
      if (!redisAvailable) return
      const task = await app.service('tasks').create({ type: 'unknown-type', payload: {} })
      expect(task.id).toBeDefined()
      // Worker skips unknown types silently — status remains waiting or completed (no-op)
      const updated = await waitForStatus(app, task.id, 'completed').catch(() => app.service('tasks').get(task.id))
      expect(['waiting', 'active', 'completed']).toContain(updated.status)
    })

    it('throws NotFound when getting a non-existent task', async () => {
      if (!redisAvailable) return
      await expect(app.service('tasks').get('non-existent-id')).rejects.toThrow('not found')
    })

    it('throws NotFound when removing a non-existent task', async () => {
      if (!redisAvailable) return
      await expect(app.service('tasks').remove('non-existent-id')).rejects.toThrow('not found')
    })
  })
})
