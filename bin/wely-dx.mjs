/**
 * DX helpers for wely CLI (doctor, setup, embed, add, ci).
 * Imported by bin/wely.mjs — not invoked directly.
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { watch } from 'node:fs'

export function shouldAutoComponents(opts, getWelyConfig) {
  if (opts?.autoComponents === true) return true
  if (opts?.autoComponents === false) return false
  return getWelyConfig().autoComponents === true
}

export function getComponentExcludeGlobs(componentsRelBase, getWelyConfig) {
  const base = '/' + componentsRelBase.replace(/^\/+/, '').replace(/\/+$/, '')
  const defaults = [
    '!' + base + '/**/index.ts',
    '!' + base + '/**/*.test.ts',
    '!' + base + '/**/*.spec.ts',
  ]
  const custom = getWelyConfig().componentExclude
  if (!Array.isArray(custom)) return defaults
  const extra = custom.map((p) => {
    const s = String(p)
    if (s.startsWith('!')) return s
    return '!' + base + '/' + s.replace(/^\//, '')
  })
  return [...defaults, ...extra]
}

export function buildAutoBundleSource(componentsRelBase, getWelyConfig) {
  const base = '/' + componentsRelBase.replace(/^\/+/, '').replace(/\/+$/, '')
  const excludes = getComponentExcludeGlobs(componentsRelBase, getWelyConfig)
  const globLines = [JSON.stringify(base + '/**/*.ts'), ...excludes.map((g) => JSON.stringify(g))]
  return `export * from 'welyjs'
const __welyComponents = import.meta.glob([
  ${globLines.join(',\n  ')},
], { eager: true })
void __welyComponents
`
}

export function printIssue(issue) {
  const icon = issue.status === 'ok' ? '✓' : issue.status === 'warn' ? '!' : '✗'
  console.log(`  ${icon} ${issue.message}`)
  if (issue.fix) console.log(`    → ${issue.fix}`)
}

export function runDoctor(ctx, opts = {}) {
  const { root, getWelyConfig, getComponentsDir, getOutDir, hasWelyjsRuntimeInstalled, hasProjectViteConfig, hasProjectVitestOrViteConfig, scanComponents } = ctx
  const checks = []

  const nodeMajor = Number(process.versions.node.split('.')[0])
  checks.push({
    id: 'node',
    status: nodeMajor >= 18 ? 'ok' : 'fail',
    message: `Node.js ${process.version}`,
    fix: nodeMajor < 18 ? 'Upgrade to Node 18+' : undefined,
  })

  const pkgPath = join(root, 'package.json')
  if (!existsSync(pkgPath)) {
    checks.push({ id: 'package', status: 'fail', message: 'package.json missing', fix: 'Run: wely init' })
  } else {
    checks.push({ id: 'package', status: 'ok', message: 'package.json found' })
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      if (!pkg.dependencies?.welyjs) {
        checks.push({ id: 'welyjs-dep', status: 'warn', message: 'welyjs not in dependencies', fix: 'Run: npm install welyjs' })
      } else {
        checks.push({ id: 'welyjs-dep', status: 'ok', message: `welyjs dependency: ${pkg.dependencies.welyjs}` })
      }
    } catch {
      checks.push({ id: 'package-parse', status: 'fail', message: 'package.json is invalid JSON', fix: 'Fix package.json syntax' })
    }
  }

  if (!hasWelyjsRuntimeInstalled()) {
    checks.push({ id: 'welyjs-resolve', status: 'fail', message: 'welyjs runtime not resolved in node_modules', fix: 'Run: npm install' })
  } else {
    checks.push({ id: 'welyjs-resolve', status: 'ok', message: 'welyjs runtime resolvable' })
  }

  const welyCfg = getWelyConfig()
  checks.push({
    id: 'components-dir',
    status: existsSync(getComponentsDir()) ? 'ok' : 'warn',
    message: `componentsDir: ${relative(root, getComponentsDir())}`,
    fix: existsSync(getComponentsDir()) ? undefined : 'Run: wely init',
  })

  const bundlePath = join(root, 'src', 'bundle.ts')
  if (welyCfg.autoComponents) {
    checks.push({ id: 'auto-components', status: 'ok', message: 'autoComponents enabled (bundle import chain optional)' })
  } else if (existsSync(bundlePath)) {
    checks.push({ id: 'bundle', status: 'ok', message: 'src/bundle.ts present' })
  } else {
    checks.push({ id: 'bundle', status: 'warn', message: 'src/bundle.ts missing', fix: 'Run: wely init — or set wely.autoComponents: true' })
  }

  const tags = scanComponents()
  checks.push({
    id: 'components',
    status: tags.length > 0 ? 'ok' : 'warn',
    message: `${tags.length} component(s) discovered`,
    fix: tags.length === 0 ? 'Run: wely create w-demo --test' : undefined,
  })

  checks.push({
    id: 'vite-config',
    status: 'ok',
    message: hasProjectViteConfig() ? 'Local vite.config detected (consumer defaults bypassed)' : 'No local vite.config (using bundled Wely configs)',
  })

  checks.push({
    id: 'vitest-config',
    status: 'ok',
    message: hasProjectVitestOrViteConfig() ? 'Local vitest/vite config detected' : 'Using bundled vitest.consumer.config.ts',
  })

  const distBundle = join(getOutDir(), 'wely.bundle.umd.js')
  checks.push({
    id: 'dist',
    status: existsSync(distBundle) ? 'ok' : 'warn',
    message: existsSync(distBundle) ? `Build output found (${relative(root, distBundle)})` : 'No bundle in dist/ yet',
    fix: existsSync(distBundle) ? undefined : 'Run: wely build',
  })

  const failed = checks.filter((c) => c.status === 'fail').length
  const warned = checks.filter((c) => c.status === 'warn').length
  const ok = failed === 0

  if (opts.json) {
    console.log(JSON.stringify({ ok, failed, warned, checks }, null, 2))
    if (!ok) process.exit(1)
    return
  }

  console.log('\n  Wely Doctor\n')
  for (const c of checks) printIssue(c)
  console.log(`\n  Summary: ${checks.length - failed - warned} ok, ${warned} warn, ${failed} fail\n`)
  if (!ok) process.exit(1)
}

