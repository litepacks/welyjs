/**
 * Default Vitest config for consumer projects that have no `vitest.config.*` or `vite.config.*`.
 * Used by `wely test` so Vitest does not walk up the filesystem and pick a parent folder’s Vite config.
 */
import { defineConfig } from 'vitest/config'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { welyConsumerResolve } from './src/build/wely-vite-resolve'
import { welyTailwindPlugin } from './src/build/wely-tailwind-plugin'

const pkgDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: process.cwd(),
  resolve: {
    alias: {
      'welyjs/test': join(pkgDir, 'src/testing/index.ts'),
      ...welyConsumerResolve(process.cwd()),
    },
  },
  plugins: [welyTailwindPlugin({ root: process.cwd(), welyPkgDir: pkgDir }), tailwindcss()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    passWithNoTests: true,
  },
})
