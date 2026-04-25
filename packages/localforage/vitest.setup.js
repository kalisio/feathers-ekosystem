import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { LocalStorage } from './test/local-storage.js'
import { createLocalForage, clearLocalForage } from './test/local-forage.js'

// For mocha @feathersjs/adapter-tests
global.before = beforeAll
global.after = afterAll

global.localStorage = new LocalStorage()

// Mock localforage
vi.mock('localforage', () => ({
  default: {
    createInstance: vi.fn(() => createLocalForage()),
    INDEXEDDB: 1,
    WEBSQL: 2,
    LOCALSTORAGE: 3
  }
}))

beforeEach(() => {
  clearLocalForage()
  vi.clearAllMocks()
})

afterEach(() => {
  clearLocalForage()
  vi.clearAllMocks()
})
