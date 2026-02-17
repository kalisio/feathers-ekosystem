import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/test/**/*.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      all: true,
      clean: true,
      include: ['packages/*/src/**/*.js']
    },
    silent: false,
    testTimeout: 30000,
    projects: [
      {
        test: {
          name: 'feathers-keycloak-listener',
          root: 'packages/feathers-keycloak-listener',
          include: ['test/**/*.test.js']
        }
      }
    ]
  }
})
