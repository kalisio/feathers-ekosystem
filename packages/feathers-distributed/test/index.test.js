import { vi, beforeAll, afterAll, describe, it, expect } from 'vitest'
import { setTimeout as sleep } from 'timers/promises'
import { authenticate } from '@feathersjs/authentication'
import auth from '@feathersjs/authentication-client'
import restClient from '@feathersjs/rest-client'
import socketClient from '@feathersjs/socketio-client'
import express from '@feathersjs/express'
import feathers from '@feathersjs/feathers'
import request from 'superagent'
import * as commonHooks from 'feathers-hooks-common'
import { MemoryService } from '@feathersjs/memory'
import io from 'socket.io-client'
import { createApp, waitForService, waitForServiceRemoval, channels, clone } from './utils.js'
import plugin, { finalize } from '../src/index.js'

class CustomMemoryService extends MemoryService {
  custom (data, params) { return data.name }
}

const baseListenPort = 4050
let startId = 6
const authUser = {
  name: 'Jane Doe',
  email: 'user@test.com',
  password: '$2a$12$97.pHfXj/1Eqn0..1V4ixOvAno7emZKTZgz.OYEHYqOOM2z.cftAu',
  id: 0
}
const store = {
  0: authUser,
  1: { name: 'Jack Doe', id: 1 },
  2: { name: 'John Doe', id: 2 },
  3: { name: 'Rick Doe', id: 3 },
  4: { name: 'Dick Doe', id: 4 },
  5: { name: 'Dork Doe', id: 5 }
}
let beforeHook = (hook) => hook
let afterHook = (hook) => hook
let serviceMiddleware = (req, res, next) => next()
let appMiddleware = (req, res, next) => res.json({})
const customMiddleware = (req, res, next) => next()
let hookFromRemote

