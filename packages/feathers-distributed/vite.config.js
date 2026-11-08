import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import { baseConfig } from '../../vite.base-config.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default mergeConfig(baseConfig, defineConfig({
  root: __dirname,
  build: {
    lib: {
      entry: 'src/index.js'
    },
    rolldownOptions: {
      output: {
        // The entry mixes default and named exports: CJS consumers get the
        // default export through require(...).default
        exports: 'named'
      }
    }
  }
}))
