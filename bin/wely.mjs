#!/usr/bin/env node

import { Command } from 'commander'
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  buildAutoBundleSource,
  getChangedTestPaths,
  runAdd,
  runCi,
  runDoctor,
  runDocsWatch,
  runEmbed,
  shouldAutoComponents,
} from './wely-dx.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = process.cwd()
const WELY_PKG = resolve(__dirname, '..')
const DEFAULT_COMPONENTS_DIR = 'src/wely-components'
const DEFAULT_OUT_DIR = 'dist'

/** Semver range for package.json (same CLI install = same welyjs major/minor line). */
function getWelyjsDependencyRange() {
  try {
    const p = JSON.parse(readFileSync(join(WELY_PKG, 'package.json'), 'utf-8'))
    const v = p.version ?? '0.0.1'
    return `^${v}`
  } catch {
    return '^0.0.1'
  }
}

/** Semver ranges for Vitest + jsdom (same as the welyjs package devDependencies). */
function getVitestDevDependencyRanges() {
  try {
    const p = JSON.parse(readFileSync(join(WELY_PKG, 'package.json'), 'utf-8'))
    const d = p.devDependencies ?? {}
    return {
      vitest: d.vitest ?? '^4.0.0',
      jsdom: d.jsdom ?? '^28.0.0',
      esbuild: d.esbuild ?? '^0.25.0',
    }
  } catch {
    return { vitest: '^4.0.0', jsdom: '^28.0.0', esbuild: '^0.25.0' }
  }
}

function getWelyConfig() {
  try {
    return JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')).wely ?? {}
  } catch {
    return {}
  }
}

function getComponentsDir() {
  const dir = getWelyConfig().componentsDir ?? DEFAULT_COMPONENTS_DIR
  return resolve(ROOT, dir)
}

function getOutDir() {
  const dir = getWelyConfig().outDir ?? DEFAULT_OUT_DIR
  return resolve(ROOT, dir)
}

function getOutDirRel() {
  return relative(ROOT, getOutDir()).replace(/\\/g, '/') || '.'
}

function hasWelyjsRuntimeInstalled() {
  const distEntry = join(ROOT, 'node_modules', 'welyjs', 'dist', 'wely.es.js')
  const srcEntry = join(ROOT, 'node_modules', 'welyjs', 'src', 'runtime', 'index.ts')
  return existsSync(distEntry) || existsSync(srcEntry)
}

/** True if the project has its own Vite config (CLI uses cwd = process.cwd()). */
function hasProjectViteConfig() {
  const names = ['vite.config.ts', 'vite.config.js', 'vite.config.mts', 'vite.config.mjs']
  return names.some((f) => existsSync(join(ROOT, f)))
}

