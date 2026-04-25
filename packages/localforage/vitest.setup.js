import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { LocalStorage } from './test/utilities/local-storage.js'
import { createLocalForageInstance, clearLocalForageMock } from './test/utilities/local-forage.js'

// For mocha @feathersjs/adapter-tests
global.before = beforeAll
global.after = afterAll

global.localStorage = new LocalStorage()

// Mock localforage
vi.mock('localforage', () => ({
  default: {
    createInstance: vi.fn(() => createLocalForageInstance()),
    INDEXEDDB: 1,
    WEBSQL: 2,
    LOCALSTORAGE: 3
  }
}))

beforeEach(() => {
  clearLocalForageMock()
  vi.clearAllMocks()
})

afterEach(() => {
  clearLocalForageMock()
  vi.clearAllMocks()
})
