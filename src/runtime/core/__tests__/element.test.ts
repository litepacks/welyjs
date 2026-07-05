import { describe, it, expect } from 'vitest'
import { WelyElement } from '../element'

class WelyTestElement extends WelyElement {}
customElements.define('wely-test-element', WelyTestElement)

describe('WelyElement', () => {
  it('instantiates and attaches open shadow root', () => {
    const el = document.createElement('wely-test-element') as WelyElement
    expect(el.shadowRoot).toBeDefined()
    expect(el.shadowRoot?.mode).toBe('open')
  })

  it('returns empty html by default in renderTemplate', () => {
    const el = document.createElement('wely-test-element') as WelyElement
    const tpl = (el as any).renderTemplate()
    expect(tpl).toBeDefined()
  })

  it('disconnects and supports callbacks', () => {
    const el = document.createElement('wely-test-element') as WelyElement
    el.disconnectedCallback()
    el.attributeChangedCallback('test', null, 'val')
  })

  it('falls back to prepending a style tag if adoptedStyleSheets throws', () => {
    const el = document.createElement('wely-test-element') as WelyElement
    const ctor = el.constructor as any
    ctor.styles = [{ cssText: '.test-styles {}' }]
    
    const originalCSSStyleSheet = (globalThis as any).CSSStyleSheet
    try {
      ;(globalThis as any).CSSStyleSheet = undefined
      ;(el as any).performUpdate()
      const styleTag = el.shadowRoot!.querySelector('style')
      expect(styleTag).not.toBeNull()
      expect(styleTag?.textContent).toContain('.test-styles {}')
    } finally {
      ;(globalThis as any).CSSStyleSheet = originalCSSStyleSheet
      delete ctor.styles
    }
  })
})