function getPackageDisplayName() {
  try {
    const p = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
    const n = p.name
    if (n && typeof n === 'string') return String(n).replace(/^@[^/]+\//, '')
  } catch {
    /* ignore */
  }
  return 'My App'
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * If docs/index.html is missing, create a minimal GitHub Pages shell (does not overwrite).
 * Returns true if the file was created.
 */
function ensureDocsLandingPage() {
  const docsDir = join(ROOT, 'docs')
  const indexHtml = join(docsDir, 'index.html')
  if (existsSync(indexHtml)) return false
  mkdirSync(docsDir, { recursive: true })
  const rawTitle = getPackageDisplayName()
  const title = escapeHtml(rawTitle)
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 42rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
    code { background: #f4f4f5; padding: 0.1em 0.35em; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Single-page site for GitHub Pages. Edit <code>docs/index.html</code> as you like.</p>
  <p>Run <code>wely page</code> from your project root to refresh <code>docs/assets/wely.bundle.umd.js</code>.</p>
  <script src="./assets/wely.bundle.umd.js"></script>
</body>
</html>
`
  writeFileSync(indexHtml, html)
  return true
}

function getComponentsImportPath() {
  const dir = getComponentsDir()
  const srcDir = join(ROOT, 'src')
  const rel = relative(srcDir, dir).replace(/\\/g, '/')
  return rel.startsWith('..') ? rel : './' + rel
}

function getComponentsDirRel() {
  return relative(ROOT, getComponentsDir()).replace(/\\/g, '/')
}

function createAutoBundleEntryFile() {
  const componentsRel = getComponentsDirRel().replace(/^\/+/, '').replace(/\/+$/, '')
  const tmpDir = mkdtempSync(join(tmpdir(), 'wely-auto-bundle-'))
  const filePath = join(tmpDir, 'auto-bundle.ts')
  writeFileSync(filePath, buildAutoBundleSource(componentsRel, getWelyConfig))
  return filePath
}

function failWithFix(what, fix, cmd) {
  console.error(`\n  ${what}\n`)
  if (fix) console.error(`  How to fix: ${fix}\n`)
  if (cmd) console.error(`  ${cmd}\n`)
  process.exit(1)
}

const dxCtx = () => ({
  root: ROOT,
  getWelyConfig,
  getComponentsDir,
  getOutDir,
  getOutDirRel,
  hasWelyjsRuntimeInstalled,
  hasProjectViteConfig,
  hasProjectVitestOrViteConfig,
  scanComponents,
  runBuild: (o) => build(o),
  buildFn: (o) => build(o),
  testFn: (o) => testCmd(o),
  docsFn: (o) => generateDocs(o),
})

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function build(opts = {}) {
  const isBundle = opts.bundle === true
  const isChunks = opts.chunks === true
  const autoComponents = shouldAutoComponents(opts, getWelyConfig)

  if (hasProjectViteConfig()) {
    if (autoComponents) {
      console.log('  --auto-components is ignored when project vite.config.* exists.\n')
    }
    if (isChunks) {
      console.log('\n  Building (chunked — vendor, runtime, components split)...\n')
      run(getViteCmd('build --emptyOutDir false'), { env: { ...process.env, WELY_BUILD_MODE: 'chunks' } })
    } else if (isBundle) {
      console.log('\n  Building (bundle — runtime + components)...\n')
      run(getViteCmd('build'), { env: { ...process.env, WELY_BUILD_MODE: 'bundle' } })
    } else if (opts.all === true) {
      console.log('\n  Building (all — library + bundle + chunks)...\n')
      run(getViteCmd('build'))
      run(getViteCmd('build --emptyOutDir false'), { env: { ...process.env, WELY_BUILD_MODE: 'bundle' } })
      run(getViteCmd('build --emptyOutDir false'), { env: { ...process.env, WELY_BUILD_MODE: 'chunks' } })
    } else {
      console.log('\n  Building...\n')
      run(getViteCmd('build'))
    }
  } else {
    if (!hasWelyjsRuntimeInstalled()) {
      failWithFix(
        'welyjs runtime could not be resolved from node_modules.',
        'Install dependencies in this project.',
        'npm install && wely build',
      )
    }
    ensureConsumerFiles()
    const autoBundleEntry = autoComponents ? createAutoBundleEntryFile() : undefined
    const buildEnv = {
      ...process.env,
      ...(isChunks && { WELY_BUILD_MODE: 'chunks' }),
      ...(autoComponents && { WELY_BUNDLE_ENTRY: autoBundleEntry }),
      WELY_OUT_DIR: getOutDir(),
      WELY_COMPONENTS_DIR: getComponentsDir(),
    }
    console.log(
      isChunks
        ? '\n  Building chunked bundle (vendor, runtime, components split)...\n'
        : autoComponents
          ? '\n  Building bundle (runtime + auto-discovered components)...\n'
          : '\n  Building bundle (runtime + components)...\n',
    )
    run(getViteCmd(`build --config ${join(WELY_PKG, 'vite.library.config.ts')}`), { env: buildEnv })
  }

  if (opts.json) {
    const outDir = getOutDir()
    const files = existsSync(outDir)
      ? readdirSync(outDir)
          .filter((f) => statSync(join(outDir, f)).isFile())
          .map((f) => {
            const fp = join(outDir, f)
            return { name: f, sizeKb: Number((statSync(fp).size / 1024).toFixed(1)) }
          })
      : []
    console.log(JSON.stringify({ ok: true, outDir: getOutDirRel(), autoComponents, files }, null, 2))
  } else {
    printDist()
  }

  if (opts.export) {
    copyTo(opts.export)
  }
}

function ensureConsumerFiles(opts = {}) {
  const silent = opts.silent === true
  const created = []
  const componentsDir = getComponentsDir()
  const componentsImport = getComponentsImportPath()

  const welyConfigPath = join(ROOT, 'wely.config.ts')
  if (!existsSync(welyConfigPath)) {
    writeFileSync(welyConfigPath, `import { defineConfig } from 'welyjs'

export default defineConfig({
  appName: 'My App',
})
`)
    created.push('wely.config.ts')
  }

  const bundlePath = join(ROOT, 'src', 'bundle.ts')
  if (!existsSync(bundlePath)) {
    mkdirSync(join(ROOT, 'src'), { recursive: true })
    writeFileSync(bundlePath, `/**
 * Bundle entry — exports wely API + registers your components.
 * Built with \`wely build\` to produce a single file you can drop into any page.
 */
export * from 'welyjs'
import '${componentsImport}'
`)
    created.push('src/bundle.ts')
  }

  mkdirSync(componentsDir, { recursive: true })
  const componentsIndexPath = join(componentsDir, 'index.ts')
  if (!existsSync(componentsIndexPath)) {
    writeFileSync(componentsIndexPath, '// no components yet\n')
    created.push(relative(ROOT, componentsDir).replace(/\\/g, '/') + '/index.ts')
  }

  if (created.length > 0 && !silent) {
    console.log('  Created:', created.join(', '), '\n')
  }
  return created
}

function init(opts = {}) {
  const created = []
  const welyRange = getWelyjsDependencyRange()

  const welyConfigPath = join(ROOT, 'wely.config.ts')
  if (!existsSync(welyConfigPath)) {
    const config = `import { defineConfig } from 'welyjs'

export default defineConfig({
  appName: 'My App',
})
`
    writeFileSync(welyConfigPath, config)
    created.push('wely.config.ts')
  }

  const pkgPath = join(ROOT, 'package.json')
  const vitestRanges = getVitestDevDependencyRanges()

  if (!existsSync(pkgPath)) {
    const pkg = {
      name: 'my-wely-app',
      version: '0.0.1',
      type: 'module',
      scripts: { dev: 'wely dev', build: 'wely build', test: 'wely test' },
      dependencies: { welyjs: welyRange },
      devDependencies: { vitest: vitestRanges.vitest, jsdom: vitestRanges.jsdom, esbuild: vitestRanges.esbuild },
      wely: { componentsDir: DEFAULT_COMPONENTS_DIR, autoComponents: true },
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
    created.push('package.json')
  } else {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      pkg.dependencies = pkg.dependencies ?? {}
      pkg.dependencies.welyjs = welyRange
      pkg.scripts = pkg.scripts ?? {}
      pkg.scripts.dev = 'wely dev'
      pkg.scripts.build = 'wely build'
      pkg.scripts.test = pkg.scripts.test ?? 'wely test'
      pkg.devDependencies = pkg.devDependencies ?? {}
      if (!pkg.devDependencies.vitest) pkg.devDependencies.vitest = vitestRanges.vitest
      if (!pkg.devDependencies.jsdom) pkg.devDependencies.jsdom = vitestRanges.jsdom
      if (!pkg.devDependencies.esbuild) pkg.devDependencies.esbuild = vitestRanges.esbuild
      pkg.wely = pkg.wely ?? {}
      if (!pkg.wely.componentsDir) pkg.wely.componentsDir = DEFAULT_COMPONENTS_DIR
      if (pkg.wely.autoComponents === undefined) pkg.wely.autoComponents = true
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
      created.push('package.json')
    } catch (e) {
      console.error(`  Could not read or write package.json: ${e?.message ?? e}\n`)
      process.exit(1)
    }
  }

  created.push(...ensureConsumerFiles({ silent: true }))

  if (created.length > 0) {
    console.log('\n  Created / updated:\n')
    for (const f of created) console.log(`    ${f}`)
    if (opts.install) {
      console.log('\n  Installing dependencies...\n')
      run('npm install', { stdio: 'inherit' })
    } else {
      console.log('\n  Run: npm install\n')
    }
  } else {
    console.log('\n  Project already initialized.\n')
  }
}

function exportCmd(target, opts) {
  if (!target) {
    console.error('  Usage: wely export <target-path> [--no-build] [--clean]\n')
    process.exit(1)
  }

  if (opts.build !== false) {
    console.log('\n  Building wely...\n')
    run(getViteCmd('build'))
  }

  const outDir = getOutDir()
  if (!existsSync(outDir)) {
    console.error(`  ${getOutDirRel()}/ not found. Run "wely build" first.\n`)
    process.exit(1)
  }

  const dest = resolve(process.cwd(), target)

  if (opts.clean && existsSync(dest)) {
    rmSync(dest, { recursive: true })
    console.log(`  Cleaned ${dest}`)
  }

  copyTo(dest)
}

function pageCmd() {
  const docsDir = join(ROOT, 'docs')
  const indexHtml = join(docsDir, 'index.html')
  const distDir = getOutDir()

  if (ensureDocsLandingPage()) {
    console.log('\n  Created docs/index.html (minimal landing page — safe to edit; not overwritten on later runs).\n')
  }

  if (!existsSync(indexHtml)) {
    console.error('  docs/index.html could not be created.\n')
    process.exit(1)
  }

  console.log('\n  Building bundle for docs (cwd: project root)...\n')
  if (hasProjectViteConfig()) {
    run(getViteCmd('build'), { env: { ...process.env, WELY_BUILD_MODE: 'bundle' } })
  } else {
    ensureConsumerFiles()
    const autoComponents = shouldAutoComponents({}, getWelyConfig)
    const autoBundleEntry = autoComponents ? createAutoBundleEntryFile() : undefined
    run(getViteCmd(`build --config ${join(WELY_PKG, 'vite.library.config.ts')}`), {
      env: {
        ...process.env,
        WELY_OUT_DIR: getOutDir(),
        WELY_COMPONENTS_DIR: getComponentsDir(),
        ...(autoBundleEntry && { WELY_BUNDLE_ENTRY: autoBundleEntry }),
      },
    })
  }

  const bundlePath = join(distDir, 'wely.bundle.umd.js')
  if (!existsSync(bundlePath)) {
    console.error(`  ${getOutDirRel()}/wely.bundle.umd.js not found after build.\n`)
    process.exit(1)
  }

  const assetsDir = join(docsDir, 'assets')
  if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true })
  const destBundle = join(assetsDir, 'wely.bundle.umd.js')
  cpSync(bundlePath, destBundle)

  const kb = (statSync(destBundle).size / 1024).toFixed(1)
  console.log(`\n  Updated docs/assets/wely.bundle.umd.js (${kb} kB)`)
  console.log('  docs/index.html left unchanged (single-page site).\n')
  console.log('  Push docs/ and enable Pages (Settings → Pages → Source: /docs)\n')
}

function create(tag, opts) {
  if (!tag) {
    console.error('  Usage: wely create <tag> [--props key:Type,...] [--actions name,...]\n')
    console.error('  Example: wely create w-card --props title:String,count:Number --actions toggle,reset\n')
    process.exit(1)
  }

  if (!tag.includes('-')) {
    console.error(`  Tag "${tag}" must contain a hyphen (e.g. w-${tag})\n`)
    process.exit(1)
  }

  ensureComponentsDir()

  const componentsDir = getComponentsDir()
  const filePath = join(componentsDir, `${tag}.ts`)

  if (existsSync(filePath) && !opts.force) {
    console.error(`  ${tag}.ts already exists. Use --force to overwrite.\n`)
    process.exit(1)
  }

  const propsInput = opts.props ? String(opts.props).split(',') : []
  const actionsInput = opts.actions ? String(opts.actions).split(',') : []

  const source = generateComponent(tag, propsInput, actionsInput)
  writeFileSync(filePath, source)
  const relPath = join(getComponentsDirRel(), `${tag}.ts`)
  console.log(`\n  Created ${relPath}\n`)

  if (opts.test) {
    const testPath = join(componentsDir, `${tag}.test.ts`)
    writeFileSync(testPath, generateComponentTest(tag))
    console.log(`  Created ${join(getComponentsDirRel(), `${tag}.test.ts`)}\n`)
  }

  syncIndex()
}

function sync() {
  ensureComponentsDir()
  const count = syncIndex()
  console.log(`\n  Synced ${count} component(s) → ${getComponentsDirRel()}/index.ts\n`)
}

function list() {
  ensureComponentsDir()
  const tags = scanComponents()

  if (tags.length === 0) {
    console.log(`\n  No components found in ${getComponentsDirRel()}/\n`)
    return
  }

  console.log(`\n  ${tags.length} component(s):\n`)
  for (const tag of tags) {
    const fp = join(getComponentsDir(), `${tag}.ts`)
    const lines = readFileSync(fp, 'utf-8').split('\n').length
    console.log(`    ${tag}  (${lines} lines)`)
  }
  console.log()
}

function generateDocs(opts = {}) {
  ensureComponentsDir()
  const tags = scanComponents()

  if (tags.length === 0) {
    console.log('\n  No components found.\n')
    return
  }

  const outPath = opts.out
    ? resolve(process.cwd(), String(opts.out))
    : join(ROOT, 'COMPONENTS.md')

  const lines = []
  lines.push('# Component Reference')
  lines.push('')
  lines.push(`> Auto-generated by \`wely docs\` — ${new Date().toISOString().slice(0, 10)}`)
  lines.push('')
  lines.push('| Tag | Props | Actions | File |')
  lines.push('|---|---|---|---|')

  const details = []

  for (const tag of tags) {
    const fp = join(getComponentsDir(), `${tag}.ts`)
    const src = readFileSync(fp, 'utf-8')
    const componentProps = parseComponentProps(src)
    const componentActions = parseComponentActions(src)

    const propsStr = componentProps.length > 0 ? componentProps.map(p => `\`${p}\``).join(', ') : '—'
    const actionsStr = componentActions.length > 0 ? componentActions.map(a => `\`${a}\``).join(', ') : '—'

    lines.push(`| \`<${tag}>\` | ${propsStr} | ${actionsStr} | \`src/components/${tag}.ts\` |`)

    details.push('')
    details.push(`## \`<${tag}>\``)
    details.push('')
    details.push(`**File:** \`src/components/${tag}.ts\``)
    details.push('')

    if (componentProps.length > 0) {
      details.push('**Props:**')
      details.push('')
      for (const p of componentProps) {
        const typeMatch = src.match(new RegExp(`${p}:\\s*(\\w+)`))
        const type = typeMatch ? typeMatch[1] : 'String'
        details.push(`- \`${p}\` — \`${type}\``)
      }
      details.push('')
    }

    if (componentActions.length > 0) {
      details.push('**Actions:**')
      details.push('')
      for (const a of componentActions) {
        details.push(`- \`${a}()\``)
      }
      details.push('')
    }

    details.push('**Usage:**')
    details.push('')
    details.push('```html')
    if (componentProps.length > 0) {
      const attrs = componentProps.map(p => `${p}="..."`).join(' ')
      details.push(`<${tag} ${attrs}></${tag}>`)
    } else {
      details.push(`<${tag}></${tag}>`)
    }
    details.push('```')
  }

  lines.push(...details)
  lines.push('')

  writeFileSync(outPath, lines.join('\n'))
  console.log(`\n  Generated docs for ${tags.length} component(s) → ${basename(outPath)}\n`)
}

function docs(opts = {}) {
  if (opts.watch) {
    runDocsWatch(dxCtx(), opts, generateDocs)
    return
  }
  generateDocs(opts)
}

function parseComponentProps(src) {
  const propsMatch = src.match(/props:\s*\{([^}]*)\}/)
  if (!propsMatch) return []
  return [...propsMatch[1].matchAll(/(\w+)\s*:/g)].map(m => m[1])
}

function parseComponentActions(src) {
  const actionsMatch = src.match(/actions:\s*\{([\s\S]*?)\n  \},/)
  if (!actionsMatch) return []
  return [...actionsMatch[1].matchAll(/(\w+)\s*\(ctx\)/g)].map(m => m[1])
}

function setupCmd(opts = {}) {
  init({ install: opts.install !== false && !opts.noInstall })
  ensureComponentsDir()
  if (scanComponents().length === 0) {
    create('w-demo', { props: 'title:String', test: true })
  }
  if (opts.build !== false) {
    build({ autoComponents: shouldAutoComponents(opts, getWelyConfig) })
  }
  console.log('\n  Setup complete! Next steps:\n')
  console.log('    npm run dev     # playground')
  console.log('    npm run build   # production bundle')
  console.log('    npm run test    # component tests\n')
}

function doctorCmd(opts = {}) {
  runDoctor(dxCtx(), opts)
}

function embedCmd(opts = {}) {
  runEmbed(dxCtx(), opts)
}

function addCmd(target) {
  runAdd(target, dxCtx())
}

function ciCmd(opts = {}) {
  runCi(dxCtx(), opts)
}

function dev() {
  if (!hasProjectViteConfig()) {
    if (!hasWelyjsRuntimeInstalled()) {
      failWithFix(
        'welyjs runtime could not be resolved from node_modules.',
        'Install dependencies in this project.',
        'npm install && wely dev',
      )
    }
    ensureConsumerFiles()
    const autoComponents = shouldAutoComponents({}, getWelyConfig)
    console.log('\n  Starting dev server...\n')
    run(getViteCmd(`--config ${join(WELY_PKG, 'vite.dev.config.ts')}`), {
      stdio: 'inherit',
      env: {
        ...process.env,
        WELY_COMPONENTS_DIR: getComponentsDir(),
        WELY_CONFIG_PATH: join(ROOT, 'wely.config.ts'),
        WELY_AUTO_COMPONENTS: autoComponents ? '1' : '0',
      },
    })
  } else {
    console.log('\n  Starting dev server...\n')
    run(getViteCmd(), { stdio: 'inherit' })
  }
}



function hasProjectVitestOrViteConfig() {
  const names = [
    'vitest.config.ts',
    'vitest.config.mts',
    'vitest.config.js',
    'vitest.config.mjs',
    'vite.config.ts',
    'vite.config.js',
    'vite.config.mts',
  ]
  return names.some((f) => existsSync(join(ROOT, f)))
}

function testCmd(opts = {}) {
  if (!hasWelyjsRuntimeInstalled()) {
    failWithFix(
      'welyjs runtime could not be resolved from node_modules.',
      'Install dependencies in this project.',
      'npm install && wely test',
    )
  }
  const isWatch = !opts.run && !opts.changed
  const useConsumerDefaults = !hasProjectVitestOrViteConfig()
  const configArg = useConsumerDefaults ? ` --config ${join(WELY_PKG, 'vitest.consumer.config.ts')}` : ''

  let fileArgs = ''
  if (opts.changed) {
    const paths = getChangedTestPaths(ROOT, scanComponents)
    if (paths.length === 0) {
      console.log('\n  No changed component tests found — running full suite.\n')
    } else {
      console.log(`\n  Running ${paths.length} changed test file(s)...\n`)
      fileArgs = ' ' + paths.map((p) => JSON.stringify(p)).join(' ')
    }
  }

  const cmd = isWatch ? `npx vitest${configArg}${fileArgs}` : `npx vitest run${configArg}${fileArgs}`
  run(cmd, { stdio: 'inherit' })
}

// ---------------------------------------------------------------------------
// Component scaffolding
// ---------------------------------------------------------------------------

function generateComponent(tag, propsInput, actionsInput) {
  const parsedProps = propsInput
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [key, type] = p.split(':')
      return { key: key.trim(), type: (type ?? 'String').trim() }
    })

  const actions = actionsInput.map((a) => a.trim()).filter(Boolean)

  const hasProps = parsedProps.length > 0
  const hasActions = actions.length > 0

  const lines = []

  lines.push(`/**`)
  lines.push(` * <${tag}>`)
  lines.push(` *`)
  if (hasProps) {
    lines.push(` * @prop ${parsedProps.map(p => `{${p.type}} ${p.key}`).join('\n * @prop ')}`)
    lines.push(` *`)
  }
  lines.push(` * @example`)
  if (hasProps) {
    const attrs = parsedProps.map(p => {
      const val = p.type === 'Number' ? '0' : p.type === 'Boolean' ? '' : `"..."`;
      return val ? `${p.key}=${val}` : p.key
    }).join(' ')
    lines.push(` * \`\`\`html`)
    lines.push(` * <${tag} ${attrs}></${tag}>`)
    lines.push(` * \`\`\``)
  } else {
    lines.push(` * \`\`\`html`)
    lines.push(` * <${tag}></${tag}>`)
    lines.push(` * \`\`\``)
  }
  lines.push(` */`)
  lines.push(``)

  const runtimeImport = existsSync(join(ROOT, 'src', 'runtime')) ? "'../runtime'" : "'welyjs'"
  lines.push(`import { defineComponent, html } from ${runtimeImport}`)
  lines.push(``)
  lines.push(`defineComponent({`)
  lines.push(`  // ── Tag ────────────────────────────────────────────────`)
  lines.push(`  tag: '${tag}',`)

  if (hasProps) {
    lines.push(``)
    lines.push(`  // ── Props ───────────────────────────────────────────────`)
    lines.push(`  // Synced from HTML attributes. Available as ctx.props.*`)
    lines.push(`  props: {`)
    for (const { key, type } of parsedProps) {
      lines.push(`    ${key}: ${type},`)
    }
    lines.push(`  },`)
  }

  lines.push(``)
  lines.push(`  // ── State ───────────────────────────────────────────────`)
  lines.push(`  // Reactive — mutations auto-trigger re-render`)
  lines.push(`  state() {`)
  lines.push(`    return {}`)
  lines.push(`  },`)

  lines.push(``)
  lines.push(`  // ── Setup ───────────────────────────────────────────────`)
  lines.push(`  // Runs once on first connect. Initialize state from props here.`)
  lines.push(`  setup(ctx) {`)
  lines.push(`  },`)

  if (hasActions) {
    lines.push(``)
    lines.push(`  // ── Actions ────────────────────────────────────────────`)
    lines.push(`  // Named handlers. Use in templates as ctx.actions.*`)
    lines.push(`  actions: {`)
    for (const name of actions) {
      lines.push(`    ${name}(ctx) {`)
      lines.push(`    },`)
    }
    lines.push(`  },`)
  }

  lines.push(``)
  lines.push(`  // ── Render ──────────────────────────────────────────────`)
  lines.push(`  // Return the template. Tailwind classes work in Shadow DOM.`)
  lines.push(`  render(ctx) {`)
  lines.push(`    return html\``)
  lines.push(`      <div>`)
  lines.push(`        <slot></slot>`)
  lines.push(`      </div>`)
  lines.push(`    \``)
  lines.push(`  },`)
  lines.push(`})`)
  lines.push(``)

  return lines.join('\n')
}

