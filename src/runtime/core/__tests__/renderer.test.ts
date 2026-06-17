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
})
