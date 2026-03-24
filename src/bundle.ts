/**
 * Repo-only re-export of the runtime (used as a minimal entry in some tooling).
 * Vite “bundle” / “chunks” CI targets use `src/demo-bundle.ts` (runtime + `src/components`).
 * Consumer apps: CLI-generated `src/bundle.ts` does `export * from 'welyjs'` + your components import.
 */
export * from './runtime'