function generateComponentTest(tag) {
  return `import { describe, it, expect, withHost } from 'welyjs/test'
import './${tag}'

describe('${tag}', () => {
  it('renders', async () => {
    await withHost('${tag}', undefined, (host) => {
      expect(host.shadowRoot).toBeTruthy()
    })
  })
})
`
}

// ---------------------------------------------------------------------------
// Component scanning & index sync
// ---------------------------------------------------------------------------

function scanComponents() {
  const dir = getComponentsDir()
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts' && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts'))
    .map((f) => f.replace(/\.ts$/, ''))
    .sort()
}

function syncIndex() {
  const tags = scanComponents()
  const imports = tags.map((t) => `import './${t}'`).join('\n')
  const content = imports ? `${imports}\n` : '// no components yet\n'
  writeFileSync(join(getComponentsDir(), 'index.ts'), content)
  return tags.length
}

function ensureComponentsDir() {
  const dir = getComponentsDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function getViteCmd(subcmd = '') {
  const localVite = join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')
  if (existsSync(localVite)) return `node ${localVite} ${subcmd}`.trim()
  const welyVite = join(WELY_PKG, 'node_modules', 'vite', 'bin', 'vite.js')
  if (existsSync(welyVite)) return `node ${welyVite} ${subcmd}`.trim()
  return `npx vite ${subcmd}`.trim()
}

function run(cmd, opts = {}) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: opts.stdio ?? 'pipe', ...opts })
  } catch (err) {
    if (opts.stdio !== 'inherit') {
      console.error(err.stdout?.toString() ?? '')
      console.error(err.stderr?.toString() ?? '')
    }
    process.exit(err.status ?? 1)
  }
}

