import { describe, it, expect } from 'welyjs/test'
import { css } from '..'

describe('core css', () => {
  it('builds cssText from template strings', () => {
    const color = 'red'
    const style = css`:host{color:${color};}`
    expect(style.cssText).toContain('color:red')
  })

  it('handles interpolation of CSSResult objects and invalid types', () => {
    const subStyle = css`background: blue;`
    const mainStyle = css`div { ${subStyle}; border: 1px solid black; ${null}; ${12}; }`
    expect(mainStyle.cssText).toContain('background: blue;')
    expect(mainStyle.cssText).toContain('border: 1px solid black;')
    expect(mainStyle.cssText).toContain('12')
  })
})
