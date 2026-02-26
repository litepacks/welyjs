import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createResource } from '../resource'

describe('createResource', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('starts idle', () => {
    const res = createResource(async () => 42)
    expect(res.data).toBeUndefined()
    expect(res.loading).toBe(false)
    expect(res.error).toBeUndefined()
  })

  it('fetches data and notifies subscribers', async () => {
    const res = createResource(async () => 'hello')
    const spy = vi.fn()
    res.subscribe(spy)

    await res.fetch()

    expect(res.data).toBe('hello')
    expect(res.loading).toBe(false)
    expect(res.error).toBeUndefined()
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2) // loading → data
  })

  it('sets error on failure', async () => {
    const res = createResource(async () => {
      throw new Error('boom')
    })

    await res.fetch()

    expect(res.data).toBeUndefined()
    expect(res.loading).toBe(false)
    expect(res.error?.message).toBe('boom')
  })

  it('supports immediate option', async () => {
    const fetcher = vi.fn(async () => 99)
    createResource(fetcher, { immediate: true })

    await vi.waitFor(() => {
      expect(fetcher).toHaveBeenCalledOnce()
    })
  })

  it('passes AbortSignal to fetcher', async () => {
    let receivedSignal: AbortSignal | undefined

    const res = createResource(async (signal) => {
      receivedSignal = signal
      return 1
    })

    await res.fetch()
    expect(receivedSignal).toBeInstanceOf(AbortSignal)
  })

  it('abort() cancels loading state', async () => {
    const res = createResource(async (signal) => {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 50_000)
        signal.addEventListener('abort', () => {
          clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        })
      })
      return 1
    })

    const promise = res.fetch()
    expect(res.loading).toBe(true)

    res.abort()
    expect(res.loading).toBe(false)

    await promise.catch(() => {})
  })

  it('mutate() replaces data and notifies', () => {
    const res = createResource<string>(async () => 'original')
    const spy = vi.fn()
    res.subscribe(spy)

    res.mutate('manual')

    expect(res.data).toBe('manual')
    expect(res.error).toBeUndefined()
    expect(spy).toHaveBeenCalled()
  })

  it('reset() clears all state', async () => {
    const res = createResource(async () => 'data')
    await res.fetch()
    expect(res.data).toBe('data')

    res.reset()

    expect(res.data).toBeUndefined()
    expect(res.loading).toBe(false)
    expect(res.error).toBeUndefined()
  })

  it('refetch() is an alias for fetch()', async () => {
    let count = 0
    const res = createResource(async () => ++count)

    await res.fetch()
    expect(res.data).toBe(1)

    await res.refetch()
    expect(res.data).toBe(2)
  })

  it('unsubscribe stops notifications', async () => {
    const res = createResource(async () => 'x')
    const spy = vi.fn()
    const unsub = res.subscribe(spy)

    unsub()
    await res.fetch()

    expect(spy).not.toHaveBeenCalled()
  })
})
