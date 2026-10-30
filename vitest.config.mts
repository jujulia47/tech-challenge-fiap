import { defineConfig } from 'vitest/config'

// Unit tests for the shared packages. The shell keeps its own
// apps/shell/vitest.config.ts for the Storybook browser tests.
export default defineConfig({
  test: {
    name: 'unit',
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/utils/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
})
