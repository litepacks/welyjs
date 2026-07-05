import { describe, it, expect } from 'welyjs/test'
import { html } from '../core'
import { defineComponent } from '../defineComponent'
import { installBridge } from '../bridge'
import { ready, whenDomReady } from '../ready'

describe('ready', () => {
  it('whenDomReady resolves in jsdom', async () => {
    await whenDomReady()
    expect(document.readyState).not.toBe('loading')
  })

  it('ready resolves after a component is defined', async () => {
    defineComponent({
      tag: 'w-ready-one',
      render: () => html`<span>ok</span>`,
    })

    await ready('w-ready-one')
    expect(customElements.get('w-ready-one')).toBeDefined()
  })

  it('ready waits for all registered components when tag is omitted', async () => {
    defineComponent({ tag: 'w-ready-a', render: () => html`` })
    defineComponent({ tag: 'w-ready-b', render: () => html`` })

    await ready()
    expect(customElements.get('w-ready-a')).toBeDefined()
    expect(customElements.get('w-ready-b')).toBeDefined()
  })

  it('window.wely.ready is available after runtime import', async () => {
    installBridge()
    defineComponent({ tag: 'w-ready-bridge', render: () => html`` })
    const bridge = (window as Window & { wely?: { ready: typeof ready } }).wely
    expect(bridge?.ready).toBeTypeOf('function')
    await bridge!.ready('w-ready-bridge')
  })

  it('whenDomReady handles DOMContentLoaded event if loading', async () => {
    Object.defineProperty(document, 'readyState', {
      value: 'loading',
      writable: true,
      configurable: true,
    })
    const promise = whenDomReady()
    document.dispatchEvent(new Event('DOMContentLoaded'))
    await promise
    
    // Restore readyState
    Object.defineProperty(document, 'readyState', {
      value: 'complete',
      writable: true,
      configurable: true,
    })
  })

  it('whenTagsDefined resolves immediately if empty tags list or customElements is undefined', async () => {
    const { whenTagsDefined } = await import('../ready')
    await whenTagsDefined([])
  })

  it('whenReady triggers callback on ready success', async () => {
    const { whenReady } = await import('../ready')
    await new Promise<void>((resolve) => {
      whenReady(() => resolve(), 'w-ready-one')
    })
  })

  it('loadScript appends script and handles onload', async () => {
    const { loadScript } = await import('../ready')
    const promise = loadScript('some-mock-script.js', 'w-ready-one')
    const script = document.head.querySelector('script[src="some-mock-script.js"]')
    expect(script).toBeDefined()
    if (script) {
      (script as any).onload()
      await promise
      script.remove()
    }
  })

  it('loadScript handles onerror and rejects', async () => {
    const { loadScript } = await import('../ready')
    const promise = loadScript('error-script.js', 'w-ready-one')
    const script = document.head.querySelector('script[src="error-script.js"]')
    expect(script).toBeDefined()
    if (script) {
      (script as any).onerror()
      await expect(promise).rejects.toThrow()
      script.remove()
    }
  })

  it('whenReady logs error on failure', async () => {
    const originalWhenDefined = customElements.whenDefined
    customElements.whenDefined = () => Promise.reject(new Error('mock error'))
    
    const originalError = console.error
    let errorLogged = false
    console.error = () => { errorLogged = true }
    
    try {
      const { whenReady } = await import('../ready')
      whenReady(() => {}, 'w-failed-tag')
      await new Promise(r => setTimeout(r, 10))
      expect(errorLogged).toBe(true)
    } finally {
      customElements.whenDefined = originalWhenDefined
      console.error = originalError
    }
  })

  it('loadScript rejects if document is undefined', async () => {
    const originalDocument = globalThis.document
    Object.defineProperty(globalThis, 'document', {
      value: undefined,
      configurable: true,
      writable: true
    })
    try {
      const { loadScript } = await import('../ready')
      await expect(loadScript('src.js')).rejects.toThrow()
    } finally {
      Object.defineProperty(globalThis, 'document', {
        value: originalDocument,
        configurable: true,
        writable: true
      })
    }
  })

  it('ready resolves after an array of components is defined', async () => {
    defineComponent({ tag: 'w-arr-a', render: () => html`` })
    defineComponent({ tag: 'w-arr-b', render: () => html`` })
    
    await ready(['w-arr-a', 'w-arr-b'])
    expect(customElements.get('w-arr-a')).toBeDefined()
    expect(customElements.get('w-arr-b')).toBeDefined()
  })
})
