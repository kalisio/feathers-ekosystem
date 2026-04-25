import { describe, it, afterAll as after, expect } from 'vitest'
import { stringsToDates } from '../src/utils.js'

describe('Utils test', () => {
  after(() => {
    console.log('\n')
  })

  describe('Date conversion not active', () => {
    it('Date string', () => {
      const myTest = '2001-09-11T12:12:11.000Z'
      expect(stringsToDates(false)(myTest)).toBe(myTest)
    })

    it('Date object', () => {
      const myTest = new Date('2001-09-11T12:12:11.000Z')
      expect(stringsToDates(false)(myTest).toISOString()).toBe(myTest.toISOString())
    })

    it('Arbitrary alphanumeric value', () => {
      expect(stringsToDates(false)(5)).toBe(5)
    })

    it('Single element', () => {
      const myTest = { a: 123, b: 'asdf', d: '2001-09-11T12:12:11.000Z' }
      const result = stringsToDates(false)(myTest)
      expect(result.a).toBe(123)
      expect(result.b).toBe('asdf')
      expect(typeof result.d).toBe('string')
    })

    it('Multilevel element', () => {
      const myTest = { a: 123, b: 'asdf', d: '2001-09-11T12:12:11.000Z', e: { f: '2001-09-11T12:12:11.000Z', g: 'hello' } }
      const result = stringsToDates(false)(myTest)
      expect(result.a).toBe(123)
      expect(result.b).toBe('asdf')
      expect(typeof result.d).toBe('string')
      expect(typeof result.e).toBe('object')
      expect(typeof result.e.f).toBe('string')
      expect(result.e.f).toBe(new Date('2001-09-11T12:12:11.000Z').toISOString())
      expect(typeof result.e.g).toBe('string')
    })

    it('Array element', () => {
      const myTest = [{ a: 123, b: 'asdf', d: '2001-09-11T12:12:11.000Z' }]
      const result = stringsToDates(false)(myTest)
      expect(result[0].a).toBe(123)
      expect(result[0].b).toBe('asdf')
      expect(typeof result[0].d).toBe('string')
    })

    it('Result elements', () => {
      const myTest = { skip: 0, limit: 10, total: 1, data: [{ a: 123, b: 'asdf', d: '2001-09-11T12:12:11.000Z' }] }
      const result = stringsToDates(false)(myTest)
      expect(result.data[0].a).toBe(123)
      expect(result.data[0].b).toBe('asdf')
      expect(typeof result.data[0].d).toBe('string')
    })
  })

  describe('Date conversion active', () => {
    it('Date string', () => {
      const myTest = '2001-09-11T12:12:11.000Z'
      expect(stringsToDates(true)(myTest).toISOString()).toBe(new Date(myTest).toISOString())
    })

    it('Date object', () => {
      const myTest = new Date('2001-09-11T12:12:11.000Z')
      expect(stringsToDates(true)(myTest).toISOString()).toBe(myTest.toISOString())
    })

    it('Arbitrary alphanumeric value', () => {
      expect(stringsToDates(true)(5)).toBe(5)
    })

    it('Single element', () => {
      const myTest = { a: 123, b: 'asdf', d: '2001-09-11T12:12:11.000Z' }
      const result = stringsToDates(true)(myTest)
      expect(result.a).toBe(123)
      expect(result.b).toBe('asdf')
      expect(result.d.toISOString()).toBe(new Date('2001-09-11T12:12:11.000Z').toISOString())
    })

    it('Multilevel element', () => {
      const myTest = { a: 123, b: 'asdf', d: '2001-09-11T12:12:11.000Z', e: { f: '2001-09-11T12:12:11.000Z', g: 'hello' } }
      const result = stringsToDates(true)(myTest)
      expect(result.a).toBe(123)
      expect(result.b).toBe('asdf')
      expect(typeof result.d).toBe('object')
      expect(typeof result.e).toBe('object')
      expect(result.e.f.toISOString()).toBe(new Date('2001-09-11T12:12:11.000Z').toISOString())
      expect(typeof result.e.g).toBe('string')
    })

    it('Array element', () => {
      const myTest = [{ a: 123, b: 'asdf', d: '2001-09-11T12:12:11.000Z' }]
      const result = stringsToDates(true)(myTest)
      expect(result[0].a).toBe(123)
      expect(result[0].b).toBe('asdf')
      expect(result[0].d.toISOString()).toBe(new Date('2001-09-11T12:12:11.000Z').toISOString())
    })

    it('Result elements', () => {
      const myTest = { skip: 0, limit: 10, total: 1, data: [{ a: 123, b: 'asdf', d: '2001-09-11T12:12:11.000Z' }] }
      const result = stringsToDates(true)(myTest)
      expect(result.data[0].a).toBe(123)
      expect(result.data[0].b).toBe('asdf')
      expect(result.data[0].d.toISOString()).toBe(new Date('2001-09-11T12:12:11.000Z').toISOString())
    })
  })

  describe('For full coverage', () => {
    it('exercise hasOwnProperty branch', () => {
      const Obj = function () {}
      Obj.prototype.inherited = 'Wauu'
      const myObj = new Obj()
      myObj.ownProperty = 'Hello'
      const result = stringsToDates(true)(myObj)
      expect(result.ownProperty).toBe(myObj.ownProperty)
    })
  })
})
