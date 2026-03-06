/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'

const isBundle = process.env.WELY_BUILD_MODE === 'bundle'
const isChunks = process.env.WELY_BUILD_MODE === 'chunks'
const runDts = !isBundle && !isChunks

export default defineConfig({
  plugins: [
    tailwindcss(),
    runDts && dts({ rollupTypes: true, outDir: 'dist', exclude: ['**/__tests__/**', '**/*.test.ts'] }),
  ].filter(Boolean),
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: { passes: 2, drop_console: false },
      format: { comments: false },
    },
    sourcemap: false,
    rollupOptions: {
      output: {
        compact: true,
        ...(isChunks && {
          chunkFileNames: 'chunks/[name].js',
          manualChunks(id) {
            if (id.includes('node_modules/lit')) return 'vendor'
            if (id.includes('src/runtime') || id.includes('src/styles')) return 'runtime'
            if (id.includes('src/components')) return 'components'
          },
        }),
      },
    },
    lib:
      isBundle || isChunks
        ? {
            entry: resolve(__dirname, 'src/bundle.ts'),
            name: 'Wely',
            fileName: (format) => (isChunks ? 'wely.chunked.es' : `wely.bundle.${format}`) + '.js',
            formats: isChunks ? ['es'] : ['es', 'umd'],
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
    include: ['src/**/*.test.ts', 'e2e/**/*.e2e.test.ts'],
  },
})
