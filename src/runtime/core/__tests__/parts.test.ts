import { describe, it, expect } from 'welyjs/test'
import { commit } from '../renderer'
import { html } from '..'

describe('core parts', () => {
  it('handles event, boolean and property parts', () => {
    const host = document.createElement('div')
    const shadow = host.attachShadow({ mode: 'open' })
    let clicked = false

    commit(
      shadow,
      html`<button @click=${() => { clicked = true }} ?disabled=${false} .value=${'a'}>go</button>`,
    )

    const btn = shadow.querySelector('button') as HTMLButtonElement
    expect(btn.hasAttribute('disabled')).toBe(false)
    expect((btn as any).value).toBe('a')
    btn.click()
    expect(clicked).toBe(true)
  })
})
