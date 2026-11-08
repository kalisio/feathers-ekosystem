import { readFileSync } from 'node:fs'
import { builtinModules } from 'node:module'
import { join } from 'node:path'
import { defineConfig } from 'vite'

const escape = (name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function externalizeDependencies () {
  return {
    name: 'externalize-dependencies',
    config (config) {
      const root = config.root ?? process.cwd()
      const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
      const dependencies = [
        ...Object.keys(packageJson.dependencies ?? {}),
        ...Object.keys(packageJson.peerDependencies ?? {})
      ]
      return {
        build: {
          rolldownOptions: {
            external: [
              ...builtinModules,
              /^node:/,
              ...dependencies.map(name => new RegExp(`^${escape(name)}(/.*)?$`))
            ]
          }
        }
      }
    }
  }
}

export const baseConfig = defineConfig({
  plugins: [externalizeDependencies()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: true,
    lib: {
      formats: ['es', 'cjs'],
      fileName: (format, name) => format === 'es' ? `${name}.mjs` : `${name}.cjs`
    }
  }
})