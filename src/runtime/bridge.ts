import { getAllComponents } from './registry'
import { ready, whenReady } from './ready'
import type { ComponentContext } from './types'

export interface WelyBridge {
  /** Get the $wely context of the first matching element. Accepts a tag name or CSS selector. */
  get(tagOrSelector: string): ComponentContext | undefined
  /** Get $wely contexts of all matching elements. Accepts a tag name or CSS selector. */
  getAll(tagOrSelector: string): ComponentContext[]
  /** List all registered component tag names. */
  list(): string[]
  /**
   * Resolves when the DOM is ready and component tag(s) are defined.
   * Safe to call after dynamic `<script>` injection — use in `script.onload`.
   */
  ready(tag?: string | string[]): Promise<void>
  /** Callback form of `ready`. Errors are logged to the console. */
  whenReady(fn: () => void, tag?: string | string[]): void
}

/**
 * Install `window.wely` helper for browser DevTools and MCP-based access.
 * Called automatically when the runtime is imported.
 */
export function installBridge(): void {
  if (typeof window === 'undefined') return

  const bridge: WelyBridge = {
    get(tagOrSelector: string): ComponentContext | undefined {
      const el = document.querySelector(tagOrSelector) as any
      return el?.$wely
    },
    getAll(tagOrSelector: string): ComponentContext[] {
      const els = document.querySelectorAll(tagOrSelector)
      const results: ComponentContext[] = []
      els.forEach((el) => {
        const ctx = (el as any).$wely
        if (ctx) results.push(ctx)
      })
      return results
    },
    list(): string[] {
      return [...getAllComponents().keys()]
    },
    ready,
    whenReady,
  }

  ;(window as any).wely = bridge
}
