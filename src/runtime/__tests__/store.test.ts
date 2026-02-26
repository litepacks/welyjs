import { describe, it, expect, vi } from 'vitest'
import { createStore } from '../store'

describe('createStore', () => {
  it('initializes state from factory', () => {
    const store = createStore({
      state: () => ({ count: 0, name: 'test' }),
    })

    expect(store.state.count).toBe(0)
    expect(store.state.name).toBe('test')
  })

  it('notifies subscribers on state mutation', () => {
    const store = createStore({
      state: () => ({ count: 0 }),
    })
    const spy = vi.fn()
    store.subscribe(spy)

    store.state.count = 5

    expect(spy).toHaveBeenCalledOnce()
    expect(store.state.count).toBe(5)
  })

  it('does not notify when value is unchanged', () => {
    const store = createStore({
      state: () => ({ count: 0 }),
    })
    const spy = vi.fn()
    store.subscribe(spy)

    store.state.count = 0

    expect(spy).not.toHaveBeenCalled()
  })

  it('binds actions without state param', () => {
    const store = createStore({
      state: () => ({ count: 0 }),
      actions: {
        increment(state) {
          state.count++
        },
        add(state, amount: number) {
          state.count += amount
        },
      },
    })

    store.actions.increment()
    expect(store.state.count).toBe(1)

    store.actions.add(10)
    expect(store.state.count).toBe(11)
  })

  it('batches notifications within actions', () => {
    const store = createStore({
      state: () => ({ a: 0, b: 0 }),
      actions: {
        updateBoth(state) {
          state.a = 1
          state.b = 2
        },
      },
    })
    const spy = vi.fn()
    store.subscribe(spy)

    store.actions.updateBoth()

    expect(spy).toHaveBeenCalledOnce()
    expect(store.state.a).toBe(1)
    expect(store.state.b).toBe(2)
  })

  it('reset() restores initial state', () => {
    const store = createStore({
      state: () => ({ count: 0 }),
    })

    store.state.count = 99
    expect(store.state.count).toBe(99)

    store.reset()
    expect(store.state.count).toBe(0)
  })

  it('reset() notifies subscribers', () => {
    const store = createStore({
      state: () => ({ count: 0 }),
    })
    const spy = vi.fn()
    store.subscribe(spy)

    store.reset()
    expect(spy).toHaveBeenCalledOnce()
  })

  it('unsubscribe stops notifications', () => {
    const store = createStore({
      state: () => ({ count: 0 }),
    })
    const spy = vi.fn()
    const unsub = store.subscribe(spy)

    unsub()
    store.state.count = 5

    expect(spy).not.toHaveBeenCalled()
  })

  it('multiple subscribers all get notified', () => {
    const store = createStore({
      state: () => ({ count: 0 }),
    })
    const spy1 = vi.fn()
    const spy2 = vi.fn()
    store.subscribe(spy1)
    store.subscribe(spy2)

    store.state.count = 1

    expect(spy1).toHaveBeenCalledOnce()
    expect(spy2).toHaveBeenCalledOnce()
  })

  it('works with no actions defined', () => {
    const store = createStore({
      state: () => ({ value: 'hello' }),
    })

    expect(store.state.value).toBe('hello')
    expect(store.actions).toEqual({})
  })
})
