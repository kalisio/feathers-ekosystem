import { describe, it, beforeAll, afterAll, expect } from 'vitest'
import feathers from '@feathersjs/feathers'
import { MemoryService } from '@feathersjs/memory'
import express from '@feathersjs/express'
import { Service } from '../../src/server'

let app, service, expressServer

const subscription = {
  subscriptions: [{
    endpoint: process.env.SUBSCRIPTION_TEST_ENDPOINT,
    keys: {
      auth: process.env.SUBSCRIPTION_TEST_KEY_AUTH,
      p256dh: process.env.SUBSCRIPTION_TEST_KEY_P256DH
    }
  }]
}

const vapidDetails = {
  subject: process.env.VAPID_SUBJECT,
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
}

class UserService extends MemoryService {}

describe('feathers-webpush:service', () => {
  beforeAll(async () => {
    app = express(feathers())
    app.use(express.json())
    app.configure(express.rest())
    app.use('users', new UserService())
    await app.service('users').create(subscription)
  })

  it('is ES module compatible', () => {
    expect(typeof Service).toEqual('function')
  })

  it('create the service', async () => {
    app.use('push', new Service({ vapidDetails, app }), {
      methods: ['create']
    })
    service = app.service('push')
    expect(service).toBeDefined()
    expressServer = await app.listen(3000)
  })

  it('send webpush notifications', async () => {
    const response = await service.create({
      notification: { title: 'title' },
      subscriptionService: 'users',
      subscriptionProperty: 'subscriptions'
    })
    expect(response).toBeDefined()
    expect(response.succesful[0].statusCode).toEqual(201)
  })

  afterAll(async () => {
    await expressServer.close()
  })
})
