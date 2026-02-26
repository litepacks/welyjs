/**
 * Dev server config for Wely consumer projects.
 * Used when running `wely dev` in a project that has no vite.config.
 */
import { defineConfig } from 'vite'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

const root = process.cwd()

export default defineConfig({
  root,
  plugins: [tailwindcss()],
})
