/**
 * Library build config for Wely consumer projects.
 * Used when running `wely build` in a project that has no vite.config.
 * Entry: src/bundle.ts (exports wely API + registers components)
 */
import { defineConfig } from 'vite'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

const root = process.cwd()
const isChunks = process.env.WELY_BUILD_MODE === 'chunks'

export default defineConfig({
  root,
  plugins: [tailwindcss()],
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        compact: true,
        ...(isChunks && {
          chunkFileNames: 'chunks/[name].js',
          manualChunks(id) {
            if (id.includes('node_modules/lit')) return 'vendor'
            if (id.includes('node_modules/welyjs')) return 'runtime'
            if (id.includes(root) && !id.includes('node_modules')) return 'components'
          },
        }),
      },
    },
    lib: {
      entry: resolve(root, 'src/bundle.ts'),
      name: 'Wely',
      fileName: (format) => (isChunks ? 'wely.chunked.es' : `wely.bundle.${format}`) + '.js',
      formats: isChunks ? ['es'] : ['es', 'umd'],
    },
  },
})
