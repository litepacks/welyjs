import { describe, it, expect } from 'welyjs/test'
import { html, nothing } from '..'

describe('core html', () => {
  it('creates a template result', () => {
    const tpl = html`<div>${'ok'}</div>`
    expect(tpl.__welyTemplate).toBe(true)
    expect(tpl.values).toEqual(['ok'])
  })

  it('keeps nothing sentinel stable', () => {
    const tpl = html`<div>${nothing}</div>`
    expect(tpl.values[0]).toBe(nothing)
  })
})
