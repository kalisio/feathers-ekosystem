import { vi, beforeEach, afterEach, beforeAll, afterAll, describe, it, expect } from 'vitest'

// polyfills globaux
global.before = beforeAll
global.after = afterAll
global.beforeEach = beforeEach
global.afterEach = afterEach
global.describe = describe
global.it = it
global.expect = expect

// Mock store partagé
const mockStore = new Map()

// Factory d’instance LocalForage
const createLocalForageInstance = () => ({
  INDEXEDDB: 1,
  WEBSQL: 2,
  LOCALSTORAGE: 3,

  config: vi.fn().mockResolvedValue(undefined),

  setItem: vi.fn((key, value) => {
    mockStore.set(key, value)
    return Promise.resolve(value)
  }),

  getItem: vi.fn((key) => Promise.resolve(mockStore.get(key) || null)),

  removeItem: vi.fn((key) => {
    mockStore.delete(key)
    return Promise.resolve()
  }),

  clear: vi.fn(() => {
    mockStore.clear()
    return Promise.resolve()
  }),

  keys: vi.fn(() => Promise.resolve(Array.from(mockStore.keys())))
})

// Mock module localforage
vi.mock('localforage', () => {
  const mockLocalForage = {
    createInstance: vi.fn(config => createLocalForageInstance(config)),

    // Valeurs statiques si ton code les utilise
    INDEXEDDB: 1,
    WEBSQL: 2,
    LOCALSTORAGE: 3
  }

  return {
    default: mockLocalForage
  }
})

// Global LocalForage (si ton code y accède aussi via global)
global.LocalForage = {
  createInstances: vi.fn(config => createLocalForageInstance(config)),
  INDEXEDDB: 1,
  WEBSQL: 2,
  LOCALSTORAGE: 3
}

// Reset avant/après
beforeEach(() => {
  mockStore.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  mockStore.clear()
  vi.clearAllMocks()
})
