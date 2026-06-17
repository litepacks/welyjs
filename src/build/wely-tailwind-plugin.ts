/**
 * Vite plugin: Tailwind CSS scoped to project components at build/dev time.
 * Used by shared-styles.ts via `virtual:wely-tailwind.css?inline`.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

export const WELY_TAILWIND_VIRTUAL = 'virtual:wely-tailwind.css'
export const WELY_TAILWIND_RESOLVED = '\0' + WELY_TAILWIND_VIRTUAL

const DEFAULT_COMPONENTS_DIR = 'src/wely-components'

function resolveTailwindId(id: string): string | undefined {
  if (id === WELY_TAILWIND_VIRTUAL) return WELY_TAILWIND_RESOLVED
  if (id.startsWith(`${WELY_TAILWIND_VIRTUAL}?`)) {
    return WELY_TAILWIND_RESOLVED + id.slice(WELY_TAILWIND_VIRTUAL.length)
  }
}

export function getComponentsDirAbs(root: string, envDir?: string): string {
  if (envDir) return resolve(root, envDir)
  if (process.env.WELY_COMPONENTS_DIR) return resolve(root, process.env.WELY_COMPONENTS_DIR)
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'))
    const dir = pkg.wely?.componentsDir ?? DEFAULT_COMPONENTS_DIR
    return resolve(root, dir)
  } catch {
    return resolve(root, DEFAULT_COMPONENTS_DIR)
  }
}

export function resolveTailwindImport(welyPkgDir: string): string {
  try {
    const req = createRequire(join(welyPkgDir, 'package.json'))
    const cssPath = req.resolve('tailwindcss/index.css').replace(/\\/g, '/')
    return `@import "${cssPath}";`
  } catch {
    return '@import "tailwindcss";'
  }
}

export function buildTailwindCssSource(
  sourceGlobs: string[],
  empty = false,
  tailwindImport = '@import "tailwindcss";',
): string {
  if (empty) return '/* wely: runtime-only — tailwind injected on consumer build/dev */\n'
  const lines = [tailwindImport]
  for (const glob of sourceGlobs) {
    const g = glob.replace(/\\/g, '/')
    lines.push(`@source "${g}";`)
  }
  return lines.join('\n') + '\n'
}

export type WelyTailwindPluginOptions = {
  root: string
  /** welyjs package root — used to resolve tailwindcss when the consumer project has no local install. */
  welyPkgDir?: string
  /** Extra @source globs relative to root (in addition to componentsDir). */
  extraSources?: string[]
  /** No utilities — for npm runtime-only builds. */
  empty?: boolean
}

export function welyTailwindPlugin(options: WelyTailwindPluginOptions) {
  const componentsDirAbs = getComponentsDirAbs(options.root)
  const componentsRel = relative(options.root, componentsDirAbs).replace(/\\/g, '/')
  const sources = options.empty
    ? []
    : [`${componentsRel}/**/*.ts`, ...(options.extraSources ?? [])]
  const tailwindImport = options.welyPkgDir ? resolveTailwindImport(options.welyPkgDir) : '@import "tailwindcss";'
  const cssSource = buildTailwindCssSource(sources, options.empty, tailwindImport)

  return {
    name: 'wely-tailwind',

    resolveId(id: string) {
      return resolveTailwindId(id)
    },

    load(id: string) {
      if (id === WELY_TAILWIND_RESOLVED || id.startsWith(`${WELY_TAILWIND_RESOLVED}?`)) {
        return cssSource
      }
    },
  }
}
