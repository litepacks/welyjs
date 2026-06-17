/**
 * E2E tests: verify CLI commands and build outputs.
 * Run: npm run test:e2e
 * @vitest-environment node
 */
import { describe, it, expect, beforeEach, afterEach } from 'welyjs/test'
import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

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

describe('CLI e2e', { timeout: 60000 }, () => {
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
      expect(pkg.wely?.autoComponents).toBe(true)
    })
  })

  describe('wely create', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    }, 60000)

    it('creates component file in src/wely-components', () => {
      run(`node ${WELY_BIN} create w-e2e-test --props msg:String`, tmpDir, { silent: true })

      const componentPath = join(tmpDir, 'src', 'wely-components', 'w-e2e-test.ts')
      expect(existsSync(componentPath)).toBe(true)

      const content = readFileSync(componentPath, 'utf-8')
      expect(content).toContain("defineComponent")
      expect(content).toContain("tag: 'w-e2e-test'")
      expect(content).toContain("msg: String")
      expect(content).toContain("from 'welyjs'")
    })

    it('updates src/wely-components/index.ts', () => {
      run(`node ${WELY_BIN} create w-e2e-bar`, tmpDir, { silent: true })

      const indexPath = join(tmpDir, 'src', 'wely-components', 'index.ts')
      expect(existsSync(indexPath)).toBe(true)
      const content = readFileSync(indexPath, 'utf-8')
      expect(content).toContain("w-e2e-bar")
    })
  })

  describe('wely build', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    }, 60000)

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
      expect(esBundle.toLowerCase()).not.toContain('node_modules/lit')
    })

    it('build --chunks creates split outputs', () => {
      run(`node ${WELY_BIN} create w-e2e-chunks`, tmpDir, { silent: true })
      run(`node ${WELY_BIN} build --chunks`, tmpDir, { silent: true })

      expect(existsSync(join(tmpDir, 'dist', 'wely.chunked.es.js'))).toBe(true)
    })
  })

  describe('wely list', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    }, 60000)

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
    }, 60000)

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
    }, 60000)

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
      expect(out).toContain('doctor')
      expect(out).toContain('setup')
      expect(out).toContain('embed')
      expect(out).toContain('ci')
    })
  })

  describe('wely doctor', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    }, 60000)

    it('reports project status', () => {
      const out = run(`node ${WELY_BIN} doctor`, tmpDir, { silent: true })
      expect(out).toContain('package.json found')
      expect(out).toContain('componentsDir')
    })

    it('supports --json output', () => {
      const out = run(`node ${WELY_BIN} doctor --json`, tmpDir, { silent: true })
      const data = JSON.parse(out)
      expect(data.checks).toBeDefined()
      expect(Array.isArray(data.checks)).toBe(true)
    })
  })

  describe('wely setup', () => {
    it('scaffolds a working project with sample component', () => {
      run(`node ${WELY_BIN} setup --no-build --no-install`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })

      expect(existsSync(join(tmpDir, 'wely.config.ts'))).toBe(true)
      expect(existsSync(join(tmpDir, 'src', 'wely-components', 'w-demo.ts'))).toBe(true)
      expect(existsSync(join(tmpDir, 'src', 'wely-components', 'w-demo.test.ts'))).toBe(true)
    }, 60000)
  })

  describe('wely embed', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    }, 60000)

    it('generates html-usage/index.html', () => {
      run(`node ${WELY_BIN} create w-e2e-embed`, tmpDir, { silent: true })
      run(`node ${WELY_BIN} embed`, tmpDir, { silent: true })

      const htmlPath = join(tmpDir, 'html-usage', 'index.html')
      expect(existsSync(htmlPath)).toBe(true)
      const html = readFileSync(htmlPath, 'utf-8')
      expect(html).toContain('wely.bundle.umd.js')
      expect(html).toContain('w-e2e-embed')
    })
  })

  describe('wely add', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
    })

    it('scaffolds react integration snippet', () => {
      run(`node ${WELY_BIN} add react`, tmpDir, { silent: true })
      expect(existsSync(join(tmpDir, 'integrations', 'react-example.tsx'))).toBe(true)
    })

    it('scaffolds vue integration snippet', () => {
      run(`node ${WELY_BIN} add vue`, tmpDir, { silent: true })
      expect(existsSync(join(tmpDir, 'integrations', 'vue-example.vue'))).toBe(true)
    })
  })

  describe('wely ci', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    }, 60000)

    it('runs build + test + docs pipeline', () => {
      run(`node ${WELY_BIN} create w-e2e-ci --test`, tmpDir, { silent: true })
      const out = run(`node ${WELY_BIN} ci`, tmpDir, { silent: true })
      expect(out).toContain('CI pipeline passed')
      expect(existsSync(join(tmpDir, 'COMPONENTS.md'))).toBe(true)
      expect(existsSync(join(tmpDir, 'dist', 'wely.bundle.umd.js'))).toBe(true)
    }, 60000)
  })

  describe('wely test', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    }, 60000)

    it('runs test command with consumer defaults', () => {
      run(`node ${WELY_BIN} create w-e2e-testable --test`, tmpDir, { silent: true })
      run(`node ${WELY_BIN} test --run`, tmpDir, { silent: true })
      expect(existsSync(join(tmpDir, 'src', 'wely-components', 'w-e2e-testable.test.ts'))).toBe(true)
    })
  })

  describe('wely sync', () => {
    beforeEach(() => {
      run(`node ${WELY_BIN} init`, tmpDir, { silent: true })
      run(`npm install ${WELY_ROOT}`, tmpDir, { silent: true })
    }, 60000)

    it('regenerates index from component files', () => {
      run(`node ${WELY_BIN} create w-e2e-sync-a`, tmpDir, { silent: true })
      run(`node ${WELY_BIN} create w-e2e-sync-b`, tmpDir, { silent: true })
      run(`node ${WELY_BIN} sync`, tmpDir, { silent: true })

      const content = readFileSync(join(tmpDir, 'src', 'wely-components', 'index.ts'), 'utf-8')
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

  it('build:all produces runtime, bundle and chunk outputs', { timeout: 30000 }, () => {
    run('npm run build:all', WELY_ROOT, { silent: true })

    const distDir = join(WELY_ROOT, 'dist')
    expect(existsSync(join(distDir, 'wely.es.js'))).toBe(true)
    expect(existsSync(join(distDir, 'wely.bundle.es.js'))).toBe(true)
    expect(existsSync(join(distDir, 'wely.chunked.es.js'))).toBe(true)
  })

  it('runtime bundle stays below 11KB gzipped', { timeout: 30000 }, () => {
    run('npm run prepublishOnly', WELY_ROOT, { silent: true })
    const runtime = readFileSync(join(WELY_ROOT, 'dist', 'wely.es.js'), 'utf-8')
    const gzKb = gzipSync(runtime).byteLength / 1024
    expect(gzKb).toBeLessThan(11)
  })
})
