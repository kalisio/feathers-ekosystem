import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: __dirname,
  test: {
    name: 'feathers-webpush',
    environment: 'node',
    globals: true,
    silent: false,
    testTimeout: 30000
  }
})
