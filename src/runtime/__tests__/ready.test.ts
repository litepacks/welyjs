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
})
