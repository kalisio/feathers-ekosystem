import { vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

// Pour mocha @feathersjs/adapter-tests
global.before = beforeAll
global.after = afterAll

// Mock store avec Map
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
    INDEXEDDB: 1,
    WEBSQL: 2,
    LOCALSTORAGE: 3
  }

  return {
    default: mockLocalForage
  }
})

global.LocalForage = {
  createInstances: vi.fn(config => createLocalForageInstance(config)),
  INDEXEDDB: 1,
  WEBSQL: 2,
  LOCALSTORAGE: 3
}

// Resets
beforeEach(() => {
  mockStore.clear()
  vi.clearAllMocks()
})

afterEach(() => {
  mockStore.clear()
  vi.clearAllMocks()
})