function copyTo(dest) {
  const outDir = getOutDir()
  const outRel = getOutDirRel()

  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true })
  }

  let count = 0
  for (const file of readdirSync(outDir)) {
    const src = join(outDir, file)
    const target = join(dest, file)
    if (statSync(src).isFile()) {
      cpSync(src, target)
      count++
      const kb = (statSync(src).size / 1024).toFixed(1)
      console.log(`    ${outRel}/${file}  (${kb} kB)`)
    } else if (statSync(src).isDirectory()) {
      cpSync(src, target, { recursive: true })
      for (const sub of readdirSync(src)) {
        count++
        const subFp = join(src, sub)
        const kb = (statSync(subFp).size / 1024).toFixed(1)
        console.log(`    ${outRel}/${file}/${sub}  (${kb} kB)`)
      }
    }
  }

  console.log(`\n  Exported ${count} file(s) → ${dest}\n`)
}

function printDist() {
  const outDir = getOutDir()
  const outRel = getOutDirRel()
  if (!existsSync(outDir)) return
  console.log('\n  Output:\n')
  for (const file of readdirSync(outDir)) {
    const fp = join(outDir, file)
    if (statSync(fp).isFile()) {
      const kb = (statSync(fp).size / 1024).toFixed(1)
      console.log(`    ${outRel}/${file}  (${kb} kB)`)
    }
  }
  console.log()
}

