import { existsSync } from 'node:fs'
import { join, resolve as pathResolve } from 'node:path'

export function resolveWelyjsAlias(root: string): Record<string, string> {
  const pkgRoot = pathResolve(root, 'node_modules', 'welyjs')
  const distEntry = join(pkgRoot, 'dist', 'wely.es.js')
  const srcEntry = join(pkgRoot, 'src', 'runtime', 'index.ts')
  if (existsSync(srcEntry)) return { welyjs: srcEntry }
  if (existsSync(distEntry)) return { welyjs: distEntry }
  return {}
}
