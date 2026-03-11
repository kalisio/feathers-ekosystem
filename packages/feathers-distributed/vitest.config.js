import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: __dirname,
  test: {
    name: 'feathers-distributed',
    environment: 'node',
    globals: true,
    silent: false,
    // beforeAll hook needs a lot of time to setup cote and stuff
    hookTimeout: 30000,
    testTimeout: 30000,
    // Disable parallelism because different test files startup listening servers on same ports
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      all: true,
      clean: true,
      include: ['src/**/*.js'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'test/**',
        '*.config.js'
      ],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage'
    }
  }
})
