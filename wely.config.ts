import { defineConfig } from './src/runtime'

export default defineConfig({
  appName: 'Wely App',
  apiURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  debug: import.meta.env.DEV,
  theme: import.meta.env.VITE_THEME ?? 'light',
})
