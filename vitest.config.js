import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      all: true,
      clean: true,
      include: ['packages/*/src/**/*.js'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.js'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage'
    }
  }
})
