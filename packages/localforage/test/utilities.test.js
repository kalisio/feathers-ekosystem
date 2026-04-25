import stringsToDatesTest from './utilities/strings-to-dates-test.js'
import localStorageTest from './utilities/local-storage-test.js'
import { describe } from 'vitest'

describe('Utilities verification', () => {
  stringsToDatesTest()
  localStorageTest()
})
