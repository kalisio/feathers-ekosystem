import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import feathers from '@feathersjs/feathers'
import { MemoryService } from '@feathersjs/memory'
import express from '@feathersjs/express'
import { deleteExpiredSubscriptions } from '../../src/server'

let app, expressServer

const endpoint = process.env.SUBSCRIPTION_TEST_ENDPOINT

const subscriptions = [{
  endpoint,
  keys: {
    auth: process.env.SUBSCRIPTION_TEST_KEY_AUTH,
    p256dh: process.env.SUBSCRIPTION_TEST_KEY_P256DH
  }
}]

const subscriptionService = 'users'
const subscriptionProperty = 'subscriptions'

class UserService extends MemoryService {}

describe('feathers-webpush:hooks', () => {
  beforeAll(async () => {
    app = express(feathers())
    app.use(express.json())
    app.configure(express.rest())
    app.use(subscriptionService, new UserService({ id: '_id' }))
    await app.service(subscriptionService).create({ subscriptions })
    expressServer = await app.listen(3001)
  })

  it('deleteExpiredSubscriptions', async () => {
    const hook = {
      type: 'after',
      app,
      result: {
        failed: [{ statusCode: 410, endpoint }],
        subscriptionService,
        subscriptionProperty
      }
    }
    await deleteExpiredSubscriptions(hook)
    const user = await app.service(subscriptionService).find()
    expect(user[0][subscriptionProperty]).toEqual([])
  })

  afterAll(async () => {
    await expressServer.close()
  })
})
