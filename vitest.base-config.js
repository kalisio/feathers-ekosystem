export const baseConfig = {
  test: {
    globals: true,
    silent: false,
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      all: true,
      clean: true,
      include: ['src/**/*.js'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'test/**',
        '*.config.js'
      ],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage/'
    }
  }
}
