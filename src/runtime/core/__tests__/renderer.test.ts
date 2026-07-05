import { describe, it, expect } from 'welyjs/test'
import { commit } from '../renderer'
import { html, nothing } from '..'

describe('core renderer', () => {
  it('renders and updates template values', () => {
    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })

    commit(shadow, html`<p>${'first'}</p>`)
    expect(shadow.textContent).toContain('first')

    const nodeBefore = shadow.querySelector('p')
    commit(shadow, html`<p>${'second'}</p>`)
    const nodeAfter = shadow.querySelector('p')
    expect(nodeAfter).toBe(nodeBefore)
    expect(shadow.textContent).toContain('second')
  })

  it('supports arrays and nothing', () => {
    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })

    commit(shadow, html`<ul>${['a', nothing, 'b'].map((x) => html`<li>${x}</li>`)}</ul>`)
    expect(shadow.querySelectorAll('li')).toHaveLength(3)
    expect(shadow.textContent).toContain('a')
    expect(shadow.textContent).toContain('b')
  })

  it('supports attributes, boolean attributes, properties, and event listeners', () => {
    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })

    let clicked = false
    const handleClick = () => { clicked = true }

    commit(shadow, html`
      <div
        class="foo ${'bar'}"
        id=${'test-id'}
        ?disabled=${true}
        .myprop=${42}
        @click=${handleClick}
      ></div>
    `)

    const div = shadow.querySelector('div') as any
    expect(div).toBeDefined()
    expect(div.getAttribute('class')).toBe('foo bar')
    expect(div.getAttribute('id')).toBe('test-id')
    expect(div.hasAttribute('disabled')).toBe(true)
    expect(div.myprop).toBe(42)

    // Click trigger
    div.dispatchEvent(new Event('click'))
    expect(clicked).toBe(true)

    // Test updates and removals using the exact same template structure for in-place updates
    commit(shadow, html`
      <div
        class="foo ${'bar'}"
        id=${null}
        ?disabled=${false}
        .myprop=${undefined}
        @click=${handleClick}
      ></div>
    `)

    expect(div.getAttribute('id')).toBeNull()
    expect(div.hasAttribute('disabled')).toBe(false)
  })

  it('supports raw DOM Node and nested TemplateResult values', () => {
    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })

    const span = document.createElement('span')
    span.textContent = 'raw node'

    commit(shadow, html`<div class="container">${span} and ${html`<b>nested</b>`}</div>`)
    expect(shadow.textContent).toContain('raw node and nested')
  })

  it('does not bind event listeners if the value is not a function', () => {
    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })

    commit(shadow, html`<div @click=${undefined}></div>`)
    const div = shadow.querySelector('div')
    expect(div).toBeDefined()
  })
})