// ---------------------------------------------------------------------------
// CLI (Commander)
// ---------------------------------------------------------------------------

const pkgJson = JSON.parse(readFileSync(join(WELY_PKG, 'package.json'), 'utf-8'))

const program = new Command()
program
  .name('wely')
  .description('Lightweight Web Component framework CLI')
  .version(pkgJson.version, '-v, --version', 'output the version number')
  .configureHelp({ sortSubcommands: true })
  .showHelpAfterError('(add --help for usage)')
  .addHelpText(
    'after',
    `
Config (package.json → "wely"):
  componentsDir       Component files directory (default: src/wely-components)
  outDir              Build output directory (default: dist)
  autoComponents      Auto-discover components on build/dev (default: true after init)
  componentExclude    Extra glob patterns to skip (e.g. "**/*.stories.ts")

Examples:
  $ wely setup
  $ wely doctor
  $ wely create w-card
  $ wely build
  $ wely embed
  $ wely add react
  $ wely test --changed
  $ wely ci
`,
  )

program.addHelpCommand('help [command]', 'display help for command')

program
  .command('init')
  .description(
    'Scaffold wely.config.ts, package.json (wely dev / wely build / wely test, vitest+jsdom devDeps, ^welyjs from this CLI), src/bundle.ts, and components index',
  )
  .option('--install', 'run npm install after scaffolding')
  .action(init)

