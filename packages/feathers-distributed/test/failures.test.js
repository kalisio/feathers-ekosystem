import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { setTimeout as sleep } from 'timers/promises'
import express from '@feathersjs/express'
import { MemoryService } from '@feathersjs/memory'
import { createApp, waitForService, clone } from './utils.js'
import plugin, { finalize } from '../src/index.js'

const baseListenPort = 4060
const startId = 2
const store = {
  0: { content: 'message 0', id: 0 },
  1: { content: 'message 1', id: 1 }
}

describe('feathers-distributed:network', () => {
  const apps = []
  const servers = []
  const nbApps = 3

  beforeAll(async () => {
    const promises = []

    for (let i = 0; i < nbApps; i++) {
      apps.push(createApp(i, { authentication: false }))
      apps[i].configure(plugin({
        middlewares: { after: express.errorHandler() },
        services: (service) => service.path.endsWith('messages'),
        key: (i === 0 ? 'app' : 'messages'),
        coteDelay: 2000,
        publicationDelay: 2000,
        cote: {
          helloInterval: 2000,
          checkInterval: 4000,
          nodeTimeout: 5000,
          masterTimeout: 6000,
          basePort: 10000,
          highestPort: 10008,
          port: 12346
        }
      }))

      if (i !== 0) {
        apps[i].use('messages', new MemoryService({ store: clone(store), startId }))
        const messagesService = apps[i].service('messages')
        expect(messagesService).toBeDefined()
        promises.push(Promise.resolve(messagesService))
      } else {
        promises.push(waitForService(apps[i], 'messages'))
      }
    }

    await Promise.all(promises)

    for (let i = 0; i < nbApps; i++) {
      apps[i].use(express.notFound())
      apps[i].use(express.errorHandler())
      servers.push(await apps[i].listen(baseListenPort + i))
    }
  })

  it('check remote service is accessible', async () => {
    const messages = await apps[0].service('messages').find({})
    expect(messages.length > 0).toBe(true)
  })

  it('check remote service is accessible on partial failure', async () => {
    apps[1].serviceSubscriber.close()
    await sleep(6000)
    const messages = await apps[0].service('messages').find({})
    expect(messages.length > 0).toBe(true)
  }, 10000)

  it('check remote service is not accessible anymore on complete failure', async () => {
    apps[2].serviceSubscriber.close()
    await sleep(6000)
    // expect(() => apps[0].service('messages').find({})).toThrow("Can not find service 'messages'")
    expect(() => apps[0].service('messages')).toThrow("Can not find service 'messages'")
  })

  afterAll(async () => {
    for (let i = 0; i < nbApps; i++) {
      await servers[i].close()
      finalize(apps[i])
    }
  })
})
