import { LitElement } from 'lit'
import type { CSSResult } from 'lit'
import { getConfig } from './config'
import { registerComponent } from './registry'
import { createResource } from './resource'
import type { Fetcher, Resource, ResourceOptions } from './resource'
import { getTailwindSheet } from './shared-styles'
import type { Store } from './store'
import type { ComponentContext, ComponentDef, PropType } from './types'

export type { ComponentContext, ComponentDef } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toLitPropertyType(ctor: PropType) {
  switch (ctor) {
    case Number:
      return { type: Number, reflect: true }
    case Boolean:
      return { type: Boolean, reflect: true }
    case Array:
      return { type: Array }
    case Object:
      return { type: Object }
    default:
      return { type: String, reflect: true }
  }
}

function createReactiveState<S extends Record<string, unknown>>(
  initial: S,
  requestUpdate: () => void,
): S {
  return new Proxy(initial, {
    set(target, key, value) {
      const prev = Reflect.get(target, key)
      const ok = Reflect.set(target, key, value)
      if (ok && prev !== value) {
        requestUpdate()
      }
      return ok
    },
  })
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function defineComponent<
  P extends Record<string, unknown> = Record<string, unknown>,
  S extends Record<string, unknown> = Record<string, unknown>,
  A extends Record<string, (ctx: ComponentContext<P, S, any>) => void> = Record<string, (ctx: ComponentContext<P, S>) => void>,
>(def: ComponentDef<P, S, A>): void {
  const propsDef = def.props ?? {}

  const litProps: Record<string, ReturnType<typeof toLitPropertyType>> = {}
  for (const [key, ctor] of Object.entries(propsDef)) {
    litProps[key] = toLitPropertyType(ctor)
  }

  const componentStyles: CSSResult[] = def.styles
    ? Array.isArray(def.styles) ? def.styles : [def.styles]
    : []

  class GeneratedElement extends LitElement {
    static override properties = litProps
    static override styles = componentStyles

    private _ctx!: ComponentContext<P, S, A>
    private _setupDone = false
    private _cleanups: (() => void)[] = []

    constructor() {
      super()

      for (const key of Object.keys(propsDef)) {
        (this as any)[key] = undefined
      }
    }

    private _buildCtx(): ComponentContext<P, S, A> {
      const host = this

      const propsProxy = new Proxy({} as P, {
        get(_target, key: string) {
          return (host as any)[key]
        },
      })

      const rawState = def.state ? def.state() : ({} as S)
      const state = createReactiveState(rawState, () => host.requestUpdate())

      const cleanups = host._cleanups

      const ctx: ComponentContext<P, S, A> = {
        el: host,
        props: propsProxy,
        state,
        config: getConfig(),
        actions: {} as ComponentContext<P, S, A>['actions'],
        update: () => host.requestUpdate(),
        emit: (event: string, payload?: unknown) => {
          host.dispatchEvent(
            new CustomEvent(event, {
              detail: payload,
              bubbles: true,
              composed: true,
            }),
          )
        },
        resource<T>(fetcher: Fetcher<T>, options?: ResourceOptions): Resource<T> {
          const res = createResource(fetcher, options)
          const unsub = res.subscribe(() => host.requestUpdate())
          cleanups.push(() => { unsub(); res.abort() })
          return res
        },
        use<SS extends Record<string, unknown>, SA extends Record<string, (state: SS, ...args: any[]) => void>>(
          store: Store<SS, SA>,
        ): Store<SS, SA> {
          const unsub = store.subscribe(() => host.requestUpdate())
          cleanups.push(unsub)
          return store
        },
      }

      if (def.actions) {
        const boundActions = {} as ComponentContext<P, S, A>['actions']
        for (const [name, fn] of Object.entries(def.actions)) {
          (boundActions as any)[name] = () => (fn as any)(ctx)
        }
        ctx.actions = boundActions
      }

      return ctx
    }

    override connectedCallback(): void {
      super.connectedCallback()

      if (!this._setupDone) {
        this._adoptTailwind()
        this._ctx = this._buildCtx()
        if (def.setup) def.setup(this._ctx)
        this._setupDone = true
      }

      if (def.connected) def.connected(this._ctx)
    }

    private _adoptTailwind(): void {
      const twSheet = getTailwindSheet()
      if (!twSheet || !this.shadowRoot) return
      try {
        const existing = this.shadowRoot.adoptedStyleSheets ?? []
        if (!existing.includes(twSheet)) {
          this.shadowRoot.adoptedStyleSheets = [twSheet, ...existing]
        }
      } catch {
        // adoptedStyleSheets not supported (e.g. jsdom)
      }
    }

    override disconnectedCallback(): void {
      super.disconnectedCallback()
      if (def.disconnected) def.disconnected(this._ctx)
      for (const cleanup of this._cleanups) cleanup()
      this._cleanups = []
    }

    override render() {
      if (!this._ctx) {
        this._ctx = this._buildCtx()
        if (def.setup) def.setup(this._ctx)
        this._setupDone = true
      }
      return def.render(this._ctx)
    }
  }

  if (!customElements.get(def.tag)) {
    customElements.define(def.tag, GeneratedElement)
  }

  registerComponent(def.tag, def as unknown as ComponentDef)
}
