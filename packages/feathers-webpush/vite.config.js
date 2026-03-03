import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: true,
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
        /^node:/,
        /@feathersjs\//,
        'lodash',
        'web-push'
      ]
    }
  }
})
