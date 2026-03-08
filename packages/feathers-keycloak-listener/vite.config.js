import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig, mergeConfig } from 'vite'
import { defaultConfig } from '../../vite.config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export default mergeConfig(defaultConfig, defineConfig({
  root: __dirname
}))
