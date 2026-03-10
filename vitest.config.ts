import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    globals: true,
    include: [
      'tests/unit/**/*.{test,spec}.{js,ts}',
      'app/**/*.{test,spec}.{js,ts}',
    ],
    exclude: [
      'node_modules',
      '.nuxt',
      'dist',
      '.output',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '.nuxt/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
})
