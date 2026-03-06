#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = process.cwd()
const WELY_PKG = resolve(fileURLToPath(import.meta.url), '..', '..')
const DIST = join(ROOT, 'dist')
const COMPONENTS_DIR = join(ROOT, 'src', 'components')

const [, , command, ...args] = process.argv

const commands = {
  init,
  build,
  export: exportCmd,
  page: pageCmd,
  create,
  sync,
  list,
  docs,
  dev,
  test: testCmd,
  help,
}

const handler = commands[command]
if (!handler) {
  if (command) console.error(`Unknown command: ${command}\n`)
  help()
  process.exit(command ? 1 : 0)
}

handler()

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function build() {
  const flags = parseFlags(args)
  const isBundle = flags.bundle === true
  const hasViteConfig = existsSync(join(ROOT, 'vite.config.ts')) || existsSync(join(ROOT, 'vite.config.js'))

  if (hasViteConfig) {
    if (isBundle) {
      console.log('\n  Building (bundle — runtime + components)...\n')
      run(getViteCmd('build'), { env: { ...process.env, WELY_BUILD_MODE: 'bundle' } })
    } else if (flags.all === true) {
      console.log('\n  Building (all — library + bundle)...\n')
      run(getViteCmd('build'))
      run(getViteCmd('build --emptyOutDir false'), { env: { ...process.env, WELY_BUILD_MODE: 'bundle' } })
    } else {
      console.log('\n  Building...\n')
      run(getViteCmd('build'))
    }
  } else {
    ensureConsumerFiles()
    console.log('\n  Building bundle (runtime + components)...\n')
    run(getViteCmd(`build --config ${join(WELY_PKG, 'vite.library.config.ts')}`))
  }

  printDist()

  if (flags.export) {
    copyTo(flags.export)
  }
}

function ensureConsumerFiles() {
  const created = []

  const bundlePath = join(ROOT, 'src', 'bundle.ts')
  if (!existsSync(bundlePath)) {
    mkdirSync(join(ROOT, 'src'), { recursive: true })
    writeFileSync(bundlePath, `/**
 * Bundle entry — exports wely API + registers your components.
 * Built with \`wely build\` to produce a single file you can drop into any page.
 */
export * from 'welyjs'
import './components'
`)
    created.push('src/bundle.ts')
  }

  mkdirSync(join(ROOT, 'src', 'components'), { recursive: true })
  const componentsIndexPath = join(ROOT, 'src', 'components', 'index.ts')
  if (!existsSync(componentsIndexPath)) {
    writeFileSync(componentsIndexPath, '// no components yet\n')
    created.push('src/components/index.ts')
  }

  if (created.length > 0) {
    console.log('  Created:', created.join(', '), '\n')
  }
}

function init() {
  const created = []

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
  if (!existsSync(pkgPath)) {
    const pkg = {
      name: 'my-wely-app',
      version: '0.0.1',
      type: 'module',
      scripts: { dev: 'vite', build: 'vite build' },
      dependencies: { welyjs: '^0.0.2' },
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
    created.push('package.json')
  } else {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      if (!pkg.dependencies?.welyjs) {
        pkg.dependencies = pkg.dependencies ?? {}
        pkg.dependencies.welyjs = pkg.dependencies.welyjs ?? '^0.0.2'
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
        created.push('package.json (added welyjs)')
      }
    } catch (_) {}
  }

  if (created.length > 0) {
    console.log('\n  Created:\n')
    for (const f of created) console.log(`    ${f}`)
    console.log('\n  Run: npm install\n')
  } else {
    console.log('\n  Project already initialized.\n')
  }
}

function exportCmd() {
  const flags = parseFlags(args)
  const target = args.find((a) => !a.startsWith('-'))

  if (!target) {
    console.error('  Usage: wely export <target-path> [--no-build] [--clean]\n')
    process.exit(1)
  }

  if (!flags['no-build']) {
    console.log('\n  Building wely...\n')
    run(getViteCmd('build'))
  }

  if (!existsSync(DIST)) {
    console.error('  dist/ not found. Run "wely build" first.\n')
    process.exit(1)
  }

  const dest = resolve(process.cwd(), target)

  if (flags.clean && existsSync(dest)) {
    rmSync(dest, { recursive: true })
    console.log(`  Cleaned ${dest}`)
  }

  copyTo(dest)
}

