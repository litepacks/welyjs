/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

const isBundle = process.env.WELY_BUILD_MODE === 'bundle'

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    target: ['chrome73', 'firefox101', 'safari16.4', 'edge79'],
    lib: isBundle
      ? {
          entry: resolve(__dirname, 'src/bundle.ts'),
          name: 'Wely',
          fileName: (format) => `wely.bundle.${format}.js`,
        }
      : {
          entry: resolve(__dirname, 'src/runtime/index.ts'),
          name: 'Wely',
          fileName: (format) => `wely.${format}.js`,
        },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
})
