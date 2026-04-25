import { fileURLToPath } from 'node:url'
import { builtinModules } from 'node:module'
import path from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import { baseConfig } from '../../vite.base-config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default mergeConfig(baseConfig, defineConfig({
  root: __dirname,
  build: {
    lib: {
      entry: {
        server: path.resolve(__dirname, 'src/server/index.js'),
        client: path.resolve(__dirname, 'src/client/index.js')
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) =>
        format === 'es' ? `${entryName}.mjs` : `${entryName}.cjs`
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map(m => `node:${m}`),
        /@feathersjs\//,
        /^@aws-sdk\/.*/,
        'lodash',
        'moment'
      ]
    }
  }
}))
