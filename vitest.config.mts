import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Unit tests for the shared packages. The shell keeps its own
// apps/shell/vitest.config.ts for the Storybook browser tests.
export default defineConfig({
  resolve: {
    alias: {
      // server-only throws outside a React Server build, and the tests run in plain Node. Here it is
      // the empty module it already is on the server: docs/fase4/security.md, "Server-only entries"
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: {
    name: 'unit',
    environment: 'node',
    include: ['packages/**/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'json-summary'],
    },
  },
})
