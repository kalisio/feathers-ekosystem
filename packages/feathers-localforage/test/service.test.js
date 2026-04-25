import { describe, it, beforeEach, afterAll, afterEach, expect } from 'vitest'
import adapterTests from '@feathersjs/adapter-tests'
import errors from '@feathersjs/errors'
import { feathers } from '@feathersjs/feathers'
import { init as service } from '../src/index.js'

const testSuite = adapterTests([
  '.options',
  '.events',
  '._get',
  '._find',
  '._create',
  '._update',
  '._patch',
  '._remove',
  '.get',
  '.get + $select',
  '.get + id + query',
  '.get + NotFound',
  '.get + id + query id',
  '.find',
  '.find + paginate + query',
  '.remove',
  '.remove + $select',
  '.remove + id + query',
  '.remove + multi',
  '.remove + multi no pagination',
  '.remove + id + query id',
  '.remove + NotFound',
  '.update',
  '.update + $select',
  '.update + id + query',
  '.update + NotFound',
  '.update + id + query id',
  '.update + query + NotFound',
  '.patch',
  '.patch + $select',
  '.patch + id + query',
  '.patch multiple',
  '.patch multiple no pagination',
  '.patch multi query same',
  '.patch multi query changed',
  '.patch + query + NotFound',
  '.patch + NotFound',
  '.patch + id + query id',
  '.create',
  '.create ignores query',
  '.create + $select',
  '.create multi',
  'internal .find',
  'internal .get',
  'internal .create',
  'internal .update',
  'internal .patch',
  'internal .remove',
  '.find + equal',
  '.find + equal multiple',
  '.find + $sort',
  '.find + $sort + string',
  '.find + $limit',
  '.find + $limit 0',
  '.find + $skip',
  '.find + $select',
  '.find + $or',
  '.find + $and',
  '.find + $in',
  '.find + $nin',
  '.find + $lt',
  '.find + $lte',
  '.find + $gt',
  '.find + $gte',
  '.find + $ne',
  '.find + $gt + $lt + $sort',
  '.find + $or nested + $sort',
  '.find + $and + $or',
  '.find + paginate',
  '.find + paginate + $limit + $skip',
  '.find + paginate + $limit 0',
  '.find + paginate + params',
  'params.adapter + paginate',
  'params.adapter + multi'
])

