/**
 * Library build config for Wely consumer projects.
 * Used when running `wely build` in a project that has no vite.config.
 * Entry: src/bundle.ts (exports wely API + registers components)
 */
import { defineConfig } from 'vite'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

const root = process.cwd()

export default defineConfig({
  root,
  plugins: [tailwindcss()],
  build: {
    target: ['chrome73', 'firefox101', 'safari16.4', 'edge79'],
    lib: {
      entry: resolve(root, 'src/bundle.ts'),
      name: 'Wely',
      fileName: (format) => `wely.bundle.${format}.js`,
    },
  },
})