function pageCmd() {
  const pageDir = join(ROOT, 'page')
  const docsDir = join(ROOT, 'docs')
  const distDir = join(ROOT, 'dist')

  if (!existsSync(pageDir)) {
    console.error('  page/ not found.\n')
    process.exit(1)
  }

  console.log('\n  Building bundle for demo...\n')
  run(getViteCmd('build'), { env: { ...process.env, WELY_BUILD_MODE: 'bundle' } })

  console.log('  Copying page/ → docs/ for GitHub Pages...\n')

  if (existsSync(docsDir)) rmSync(docsDir, { recursive: true })
  cpSync(pageDir, docsDir, { recursive: true })

  const assetsDir = join(docsDir, 'assets')
  if (!existsSync(assetsDir)) mkdirSync(assetsDir, { recursive: true })
  const bundlePath = join(distDir, 'wely.bundle.umd.js')
  if (existsSync(bundlePath)) {
    cpSync(bundlePath, join(assetsDir, 'wely.bundle.umd.js'))
  }

  const files = readdirSync(docsDir)
  for (const f of files) {
    const fp = join(docsDir, f)
    if (statSync(fp).isFile()) {
      const kb = (statSync(fp).size / 1024).toFixed(1)
      console.log(`    docs/${f}  (${kb} kB)`)
    }
  }
  if (existsSync(assetsDir)) {
    for (const f of readdirSync(assetsDir)) {
      const fp = join(assetsDir, f)
      if (statSync(fp).isFile()) {
        const kb = (statSync(fp).size / 1024).toFixed(1)
        console.log(`    docs/assets/${f}  (${kb} kB)`)
      }
    }
  }
  console.log('\n  Push docs/ and enable Pages (Settings → Pages → Source: /docs)\n')
}

function create() {
  const tag = args.find((a) => !a.startsWith('-'))
  const flags = parseFlags(args)

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

  const filePath = join(COMPONENTS_DIR, `${tag}.ts`)

  if (existsSync(filePath) && !flags.force) {
    console.error(`  ${tag}.ts already exists. Use --force to overwrite.\n`)
    process.exit(1)
  }

  const propsInput = flags.props ? String(flags.props).split(',') : []
  const actionsInput = flags.actions ? String(flags.actions).split(',') : []

  const source = generateComponent(tag, propsInput, actionsInput)
  writeFileSync(filePath, source)
  console.log(`\n  Created src/components/${tag}.ts\n`)

  syncIndex()
}

function sync() {
  ensureComponentsDir()
  const count = syncIndex()
  console.log(`\n  Synced ${count} component(s) → src/components/index.ts\n`)
}

function list() {
  ensureComponentsDir()
  const tags = scanComponents()

  if (tags.length === 0) {
    console.log('\n  No components found in src/components/\n')
    return
  }

  console.log(`\n  ${tags.length} component(s):\n`)
  for (const tag of tags) {
    const fp = join(COMPONENTS_DIR, `${tag}.ts`)
    const lines = readFileSync(fp, 'utf-8').split('\n').length
    console.log(`    ${tag}  (${lines} lines)`)
  }
  console.log()
}

