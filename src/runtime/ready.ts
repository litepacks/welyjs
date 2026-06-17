import { getAllComponents } from './registry'

/** Resolves when `document` has finished parsing (or immediately if already past `loading`). */
export function whenDomReady(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  if (document.readyState !== 'loading') return Promise.resolve()
  return new Promise((resolve) => {
    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true })
  })
}

function normalizeTags(tag?: string | string[]): string[] {
  if (!tag) return [...getAllComponents().keys()]
  return Array.isArray(tag) ? tag : [tag]
}

/** Wait until listed custom element tags are defined via `customElements.define`. */
export function whenTagsDefined(tags: string[]): Promise<void> {
  if (typeof customElements === 'undefined' || tags.length === 0) {
    return Promise.resolve()
  }
  return Promise.all(tags.map((t) => customElements.whenDefined(t))).then(() => {})
}

/**
 * Resolves when the DOM is ready and Wely component tag(s) are registered.
 * Omit `tag` to wait for every component in the registry.
 */
export function ready(tag?: string | string[]): Promise<void> {
  const tags = normalizeTags(tag)
  return whenDomReady().then(() => whenTagsDefined(tags))
}

/** Callback form of {@link ready}. */
export function whenReady(fn: () => void, tag?: string | string[]): void {
  ready(tag).then(fn).catch((err) => {
    console.error('[wely] ready failed:', err)
  })
}

/**
 * Append a classic script tag and resolve when the bundle has loaded and components are ready.
 * Use for lazy / on-demand Wely bundle injection.
 */
export function loadScript(src: string, tag?: string | string[]): Promise<void> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('[wely] loadScript requires a browser document'))
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.defer = true
    script.onload = () => {
      ready(tag).then(resolve, reject)
    }
    script.onerror = () => {
      reject(new Error(`[wely] failed to load script: ${src}`))
    }
    document.head.appendChild(script)
  })
}