program
  .command('create <tag>')
  .description('Scaffold a new component')
  .option('--props <spec>', 'key:Type pairs, comma-separated (e.g. title:String,count:Number)')
  .option('--actions <names>', 'action names, comma-separated (e.g. toggle,reset)')
  .option('--test', 'also scaffold a <tag>.test.ts file')
  .option('--force', 'overwrite existing file')
  .action(create)

program.command('sync').description('Regenerate components index from existing files').action(sync)

program.command('list').description('List registered components').action(list)

program
  .command('doctor')
  .description('Diagnose project setup and suggest fixes')
  .option('--json', 'machine-readable output')
  .action(doctorCmd)

program
  .command('setup')
  .description('One-shot scaffold: init, sample component, optional build')
  .option('--no-build', 'skip initial build')
  .option('--no-install', 'skip npm install during init')
  .action(setupCmd)

program
  .command('docs')
  .description('Generate COMPONENTS.md from component source files')
  .option('--out <path>', 'write to a custom path instead of COMPONENTS.md')
  .option('--watch', 'regenerate docs when components change')
  .action(docs)

program
  .command('embed')
  .description('Generate plain HTML usage scaffold (html-usage/index.html)')
  .option('--out <dir>', 'output directory (default: html-usage)')
  .option('--title <text>', 'page title')
  .action(embedCmd)

