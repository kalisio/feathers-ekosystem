import { describe, it, afterAll as after, expect } from 'vitest'
import { LocalStorage } from './local-storage.js'

const localStorage = new LocalStorage()

describe('LocalStorage test', () => {
  after(() => {
    console.log('\n')
  })

  describe('basic functionality', () => {
    it('attribute length works', () => {
      expect(localStorage.length).toBe(0)
    })

    it('getItem of non-existing item works', () => {
      expect(localStorage.getItem('MyNonExistingItemKey')).toBeNull()
    })

    it('getItem of existing item works', () => {
      localStorage.setItem('TestItem1', 'MyExistingItem1')
      expect(localStorage.getItem('TestItem1')).toBe('MyExistingItem1')
    })

    it('key works', () => {
      localStorage.setItem('TestItem2', 'MyExistingItem2')
      expect(localStorage.key(2)).toBeUndefined()
      expect(localStorage.key(1)).toBe('TestItem2')
      expect(localStorage.key(0)).toBe('TestItem1')
    })

    it('setItem of non-existing item works', () => {
      const oldValue = localStorage.setItem('TestItem3', 'MyExistingItem3')
      expect(localStorage.getItem('TestItem3')).toBe('MyExistingItem3')
      expect(oldValue).toBeNull()
    })

    it('setItem of existing item works', () => {
      const oldValue = localStorage.setItem('TestItem2', 'MyExistingItem2 - with a star!')
      expect(localStorage.getItem('TestItem2')).toBe('MyExistingItem2 - with a star!')
      expect(oldValue).toBe('MyExistingItem2')
    })

    it('removeItem of existing item works', () => {
      const oldValue = localStorage.setItem('TestItem4', 'MyExistingItem4 - to be discarded!')
      expect(localStorage.getItem('TestItem4')).toBe('MyExistingItem4 - to be discarded!')
      expect(oldValue).toBeNull()
      const delValue = localStorage.removeItem('TestItem4')
      expect(delValue).toBe('MyExistingItem4 - to be discarded!')
      expect(localStorage.getItem('TestItem4')).toBeNull()
    })

    it('clear works', () => {
      const oldLength = localStorage.length
      const storage = localStorage.clear()
      const newLength = localStorage.length
      expect(oldLength).toBeGreaterThan(0)
      expect(newLength).toBe(0)
      expect(Object.keys(storage).length).toBe(oldLength)
    })
  })
})
