import { describe, it, expect, vi, beforeAll } from 'vitest'
import { html } from 'lit'
import { defineComponent } from '../defineComponent'
import { getComponent } from '../registry'

function wait(ms = 0): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

describe('defineComponent', () => {
  it('registers a custom element', () => {
    defineComponent({
      tag: 'w-test-register',
      render: () => html`<span>ok</span>`,
    })

    expect(customElements.get('w-test-register')).toBeDefined()
    expect(getComponent('w-test-register')).toBeDefined()
  })

  it('creates an element with correct tag name', () => {
    defineComponent({
      tag: 'w-test-tag',
      render: () => html`<p>hello</p>`,
    })

    const el = document.createElement('w-test-tag')
    expect(el).toBeInstanceOf(HTMLElement)
    expect(el.tagName.toLowerCase()).toBe('w-test-tag')
  })

  it('syncs props from attributes', async () => {
    let captured: any

    defineComponent({
      tag: 'w-test-props',
      props: { count: Number, label: String },
      render(ctx) {
        captured = { count: ctx.props.count, label: ctx.props.label }
        return html`<span>${ctx.props.label}: ${ctx.props.count}</span>`
      },
    })

    const el = document.createElement('w-test-props')
    el.setAttribute('count', '42')
    el.setAttribute('label', 'Items')
    document.body.appendChild(el)
    await wait(50)

    expect(captured.count).toBe(42)
    expect(captured.label).toBe('Items')

    el.remove()
  })

  it('creates reactive state that auto-triggers update', async () => {
    const renderSpy = vi.fn()

    defineComponent({
      tag: 'w-test-state',
      state: () => ({ value: 0 }),
      render(ctx) {
        renderSpy(ctx.state.value)
        return html`<span>${ctx.state.value}</span>`
      },
    })

    const el = document.createElement('w-test-state')
    document.body.appendChild(el)
    await wait(50)

    expect(renderSpy).toHaveBeenCalledWith(0)

    ;(el as any).__ctx_for_test_only // We can't access ctx directly, use the element
    // Trigger a state change via the element's internal API
    // Since state is reactive via proxy, we need to test through actions
    el.remove()
  })

  it('binds actions to ctx and they trigger updates', async () => {
    const values: number[] = []

    defineComponent({
      tag: 'w-test-actions',
      state: () => ({ n: 0 }),
      actions: {
        inc(ctx) { ctx.state.n++ },
        add5(ctx) { ctx.state.n += 5 },
      },
      render(ctx) {
        values.push(ctx.state.n)
        return html`
          <span id="val">${ctx.state.n}</span>
          <button id="inc" @click=${ctx.actions.inc}>+</button>
          <button id="add5" @click=${ctx.actions.add5}>+5</button>
        `
      },
    })

    const el = document.createElement('w-test-actions')
    document.body.appendChild(el)
    await wait(50)

    expect(values[0]).toBe(0)

    const shadow = el.shadowRoot!
    const incBtn = shadow.querySelector('#inc') as HTMLButtonElement
    incBtn.click()
    await wait(50)

    expect(values).toContain(1)

    const add5Btn = shadow.querySelector('#add5') as HTMLButtonElement
    add5Btn.click()
    await wait(50)

    expect(values).toContain(6)

    el.remove()
  })

  it('calls setup on first connect', async () => {
    const setupSpy = vi.fn()

    defineComponent({
      tag: 'w-test-setup',
      state: () => ({ ready: false }),
      setup(ctx) {
        ctx.state.ready = true
        setupSpy()
      },
      render(ctx) {
        return html`<span>${ctx.state.ready}</span>`
      },
    })

    const el = document.createElement('w-test-setup')
    document.body.appendChild(el)
    await wait(50)

    expect(setupSpy).toHaveBeenCalledOnce()

    el.remove()
    document.body.appendChild(el)
    await wait(50)

    expect(setupSpy).toHaveBeenCalledOnce()

    el.remove()
  })

  it('calls connected/disconnected hooks', async () => {
    const hooks: string[] = []

    defineComponent({
      tag: 'w-test-lifecycle',
      connected() { hooks.push('connected') },
      disconnected() { hooks.push('disconnected') },
      render: () => html`<span>lc</span>`,
    })

    const el = document.createElement('w-test-lifecycle')
    document.body.appendChild(el)
    await wait(50)

    expect(hooks).toContain('connected')

    el.remove()
    await wait(50)

    expect(hooks).toContain('disconnected')
  })

  it('emit dispatches a CustomEvent', async () => {
    defineComponent({
      tag: 'w-test-emit',
      actions: {
        fire(ctx) { ctx.emit('hello', { msg: 'world' }) },
      },
      render(ctx) {
        return html`<button @click=${ctx.actions.fire}>fire</button>`
      },
    })

    const el = document.createElement('w-test-emit')
    document.body.appendChild(el)
    await wait(50)

    const received: any[] = []
    el.addEventListener('hello', ((e: CustomEvent) => {
      received.push(e.detail)
    }) as EventListener)

    const btn = el.shadowRoot!.querySelector('button')!
    btn.click()
    await wait(50)

    expect(received).toHaveLength(1)
    expect(received[0]).toEqual({ msg: 'world' })

    el.remove()
  })

  it('setup receives correct initial prop value', async () => {
    let setupStart: number | undefined

    defineComponent({
      tag: 'w-test-setup-props',
      props: { start: Number },
      state: () => ({ count: 0 }),
      setup(ctx) {
        setupStart = ctx.props.start
        ctx.state.count = ctx.props.start ?? 0
      },
      render(ctx) {
        return html`<span>${ctx.state.count}</span>`
      },
    })

    const el = document.createElement('w-test-setup-props')
    el.setAttribute('start', '10')
    document.body.appendChild(el)
    await wait(50)

    expect(setupStart).toBe(10)

    el.remove()
  })
})
