import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: __dirname,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: true,
    lib: {
      entry: 'src/index.js',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'index.mjs' : 'index.cjs'
    },
    rollupOptions: {
      external: [
        /^node:/,
        /^stream$/, // ✅ built-ins sans préfixe node:
        /^fs$/,
        /^path$/,
        /^os$/,
        /^zlib$/,
        /^events$/,
        /^buffer$/,
        /^util$/,
        /^crypto$/,
        /@feathersjs\//,
        /@kalisio\//,
        'archiver',
        'debug',
        'lodash',
        'mathjs',
        'moment',
        'papaparse',
        'sift'
      ]
    }
  }
})
