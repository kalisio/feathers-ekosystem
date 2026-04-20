import { beforeAll, afterAll } from 'vitest'
import { LocalStorage } from './test/utilities/local-storage.js'

// For mocha @feathersjs/adapter-tests
global.before = beforeAll
global.after = afterAll

global.localStorage = new LocalStorage()
