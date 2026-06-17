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
import { welyConsumerResolve } from './src/build/wely-vite-resolve'
import { welyTailwindPlugin, WELY_TAILWIND_VIRTUAL } from './src/build/wely-tailwind-plugin'

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

function readWelyPackageConfig() {
  try {
    return JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8')).wely ?? {}
  } catch {
    return {}
  }
}

function buildComponentExcludeGlobs(base: string) {
  const normalized = '/' + base.replace(/^\/+/, '').replace(/\/+$/, '')
  const defaults = [
    '!' + normalized + '/**/index.ts',
    '!' + normalized + '/**/*.test.ts',
    '!' + normalized + '/**/*.spec.ts',
  ]
  const custom = readWelyPackageConfig().componentExclude
  if (!Array.isArray(custom)) return defaults
  const extra = custom.map((p: unknown) => {
    const s = String(p)
    if (s.startsWith('!')) return s
    return '!' + normalized + '/' + s.replace(/^\//, '')
  })
  return [...defaults, ...extra]
}

const useAutoComponents = process.env.WELY_AUTO_COMPONENTS !== '0'
  && (process.env.WELY_AUTO_COMPONENTS === '1' || readWelyPackageConfig().autoComponents === true)

/** Virtual module that discovers consumer components via glob imports. */
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
  const RESOLVED_COMPONENTS = '\0' + WELY_COMPONENTS_VIRTUAL
  const componentGlobBase = '/' + componentsRelToRoot.replace(/^\/+/, '').replace(/\/+$/, '')
  const excludeGlobs = buildComponentExcludeGlobs(componentsRelToRoot)

  const componentsLoaderJs = useAutoComponents
    ? `
const __welyComponents = import.meta.glob([
  ${JSON.stringify(componentGlobBase + '/**/*.ts')},
  ${excludeGlobs.map((g) => JSON.stringify(g)).join(',\n  ')},
], { eager: true })
void __welyComponents
`
    : `
import ${JSON.stringify(join(root, 'src/bundle.ts'))}
`

  const playgroundJs = `
import ${JSON.stringify(configPathResolved)}
import ${JSON.stringify(WELY_TAILWIND_VIRTUAL)}
import { mountApp } from 'welyjs/playground/app'
await import(${JSON.stringify(WELY_COMPONENTS_VIRTUAL)})
mountApp()
`

  const playgroundHtml = buildPlaygroundHtml(VIRTUAL_ENTRY)

  return {
    name: 'wely-playground',

    resolveId(id) {
      if (id === VIRTUAL_ENTRY || id === '/' + VIRTUAL_ENTRY) return RESOLVED_ENTRY
      if (id === WELY_COMPONENTS_VIRTUAL) return RESOLVED_COMPONENTS
    },

    load(id) {
      if (id === RESOLVED_ENTRY) return playgroundJs
      if (id === RESOLVED_COMPONENTS) return componentsLoaderJs
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
      ...welyConsumerResolve(root),
      /** Vite 7 import-analysis expects an explicit export; point at package source inside welyjs. */
      'welyjs/playground/app': join(pkgDir, 'src/playground/app.ts'),
    },
  },
  plugins: [
    welyPlaygroundPlugin(),
    welyTailwindPlugin({ root, welyPkgDir: pkgDir }),
    tailwindcss(),
  ],
})
