import feathers from '@feathersjs/feathers'
import express from '@feathersjs/express'
import { MemoryService } from '@feathersjs/memory'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Service, hooks } from '../src/index.js'
import { AdminEvents, UserEvents } from './data/index.js'

let app, usersService, kcListenerService, expressServer

describe('feathers-keycloak-listener-service', () => {
  beforeAll(async () => {
    app = express(feathers())
    app.use(express.json())
    app.configure(express.rest())

    // create the user service
    app.use('users', new MemoryService({ id: '_id', paginate: { default: 12, max: 50 } }))
    usersService = app.service('users')

    // create the kcListenerService service
    app.use('kc-events', new Service(), { methods: ['create'] })
    kcListenerService = app.service('kc-events')

    // run the server
    expressServer = await app.listen(3333)
  })

  afterAll(async () => {
    await expressServer.close()
  })

  it('is ES module compatible', () => {
    expect(typeof Service).toBe('function')
  })

  it('creates the services', () => {
    expect(usersService).toBeDefined()
    expect(kcListenerService).toBeDefined()
  })

  it('trigger create user without hook', async () => {
    await fetch('http://localhost:3333/kc-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(AdminEvents.createUser)
    })
    const response = await usersService.find({})
    expect(response.data.length).toBe(0)
  })

  it('installs hooks', () => {
    kcListenerService.hooks({
      after: {
        create: [
          hooks.createUser,
          hooks.updateUser,
          hooks.deleteUser,
          hooks.setSession,
          hooks.unsetSession
        ]
      }
    })
    expect(typeof kcListenerService.hooks).toBe('function')
  })

  it('trigger create user event', async () => {
    await fetch('http://localhost:3333/kc-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(AdminEvents.createUser)
    })
    const response = await usersService.find({})
    expect(response.data.length).toBe(1)
    const user = response.data[0]
    expect(user.username).toBe(AdminEvents.createUser.value.username)
    expect(user.email).toBe(AdminEvents.createUser.value.email)
    expect(user.firstName).toBe(AdminEvents.createUser.value.firstName)
    expect(user.lastName).toBe(AdminEvents.createUser.value.lastName)
  })

  it('trigger user login event', async () => {
    await fetch('http://localhost:3333/kc-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(UserEvents.login)
    })
    const response = await usersService.find({})
    expect(response.data.length).toBe(1)
    const user = response.data[0]
    expect(user.session).toBeDefined()
  })

  it('trigger user logout event', async () => {
    await fetch('http://localhost:3333/kc-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(UserEvents.logout)
    })
    const response = await usersService.find({})
    expect(response.data.length).toBe(1)
    const user = response.data[0]
    expect(user.session).toBeNull()
  })

  it('trigger update user event', async () => {
    await fetch('http://localhost:3333/kc-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(AdminEvents.updateUser)
    })
    const response = await usersService.find({})
    expect(response.data.length).toBe(1)
    const user = response.data[0]
    expect(user.lastName).toBe(AdminEvents.updateUser.value.lastName)
  })

  it('trigger delete user event', async () => {
    await fetch('http://localhost:3333/kc-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(AdminEvents.deleteUser)
    })
    const response = await usersService.find({})
    expect(response.data.length).toBe(0)
  })
})
