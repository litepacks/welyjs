#!/usr/bin/env node
/**
 * Captures playground screenshots for docs/ (run from repo root after npm install).
 * Usage: node scripts/capture-playground-screenshots.mjs
 */
import { mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'docs/assets/playground')
const BASE = 'http://127.0.0.1:5173'

async function waitForHttp(url, timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url)
      if (r.ok) return
    } catch {
      /* server not up yet */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  throw new Error(`Timeout waiting for ${url}`)
}

mkdirSync(OUT, { recursive: true })

const vite = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

try {
  await waitForHttp(BASE, 90000)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1100, height: 780 } })

  const shots = [
    { path: '/index.html#/home', file: 'playground-home.png', fullPage: false },
    { path: '/index.html#/docs', file: 'playground-docs.png', fullPage: false },
    { path: '/index.html#/gallery', file: 'playground-components.png', fullPage: false },
    /** Full page so Preview shows props + stage + snippet block (not clipped). */
    { path: '/index.html#/preview?tag=w-button', file: 'playground-preview.png', fullPage: true },
  ]

  for (const { path: p, file, fullPage } of shots) {
    await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 60000 })
    await page.waitForTimeout(400)
    await page.screenshot({ path: join(OUT, file), fullPage })
    console.log('Wrote', join('docs/assets/playground', file))
  }

  await browser.close()
} finally {
  vite.kill('SIGTERM')
  await new Promise((r) => setTimeout(r, 500))
}
