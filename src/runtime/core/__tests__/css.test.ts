import { describe, it, expect } from 'welyjs/test'
import { css } from '..'

describe('core css', () => {
  it('builds cssText from template strings', () => {
    const color = 'red'
    const style = css`:host{color:${color};}`
    expect(style.cssText).toContain('color:red')
  })
})
