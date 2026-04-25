import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import feathers from '@feathersjs/feathers'
import { MongoClient } from 'mongodb'
import plugin from '../src/index.js'

describe('feathers-mongodb-management', () => {
  let app, client, adminDb, testDb, databaseService, collectionService, userService

  beforeAll(async () => {
    app = feathers()
    const url = process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017'
    client = await MongoClient.connect(url)
    adminDb = client.db('feathers-test').admin()
    await adminDb.listDatabases()
  })

  it('is CommonJS compatible', () => {
    expect(typeof plugin).toBe('function')
    expect(typeof plugin.database).toBe('function')
    expect(typeof plugin.database.Service).toBe('function')
    expect(typeof plugin.collection).toBe('function')
    expect(typeof plugin.collection.Service).toBe('function')
    expect(typeof plugin.user).toBe('function')
    expect(typeof plugin.user.Service).toBe('function')
  })

  it('registers the plugin', () => {
    expect(() => app.configure(plugin)).not.toThrow()
  })

  it('creates the database service', () => {
    app.use('databases', plugin.database({
      adminDb, client
    }))
    databaseService = app.service('databases')
    expect(databaseService).toBeDefined()
  })

  it('creates a database', async () => {
    await databaseService.create({
      name: 'test-db'
    })
    testDb = client.db('test-db')
    expect(testDb).toBeDefined()
  })

  it('finds databases', async () => {
    const serviceDbs = await databaseService.find({
      query: { $select: ['name', 'collections'] }
    })
    const dbsInfo = await adminDb.listDatabases()
    expect(serviceDbs.length).toBe(dbsInfo.databases.length)
    serviceDbs.forEach(db => expect(db.collections).toBeDefined())
    // Provided by default if no $select
    serviceDbs.forEach(db => expect(db.objects).toBeUndefined())
  })

  it('creates the collection service', () => {
    app.use('collections', plugin.collection({
      db: testDb
    }))
    collectionService = app.service('collections')
    expect(collectionService).toBeDefined()
  })

  it('creates a collection', async () => {
    await collectionService.create({
      name: 'test-collection'
    })
    // Need to use strict mode to ensure the delete operation has been taken into account
    const createdCollection = await testDb.collection('test-collection', { strict: true })
    expect(createdCollection).toBeDefined()
  })

  it('finds collections', async () => {
    const serviceCollections = await collectionService.find({
      query: { $select: ['name', 'count'] }
    })
    const collections = await testDb.collections()
    expect(serviceCollections.length).toBe(collections.length)
    serviceCollections.forEach(collection => expect(collection.count).toBeDefined())
    // Provided by default if no $select
    serviceCollections.forEach(collection => expect(collection.size).toBeUndefined())
  })

  it('removes a collection', async () => {
    await collectionService.remove('test-collection')
    const collections = await testDb.collections()
    expect(collections).not.toContain('test-collection')
  })

  it('creates the user service', () => {
    app.use('users', plugin.user({
      // To test fallback for Mongo <= 2.4
      // hasUserInfosCommand: false,
      db: testDb
    }))
    userService = app.service('users')
    expect(userService).toBeDefined()
  })

  it('creates a user', async () => {
    await userService.create({
      name: 'test-user',
      password: 'test-password',
      roles: ['readWrite']
    })
    const user = await testDb.command({ usersInfo: 'test-user' })
    expect(user).toBeDefined()
  })

  it('finds users', async () => {
    const serviceUsers = await userService.find({
      query: { $select: ['name', 'roles'] }
    })
    const data = await testDb.command({ usersInfo: 1 })
    expect(serviceUsers.length).toBe(data.users.length)
    serviceUsers.forEach(user => expect(user.name).toBeDefined())
    // Provided by default if no $select
    serviceUsers.forEach(user => expect(user.db).toBeUndefined())
  })

  it('removes a user', async () => {
    await userService.remove('test-user')
    try {
      await testDb.command({ usersInfo: 'test-user' })
    } catch (error) {
      expect(error).toBeDefined()
    }
  })

  it('removes a database', async () => {
    await databaseService.remove('test-db')
    const dbsInfo = await adminDb.listDatabases()
    expect(dbsInfo.databases.find(item => item.name === 'test-db')).toBeUndefined()
  })

  // Cleanup
  afterAll(() => {
    client.close()
  })
})
