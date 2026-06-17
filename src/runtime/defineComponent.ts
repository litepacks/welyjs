import type { CSSResult } from './core'
import { WelyElement } from './core'
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

function parsePropValue(host: HTMLElement, key: string, ctor: PropType): unknown {
  const attr = host.getAttribute(key)
  if (ctor === Number) return attr == null ? undefined : Number(attr)
  if (ctor === Boolean) return host.hasAttribute(key)
  if (ctor === Array || ctor === Object) {
    if (attr == null) return undefined
    try {
      return JSON.parse(attr)
    } catch {
      return undefined
    }
  }
  return attr == null ? undefined : attr
}

function toObservedAttribute(ctor: PropType) {
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
  A extends Record<string, (ctx: ComponentContext<P, S, any>, event?: Event) => void> = Record<string, (ctx: ComponentContext<P, S>, event?: Event) => void>,
>(def: ComponentDef<P, S, A>): void {
  const propsDef = def.props ?? {}

  const observedProps: Record<string, ReturnType<typeof toObservedAttribute>> = {}
  for (const [key, ctor] of Object.entries(propsDef)) {
    observedProps[key] = toObservedAttribute(ctor)
  }

  const componentStyles: CSSResult[] = def.styles
    ? Array.isArray(def.styles) ? def.styles : [def.styles]
    : []

  class GeneratedElement extends WelyElement {
    static override observedAttributes = Object.keys(observedProps)
    static override styles = componentStyles

    private _ctx!: ComponentContext<P, S, A>
    private _setupDone = false
    private _cleanups: (() => void)[] = []

    constructor() {
      super()
    }

    private _buildCtx(): ComponentContext<P, S, A> {
      const host = this

      const propsProxy = new Proxy({} as P, {
        get(_target, key: string) {
          const ctor = propsDef[key]
          if (!ctor) return undefined
          return parsePropValue(host, key, ctor)
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
          (boundActions as any)[name] = (event?: Event) => (fn as any)(ctx, event)
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
        this._applyDevInfo()
        ;(this as any).$wely = this._ctx
      }

      if (def.connected) def.connected(this._ctx)
    }

    override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
      super.attributeChangedCallback(name, oldValue, newValue)
    }

    private _applyDevInfo(): void {
      if (def.devInfo === false) return
      const cfg = getConfig()
      const version =
        (typeof def.devInfo === 'object' && typeof def.devInfo?.version === 'string' ? def.devInfo.version : undefined) ??
        (typeof cfg.version === 'string' ? cfg.version : undefined) ??
        '0.0.0'
      this.setAttribute('data-wely-version', version)
      this.setAttribute('data-wely-mounted', new Date().toISOString())
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
      if (def.disconnected) def.disconnected(this._ctx)
      for (const cleanup of this._cleanups) cleanup()
      this._cleanups = []
    }

    protected override renderTemplate() {
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
