/**
 * Shared reactive store — cross-component state management.
 *
 * State is wrapped in a `Proxy` so mutations automatically notify
 * subscribers (including any component that called `ctx.use(store)`).
 *
 * @example
 * ```ts
 * // stores/auth.ts
 * export const authStore = createStore({
 *   state: () => ({
 *     user: null as User | null,
 *     token: '',
 *   }),
 *   actions: {
 *     login(state, user: User, token: string) {
 *       state.user = user
 *       state.token = token
 *     },
 *     logout(state) {
 *       state.user = null
 *       state.token = ''
 *     },
 *   },
 * })
 *
 * // inside a component
 * setup(ctx) {
 *   const auth = ctx.use(authStore)
 *   // auth.state.user, auth.actions.login(...)
 * }
 * ```
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Definition object for `createStore()`. */
export interface StoreDef<
  S extends Record<string, unknown>,
  A extends Record<string, (state: S, ...args: any[]) => void>,
> {
  /** Factory that returns the initial state. */
  state: () => S
  /** Named mutations that receive `state` as the first argument. */
  actions?: A
}

/** Bound action: same signature as the definition minus the leading `state` param. */
type BoundAction<F> = F extends (state: any, ...args: infer R) => void
  ? (...args: R) => void
  : never

/** The store instance returned by `createStore()`. */
export interface Store<
  S extends Record<string, unknown>,
  A extends Record<string, (state: S, ...args: any[]) => void>,
> {
  /** Reactive state — reads are always current, writes notify subscribers. */
  readonly state: S
  /** Bound actions (no `state` param needed). */
  readonly actions: { [K in keyof A]: BoundAction<A[K]> }
  /**
   * Register a callback invoked whenever state changes.
   * Returns an unsubscribe function.
   */
  subscribe: (fn: () => void) => () => void
  /** Replace the entire state and notify subscribers. */
  reset: () => void
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export function createStore<
  S extends Record<string, unknown>,
  A extends Record<string, (state: S, ...args: any[]) => void> = Record<string, never>,
>(def: StoreDef<S, A>): Store<S, A> {
  const _subs = new Set<() => void>()
  let _batchDepth = 0
  let _batchDirty = false

  function notify() {
    if (_batchDepth > 0) {
      _batchDirty = true
      return
    }
    for (const fn of _subs) fn()
  }

  function makeReactive(raw: S): S {
    return new Proxy(raw, {
      set(target, key, value) {
        const prev = Reflect.get(target, key)
        const ok = Reflect.set(target, key, value)
        if (ok && prev !== value) notify()
        return ok
      },
    })
  }

  let _state = makeReactive(def.state())

  const boundActions = {} as Store<S, A>['actions']
  if (def.actions) {
    for (const [name, fn] of Object.entries(def.actions)) {
      (boundActions as any)[name] = (...args: unknown[]) => {
        _batchDepth++
        try {
          ;(fn as any)(_state, ...args)
        } finally {
          _batchDepth--
          if (_batchDepth === 0 && _batchDirty) {
            _batchDirty = false
            notify()
          }
        }
      }
    }
  }

  return {
    get state() { return _state },
    actions: boundActions,

    subscribe(fn: () => void) {
      _subs.add(fn)
      return () => { _subs.delete(fn) }
    },

    reset() {
      _state = makeReactive(def.state())
      notify()
    },
  }
}
