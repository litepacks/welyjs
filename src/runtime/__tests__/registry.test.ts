import { describe, it, expect, beforeEach } from 'vitest'
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
})
