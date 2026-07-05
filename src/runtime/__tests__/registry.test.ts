import { describe, it, expect, beforeEach } from 'welyjs/test'
import { registerComponent, getComponent, getAllComponents } from '../registry'
import type { ComponentDef } from '../defineComponent'

function makeDef(tag: string): ComponentDef {
  return {
    tag,
    render: () => null as any,
  }
}

describe('registry', () => {
  it('getComponent returns undefined for unregistered tag', () => {
    expect(getComponent('w-nonexistent')).toBeUndefined()
  })

  it('registerComponent stores and retrieves a def', () => {
    const def = makeDef('w-reg-test-1')
    registerComponent('w-reg-test-1', def)
    expect(getComponent('w-reg-test-1')).toBe(def)
  })

  it('getAllComponents returns a copy of the registry', () => {
    const def = makeDef('w-reg-test-2')
    registerComponent('w-reg-test-2', def)

    const all = getAllComponents()
    expect(all).toBeInstanceOf(Map)
    expect(all.has('w-reg-test-2')).toBe(true)
  })

  it('registering duplicate component warns and returns early', () => {
    const def1 = makeDef('w-reg-dup')
    const def2 = makeDef('w-reg-dup')
    registerComponent('w-reg-dup', def1)

    // Stub console.warn
    const originalWarn = console.warn
    let warnCalled = false
    console.warn = () => { warnCalled = true }
    try {
      registerComponent('w-reg-dup', def2)
      expect(warnCalled).toBe(true)
      expect(getComponent('w-reg-dup')).toBe(def1)
    } finally {
      console.warn = originalWarn
    }
  })
})