describe('Feathers LocalForage Service', () => {
  const events = ['testing']
  const app = feathers()
    .use('/people', service({ events, name: 'test-people-service', storeName: 'test-people-storage', date: false }))
    .use('/people-customid', service({
      id: 'customid', events, name: 'test-people-customid-service', storeName: 'test-people-customid-storage', date: false
    }))

  describe('Specific adapter tests', () => {
    describe('Basic tests', () => {
      afterAll(() => {
        console.log('\n')
      })

      it('is CommonJS compatible', () => {
        expect(typeof service).toBe('function')
      })

      it('throws on name reuse', () => {
        const name = 'test-service-1'
        const storeName = 'test-storage-1'

        expect(() => {
          app.use('service1', service({ name, storeName }))
          app.use('service2', service({ name, storeName }))
        }).toThrow()
      })

      it('accepts name reuse with reuseKeys option set', () => {
        const name = 'test-service-2'
        const storeName = 'test-storage-2'

        expect(() => {
          app.use('service2', service({ name, storeName }))
          app.use('service2-reused', service({ name, storeName, reuseKeys: true }))
        }).not.toThrow()
      })

      it('accepts name reuse with reuseKeys option set + contents', async () => {
        const name = 'test-service-3'
        const storeName = 'test-storage-3'

        app.use('service3', service({ name, storeName }))
        await expect(
          app.service('service3').create({ name: 'Bond', age: 58 })
            .then(() => app.use('service4', service({ name, storeName, reuseKeys: true })))
        ).resolves.not.toThrow()
      })

      it('works with default options', async () => {
        app.use('service4', service())
        const myService = app.service('service4')
        await expect(myService.create({ id: 1, name: 'Bond' })).resolves.toBeTruthy()
      })

      it('special debug (_local)', async () => {
        app.use('service_local', service({ name: 'service_local' }))
        await expect(app.service('service_local').create({ id: 1, name: 'Bond' })).resolves.toBeTruthy()
      })

      it('special debug (_queue)', async () => {
        app.use('service_queue', service({ name: 'service_queue' }))
        await expect(app.service('service_queue').create({ id: 1, name: 'Bond' })).resolves.toBeTruthy()
      })

      it('get unknown id throws', async () => {
        app.use('service5', service({ name: 'service5' }))
        const myService = app.service('service5')
        await myService.create({ id: 1, name: 'Bond' })
        await expect(myService.get(99)).rejects.toThrow()
      })

      it('create with id set', async () => {
        const name = 'test-storage-6'
        app.use('service6', service({ name }))
        const myService = app.service('service6')

        const data = { id: '123', name: 'David', age: 32 }
        const result = await myService.create(data, {})

        expect(result.id).toBe(data.id)
        expect(result.name).toBe(data.name)
        expect(result.age).toBe(data.age)
        await myService.remove(data.id, {})
      })

      it('create by skipping id generation', async () => {
        const name = 'test-storage-7'
        app.use('service7', service({ name }))
        const myService = app.service('service7')

        let data = { name: 'David', age: 32 }
        let result = await myService.create(data, { addId: false })
        expect(result.id).toBe(data.id)
        expect(result.name).toBe(data.name)
        expect(result.age).toBe(data.age)

        result = await myService.get('1')
        expect(result.id).toBe(data.id)
        expect(result.name).toBe(data.name)
        expect(result.age).toBe(data.age)
        await myService.remove('1', {})

        data = { id: '123', name: 'David', age: 32 }
        result = await myService.create(data, { addId: false })
        expect(result.id).toBe(data.id)
        expect(result.name).toBe(data.name)
        expect(result.age).toBe(data.age)

        result = await myService.get(data.id)
        expect(result.id).toBe(data.id)
        expect(result.name).toBe(data.name)
        expect(result.age).toBe(data.age)
        await myService.remove(data.id, {})
      })
    })

    describe('Check driver settings', () => {
      let ix = 0

      afterAll(() => {
        console.log('\n')
      })

      function checkValidDrivers (drivers) {
        return drivers.forEach(driver => checkValidDriver(driver))
      }

      function checkValidDriver (driver) {
        it(`valid driver ${JSON.stringify(driver)} works`, () => {
          expect(() => {
            app.use(`service4-${driver}${++ix}`, service({ name: `service4-${driver}${ix}`, storage: driver }))
            app.service(`service4-${driver}${ix}`).create({ id: 1, name: 'Bond' })
          }).not.toThrow()
        })
      }

      checkValidDrivers([
        'IndexedDB',
        'WebSQL',
        'LocalStorage',
        ['IndexedDB'],
        ['IndexedDB', 'WebSQL'],
        ['IndexedDB', 'WebSQL', 'LocalStorage'],
        ['WebSQL'],
        ['WebSQL', 'LocalStorage'],
        ['WebSQL', 'LocalStorage', 'IndexedDB'],
        ['LocalStorage'],
        ['LocalStorage', 'IndexedDB'],
        ['LocalStorage', 'IndexedDB', 'WebSQL']
      ])

      function checkInvalidDriver (driver) {
        it(`invalid driver '${JSON.stringify(driver)}' aborts`, () => {
          expect(() => {
            app.use(`service4-${driver}${++ix}`, service({ name: `service4-${driver}${ix}`, storage: driver }))
            app.service(`service4-${driver}${ix}`).create({ id: 1, name: 'Bond' })
          }).toThrow(errors.NotAcceptable)
        })
      }

      ['xxS', ['XXS'], ['XXS', 'IndexedDB'], ['IndexedDB', 'XXS']].forEach(d => checkInvalidDriver(d))
    })

    describe('getEntries', () => {
      let myService = null
      const serviceName = 'service6'
      const name = 'test-storage-9'
      let doug = {}
      let idProp = 'unknown??'

      afterAll(() => {
        console.log('\n')
      })

      beforeEach(async () => {
        app.use(serviceName, service({ name, reuseKeys: true }))
        myService = app.service(serviceName)
        idProp = myService.id
        doug = await myService.create({ name: 'Doug', age: 32 })
      })

      afterEach(async () => {
        try {
          await myService.remove(doug[idProp])
        } catch (err) {
          throw new Error(`Unexpectedly failed to remove 'doug'! err=${err.name}, ${err.message} id=${doug[idProp]}, idProp=${idProp}`)
        }
      })

      it('getEntries', async () => {
        const result = await myService.getEntries()
        expect(result.length).toBe(1)
        expect(result[0].name).toBe(doug.name)
        expect(result[0].age).toBe(doug.age)
      })

      it('getEntries + $select', async () => {
        const result = await myService.getEntries({ query: { $select: ['age'] } })
        expect(result.length).toBe(1)
        expect(result[0].name).toBeUndefined()
        expect(result[0].age).toBe(doug.age)
      })
    })

    describe('Types are preserved', () => {
      const serviceName = 'types'
      const bDate = new Date('2001-09-11T09:00:00.000Z')
      let sService = null
      let doug
      const idProp = 'id'
      class TestClass {
        dummy () {}
      }

      afterAll(() => {
        console.log('\n')
      })

      beforeEach(async () => {
        doug = {}
      })

      afterEach(async () => {
        try {
          await sService.remove(doug[idProp])
        } catch (err) {
          throw new Error(`Unexpectedly failed to remove 'doug'! err=${err.name}, ${err.message} id=${doug[idProp]}, idProp=${idProp}`)
        }
      })

      it('types ok (dates set to \'true\')', async () => {
        const app = feathers()
          .use(serviceName, service({ id: idProp, name: serviceName, reuseKeys: true, dates: true }))
        sService = app.service(serviceName)
        doug = await sService.create({
          [idProp]: 0,
          name: 'Doug',
          age: 32,
          birthdate: bDate,
          tc: new TestClass()
        })

        const result = await sService.getEntries()
        expect(typeof result[0].name).toBe('string')
        expect(result[0].name).toBe('Doug')
        expect(typeof result[0].age).toBe('number')
        expect(result[0].age).toBe(32)
        expect(typeof result[0].birthdate).toBe('object')
        expect(result[0].birthdate.toISOString()).toBe(bDate.toISOString())
        expect(result[0].birthdate - bDate).toBe(0)
        expect(JSON.stringify(result[0].tc)).toBe(JSON.stringify(doug.tc))
      })

      it('types ok (dates set to \'false\' (default))', async () => {
        const app = feathers()
          .use(serviceName, service({ id: idProp, name: serviceName, reuseKeys: true }))
        sService = app.service(serviceName)
        const dDate = new Date(bDate.getTime() + 1)
        doug = await sService.create({
          [idProp]: 0,
          name: 'Doug',
          age: 32,
          birthdate: bDate,
          deceased: dDate.toISOString(),
          tc: new TestClass()
        })

        const result = await sService.getEntries()
        expect(typeof result[0].name).toBe('string')
        expect(result[0].name).toBe('Doug')
        expect(typeof result[0].age).toBe('number')
        expect(result[0].age).toBe(32)
        expect(typeof result[0].birthdate).toBe('string')
        expect(result[0].birthdate).toBe(bDate.toISOString())
        expect(new Date(result[0].birthdate) - bDate).toBe(0)
        expect(typeof result[0].deceased).toBe('string')
        expect(new Date(result[0].deceased).toISOString()).toBe(dDate.toISOString())
        expect(new Date(result[0].deceased).getTime() - bDate.getTime()).toBe(1)
        expect(JSON.stringify(result[0].tc)).toBe(JSON.stringify(doug.tc))
      })
    })

    describe('Pre-load data', () => {
      const samples = 5
      let data = {}

      beforeEach(() => {
        data = {}
        for (let i = 0; i < samples; i++) { data[i] = { id: i, age: 10 + i, born: 2011 - i } }
      })

      afterAll(() => {
        console.log('\n')
      })

      it('Pre-loading works', async () => {
        const preLoadService = 'preloadData'
        const app = feathers()
          .use(preLoadService, service({ name: preLoadService, store: data }))
        const myService = app.service(preLoadService)

        const result = await myService.getEntries()
        expect(result.length).toBe(Object.keys(data).length)

        result.forEach((item, ix) => {
          expect(item.id).toBe(data[ix].id)
          expect(item.age).toBe(data[ix].age)
          expect(item.born).toBe(data[ix].born)
        })

        const item = await myService.create({ age: 59, born: 1962 })
        expect(item.id).toBe(5)
        expect(item.age).toBe(59)
        expect(item.born).toBe(1962)
      })
    })
  })

  testSuite(app, errors, 'people')
  testSuite(app, errors, 'people-customid', 'customid')
})
