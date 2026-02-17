import { defineConfig, mergeConfig } from 'vite'
import { defaultConfig } from '../../vite.config'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default mergeConfig(defaultConfig, defineConfig({
  root: __dirname
}))
