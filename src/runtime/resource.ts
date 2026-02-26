/**
 * Reactive async data primitive.
 *
 * Tracks `loading`, `error`, and `data` states for any async operation.
 * Subscribers are notified on every state transition, making it trivial
 * to wire into a component's render cycle.
 *
 * @example
 * ```ts
 * const users = createResource(async (signal) => {
 *   const { data } = await api.get<User[]>('/users', { signal })
 *   return data
 * })
 *
 * users.fetch()           // trigger manually
 * users.data              // User[] | undefined
 * users.loading           // boolean
 * users.error             // Error | undefined
 * users.refetch()         // re-run the fetcher
 * users.abort()           // cancel in-flight request
 * ```
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A function that performs an async operation. Receives an `AbortSignal` for cancellation. */
export type Fetcher<T> = (signal: AbortSignal) => Promise<T>

/** Options for `createResource`. */
export interface ResourceOptions {
  /**
   * When `true`, the fetcher runs immediately on creation.
   * @default false
   */
  immediate?: boolean
}

/** Reactive async data container. */
export interface Resource<T> {
  /** Resolved data, or `undefined` while loading / before first fetch. */
  readonly data: T | undefined
  /** `true` while the fetcher is in-flight. */
  readonly loading: boolean
  /** The error from the last failed fetch, or `undefined` on success. */
  readonly error: Error | undefined
  /** Trigger the fetcher. Aborts any previous in-flight request. */
  fetch: () => Promise<void>
  /** Alias for `fetch()` — re-runs the same fetcher. */
  refetch: () => Promise<void>
  /** Abort the current in-flight request (no-op if idle). */
  abort: () => void
  /**
   * Register a callback invoked on every state change.
   * Returns an unsubscribe function.
   */
  subscribe: (fn: () => void) => () => void
  /** Replace the data value manually and notify subscribers. */
  mutate: (value: T) => void
  /** Reset to initial state (no data, no error, not loading). */
  reset: () => void
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createResource<T>(
  fetcher: Fetcher<T>,
  options: ResourceOptions = {},
): Resource<T> {
  let _data: T | undefined
  let _loading = false
  let _error: Error | undefined
  let _controller: AbortController | null = null
  const _subs = new Set<() => void>()

  function notify() {
    for (const fn of _subs) fn()
  }

  async function run() {
    _controller?.abort()
    _controller = new AbortController()

    _loading = true
    _error = undefined
    notify()

    try {
      _data = await fetcher(_controller.signal)
      _loading = false
      notify()
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return
      _error = err instanceof Error ? err : new Error(String(err))
      _loading = false
      notify()
    } finally {
      _controller = null
    }
  }

  const resource: Resource<T> = {
    get data() { return _data },
    get loading() { return _loading },
    get error() { return _error },

    fetch: run,
    refetch: run,
    abort() {
      _controller?.abort()
      _controller = null
      if (_loading) {
        _loading = false
        notify()
      }
    },

    subscribe(fn: () => void) {
      _subs.add(fn)
      return () => { _subs.delete(fn) }
    },

    mutate(value: T) {
      _data = value
      _error = undefined
      notify()
    },

    reset() {
      _controller?.abort()
      _controller = null
      _data = undefined
      _loading = false
      _error = undefined
      notify()
    },
  }

  if (options.immediate) {
    run()
  }

  return resource
}
