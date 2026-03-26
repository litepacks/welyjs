/**
 * Default Vitest config for consumer projects that have no `vitest.config.*` or `vite.config.*`.
 * Used by `wely test` so Vitest does not walk up the filesystem and pick a parent folder’s Vite config.
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: process.cwd(),
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    passWithNoTests: true,
  },
})
