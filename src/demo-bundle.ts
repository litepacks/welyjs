/**
 * Demo bundle entry — runtime + `src/components` (showcase components).
 * Used when `WELY_BUILD_MODE` is `bundle` or `chunks` (see vite.config.ts).
 * Outputs: wely.bundle.*.js / wely.chunked.es.js — for tests, `wely page` (→ docs/assets/), and local demos.
 * Not the default npm publish artifact (`npm run build` uses src/runtime only).
 */
export * from './runtime'
import './components'
