import { vi } from 'vitest'

const mockStore = new Map()

export const createLocalForage = () => ({
  INDEXEDDB: 1,
  WEBSQL: 2,
  LOCALSTORAGE: 3,

  config: vi.fn().mockResolvedValue(undefined),

  setItem: vi.fn((key, value) => {
    mockStore.set(key, value)
    return Promise.resolve(value)
  }),

  getItem: vi.fn((key) => Promise.resolve(mockStore.get(key) ?? null)),

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

export const clearLocalForage = () => {
  mockStore.clear()
}
