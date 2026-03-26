/**
 * Dev server config for Wely consumer projects.
 * Used when running `wely dev` in a project that has no vite.config.
 *
 * HTML shell is read from the published `index.html` (same markup as the Wely repo dev server).
 * The virtual entry imports `welyjs/playground/app` so behavior matches `src/playground/main.ts`.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const pkgDir = dirname(fileURLToPath(import.meta.url))

const root = process.cwd()
/** Absolute path to the folder that contains components `index.ts` (from env or default). */
const componentsDirAbs = process.env.WELY_COMPONENTS_DIR
  ? resolve(process.env.WELY_COMPONENTS_DIR)
  : resolve(root, 'src/wely-components')
const componentsRelToRoot = relative(root, componentsDirAbs).replace(/\\/g, '/')
const configPathResolved = process.env.WELY_CONFIG_PATH
  ? resolve(process.env.WELY_CONFIG_PATH)
  : join(root, 'wely.config.ts')

/** Vite cannot reliably resolve `import(absPath)` for consumer dirs; map to the real index module. */
const WELY_COMPONENTS_VIRTUAL = 'virtual:wely-components'

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
import ${JSON.stringify(configPathResolved)}
import '${VIRTUAL_CSS}'
import { mountApp } from 'welyjs/playground/app'
await import(${JSON.stringify(WELY_COMPONENTS_VIRTUAL)})
mountApp()
`

  const playgroundHtml = buildPlaygroundHtml(VIRTUAL_ENTRY)

  const tailwindCss = `@import "tailwindcss";\n@source "${componentsRelToRoot}/**/*.ts";\n`

  return {
    name: 'wely-playground',

    resolveId(id) {
      if (id === VIRTUAL_ENTRY || id === '/' + VIRTUAL_ENTRY) return RESOLVED_ENTRY
      if (id === VIRTUAL_CSS) return RESOLVED_CSS
      if (id === WELY_COMPONENTS_VIRTUAL) return join(componentsDirAbs, 'index.ts')
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