describe('feathers-distributed:main', () => {
  const apps = []
  const servers = []
  let customServices = []
  const appServices = []
  const restClients = []
  const restClientServices = []
  const restClientCustomServices = []
  const sockets = []
  const socketClients = []
  const socketClientServices = []
  const socketClientCustomServices = []
  let checkAuthentication = false
  let accessToken
  const nbApps = 4
  const gateway = 0
  const service1 = 1
  const service2 = 2
  const noEvents = 3
  const hookContext = { query: { } }

  beforeAll(async () => {
    beforeHook = vi.fn(beforeHook)
    afterHook = vi.fn(afterHook)
    serviceMiddleware = vi.fn(serviceMiddleware)
    appMiddleware = vi.fn(appMiddleware)
    const promises = []

    for (let i = 0; i < nbApps; i++) {
      apps.push(createApp(i, { authentication: (i === gateway ? ['jwt', 'local'] : ['jwt']) }))
      apps[i].configure(plugin({
        hooks: { before: { all: beforeHook }, after: { all: afterHook } },
        middlewares: { after: express.errorHandler() },
        services: (service) => service.path.endsWith('users') ||
                  service.path.endsWith('custom') ||
                  service.path.endsWith('no-events'),
        remoteServicePath: (service) => (service.path.endsWith('custom') ? service.path.replace('custom', 'custom-name') : service.path),
        remoteServiceOptions: (service) => service.path.endsWith('users') ? ['startId'] : null,
        key: i.toString(),
        coteDelay: 5000,
        publicationDelay: 5000,
        publishEvents: (i !== noEvents),
        distributedEvents: ['created', 'updated', 'patched', 'removed', 'custom'],
        distributedMethods: ['find', 'get', 'create', 'update', 'patch', 'remove', 'custom'],
        cote: {
          helloInterval: 2000,
          checkInterval: 4000,
          nodeTimeout: 5000,
          masterTimeout: 6000,
          basePort: 6000,
          highestPort: 6999,
          port: 12345
        }
      }))
      apps[i].configure(channels)
      if (i === gateway) {
        apps[gateway].use('/middleware', appMiddleware)
        apps[gateway].use('users', serviceMiddleware, new CustomMemoryService({ store: clone(store), startId }))
        const userService = apps[gateway].service('users')
        expect(userService).toBeDefined()
        userService.hooks({
          before: {
            all: [
              hook => {
                hookFromRemote = hook.params.fromRemote
                return hook
              },
              commonHooks.when(
                hook => hook.params.provider && checkAuthentication,
                authenticate('jwt')
              )
            ]
          }
        })
        promises.push(Promise.resolve(userService))
      } else if (i === noEvents) {
        apps[noEvents].use('no-events', new CustomMemoryService(), { events: ['custom'] })
        promises.push(waitForService(apps[i], 'users'))
      } else {
        promises.push(waitForService(apps[i], 'users'))
      }
    }

    await Promise.all(promises)

    for (let i = 0; i < nbApps; i++) {
      apps[i].use(express.notFound())
      apps[i].use(express.errorHandler())
      servers.push(await apps[i].listen(baseListenPort + i))
    }

    for (let i = 0; i < nbApps; i++) {
      appServices.push(apps[i].service('users'))
      expect(appServices[i]).toBeDefined()

      const url = 'http://localhost:' + (baseListenPort + i)
      const restTransporter = restClient(url).superagent(request)
      const rClient = feathers()
        .configure(restTransporter)
        .configure(auth())
      restClients.push(rClient)
      rClient.transporter = restTransporter
      rClient.registerCustomService = function (name, methods) {
        rClient.use(name, rClient.transporter.service(name), { methods })
        return rClient.service(name)
      }

      const socket = io(url)
      sockets.push(socket)
      const socketTransporter = socketClient(socket)
      const sClient = feathers()
        .configure(socketTransporter)
        .configure(auth())
      socketClients.push(sClient)
      sClient.transporter = socketTransporter
      sClient.registerCustomService = function (name, methods) {
        sClient.use(name, sClient.transporter.service(name), { methods })
        return sClient.service(name)
      }
    }

    await sleep(10000)
  })

  it('is ES module compatible', () => {
    expect(typeof finalize).toBe('function')
    expect(typeof plugin).toBe('function')
  })

  it('dynamically register a custom middleware', () => {
    expect(() => apps[gateway].use('customMiddleware', customMiddleware)).not.toThrow()
  })

  it('initiate the rest clients', () => {
    for (let i = 0; i < nbApps; i++) {
      expect(restClients[i]).toBeDefined()
      restClientServices[i] = restClients[i].service('users')
      expect(restClientServices[i]).toBeDefined()
    }
  })

  it('initiate the socket clients', () => {
    for (let i = 0; i < nbApps; i++) {
      expect(socketClients[i]).toBeDefined()
      socketClientServices[i] = socketClients[i].service('users')
      expect(socketClientServices[i]).toBeDefined()
    }
  })

  it('ensure healthcheck can been called on apps', async () => {
    let url = 'http://localhost:' + (baseListenPort + service1) + '/distribution/healthcheck/0'
    let response = await request.get(url)
    expect(response.body).toEqual({ users: true })
    url = 'http://localhost:' + (baseListenPort + service2) + '/distribution/healthcheck/0'
    response = await request.get(url)
    expect(response.body).toEqual({ users: true })
    url = 'http://localhost:' + (baseListenPort + gateway) + '/distribution/healthcheck/3'
    response = await request.get(url)
    expect(response.body).toEqual({ 'no-events': true })
    url = 'http://localhost:' + (baseListenPort + gateway) + '/distribution/healthcheck/0'
    response = await request.get(url)
    expect(response.body).toEqual({ 'no-events': true })
    url = 'http://localhost:' + (baseListenPort + gateway) + '/distribution/healthcheck'
    response = await request.get(url)
    expect(response.body).toEqual({ 'no-events': true })
  })

  it('ensure middleware can been called on app', async () => {
    const url = 'http://localhost:' + (baseListenPort + gateway) + '/middleware'
    await request.get(url)
    expect(appMiddleware).toHaveBeenCalled()
  })

  it('dispatch find rest service calls from remote to local without auth', async () => {
    const users = await restClientServices[service1].find({})
    expect(users.length > 0).toBe(true)
  }, 5000)

  it('dispatch get rest service calls from remote to local without auth', async () => {
    const user = await restClientServices[service1].get(1)
    expect(user.id).toBe(1)
  }, 5000)

  it('dispatch create rest service calls from remote to local without auth', async () => {
    const user = await restClientServices[service1].create({ name: 'Donald Doe' })
    expect(user.id).toBe(startId)
  }, 5000)

  it('dispatch update rest service calls from remote to local without auth', async () => {
    const user = await restClientServices[service1].update(startId, { name: 'Donald Dover' })
    expect(user.name).toBe('Donald Dover')
  }, 5000)

  it('dispatch patch rest service calls from remote to local without auth', async () => {
    const user = await restClientServices[service1].patch(startId, { name: 'Donald Doe' })
    expect(user.name).toBe('Donald Doe')
  }, 5000)

  it('dispatch remove rest service calls from remote to local without auth', async () => {
    const user = await restClientServices[service1].remove(startId)
    expect(user.id).toBe(startId)
  }, 5000)

  it('ensure distribution hooks have been called on remote service', () => {
    expect(beforeHook).toHaveBeenCalled()
    expect(afterHook).toHaveBeenCalled()
  }, 5000)

  it('ensure local service hooks have been called with the remote service flag', () => {
    expect(hookFromRemote).toBe(true)
  }, 5000)

  it('ensure middleware can been called on local service', async () => {
    const url = 'http://localhost:' + (baseListenPort + gateway) + '/users'
    await request.get(url)
    expect(serviceMiddleware).toHaveBeenCalled()
  }, 5000)

  it('dispatch find socket service calls from remote to local without auth', async () => {
    const users = await socketClientServices[service1].find({})
    expect(users.length > 0).toBe(true)
  }, 5000)

  it('dispatch get socket service calls from remote to local without auth', async () => {
    const user = await socketClientServices[service1].get(1)
    expect(user.id).toBe(1)
  }, 5000)

  it('dispatch create socket service calls from remote to local without auth', async () => {
    startId += 1
    const user = await socketClientServices[service1].create({ name: 'Donald Doe' })
    expect(user.id).toBe(startId)
  }, 5000)

  it('dispatch update socket service calls from remote to local without auth', async () => {
    const user = await socketClientServices[service1].update(startId, { name: 'Donald Dover' })
    expect(user.name).toBe('Donald Dover')
  }, 5000)

  it('dispatch patch socket service calls from remote to local without auth', async () => {
    const user = await socketClientServices[service1].patch(startId, { name: 'Donald Doe' })
    expect(user.name).toBe('Donald Doe')
  }, 5000)

  it('dispatch remove socket service calls from remote to local without auth', async () => {
    const user = await socketClientServices[service1].remove(startId)
    expect(user.id).toBe(startId)
  }, 5000)

  it('dispatch create socket service events from local to remote without auth', () => new Promise(resolve => {
    let count = 0
    startId += 1
    socketClientServices[service1].once('created', user => {
      expect(user.name).toBe('Donald Doe')
      expect(user.id).toBe(startId)
      count++
      if (count === 2) resolve()
    })
    appServices[service1].once('created', (user, context) => {
      expect(user.name).toBe('Donald Doe')
      expect(user.id).toBe(startId)
      expect(context).toBeDefined()
      expect(context.type).toBe('around')
      expect(context.event).toBe('created')
      expect(context.method).toBe('create')
      expect(context.data).toEqual({ name: 'Donald Doe' })
      expect(context.result).toEqual({ name: 'Donald Doe', id: startId })
      expect(context.params).toBeDefined()
      expect(context.params.query).toEqual(hookContext.query)
      count++
      if (count === 2) resolve()
    })
    hookContext.query.id = startId
    socketClientServices[gateway].create({ name: 'Donald Doe' }, hookContext)
  }), 5000)

  it('dispatch update socket service events from local to remote without auth', () => new Promise(resolve => {
    let count = 0
    socketClientServices[service2].once('updated', user => {
      expect(user.name).toBe('Donald Dover')
      count++
      if (count === 2) resolve()
    })
    appServices[service2].once('updated', (user, context) => {
      expect(user.name).toBe('Donald Dover')
      expect(user.id).toBe(startId)
      expect(context).toBeDefined()
      expect(context.type).toBe('around')
      expect(context.event).toBe('updated')
      expect(context.method).toBe('update')
      expect(context.data).toEqual({ name: 'Donald Dover' })
      expect(context.result).toEqual({ name: 'Donald Dover', id: startId })
      expect(context.params).toBeDefined()
      expect(context.params.query).toEqual(hookContext.query)
      count++
      if (count === 2) resolve()
    })
    socketClientServices[gateway].update(startId, { name: 'Donald Dover' }, hookContext)
  }), 5000)

  it('dispatch patch socket service events from local to remote without auth', () => new Promise(resolve => {
    let count = 0
    socketClientServices[service1].once('patched', user => {
      expect(user.name).toBe('Donald Doe')
      count++
      if (count === 2) resolve()
    })
    appServices[service1].once('patched', (user, context) => {
      expect(user.name).toBe('Donald Doe')
      expect(user.id).toBe(startId)
      expect(context).toBeDefined()
      expect(context.type).toBe('around')
      expect(context.event).toBe('patched')
      expect(context.method).toBe('patch')
      expect(context.data).toEqual({ name: 'Donald Doe' })
      expect(context.result).toEqual({ name: 'Donald Doe', id: startId })
      expect(context.params).toBeDefined()
      expect(context.params.query).toEqual(hookContext.query)
      count++
      if (count === 2) resolve()
    })
    socketClientServices[gateway].patch(startId, { name: 'Donald Doe' }, hookContext)
  }), 5000)

  it('dispatch remove socket service events from local to remote without auth', () => new Promise(resolve => {
    let count = 0
    socketClientServices[service2].once('removed', user => {
      expect(user.id).toBe(startId)
      count++
      if (count === 2) resolve()
    })
    appServices[service2].once('removed', (user, context) => {
      expect(user.name).toBe('Donald Doe')
      expect(user.id).toBe(startId)
      expect(context).toBeDefined()
      expect(context.type).toBe('around')
      expect(context.event).toBe('removed')
      expect(context.method).toBe('remove')
      expect(context.data).toBeUndefined()
      expect(context.id).toBe(startId)
      expect(context.result).toEqual({ name: 'Donald Doe', id: startId })
      expect(context.params).toBeDefined()
      expect(context.params.query).toEqual(hookContext.query)
      count++
      if (count === 2) resolve()
    })
    socketClientServices[gateway].remove(startId, hookContext)
  }), 5000)

  it('dynamically register a custom service', async () => {
    const customService = new CustomMemoryService()
    const methods = ['create', 'update', 'custom']
    const events = ['custom']
    apps[gateway].use('custom', customService, {
      events,
      methods,
      distributedEvents: ['created', 'custom'],
      distributedMethods: methods
    })
    customServices.push(Promise.resolve(apps[gateway].service('custom')))
    customServices.push(waitForService(apps[service1], 'custom-name'))
    customServices.push(waitForService(apps[service2], 'custom-name'))
    customServices = await Promise.all(customServices)
    expect(customServices[gateway]).toBeDefined()
    expect(customServices[service1]).toBeDefined()
    expect(customServices[service2]).toBeDefined()
    expect(typeof customServices[gateway].custom).toBe('function')
    expect(typeof customServices[service1].custom).toBe('function')
    expect(typeof customServices[service2].custom).toBe('function')
    restClientCustomServices.push(restClients[gateway].registerCustomService('custom', methods))
    restClientCustomServices.push(restClients[service1].registerCustomService('custom-name', methods))
    restClientCustomServices.push(restClients[service2].registerCustomService('custom-name', methods))
    expect(restClientCustomServices[gateway]).toBeDefined()
    expect(restClientCustomServices[service1]).toBeDefined()
    expect(restClientCustomServices[service2]).toBeDefined()
    expect(typeof restClientCustomServices[gateway].custom).toBe('function')
    expect(typeof restClientCustomServices[service1].custom).toBe('function')
    expect(typeof restClientCustomServices[service2].custom).toBe('function')
    socketClientCustomServices.push(socketClients[gateway].registerCustomService('custom', methods))
    socketClientCustomServices.push(socketClients[service1].registerCustomService('custom-name', methods))
    socketClientCustomServices.push(socketClients[service2].registerCustomService('custom-name', methods))
    expect(socketClientCustomServices[gateway]).toBeDefined()
    expect(socketClientCustomServices[service1]).toBeDefined()
    expect(socketClientCustomServices[service2]).toBeDefined()
    expect(typeof socketClientCustomServices[gateway].custom).toBe('function')
    expect(typeof socketClientCustomServices[service1].custom).toBe('function')
    expect(typeof socketClientCustomServices[service2].custom).toBe('function')
    await sleep(15000)
  }, 20000)

  it('dispatch custom service calls from remote to local', async () => {
    let name = await customServices[service1].custom({ name: 'Donald Doe' })
    expect(name).toBe('Donald Doe')
    name = await customServices[service2].custom({ name: 'Donald Doe' })
    expect(name).toBe('Donald Doe')
  }, 5000)

  it('dispatch custom rest service calls from remote to local without auth', async () => {
    let name = await restClientCustomServices[service1].custom({ name: 'Donald Doe' })
    expect(name).toBe('Donald Doe')
    name = await restClientCustomServices[service2].custom({ name: 'Donald Doe' })
    expect(name).toBe('Donald Doe')
  }, 5000)

  it('not found request should return 404 on local service', async () => {
    const url = 'http://localhost:' + (baseListenPort + gateway) + '/xxx'
    try {
      await request.get(url)
    } catch (err) {
      expect(err.response.text.includes('NotFound')).toBe(true)
      expect(err.status).toBe(404)
    }
  }, 5000)

  it('not found request should return 404 on remote service', async () => {
    const url = 'http://localhost:' + (baseListenPort + service1) + '/xxx'
    try {
      await request.get(url)
    } catch (err) {
      expect(err.response.text.includes('NotFound')).toBe(true)
      expect(err.status).toBe(404)
    }
  }, 5000)

  it('unauthenticated call should return 401 on local service with auth', async () => {
    checkAuthentication = true
    try {
      await socketClientServices[gateway].find({})
    } catch (err) {
      expect(err.code).toBe(401)
    }
  }, 5000)

  it('unauthenticated request should return 401 on local service with auth', async () => {
    const url = 'http://localhost:' + (baseListenPort + gateway) + '/users'
    try {
      await request.get(url)
    } catch (err) {
      expect(err.response.text.includes('NotAuthenticated')).toBe(true)
      expect(err.status).toBe(401)
    }
  }, 5000)

  it('unauthenticated call should return 401 on remote service with auth', async () => {
    try {
      await socketClientServices[service1].find({})
    } catch (err) {
      expect(err.code).toBe(401)
    }
  }, 5000)

  it('unauthenticated request should return 401 on remote service with auth', async () => {
    const url = 'http://localhost:' + (baseListenPort + service1) + '/users'
    try {
      await request.get(url)
    } catch (err) {
      expect(err.response.text.includes('NotAuthenticated')).toBe(true)
      expect(err.status).toBe(401)
    }
  }, 5000)

  it('authenticate rest client should return token', async () => {
    let response = await restClients[gateway].authenticate({
      strategy: 'local',
      email: 'user@test.com',
      password: 'password'
    })
    accessToken = response.accessToken
    expect(accessToken).toBeDefined()
    response = await restClients[service1].authenticate({ strategy: 'jwt', accessToken })
    accessToken = response.accessToken
    expect(accessToken).toBeDefined()
    response = await restClients[service2].authenticate({ strategy: 'jwt', accessToken })
    accessToken = response.accessToken
    expect(accessToken).toBeDefined()
  }, 5000)

  it('authenticate socket client should return token', async () => {
    let response = await socketClients[gateway].authenticate({
      strategy: 'local',
      email: 'user@test.com',
      password: 'password'
    })
    accessToken = response.accessToken
    expect(accessToken).toBeDefined()
    response = await socketClients[service1].authenticate({ strategy: 'jwt', accessToken })
    accessToken = response.accessToken
    expect(accessToken).toBeDefined()
    response = await socketClients[service2].authenticate({ strategy: 'jwt', accessToken })
    accessToken = response.accessToken
    expect(accessToken).toBeDefined()
  }, 5000)

  it('dispatch find rest service calls from remote to local with auth', async () => {
    const users = await restClientServices[service1].find({})
    expect(users.length > 0).toBe(true)
  }, 5000)

  it('dispatch get rest service calls from remote to local with auth', async () => {
    const user = await restClientServices[service1].get(1)
    expect(user.id).toBe(1)
  }, 5000)

  it('dispatch create rest service calls from remote to local with auth', async () => {
    startId += 1
    const user = await restClientServices[service1].create({ name: 'Donald Doe' })
    expect(user.id).toBe(startId)
  }, 5000)

  it('dispatch update rest service calls from remote to local with auth', async () => {
    const user = await restClientServices[service1].update(startId, { name: 'Donald Dover' })
    expect(user.name).toBe('Donald Dover')
  }, 5000)

  it('dispatch patch rest service calls from remote to local with auth', async () => {
    const user = await restClientServices[service1].patch(startId, { name: 'Donald Doe' })
    expect(user.name).toBe('Donald Doe')
  }, 5000)

  it('dispatch remove rest service calls from remote to local with auth', async () => {
    const user = await restClientServices[service1].remove(startId)
    expect(user.id).toBe(startId)
  }, 5000)

  it('dispatch find socket service calls from remote to local with auth', async () => {
    const users = await socketClientServices[service1].find({})
    expect(users.length > 0).toBe(true)
  }, 5000)

  it('dispatch get socket service calls from remote to local with auth', async () => {
    const user = await socketClientServices[service1].get(1)
    expect(user.id).toBe(1)
  }, 5000)

  it('dispatch create socket service calls from remote to local with auth', async () => {
    startId += 1
    const user = await socketClientServices[service1].create({ name: 'Donald Doe' })
    expect(user.id).toBe(startId)
  }, 5000)

  it('dispatch update socket service calls from remote to local with auth', async () => {
    const user = await socketClientServices[service1].update(startId, { name: 'Donald Dover' })
    expect(user.name).toBe('Donald Dover')
  }, 5000)

  it('dispatch patch socket service calls from remote to local with auth', async () => {
    const user = await socketClientServices[service1].patch(startId, { name: 'Donald Doe' })
    expect(user.name).toBe('Donald Doe')
  }, 5000)

  it('dispatch remove socket service calls from remote to local with auth', async () => {
    const user = await socketClientServices[service1].remove(startId)
    expect(user.id).toBe(startId)
  }, 5000)

  it('dispatch create socket service events from local to remote with auth', () => new Promise(resolve => {
    let count = 0
    startId += 1
    socketClientServices[service2].once('created', user => {
      expect(user.id).toBe(startId)
      count++
      if (count === 2) resolve()
    })
    appServices[service2].once('created', (user, context) => {
      expect(user.name).toBe('Donald Doe')
      expect(user.id).toBe(startId)
      expect(context).toBeDefined()
      expect(context.type).toBe('around')
      expect(context.event).toBe('created')
      expect(context.method).toBe('create')
      expect(context.data).toEqual({ name: 'Donald Doe' })
      expect(context.result).toEqual({ name: 'Donald Doe', id: startId })
      expect(context.params).toBeDefined()
      expect(context.params.query).toEqual(hookContext.query)
      expect(context.params.user).toEqual(authUser)
      count++
      if (count === 2) resolve()
    })
    hookContext.query.id = startId
    socketClientServices[gateway].create({ name: 'Donald Doe' }, hookContext)
  }), 5000)

  it('dispatch update socket service events from local to remote with auth', () => new Promise(resolve => {
    let count = 0
    socketClientServices[service2].once('updated', user => {
      expect(user.name).toBe('Donald Dover')
      count++
      if (count === 2) resolve()
    })
    appServices[service2].once('updated', (user, context) => {
      expect(user.name).toBe('Donald Dover')
      expect(user.id).toBe(startId)
      expect(context).toBeDefined()
      expect(context.type).toBe('around')
      expect(context.event).toBe('updated')
      expect(context.method).toBe('update')
      expect(context.data).toEqual({ name: 'Donald Dover' })
      expect(context.result).toEqual({ name: 'Donald Dover', id: startId })
      expect(context.params).toBeDefined()
      expect(context.params.query).toEqual(hookContext.query)
      expect(context.params.user).toEqual(authUser)
      count++
      if (count === 2) resolve()
    })
    socketClientServices[gateway].update(startId, { name: 'Donald Dover' }, hookContext)
  }), 5000)

  it('dispatch patch socket service events from local to remote with auth', () => new Promise(resolve => {
    let count = 0
    socketClientServices[service2].once('patched', user => {
      expect(user.name).toBe('Donald Doe')
      count++
      if (count === 2) resolve()
    })
    appServices[service1].once('patched', (user, context) => {
      expect(user.name).toBe('Donald Doe')
      expect(user.id).toBe(startId)
      expect(context).toBeDefined()
      expect(context.type).toBe('around')
      expect(context.event).toBe('patched')
      expect(context.method).toBe('patch')
      expect(context.data).toEqual({ name: 'Donald Doe' })
      expect(context.result).toEqual({ name: 'Donald Doe', id: startId })
      expect(context.params).toBeDefined()
      expect(context.params.query).toEqual(hookContext.query)
      expect(context.params.user).toEqual(authUser)
      count++
      if (count === 2) resolve()
    })
    socketClientServices[gateway].patch(startId, { name: 'Donald Doe' }, hookContext)
  }), 5000)

  it('dispatch remove socket service events from local to remote with auth', () => new Promise(resolve => {
    let count = 0
    socketClientServices[service2].once('removed', user => {
      expect(user.id).toBe(startId)
      count++
      if (count === 2) resolve()
    })
    appServices[service2].once('removed', (user, context) => {
      expect(user.name).toBe('Donald Doe')
      expect(user.id).toBe(startId)
      expect(context).toBeDefined()
      expect(context.type).toBe('around')
      expect(context.event).toBe('removed')
      expect(context.method).toBe('remove')
      expect(context.data).toBeUndefined()
      expect(context.id).toBe(startId)
      expect(context.result).toEqual({ name: 'Donald Doe', id: startId })
      expect(context.params).toBeDefined()
      expect(context.params.query).toEqual(hookContext.query)
      expect(context.params.user).toEqual(authUser)
      count++
      if (count === 2) resolve()
    })
    socketClientServices[gateway].remove(startId, hookContext)
  }), 5000)

  it('disable events publishing globally', () => {
    expect(apps[gateway].serviceEventsPublisher).toBeDefined()
    expect(apps[service2].serviceEventsPublisher).toBeDefined()
    expect(apps[noEvents].serviceEventsPublisher).toBeUndefined()
  })

  it('dynamically unregister a custom service', async () => {
    apps[gateway].unuse('custom')
    expect(() => apps[gateway].service('custom')).toThrow()
    await Promise.all([
      waitForServiceRemoval(apps[service1], 'custom-name'),
      waitForServiceRemoval(apps[service2], 'custom-name')
    ])
  })

  afterAll(async () => {
    for (let i = 0; i < nbApps; i++) {
      await servers[i].close()
      finalize(apps[i])
      await sockets[i].close()
    }
  })
})
