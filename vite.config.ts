/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'
import dts from 'vite-plugin-dts'
const isBundle = process.env.WELY_BUILD_MODE === 'bundle'

export default defineConfig({
  plugins: [
    tailwindcss(),
    !isBundle && dts({ rollupTypes: true, outDir: 'dist', exclude: ['**/__tests__/**', '**/*.test.ts'] }),
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
      output: { compact: true },
    },
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
    include: ['src/**/*.test.ts', 'e2e/**/*.e2e.test.ts'],
  },
})
