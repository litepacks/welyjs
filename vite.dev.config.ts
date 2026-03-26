/**
 * Dev server config for Wely consumer projects.
 * Used when running `wely dev` in a project that has no vite.config.
 *
 * HTML shell is read from the published `index.html` (same markup as the Wely repo dev server).
 * The virtual entry imports `welyjs/playground/app` so behavior matches `src/playground/main.ts`.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const pkgDir = dirname(fileURLToPath(import.meta.url))

const root = process.cwd()
const componentsDir = (process.env.WELY_COMPONENTS_DIR || '').replace(/\\/g, '/')
const configPath = (process.env.WELY_CONFIG_PATH || '').replace(/\\/g, '/')

function buildPlaygroundHtml(virtualEntry: string): string {
  const raw = readFileSync(join(pkgDir, 'index.html'), 'utf-8')
  return raw
    .replace(/\s*<link rel="stylesheet" href="\/src\/styles\/tailwind\.css" \/>\s*\n?/g, '\n')
    .replace(/<script type="module" src="[^"]*"><\/script>/, `<script type="module" src="/${virtualEntry}"></script>`)
}

function welyPlaygroundPlugin() {
  const VIRTUAL_ENTRY = 'virtual:wely-playground'
  const RESOLVED_ENTRY = '\0' + VIRTUAL_ENTRY
  const VIRTUAL_CSS = 'virtual:wely-dev.css'
  const RESOLVED_CSS = '\0' + VIRTUAL_CSS

  const playgroundJs = `
import '${configPath}'
import '${VIRTUAL_CSS}'
import { mountApp } from 'welyjs/playground/app'
await import('${componentsDir}')
mountApp()
`

  const playgroundHtml = buildPlaygroundHtml(VIRTUAL_ENTRY)

  const tailwindCss = `@import "tailwindcss";\n@source "${componentsDir}/**/*.ts";\n`

  return {
    name: 'wely-playground',

    resolveId(id) {
      if (id === VIRTUAL_ENTRY || id === '/' + VIRTUAL_ENTRY) return RESOLVED_ENTRY
      if (id === VIRTUAL_CSS) return RESOLVED_CSS
    },

    load(id) {
      if (id === RESOLVED_ENTRY) return playgroundJs
      if (id === RESOLVED_CSS) return tailwindCss
    },

    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url?.split('?')[0]
          if (url === '/' || url === '/index.html') {
            const transformed = await server.transformIndexHtml('/', playgroundHtml)
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html')
            res.end(transformed)
            return
          }
          next()
        })
      }
    },
  }
}

export default defineConfig({
  root,
  resolve: {
    alias: {
      /** Vite 7 import-analysis expects an explicit export; point at package source inside welyjs. */
      'welyjs/playground/app': join(pkgDir, 'src/playground/app.ts'),
    },
  },
  plugins: [
    welyPlaygroundPlugin(),
    tailwindcss(),
  ],
})
