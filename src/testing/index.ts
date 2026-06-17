/**
 * Single import surface for Wely integration tests: Vitest primitives re-exported here
 * plus small DOM helpers. Use `import { describe, it, expect } from 'welyjs/test'`.
 *
 * Requires `vitest` as a devDependency in your project.
 */
export {
  describe,
  it,
  test,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from 'vitest'

export type { Mock } from 'vitest'

import type { ComponentContext } from '../runtime/types'

/** Read the Wely context exposed on a mounted custom element (`$wely`). */
export function getComponentContext(el: HTMLElement): ComponentContext | undefined {
  return (el as HTMLElement & { $wely?: ComponentContext }).$wely
}

/**
 * Create a custom element, set attributes, append to `document.body`.
 * Call `el.remove()` in `afterEach` or pass to {@link withHost}.
 */
export function appendComponent(
  tagName: string,
  attrs?: Record<string, string | number | boolean>,
): HTMLElement {
  const el = document.createElement(tagName)
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v === true) el.setAttribute(k, '')
    else if (v === false) continue
    else el.setAttribute(k, String(v))
  }
  document.body.appendChild(el)
  return el
}

/**
 * Run `fn` with a mounted host, then remove it (even if `fn` throws).
 */
export async function withHost<T>(
  tagName: string,
  attrs: Record<string, string | number | boolean> | undefined,
  fn: (host: HTMLElement) => T | Promise<T>,
): Promise<T> {
  const host = appendComponent(tagName, attrs)
  try {
    return await fn(host)
  } finally {
    host.remove()
  }
}

/** Wait for microtasks + rendering queue. Useful after events/state updates. */
export async function flushUpdates(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

/** Click an element inside shadow DOM and wait for queued updates. */
export async function clickInShadow(host: HTMLElement, selector: string): Promise<void> {
  const target = host.shadowRoot?.querySelector(selector)
  if (!(target instanceof HTMLElement)) {
    throw new Error(`Element not found in shadow root: ${selector}`)
  }
  target.click()
  await flushUpdates()
}
