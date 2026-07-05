import { vi } from 'vitest'

vi.mock('virtual:wely-tailwind.css?inline', () => {
  return {
    default: 'body { color: red; }'
  }
})

import { describe, it, expect } from 'welyjs/test'
import { html, css } from '../index'
import { defineComponent } from '../defineComponent'
import { getComponent } from '../registry'
import { defineConfig, resetConfig } from '../config'

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

  it('adds data-wely-* attributes when devInfo is enabled (default)', async () => {
    resetConfig()
    defineConfig({ version: '1.2.3' })

    defineComponent({
      tag: 'w-test-devinfo',
      render: () => html`<span>ok</span>`,
    })

    const el = document.createElement('w-test-devinfo')
    document.body.appendChild(el)
    await wait(50)

    expect(el.getAttribute('data-wely-version')).toBe('1.2.3')
    expect(el.getAttribute('data-wely-mounted')).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    el.remove()
    resetConfig()
  })

  it('omits data-wely-* when devInfo is false', async () => {
    defineComponent({
      tag: 'w-test-devinfo-off',
      devInfo: false,
      render: () => html`<span>ok</span>`,
    })

    const el = document.createElement('w-test-devinfo-off')
    document.body.appendChild(el)
    await wait(50)

    expect(el.getAttribute('data-wely-version')).toBeNull()
    expect(el.getAttribute('data-wely-mounted')).toBeNull()

    el.remove()
  })

  it('uses component-level version when devInfo.version is set', async () => {
    resetConfig()
    defineConfig({ version: 'global-1.0' })

    defineComponent({
      tag: 'w-test-devinfo-override',
      devInfo: { version: '2.0.0' },
      render: () => html`<span>ok</span>`,
    })

    const el = document.createElement('w-test-devinfo-override')
    document.body.appendChild(el)
    await wait(50)

    expect(el.getAttribute('data-wely-version')).toBe('2.0.0')

    el.remove()
    resetConfig()
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

  it('renders slot content from light DOM', async () => {
    defineComponent({
      tag: 'w-test-slot',
      render: () => html`<div><slot></slot></div>`,
    })

    const el = document.createElement('w-test-slot')
    el.textContent = 'inside'
    document.body.appendChild(el)
    await wait(50)

    const slot = el.shadowRoot?.querySelector('slot')
    expect(slot).toBeDefined()
    expect((slot as HTMLSlotElement).assignedNodes().length).toBeGreaterThan(0)

    el.remove()
  })

  it('applies component styles with css helper', async () => {
    defineComponent({
      tag: 'w-test-styles',
      styles: css`:host{display:block;}`,
      render: () => html`<span>ok</span>`,
    })

    const el = document.createElement('w-test-styles')
    document.body.appendChild(el)
    await wait(50)

    const styleTag = el.shadowRoot?.querySelector('style')
    const adopted = el.shadowRoot?.adoptedStyleSheets ?? []
    expect(Boolean(styleTag) || adopted.length > 0).toBe(true)

    el.remove()
  })

  it('updates .value bindings on re-render', async () => {
    defineComponent({
      tag: 'w-test-prop-binding',
      state: () => ({ value: 'first' }),
      actions: {
        change(ctx) {
          ctx.state.value = 'second'
        },
      },
      render(ctx) {
        return html`
          <input id="field" .value=${ctx.state.value} />
          <button id="go" @click=${ctx.actions.change}>change</button>
        `
      },
    })

    const el = document.createElement('w-test-prop-binding')
    document.body.appendChild(el)
    await wait(50)

    const input = el.shadowRoot?.querySelector('#field') as HTMLInputElement
    const button = el.shadowRoot?.querySelector('#go') as HTMLButtonElement
    expect(input.value).toBe('first')

    button.click()
    await wait(50)
    expect(input.value).toBe('second')

    el.remove()
  })

  it('initializes context inside renderTemplate if connectedCallback has not run', () => {
    let setupCtx: any
    defineComponent({
      tag: 'w-test-disconnected',
      props: {
        title: { type: String, default: 'disconnected-default' }
      },
      setup(ctx) {
        setupCtx = ctx
        ctx.state.value = 'inited'
      },
      state: () => ({ value: '' }),
      render: (ctx) => html`<span>${ctx.state.value}</span>`
    })

    const el = document.createElement('w-test-disconnected')
    // Manually trigger performUpdate while not attached to DOM
    ;(el as any).performUpdate()
    expect((el as any)._setupDone).toBe(true)
    expect(el.shadowRoot?.textContent).toBe('inited')
    expect(setupCtx.props.title).toBe('disconnected-default')
  })

  it('applies an array of component styles', async () => {
    defineComponent({
      tag: 'w-test-styles-array',
      styles: [css`:host{display:block;}`, css`span{color:red;}`],
      render: () => html`<span>ok</span>`,
    })

    const el = document.createElement('w-test-styles-array')
    document.body.appendChild(el)
    await wait(50)

    const styleTag = el.shadowRoot?.querySelector('style')
    const adopted = el.shadowRoot?.adoptedStyleSheets ?? []
    expect(Boolean(styleTag) || adopted.length > 0).toBe(true)

    el.remove()
  })

  it('handles adoptedStyleSheets assignment error gracefully in _adoptTailwind', async () => {
    const { getTailwindSheet } = await import('../shared-styles')
    const twSheet = getTailwindSheet() ?? new CSSStyleSheet()
    
    defineComponent({
      tag: 'w-test-adopt-fail',
      render: () => html`<span>ok</span>`
    })
    
    const el = document.createElement('w-test-adopt-fail')
    Object.defineProperty(el.shadowRoot, 'adoptedStyleSheets', {
      get() { return [] },
      set() { throw new Error('stub error') },
      configurable: true
    })
    
    document.body.appendChild(el)
    await wait(10)
    el.remove()
  })

  it('binds actions in component setup context', async () => {
    let actionTriggered = false
    defineComponent({
      tag: 'w-test-setup-actions',
      actions: {
        clickAction() {
          actionTriggered = true
        }
      },
      render: (ctx) => html`<button id="btn" @click=${ctx.actions.clickAction}>click</button>`
    })

    const el = document.createElement('w-test-setup-actions')
    document.body.appendChild(el)
    await wait(20)

    const button = el.shadowRoot?.querySelector('#btn') as HTMLButtonElement
    button.click()
    expect(actionTriggered).toBe(true)

    el.remove()
  })

  it('applies default property configurations', async () => {
    defineComponent({
      tag: 'w-test-prop-defaults',
      props: {
        active: { type: Boolean, default: true },
        title: { type: String, default: 'wely' },
        info: { type: Object, default: { id: 1 } }
      },
      render: () => html`<span>ok</span>`
    })

    const el = document.createElement('w-test-prop-defaults')
    document.body.appendChild(el)
    await wait(20)

    expect(el.hasAttribute('active')).toBe(true)
    expect(el.getAttribute('title')).toBe('wely')
    expect(el.getAttribute('info')).toBe('{"id":1}')

    el.remove()
  })

  it('supports context helpers like update, resource, use and default props proxy access', async () => {
    const { createStore } = await import('../store')
    let setupCtx: any
    const testStore = createStore({ state: () => ({ value: 1 }) })

    defineComponent({
      tag: 'w-test-ctx-helpers',
      props: {
        title: { type: String, default: 'default-wely' }
      },
      setup(ctx) {
        setupCtx = ctx
        ctx.use(testStore)
        ctx.resource(async () => 'ok')
      },
      render: () => html`<span>ok</span>`
    })

    const el = document.createElement('w-test-ctx-helpers')
    document.body.appendChild(el)
    await wait(20)

    expect(setupCtx.props.title).toBe('default-wely')
    setupCtx.update()

    el.remove()
  })

  it('parses Object and Array properties from attributes', async () => {
    let setupCtx: any
    defineComponent({
      tag: 'w-test-prop-parsing',
      props: {
        list: Array,
        data: Object,
      },
      setup(ctx) {
        setupCtx = ctx
      },
      render: () => html`<span>ok</span>`
    })

    const el = document.createElement('w-test-prop-parsing')
    el.setAttribute('list', '[1, 2, 3]')
    el.setAttribute('data', '{"val": 100}')
    document.body.appendChild(el)
    await wait(20)

    expect(setupCtx.props.list).toEqual([1, 2, 3])
    expect(setupCtx.props.data).toEqual({ val: 100 })

    el.setAttribute('data', 'invalid-json')
    expect(setupCtx.props.data).toBeUndefined()

    el.remove()
  })
})
