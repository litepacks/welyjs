/**
 * Library build config for Wely consumer projects.
 * Used when running `wely build` in a project that has no vite.config.
 * Entry: src/bundle.ts (exports wely API + registers components)
 */
import { defineConfig } from 'vite'
import { join, resolve as pathResolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { welyConsumerResolve } from './src/build/wely-vite-resolve'
import { welyTailwindPlugin } from './src/build/wely-tailwind-plugin'

const root = process.cwd()
const welyPkgDir = dirname(fileURLToPath(import.meta.url))
const isChunks = process.env.WELY_BUILD_MODE === 'chunks'
const outDir = process.env.WELY_OUT_DIR || pathResolve(root, 'dist')
const bundleEntry = process.env.WELY_BUNDLE_ENTRY || pathResolve(root, 'src/bundle.ts')

export default defineConfig({
  root,
  resolve: {
    alias: welyConsumerResolve(root),
  },
  plugins: [welyTailwindPlugin({ root, welyPkgDir }), tailwindcss()],
  build: {
    outDir,
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        ...(isChunks && {
          chunkFileNames: 'chunks/[name].js',
          manualChunks(id) {
            if (id.includes('node_modules/welyjs')) return 'runtime'
            if (id.includes(root) && !id.includes('node_modules')) return 'components'
          },
        }),
      },
    },
    lib: {
      entry: bundleEntry,
      name: 'Wely',
      fileName: (format) => (isChunks ? 'wely.chunked.es' : `wely.bundle.${format}`) + '.js',
      formats: isChunks ? ['es'] : ['es', 'umd'],
    },
  },
})
