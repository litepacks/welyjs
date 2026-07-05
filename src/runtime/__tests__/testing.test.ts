import { describe, it, expect } from 'vitest'
import { defineComponent, html } from '../index'
import {
  getComponentContext,
  appendComponent,
  withHost,
  flushUpdates,
  clickInShadow
} from '../../testing/index'

describe('testing helpers', () => {
  it('appends and manipulates component', async () => {
    defineComponent({
      tag: 'w-test-helpers',
      state() { return { value: 0 } },
      actions: {
        inc(ctx) { ctx.state.value++ }
      },
      render: (ctx) => html`<button @click=${ctx.actions.inc}>${ctx.state.value}</button>`
    })

    const el = appendComponent('w-test-helpers', {
      disabled: true,
      active: false,
      label: 'test'
    })
    await flushUpdates()

    expect(el.getAttribute('disabled')).toBe('')
    expect(el.hasAttribute('active')).toBe(false)
    expect(el.getAttribute('label')).toBe('test')

    const ctx = getComponentContext(el)
    expect(ctx).toBeDefined()

    await clickInShadow(el, 'button')
    expect(ctx?.state.value).toBe(1)

    el.remove()
  })

  it('runs withHost helper', async () => {
    let checked = false
    await withHost('w-test-helpers', undefined, async (host) => {
      await flushUpdates()
      expect(host).toBeDefined()
      checked = true
    })
    expect(checked).toBe(true)
  })

  it('throws on non-existent shadow element', async () => {
    await withHost('w-test-helpers', undefined, async (host) => {
      await flushUpdates()
      await expect(clickInShadow(host, '.non-existent')).rejects.toThrow()
    })
  })
})
