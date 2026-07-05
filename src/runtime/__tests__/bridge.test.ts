import { describe, it, expect, beforeEach } from 'vitest'
import { installBridge } from '../bridge'
import { defineComponent } from '../defineComponent'
import { html } from '../core/html'

describe('bridge', () => {
  beforeEach(() => {
    installBridge()
  })

  it('installs wely on window', () => {
    expect((window as any).wely).toBeDefined()
  })

  it('lists registered components', () => {
    defineComponent({
      tag: 'w-test-bridge',
      render: () => html`<div></div>`
    })
    const list = (window as any).wely.list()
    expect(list).toContain('w-test-bridge')
  })

  it('gets context of element', () => {
    const el = document.createElement('w-test-bridge')
    document.body.appendChild(el)
    
    // Check that get and getAll return the context
    const ctx = (window as any).wely.get('w-test-bridge')
    expect(ctx).toBeDefined()
    
    const all = (window as any).wely.getAll('w-test-bridge')
    expect(all.length).toBeGreaterThan(0)
    expect(all[0]).toBe(ctx)
    
    el.remove()
  })

  it('does not install bridge if window is undefined', async () => {
    const originalWindow = globalThis.window
    try {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        configurable: true,
        writable: true
      })
      const { installBridge: install } = await import('../bridge')
      install()
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true
      })
    }
  })
})
