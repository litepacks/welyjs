/**
 * Shape of the global Wely config object.
 * Extend this via `defineConfig()` with any key/value pairs your app needs.
 */
export interface WelyConfig {
  [key: string]: unknown
}

let _config: WelyConfig = {}
let _sealed = false

/**
 * Set the project-wide configuration. Call this once in your entry file
 * **before** any component renders.
 *
 * Values can reference environment variables via `import.meta.env.VITE_*`.
 *
 * @example
 * ```ts
 * // wely.config.ts
 * import { defineConfig } from './src/runtime'
 *
 * export default defineConfig({
 *   apiURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
 *   theme: 'light',
 * })
 * ```
 */
export function defineConfig<T extends WelyConfig>(config: T): T {
  if (_sealed) {
    console.warn('[wely] Config is already sealed. Call defineConfig() before any component renders.')
  }
  _config = { ...config }
  return config
}

/**
 * Return the full config object (read-only).
 *
 * @example
 * ```ts
 * const cfg = getConfig()
 * console.log(cfg.apiURL)
 * ```
 */
export function getConfig<T extends WelyConfig = WelyConfig>(): Readonly<T> {
  _sealed = true
  return _config as T
}

/**
 * Read a single config value by key, with an optional fallback.
 *
 * @example
 * ```ts
 * const theme = useConfig('theme', 'light')
 * ```
 */
export function useConfig<V = unknown>(key: string): V | undefined
export function useConfig<V = unknown>(key: string, fallback: V): V
export function useConfig<V = unknown>(key: string, fallback?: V): V | undefined {
  _sealed = true
  const val = _config[key]
  return (val !== undefined ? val : fallback) as V | undefined
}

/** @internal Reset config store — used only in tests. */
export function resetConfig(): void {
  _config = {}
  _sealed = false
}
