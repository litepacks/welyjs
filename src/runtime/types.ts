import type { CSSResult, TemplateResult } from 'lit'
import type { Fetcher, Resource, ResourceOptions } from './resource'
import type { Store } from './store'

/** Supported property constructor types for attribute ↔ property sync. */
export type PropType = typeof Number | typeof String | typeof Boolean | typeof Array | typeof Object

/**
 * Context object passed to every lifecycle and render function.
 *
 * @example
 * ```ts
 * setup(ctx) {
 *   ctx.state.count = ctx.props.start ?? 0
 * }
 * ```
 */
export interface ComponentContext<
  P extends Record<string, unknown> = Record<string, unknown>,
  S extends Record<string, unknown> = Record<string, unknown>,
  A extends Record<string, (ctx: ComponentContext<P, S, A>) => void> = Record<string, (ctx: ComponentContext<P, S>) => void>,
> {
  /** Reference to the host HTMLElement (the custom element itself). */
  el: HTMLElement
  /** Readonly proxy to attribute-synced properties. */
  props: Readonly<P>
  /** Auto-reactive state — mutations trigger re-render automatically. */
  state: S
  /** Project-wide config from `wely.config.ts`, read-only at runtime. */
  config: Readonly<Record<string, unknown>>
  /** Bound action map. Use in templates: @input=${ctx.actions.onSearch}. Handler receives (ctx, event) — event.target gives the element. */
  actions: { [K in keyof A]: (event?: Event) => void }
  /** Manually request a re-render. Usually unnecessary — state is already reactive. */
  update: () => void
  /** Dispatch a bubbling, composed `CustomEvent`. */
  emit: (event: string, payload?: unknown) => void
  /**
   * Create an async resource bound to this component's lifecycle.
   * The resource auto-triggers re-renders on state changes and auto-aborts on disconnect.
   *
   * @example
   * ```ts
   * setup(ctx) {
   *   const users = ctx.resource(
   *     (signal) => api.get<User[]>('/users', { signal }).then(r => r.data),
   *     { immediate: true },
   *   )
   *   // users.data, users.loading, users.error
   * }
   * ```
   */
  resource: <T>(fetcher: Fetcher<T>, options?: ResourceOptions) => Resource<T>
  /**
   * Subscribe to a shared store. The component re-renders when store state changes.
   * Automatically unsubscribes on disconnect.
   *
   * @example
   * ```ts
   * setup(ctx) {
   *   const auth = ctx.use(authStore)
   *   // auth.state.user, auth.actions.login(...)
   * }
   * ```
   */
  use: <SS extends Record<string, unknown>, SA extends Record<string, (state: SS, ...args: any[]) => void>>(
    store: Store<SS, SA>,
  ) => Store<SS, SA>
}

/**
 * Component definition object — the single argument to `defineComponent()`.
 *
 * @example
 * ```ts
 * defineComponent({
 *   tag: 'w-counter',
 *   props: { start: Number },
 *   state() { return { count: 0 } },
 *   actions: {
 *     increment(ctx) { ctx.state.count++ },
 *   },
 *   render(ctx) {
 *     return html`<button @click=${ctx.actions.increment}>${ctx.state.count}</button>`
 *   },
 * })
 * ```
 */
export interface ComponentDef<
  P extends Record<string, unknown> = Record<string, unknown>,
  S extends Record<string, unknown> = Record<string, unknown>,
  A extends Record<string, (ctx: ComponentContext<P, S, any>, event?: Event) => void> = Record<string, (ctx: ComponentContext<P, S>, event?: Event) => void>,
> {
  /** Custom element tag name. Must contain a hyphen (e.g. `w-button`). */
  tag: string
  /** Attribute-synced properties. Keys become HTML attributes. */
  props?: Record<string, PropType>
  /** Component-scoped styles via Lit's `css` helper. */
  styles?: CSSResult | CSSResult[]
  /** Factory that returns the initial reactive state object. */
  state?: () => S
  /** Named action handlers. Signature: (ctx, event?) => void. Use @input=${ctx.actions.onSearch} — event.target gives the element. */
  actions?: A
  /** Called once when the element first connects to the DOM. */
  setup?: (ctx: ComponentContext<P, S, A>) => void
  /** Returns the component template. Called on every render cycle. */
  render: (ctx: ComponentContext<P, S, A>) => TemplateResult
  /** Called on every `connectedCallback` (including re-insertions). */
  connected?: (ctx: ComponentContext<P, S, A>) => void
  /** Called on every `disconnectedCallback`. */
  disconnected?: (ctx: ComponentContext<P, S, A>) => void
  /**
   * When true (default), adds `data-wely-version` and `data-wely-mounted` attributes for dev tools.
   * Set to `false` to disable. Pass `{ version: '1.2.3' }` to override version per component.
   */
  devInfo?: boolean | { version?: string }
}
