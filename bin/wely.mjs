#!/usr/bin/env node

import { Command } from 'commander'
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = process.cwd()
const WELY_PKG = resolve(__dirname, '..')
const DEFAULT_COMPONENTS_DIR = 'src/wely-components'
const DEFAULT_OUT_DIR = 'dist'

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

function getComponentsImportPath() {
  const dir = getComponentsDir()
  const srcDir = join(ROOT, 'src')
  const rel = relative(srcDir, dir).replace(/\\/g, '/')
  return rel.startsWith('..') ? rel : './' + rel
}

function getComponentsDirRel() {
  return relative(ROOT, getComponentsDir()).replace(/\\/g, '/')
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function build(opts = {}) {
  const isBundle = opts.bundle === true
  const isChunks = opts.chunks === true
  const hasViteConfig = existsSync(join(ROOT, 'vite.config.ts')) || existsSync(join(ROOT, 'vite.config.js'))

  if (hasViteConfig) {
    if (isChunks) {
      console.log('\n  Building (chunked — vendor, runtime, components split)...\n')
      run(getViteCmd('build --emptyOutDir false'), { env: { ...process.env, WELY_BUILD_MODE: 'chunks' } })
    } else if (isBundle) {
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
    const buildEnv = {
      ...process.env,
      ...(isChunks && { WELY_BUILD_MODE: 'chunks' }),
      WELY_OUT_DIR: getOutDir(),
    }
    console.log(isChunks ? '\n  Building chunked bundle (vendor, runtime, components split)...\n' : '\n  Building bundle (runtime + components)...\n')
    run(getViteCmd(`build --config ${join(WELY_PKG, 'vite.library.config.ts')}`), { env: buildEnv })
  }

  printDist()

  if (opts.export) {
    copyTo(opts.export)
  }
}

function ensureConsumerFiles() {
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
      wely: { componentsDir: DEFAULT_COMPONENTS_DIR },
    }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
    created.push('package.json')
  } else {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      let changed = false
      if (!pkg.dependencies?.welyjs) {
        pkg.dependencies = pkg.dependencies ?? {}
        pkg.dependencies.welyjs = pkg.dependencies.welyjs ?? '^0.0.2'
        changed = true
      }
      if (!pkg.wely?.componentsDir) {
        pkg.wely = pkg.wely ?? {}
        pkg.wely.componentsDir = DEFAULT_COMPONENTS_DIR
        changed = true
      }
      if (changed) {
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
        created.push('package.json')
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
  const pageDir = join(ROOT, 'page')
  const docsDir = join(ROOT, 'docs')
  const distDir = getOutDir()

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
    const fp = join(getComponentsDir(), `${tag}.ts`)
    const lines = readFileSync(fp, 'utf-8').split('\n').length
    console.log(`    ${tag}  (${lines} lines)`)
  }
  console.log()
}

function docs(opts) {
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
    console.log('\n  Starting dev server...\n')
    run(getViteCmd(`--config ${join(WELY_PKG, 'vite.dev.config.ts')}`), {
      stdio: 'inherit',
      env: {
        ...process.env,
        WELY_COMPONENTS_DIR: getComponentsDir(),
        WELY_CONFIG_PATH: join(ROOT, 'wely.config.ts'),
      },
    })
  } else {
    console.log('\n  Starting dev server...\n')
    run(getViteCmd(), { stdio: 'inherit' })
  }
}



function testCmd(opts) {
  const isWatch = !opts.run
  if (isWatch) {
    run('npx vitest', { stdio: 'inherit' })
  } else {
    run('npx vitest run', { stdio: 'inherit' })
  }
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
  componentsDir    Component files directory (default: src/wely-components)
  outDir           Build output directory (default: dist)

Examples:
  $ wely init
  $ wely create w-card
  $ wely create w-user-list --props name:String,age:Number --actions refresh
  $ wely sync && wely list
  $ wely build
  $ wely export ../my-app/public/vendor/wely
`,
  )

program.addHelpCommand('help [command]', 'display help for command')

program.command('init').description('Create wely.config.ts and ensure wely is in package.json').action(init)

program
  .command('create <tag>')
  .description('Scaffold a new component')
  .option('--props <spec>', 'key:Type pairs, comma-separated (e.g. title:String,count:Number)')
  .option('--actions <names>', 'action names, comma-separated (e.g. toggle,reset)')
  .option('--force', 'overwrite existing file')
  .action(create)

program.command('sync').description('Regenerate components index from existing files').action(sync)

program.command('list').description('List registered components').action(list)

program
  .command('docs')
  .description('Generate COMPONENTS.md from component source files')
  .option('--out <path>', 'write to a custom path instead of COMPONENTS.md')
  .action(docs)

program
  .command('build')
  .description('Build the library (runtime only by default when using vite.config.ts)')
  .option('--bundle', 'include components in output (runtime + components)')
  .option('--chunks', 'split into vendor, runtime, and components chunks')
  .option('--all', 'build both library and bundle')
  .option('--export <path>', 'copy build output to destination after build')
  .action(build)

program
  .command('page')
  .description('Build static demo page for GitHub Pages into docs/')
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
  .action(testCmd)

if (process.argv.length <= 2) {
  program.outputHelp()
  process.exit(0)
}

program.parse(process.argv)