program
  .command('add <target>')
  .description('Scaffold framework integration snippet (react, vue)')
  .action(addCmd)

program
  .command('ci')
  .description('Run build + test + docs verification pipeline')
  .option('--json', 'machine-readable output')
  .action(ciCmd)

program
  .command('build')
  .description('Build the library (runtime only by default when using vite.config.ts)')
  .option('--bundle', 'include components in output (runtime + components)')
  .option('--chunks', 'split into vendor, runtime, and components chunks')
  .option('--auto-components', 'auto-discover components from componentsDir instead of src/bundle.ts import chain')
  .option('--no-auto-components', 'disable auto-discovery even when wely.autoComponents is true')
  .option('--all', 'build runtime, bundle, and chunks')
  .option('--export <path>', 'copy build output to destination after build')
  .option('--json', 'machine-readable build summary')
  .action(build)

program
  .command('page')
  .description(
    'Build demo bundle and copy to docs/assets/wely.bundle.umd.js (keeps docs/index.html — GitHub Pages single-page doc)',
  )
  .action(pageCmd)

program
  .command('export <target>')
  .description('build and copy dist output to a target directory')
  .option('--no-build', 'skip build, copy existing dist only')
  .option('--clean', 'remove target directory before copying')
  .action(exportCmd)

program.command('dev').description('Start Vite dev server (playground when no local vite.config)').action(dev)

program
  .command('test')
  .description('Run Vitest (watch mode by default)')
  .option('--run', 'single run, no watch')
  .option('--changed', 'run tests related to git-changed files only')
  .action(testCmd)

if (process.argv.length <= 2) {
  program.outputHelp()
  process.exit(0)
}

program.parse(process.argv)