function docs() {
  ensureComponentsDir()
  const tags = scanComponents()

  if (tags.length === 0) {
    console.log('\n  No components found.\n')
    return
  }

  const flags = parseFlags(args)
  const outPath = flags.out
    ? resolve(process.cwd(), String(flags.out))
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
    const fp = join(COMPONENTS_DIR, `${tag}.ts`)
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

function dev() {
  const hasViteConfig = existsSync(join(ROOT, 'vite.config.ts')) || existsSync(join(ROOT, 'vite.config.js'))
  if (!hasViteConfig) {
    ensureConsumerFiles()
    ensureDevFiles()
    console.log('\n  Starting dev server...\n')
    run(getViteCmd(`--config ${join(WELY_PKG, 'vite.dev.config.ts')}`), { stdio: 'inherit' })
  } else {
    console.log('\n  Starting dev server...\n')
    run(getViteCmd(), { stdio: 'inherit' })
  }
}

function ensureDevFiles() {
  const created = []
  if (!existsSync(join(ROOT, 'index.html'))) {
    writeFileSync(join(ROOT, 'index.html'), `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wely Playground</title>
  <link rel="stylesheet" href="/src/styles/tailwind.css" />
</head>
<body class="bg-zinc-50 text-zinc-900 antialiased p-8">
  <h1 class="text-2xl font-bold mb-6">Wely <span class="font-light text-zinc-400">playground</span></h1>
  <div id="app"></div>
  <script type="module" src="/src/playground/main.ts"></script>
</body>
</html>
`)
    created.push('index.html')
  }
  if (!existsSync(join(ROOT, 'src', 'playground', 'main.ts'))) {
    mkdirSync(join(ROOT, 'src', 'playground'), { recursive: true })
    writeFileSync(join(ROOT, 'src', 'playground', 'main.ts'), `import '../../wely.config'
import '../components'
console.log('[wely] Playground loaded')
`)
    created.push('src/playground/main.ts')
  }
  if (!existsSync(join(ROOT, 'src', 'styles', 'tailwind.css'))) {
    mkdirSync(join(ROOT, 'src', 'styles'), { recursive: true })
    writeFileSync(join(ROOT, 'src', 'styles', 'tailwind.css'), `@import "tailwindcss";
@source "../components/**/*.ts";
@source "../**/*.html";
`)
    created.push('src/styles/tailwind.css')
  }
  if (created.length > 0) console.log('  Created:', created.join(', '), '\n')
}

function testCmd() {
  const isWatch = !args.includes('--run')
  if (isWatch) {
    run('npx vitest', { stdio: 'inherit' })
  } else {
    run('npx vitest run', { stdio: 'inherit' })
  }
}

function help() {
  console.log(`
  wely — Lightweight Web Component Framework CLI

  Usage:
    wely <command> [options]

  Commands:
    init                          Create wely.config.ts and add wely to package.json
    create <tag>                 Scaffold a new component
      --props key:Type,...       Add props (e.g. title:String,count:Number)
      --actions name,...         Add actions (e.g. toggle,reset)
      --force                   Overwrite if file exists

    sync                         Regenerate src/components/index.ts from existing files
    list                         List all registered components
    docs                         Generate COMPONENTS.md from component source files
      --out <path>               Write to a custom path instead of COMPONENTS.md

    build                        Build the library (runtime only by default)
      --bundle                   Include components in output (runtime + components)
      --all                      Build both library and bundle
      --export <path>            Also copy output to <path> after building

    page                         Build static page for GitHub Pages → docs/

    export <path>                Build and copy dist/ to <path>
      --no-build                 Skip build, copy existing dist/ only
      --clean                    Remove target directory before copying

    dev                          Start Vite dev server with playground
    test                         Run Vitest in watch mode
      --run                      Single run (no watch)

    help                         Show this message

  Examples:
    wely init
    wely create w-card
    wely create w-user-list --props name:String,age:Number --actions refresh
    wely sync
    wely list
    wely build
    wely export ../my-app/public/vendor/wely
`)
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

// ---------------------------------------------------------------------------
// Component scanning & index sync
// ---------------------------------------------------------------------------

function scanComponents() {
  if (!existsSync(COMPONENTS_DIR)) return []
  return readdirSync(COMPONENTS_DIR)
    .filter((f) => f.endsWith('.ts') && f !== 'index.ts' && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts'))
    .map((f) => f.replace(/\.ts$/, ''))
    .sort()
}

function syncIndex() {
  const tags = scanComponents()
  const imports = tags.map((t) => `import './${t}'`).join('\n')
  const content = imports ? `${imports}\n` : '// no components yet\n'
  writeFileSync(join(COMPONENTS_DIR, 'index.ts'), content)
  return tags.length
}

function ensureComponentsDir() {
  if (!existsSync(COMPONENTS_DIR)) {
    mkdirSync(COMPONENTS_DIR, { recursive: true })
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

function parseFlags(argv) {
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('-')) {
        flags[key] = next
        i++
      } else {
        flags[key] = true
      }
    }
  }
  return flags
}

function copyTo(dest) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true })
  }

  let count = 0
  for (const file of readdirSync(DIST)) {
    const src = join(DIST, file)
    const target = join(dest, file)
    if (statSync(src).isFile()) {
      cpSync(src, target)
      count++
      const kb = (statSync(src).size / 1024).toFixed(1)
      console.log(`    dist/${file}  (${kb} kB)`)
    } else if (statSync(src).isDirectory()) {
      cpSync(src, target, { recursive: true })
      for (const sub of readdirSync(src)) {
        count++
        const subFp = join(src, sub)
        const kb = (statSync(subFp).size / 1024).toFixed(1)
        console.log(`    dist/${file}/${sub}  (${kb} kB)`)
      }
    }
  }

  console.log(`\n  Exported ${count} file(s) → ${dest}\n`)
}

function printDist() {
  if (!existsSync(DIST)) return
  console.log('\n  Output:\n')
  for (const file of readdirSync(DIST)) {
    const fp = join(DIST, file)
    if (statSync(fp).isFile()) {
      const kb = (statSync(fp).size / 1024).toFixed(1)
      console.log(`    dist/${file}  (${kb} kB)`)
    }
  }
  console.log()
}
