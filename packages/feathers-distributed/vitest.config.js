import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig, mergeConfig } from 'vitest/config'
import { baseConfig } from '../../vitest.base-config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default mergeConfig(baseConfig, defineConfig({
  root: __dirname,
  test: {
    name: 'feathers-distributed',
    environment: 'node',
    // beforeAll hook needs a lot of time to setup cote and stuff
    hookTimeout: 30000,
    // testTimeout: 30000,
    // Disable parallelism because tests fail otherwise, not sure exactly why.
    // Different files don't share same server ports, but touching the basePort in cote config seems
    // to break tests in index.test.js ... So currently files share the same cote basePort value.
    fileParallelism: false
  }
}))
