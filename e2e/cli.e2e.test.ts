/**
 * E2E tests: verify CLI commands and build outputs.
 * Run: npm run test:e2e
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const WELY_ROOT = join(__dirname, '..')
const WELY_BIN = join(WELY_ROOT, 'bin', 'wely.mjs')

function run(cmd: string, cwd: string, opts?: { silent?: boolean }): string {
  const result = execSync(cmd, {
    cwd,
    encoding: 'utf-8',
    stdio: opts?.silent ? 'pipe' : 'inherit',
  })
  return typeof result === 'string' ? result : ''
}

describe('CLI e2e', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'wely-e2e-'))
  })

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true })
    }
  })

  describe('wely init', () => {
    it('creates wely.config.ts and package.json', () => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })

      expect(existsSync(join(tmpDir, 'wely.config.ts'))).toBe(true)
      expect(existsSync(join(tmpDir, 'package.json'))).toBe(true)

      const config = readFileSync(join(tmpDir, 'wely.config.ts'), 'utf-8')
      expect(config).toContain("defineConfig")
      expect(config).toContain("from 'welyjs'")

      const pkg = JSON.parse(readFileSync(join(tmpDir, 'package.json'), 'utf-8'))
      expect(pkg.dependencies?.welyjs).toBeDefined()
    })
  })

  describe('wely create', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    })

    it('creates component file in src/components', () => {
      run(`node ${WELY_BIN} create w-e2e-test --props msg:String`, tmpDir, { silent: true })

      const componentPath = join(tmpDir, 'src', 'components', 'w-e2e-test.ts')
      expect(existsSync(componentPath)).toBe(true)

      const content = readFileSync(componentPath, 'utf-8')
      expect(content).toContain("defineComponent")
      expect(content).toContain("tag: 'w-e2e-test'")
      expect(content).toContain("msg: String")
      expect(content).toContain("from 'welyjs'")
    })

    it('updates src/components/index.ts', () => {
      run(`node ${WELY_BIN} create w-e2e-bar`, tmpDir, { silent: true })

      const indexPath = join(tmpDir, 'src', 'components', 'index.ts')
      expect(existsSync(indexPath)).toBe(true)
      const content = readFileSync(indexPath, 'utf-8')
      expect(content).toContain("w-e2e-bar")
    })
  })

  describe('wely build', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    })

    it('produces bundle output (no vite.config)', () => {
      run(`node ${WELY_BIN} create w-e2e-build`, tmpDir, { silent: true })
      run(`node ${WELY_BIN} build`, tmpDir, { silent: true })

      const distDir = join(tmpDir, 'dist')
      expect(existsSync(distDir)).toBe(true)
      expect(existsSync(join(distDir, 'wely.bundle.es.js'))).toBe(true)
      expect(existsSync(join(distDir, 'wely.bundle.umd.js'))).toBe(true)
    })

    it('bundle contains defineComponent and component tag', () => {
      run(`node ${WELY_BIN} create w-e2e-bundle`, tmpDir, { silent: true })
      run(`node ${WELY_BIN} build`, tmpDir, { silent: true })

      const esBundle = readFileSync(join(tmpDir, 'dist', 'wely.bundle.es.js'), 'utf-8')
      expect(esBundle).toContain('defineComponent')
      expect(esBundle).toContain('w-e2e-bundle')
    })
  })

  describe('wely list', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    })

    it('lists created components', () => {
      run(`node ${WELY_BIN} create w-e2e-list`, tmpDir, { silent: true })
      const out = run(`node ${WELY_BIN} list`, tmpDir, { silent: true })

      expect(out).toContain('w-e2e-list')
    })
  })

  describe('wely docs', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    })

    it('generates COMPONENTS.md with component info', () => {
      run(`node ${WELY_BIN} create w-e2e-docs --props title:String`, tmpDir, { silent: true })
      run(`node ${WELY_BIN} docs`, tmpDir, { silent: true })

      const docsPath = join(tmpDir, 'COMPONENTS.md')
      expect(existsSync(docsPath)).toBe(true)
      const content = readFileSync(docsPath, 'utf-8')
      expect(content).toContain('w-e2e-docs')
      expect(content).toContain('title')
    })
  })

  describe('wely export', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    })

    it('builds and copies dist to target path (wely build then export --no-build)', () => {
      run(`node ${WELY_BIN} create w-e2e-export`, tmpDir, { silent: true })
      run(`node ${WELY_BIN} build`, tmpDir, { silent: true })
      const exportTarget = join(tmpDir, 'export-target')
      run(`node ${WELY_BIN} export ${exportTarget} --no-build`, tmpDir, { silent: true })

      expect(existsSync(join(exportTarget, 'wely.bundle.es.js'))).toBe(true)
      expect(existsSync(join(exportTarget, 'wely.bundle.umd.js'))).toBe(true)
    })

    it('export --no-build copies existing dist only', () => {
      run(`node ${WELY_BIN} create w-e2e-export-nb`, tmpDir, { silent: true })
      run(`node ${WELY_BIN} build`, tmpDir, { silent: true })
      const exportTarget = join(tmpDir, 'export-nb')
      run(`node ${WELY_BIN} export ${exportTarget} --no-build`, tmpDir, { silent: true })

      expect(existsSync(join(exportTarget, 'wely.bundle.es.js'))).toBe(true)
    })
  })

  describe('wely help', () => {
    it('prints usage and commands', () => {
      const out = run(`node ${WELY_BIN} help`, tmpDir, { silent: true })

      expect(out).toContain('wely')
      expect(out).toContain('init')
      expect(out).toContain('create')
      expect(out).toContain('build')
      expect(out).toContain('export')
    })
  })

  describe('wely sync', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    })

    it('regenerates index from component files', () => {
      run(`node ${WELY_BIN} create w-e2e-sync-a`, tmpDir, { silent: true })
      run(`node ${WELY_BIN} create w-e2e-sync-b`, tmpDir, { silent: true })
      run(`node ${WELY_BIN} sync`, tmpDir, { silent: true })

      const content = readFileSync(join(tmpDir, 'src', 'components', 'index.ts'), 'utf-8')
      expect(content).toContain('w-e2e-sync-a')
      expect(content).toContain('w-e2e-sync-b')
    })
  })
})

describe('Build output verification (wely repo)', () => {
  it('prepublishOnly produces runtime dist files only', { timeout: 30000 }, () => {
    run('npm run prepublishOnly', WELY_ROOT, { silent: true })

    const distDir = join(WELY_ROOT, 'dist')
    expect(existsSync(join(distDir, 'wely.es.js'))).toBe(true)
    expect(existsSync(join(distDir, 'wely.umd.js'))).toBe(true)
    expect(existsSync(join(distDir, 'index.d.ts'))).toBe(true)

    const lib = readFileSync(join(distDir, 'wely.es.js'), 'utf-8')
    expect(lib).toContain('defineComponent')
  })
})