export function runEmbed(ctx, opts = {}) {
  const { root, getOutDir, getOutDirRel, scanComponents, runBuild } = ctx
  const outDir = opts.out ? resolve(root, String(opts.out)) : join(root, 'html-usage')
  const bundleRel = '../' + getOutDirRel().replace(/\\/g, '/') + '/wely.bundle.umd.js'

  if (!existsSync(join(getOutDir(), 'wely.bundle.umd.js'))) {
    console.log('\n  No bundle found — building first...\n')
    runBuild({ autoComponents: true })
  }

  const tags = scanComponents()
  const sampleTag = tags[0] ?? 'w-demo'
  const title = opts.title ? String(opts.title) : 'Wely HTML Embed'

  mkdirSync(outDir, { recursive: true })
  const tagJson = JSON.stringify(sampleTag)
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 16px;
      line-height: 1.65;
      background: #f1f5f9;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    .page { max-width: 44rem; margin: 0 auto; padding: 2.75rem 1.25rem 3rem; }
    .eyebrow {
      margin: 0 0 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #2563eb;
    }
    h1 {
      margin: 0 0 0.75rem;
      font-size: clamp(1.5rem, 4vw, 2rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }
    .lead { margin: 0 0 2rem; color: #64748b; max-width: 38ch; line-height: 1.6; }
    .card {
      padding: 1.25rem 1.25rem 1.5rem;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      background: #fff;
      box-shadow: 0 1px 2px rgba(15,23,42,.04);
    }
    .card p { margin: 0 0 1rem; font-size: 0.9375rem; color: #64748b; }
    .demo-label {
      display: flex; align-items: center; gap: 0.75rem;
      margin: 2rem 0 1rem;
      font-size: 0.8125rem; font-weight: 600;
      letter-spacing: 0.04em; text-transform: uppercase; color: #64748b;
    }
    .demo-label::after { content: ''; flex: 1; height: 1px; background: #e2e8f0; }
    .demo-host {
      padding: 1.25rem;
      border-radius: 14px;
      border: 1px solid #e2e8f0;
      background: #fff;
    }
    code {
      font-family: ui-monospace, monospace;
      font-size: 0.85em;
      background: #f1f5f9;
      padding: 0.15em 0.4em;
      border-radius: 4px;
    }
  </style>
  <script src="${bundleRel}" defer></script>
</head>
<body>
  <main class="page">
    <p class="eyebrow">Generated by wely embed</p>
    <h1>${title}</h1>
    <p class="lead">Bundle <code>${bundleRel}</code> loads with <code>defer</code>; boot uses <code>wely.ready()</code>.</p>
    <section class="card">
      <p>Use this page as a starting point for plain HTML integration.</p>
      <${sampleTag} title="Hello from HTML"></${sampleTag}>
    </section>
  </main>
  <script defer>
    wely.ready(${tagJson}).catch(console.error);
  </script>
</body>
</html>
`
  const indexPath = join(outDir, 'index.html')
  writeFileSync(indexPath, html)
  console.log(`\n  Created ${relative(root, indexPath)}\n`)
  console.log('  Open in a browser or serve the folder with any static server.\n')
}

export function runAdd(target, ctx) {
  const { root } = ctx
  const t = String(target ?? '').toLowerCase()
  if (!['react', 'vue'].includes(t)) {
    console.error('  Usage: wely add <react|vue>\n')
    process.exit(1)
  }

  const dir = join(root, 'integrations')
  mkdirSync(dir, { recursive: true })

  if (t === 'react') {
    const path = join(dir, 'react-example.tsx')
    writeFileSync(path, `/**
 * React integration example — use Wely custom elements like regular JSX tags.
 * Ensure the Wely bundle is loaded before rendering (script tag or dynamic import).
 */
import type { ReactNode } from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'w-demo': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { title?: string }, HTMLElement>
    }
  }
}

export function WelyDemo({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <w-demo title={title}>
      {children}
    </w-demo>
  )
}
`)
    console.log(`\n  Created ${relative(root, path)}\n`)
    return
  }

  const path = join(dir, 'vue-example.vue')
  writeFileSync(path, `<!--
  Vue integration example — use Wely custom elements in templates.
  Load the Wely bundle before mounting the app.
-->
<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <w-demo :title="title">
    <slot />
  </w-demo>
</template>
`)
  console.log(`\n  Created ${relative(root, path)}\n`)
}

export function getChangedTestPaths(root, scanComponents) {
  let changed = []
  try {
    const out = execSync('git diff --name-only HEAD', { cwd: root, encoding: 'utf-8' })
    changed = out.split('\n').map((s) => s.trim()).filter(Boolean)
  } catch {
    return []
  }

  const tests = new Set()
  for (const f of changed) {
    if (f.endsWith('.test.ts') || f.endsWith('.spec.ts')) {
      tests.add(f)
      continue
    }
    if (f.endsWith('.ts') && f.includes('wely-components')) {
      const candidate = f.replace(/\.ts$/, '.test.ts')
      if (existsSync(join(root, candidate))) tests.add(candidate)
    }
  }

  if (tests.size === 0 && changed.length > 0) {
    for (const tag of scanComponents()) {
      const testRel = join(relative(root, join(root, 'src', 'wely-components')).replace(/\\/g, '/'), `${tag}.test.ts`)
      if (existsSync(join(root, testRel))) tests.add(testRel)
    }
  }

  return [...tests]
}

export function runDocsWatch(ctx, opts, docsFn) {
  const { getComponentsDir, root } = ctx
  const dir = getComponentsDir()
  if (!existsSync(dir)) {
    console.error(`  componentsDir not found: ${relative(root, dir)}\n`)
    process.exit(1)
  }

  docsFn(opts)
  console.log(`\n  Watching ${relative(root, dir)} for changes (Ctrl+C to stop)...\n`)

  let timer
  watch(dir, { recursive: true }, (_event, filename) => {
    if (!filename || !String(filename).endsWith('.ts')) return
    clearTimeout(timer)
    timer = setTimeout(() => {
      console.log(`  Regenerating docs (${filename})...`)
      docsFn(opts)
    }, 200)
  })
}

export function runCi(ctx, opts = {}) {
  const { buildFn, testFn, docsFn, getOutDir, root } = ctx
  const steps = []

  try {
    buildFn({ autoComponents: true, json: opts.json })
    steps.push({ step: 'build', status: 'ok' })
  } catch (e) {
    steps.push({ step: 'build', status: 'fail', error: String(e?.message ?? e) })
    if (opts.json) console.log(JSON.stringify({ ok: false, steps }, null, 2))
    process.exit(1)
  }

  try {
    testFn({ run: true })
    steps.push({ step: 'test', status: 'ok' })
  } catch (e) {
    steps.push({ step: 'test', status: 'fail', error: String(e?.message ?? e) })
    if (opts.json) console.log(JSON.stringify({ ok: false, steps }, null, 2))
    process.exit(1)
  }

  try {
    docsFn({})
    steps.push({ step: 'docs', status: 'ok' })
  } catch (e) {
    steps.push({ step: 'docs', status: 'fail', error: String(e?.message ?? e) })
    if (opts.json) console.log(JSON.stringify({ ok: false, steps }, null, 2))
    process.exit(1)
  }

  const bundle = join(getOutDir(), 'wely.bundle.umd.js')
  if (!existsSync(bundle)) {
    steps.push({ step: 'verify-dist', status: 'fail', error: 'wely.bundle.umd.js missing' })
    if (opts.json) console.log(JSON.stringify({ ok: false, steps }, null, 2))
    process.exit(1)
  }
  steps.push({ step: 'verify-dist', status: 'ok', sizeKb: (statSync(bundle).size / 1024).toFixed(1) })

  if (opts.json) {
    console.log(JSON.stringify({ ok: true, steps }, null, 2))
    return
  }

  console.log('\n  CI pipeline passed:\n')
  for (const s of steps) console.log(`    ✓ ${s.step}`)
  console.log()
}
