import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('virtual:wely-tailwind.css?inline', () => {
  return {
    default: 'body { color: red; }'
  }
})

describe('shared-styles', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('creates and caches Tailwind CSSStyleSheet', async () => {
    const { getTailwindSheet } = await import('../shared-styles')
    const sheet = getTailwindSheet()
    expect(sheet).toBeInstanceOf(CSSStyleSheet)
    
    // Check caching
    const sheet2 = getTailwindSheet()
    expect(sheet2).toBe(sheet)
  })

  it('returns null if CSSStyleSheet constructor throws', async () => {
    const originalCSSStyleSheet = (globalThis as any).CSSStyleSheet
    try {
      ;(globalThis as any).CSSStyleSheet = undefined
      const { getTailwindSheet } = await import('../shared-styles')
      const sheet = getTailwindSheet()
      expect(sheet).toBeNull()
    } finally {
      ;(globalThis as any).CSSStyleSheet = originalCSSStyleSheet
    }
  })
})
