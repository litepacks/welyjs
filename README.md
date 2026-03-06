# Wely

A lightweight Web Component framework built on a single `defineComponent()` factory function. No class syntax, no framework lock-in — just plain config objects that produce native custom elements.

Lit powers the rendering engine internally but is never exposed to consumers. Developers interact exclusively through the Wely API.

## Why Wely?

Building frontend components today typically means choosing a heavy framework, wiring up a dozen separate tools, and learning framework-specific abstractions. Wely replaces that entire workflow with a single unified toolkit.

### The problem

1. **Too many moving parts.** A typical component project requires a framework (React, Vue, Svelte), a bundler, a test runner, a dev server, a CSS pipeline, and an HTTP client — each with its own config file and mental model.
2. **Framework lock-in.** Components written for one framework cannot be dropped into another. Migrating means rewriting.
3. **Boilerplate overhead.** Class-based or hook-based patterns demand ceremony that gets in the way, especially when generating code with LLM tools.
4. **No single source of truth.** Build, test, preview, scaffold, and export are spread across unrelated scripts with no shared conventions.
5. **Documentation falls behind.** Components grow but their docs don't — prop types, actions, and usage examples live only in developers' heads.

### How Wely solves it

| Step | What you do | What Wely handles |
|---|---|---|
| **Configure** | Edit `wely.config.ts` and `.env` | Centralized, env-aware config accessible everywhere via `ctx.config` |
| **Create** | `wely create w-card --props title:String` | Scaffolds a ready-to-use component file and updates the barrel index |
| **Develop** | `wely dev` | Launches a hot-reloading playground where every component is instantly testable |
| **Style** | Use Tailwind classes directly in templates | Tailwind CSS is compiled and injected into Shadow DOM automatically |
| **Fetch data** | `createClient({ baseURL })` | Built-in HTTP client with interceptors, timeout, and typed responses |
| **Manage state** | `ctx.resource()` / `ctx.use(store)` | Async resources + shared stores with auto re-render, abort, and batching |
| **Test** | `wely test` | Vitest runs against real DOM with zero extra config (same `vite.config.ts`) |
| **Build** | `wely build` | Produces ES + UMD bundles — standard Web Components usable anywhere |
| **Export** | `wely export ../other-project/lib` | Copies the built output directly into any project folder |
| **Document** | `wely docs` | Parses component source files and generates a complete `COMPONENTS.md` reference |

The entire lifecycle — from scaffolding a component to shipping it into production — happens through one CLI and one config file.

### What comes out

The output is **native custom elements**. No virtual DOM, no framework runtime at the consumer side. The components work in plain HTML, inside React, Vue, Angular, Svelte, or any other environment that supports the DOM.

```html
<!-- works anywhere -->
<script src="wely.umd.js"></script>
<w-counter start="5"></w-counter>
```

### Portability

Wely components are **fully portable** — build once, use anywhere.

| Aspect | Behavior |
|---|---|
| **Output** | Standard Web Components (Custom Elements v1, Shadow DOM). No framework-specific bundle. |
| **Consumer runtime** | Zero Wely runtime at the consumer side. Components are plain DOM elements. |
| **Drop-in** | Works in plain HTML, React, Vue, Angular, Svelte, Astro, Eleventy, or any environment with a DOM. |
| **Formats** | ES module and UMD — use with bundlers or classic `<script>` tags. |
| **Deployment** | `wely export <path>` copies the built output to any project folder. No lock-in. |

**Example — use in React:**

```tsx
<w-counter start={5} />
```

**Example — use in Vue:**

```vue
<w-counter start="5" />
```

**Example — use in plain HTML:**

```html
<script src="wely.bundle.umd.js"></script>
<w-pokemon-grid limit="12"></w-pokemon-grid>
```

The same component works in all of these without modification.

### Bundle Size

Wely produces minimal bundles. Runtime includes Lit, our API (defineComponent, store, resource, fetch), and Tailwind CSS. All sizes below are **minified + gzipped**.

| Build | Size (min+gzip) |
|-------|-----------------|
| Runtime only (`wely.es.js`) | **13 KB** |
| 1 component (w-button) | **13.3 KB** |
| 2 components (+ w-counter) | **13.6 KB** |
| 3 components (+ w-counter-card) | **14 KB** |
| 5 components (+ w-pokemon-grid, w-user-list) | **15 KB** |

**Per-component overhead:** ~0.4–0.5 KB for simple components.

**Pay for what you use** — Wely bundles only what you import. Add one component → ~13 KB. Add five → ~15 KB. No framework runtime at the consumer; output is native Web Components. Tree-shaking keeps the bundle minimal: unused components never land in the final file.

**Smaller bundles** — Consumer builds use esbuild minify (fast). For ~5–15% smaller output, add a custom `vite.config` with `minify: 'terser'` and `terser` as a devDependency. The Wely repo uses Terser for published builds.

## Quick Start

### Minimal setup (new project)

Add **only** `wely.config.ts` and `welyjs` as a dependency. No vite.config, no extra devDependencies — Wely brings them.

```bash
mkdir my-app && cd my-app
wely init                    # creates wely.config.ts + package.json with welyjs
npm install
wely create w-hello --props msg:String
wely build                   # → dist/wely.bundle.es.js, dist/wely.bundle.umd.js
wely dev                     # playground at localhost:5173
```

On first `wely build` or `wely dev`, the CLI creates `src/bundle.ts`, `src/wely-components/index.ts`, and other files as needed. The components directory defaults to `src/wely-components` (configurable via `package.json`).

### Dev mode & playground

`wely dev` starts a Vite dev server with a hot-reloading playground. On first run (when no `vite.config` exists), the CLI creates:

| File | Purpose |
|------|---------|
| `index.html` | Playground page with `#app` container |
| `src/playground/main.ts` | Entry that imports components and renders each via `getAllComponents()` |
| `src/styles/tailwind.css` | Tailwind entry with `@source` for component templates |

**Auto-rendering:** All registered components are rendered automatically. Each `<w-*>` tag gets its own section with a label. When you add a new component with `wely create`, it appears in the playground immediately (HMR). No manual HTML edits needed.

**With or without vite.config:** If the project has no `vite.config`, Wely uses its built-in `vite.dev.config.ts`. If you have a custom `vite.config`, `wely dev` uses that instead.

### Full repo (Wely development)

```bash
npm install
npm run dev      # playground at localhost:5173
npm run build    # library → dist/wely.es.js + dist/wely.umd.js
npm run test     # vitest in watch mode
npm run test:run # single run
```

## Defining a Component

Every component is a plain object passed to `defineComponent()`:

```ts
import { defineComponent, html } from 'welyjs'

defineComponent({
  tag: 'w-counter',

  props: { start: Number },

  state() {
    return { count: 0 }
  },

  setup(ctx) {
    ctx.state.count = ctx.props.start ?? 0
  },

  actions: {
    increment(ctx) { ctx.state.count++ },
    decrement(ctx) { ctx.state.count-- },
    reset(ctx)     { ctx.state.count = ctx.props.start ?? 0 },
  },

  render(ctx) {
    return html`
      <button @click=${ctx.actions.decrement}>-</button>
      <span>${ctx.state.count}</span>
      <button @click=${ctx.actions.increment}>+</button>
      <button @click=${ctx.actions.reset}>Reset</button>
    `
  },
})
```

Then use it anywhere:

```html
<w-counter start="5"></w-counter>
```

## Component Composition

Wely components are **native Custom Elements** — they can be nested inside each other with zero ceremony. Just use the tag name in any template:

```ts
defineComponent({
  tag: 'w-counter-card',
  props: { title: String, start: Number },
  state() { return { lastEvent: '' } },
  actions: {
    onCounterClick(ctx) {
      ctx.state.lastEvent = `Clicked at ${new Date().toLocaleTimeString()}`
    },
  },
  render(ctx) {
    return html`
      <div class="border rounded-lg p-4 space-y-3">
        <h3>${ctx.props.title}</h3>
        <!-- Child components — just use the tag -->
        <w-counter start=${ctx.props.start ?? 0}></w-counter>
        <w-button label="Action" variant="primary" @w-click=${ctx.actions.onCounterClick}></w-button>
        ${ctx.state.lastEvent ? html`<p>${ctx.state.lastEvent}</p>` : ''}
      </div>
    `
  },
})
```

```html
<w-counter-card title="Score" start="10"></w-counter-card>
```

### How it works

| Concept | Mechanism |
|---|---|
| **Nesting** | Any `<w-*>` tag in a template is resolved by the browser's Custom Elements registry — no import needed |
| **Parent → Child data** | Pass data through HTML attributes / properties: `start=${ctx.props.start}` |
| **Child → Parent events** | Children call `ctx.emit('event-name', payload)`, parents listen with `@event-name=${handler}` |
| **Shared state** | Use `createStore()` + `ctx.use(store)` for state that spans multiple components |
| **Slot projection** | Use `<slot>` to project parent-provided content into a child's Shadow DOM |

### Communication patterns

```
┌─────────────────────────────┐
│  w-counter-card (parent)    │
│                             │
│  ┌───────────┐ ┌─────────┐ │
│  │ w-counter │ │w-button  │ │
│  └─────┬─────┘ └────┬────┘ │
│    props↓        emit↑      │
│   start="10"  @w-click=fn   │
└─────────────────────────────┘

props  → parent to child (attributes)
emit   → child to parent (CustomEvent)
store  → any to any (shared state)
```

### External npm packages

Component files can import and use any npm dependency. Vite bundles them into the build output:

```ts
import { defineComponent, html } from '../runtime'

defineComponent({
  tag: 'w-counter-card',
  // ...
  actions: {
    onCounterClick(ctx) {
      const t = new Date()
      ctx.state.lastEvent = `Clicked at ${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}`
    },
  },
  // ...
})
```

Run `wely build --bundle` (or `--all`) so that components and their dependencies are included in `wely.bundle.*.js`. Library-only build (`wely build`) does not include component code, so external packages used only in components appear only in the bundle output.

## API Surface

### `defineComponent(def)`

Registers a native custom element. Accepts a `ComponentDef` object:

| Field | Type | Description |
|---|---|---|
| `tag` | `string` | Custom element tag name (must contain a hyphen) |
| `props` | `Record<string, PropType>` | Attribute-synced properties (`String`, `Number`, `Boolean`, `Array`, `Object`) |
| `devInfo` | `boolean \| { version?: string }` | When `true` (default), adds `data-wely-version` and `data-wely-mounted` attributes for dev tools. Set `false` to disable. Pass `{ version: '1.2.3' }` to override per component. |
| `styles` | `CSSResult \| CSSResult[]` | Component-scoped styles via Lit's `css` helper |
| `state()` | `() => S` | Factory that returns initial reactive state |
| `actions` | `Record<string, (ctx, event?) => void>` | Named action handlers. Use in templates: `@input=${ctx.actions.onSearch}` — second param is the DOM event; `event.target` gives the element. |
| `setup(ctx)` | `(ctx) => void` | Called once when the element first connects |
| `render(ctx)` | `(ctx) => TemplateResult` | Returns the template (uses `html` tagged literal) |
| `connected(ctx)` | `(ctx) => void` | Called on every `connectedCallback` |
| `disconnected(ctx)` | `(ctx) => void` | Called on every `disconnectedCallback` |

### The `ctx` Object

Every lifecycle and render function receives a context object:

| Property | Description |
|---|---|
| `ctx.el` | Reference to the host `HTMLElement` |
| `ctx.props` | Readonly proxy to attribute-synced properties |
| `ctx.state` | Auto-reactive state — mutations trigger re-render automatically |
| `ctx.actions` | Bound action map. When used with `@input`, `@click`, etc., the handler receives `(ctx, event)` — use `event.target` to access the element. |
| `ctx.update()` | Manually request a re-render (optional, state is already reactive) |
| `ctx.emit(event, payload?)` | Dispatch a `CustomEvent` with `bubbles` and `composed` |
| `ctx.resource(fetcher, opts?)` | Create an async resource bound to the component lifecycle |
| `ctx.use(store)` | Subscribe to a shared store — auto-unsubscribes on disconnect |
| `ctx.config` | Read-only project-wide config from `wely.config.ts` |

### `createClient(config?)`

Zero-dependency HTTP client built on native `fetch`, with an Axios-like API:

```ts
import { createClient } from 'welyjs'

const api = createClient({
  baseURL: 'https://api.example.com',
  headers: { Authorization: 'Bearer token' },
  timeout: 5000,
})

const { data } = await api.get<User[]>('/users', { params: { page: 1 } })
await api.post<User>('/users', { name: 'Ali' })
await api.put('/users/1', { name: 'Veli' })
await api.patch('/users/1', { role: 'admin' })
await api.delete('/users/1')
```

**Interceptors:**

```ts
api.onRequest((_url, init) => {
  ;(init.headers as Record<string, string>)['X-Request-Id'] = crypto.randomUUID()
  return init
})

api.onResponse((res) => { console.log(res.status); return res })

api.onError((err) => {
  if (err.status === 401) redirectToLogin()
})
```

Features: automatic JSON serialization/parsing, query params, timeout via `AbortController`, `ApiError` class with status/data, FormData support, full TypeScript generics.

### `createResource(fetcher, options?)`

Async data primitive that tracks `loading`, `error`, and `data` states. Integrates with the component lifecycle via `ctx.resource()` — auto re-renders and auto-aborts on disconnect.

```ts
import { defineComponent, html, createClient } from 'welyjs'

const api = createClient({ baseURL: 'https://api.example.com' })

defineComponent({
  tag: 'w-users',
  setup(ctx) {
    const users = ctx.resource(
      (signal) => api.get<User[]>('/users', { signal }).then(r => r.data),
      { immediate: true },
    )

    ctx.state.users = users
  },
  render(ctx) {
    const { loading, error, data } = ctx.state.users

    if (loading) return html`<p>Loading…</p>`
    if (error)   return html`<p>Error: ${error.message}</p>`

    return html`
      <ul>
        ${data?.map(u => html`<li>${u.name}</li>`)}
      </ul>
    `
  },
})
```

**Resource API:**

| Method / Property | Description |
|---|---|
| `data` | Resolved value, or `undefined` |
| `loading` | `true` while in-flight |
| `error` | `Error` from last failure |
| `fetch()` / `refetch()` | Trigger or re-trigger the fetcher |
| `abort()` | Cancel in-flight request |
| `mutate(value)` | Replace data manually |
| `reset()` | Clear all state |
| `subscribe(fn)` | Listen to changes (returns unsubscribe) |

### `createStore(def)`

Shared reactive state for cross-component communication. State mutations are batched inside actions — subscribers are notified once per action.

```ts
import { createStore } from 'welyjs'

export const authStore = createStore({
  state: () => ({
    user: null as User | null,
    token: '',
  }),
  actions: {
    login(state, user: User, token: string) {
      state.user = user
      state.token = token
    },
    logout(state) {
      state.user = null
      state.token = ''
    },
  },
})
```

**Using a store in a component** — `ctx.use()` subscribes automatically and unsubscribes on disconnect:

```ts
defineComponent({
  tag: 'w-header',
  setup(ctx) {
    const auth = ctx.use(authStore)
    ctx.state.auth = auth
  },
  render(ctx) {
    const user = ctx.state.auth.state.user
    return html`<nav>${user ? html`Hi, ${user.name}` : html`<a href="/login">Sign in</a>`}</nav>`
  },
})
```

**Store API:**

| Method / Property | Description |
|---|---|
| `state` | Reactive state object (reads always current) |
| `actions` | Bound action functions (no `state` param needed) |
| `subscribe(fn)` | Listen to changes (returns unsubscribe) |
| `reset()` | Restore initial state |

### Configuration (`wely.config.ts`)

Define project-wide settings in a single config file at the project root. Values can be hardcoded or pulled from environment variables via Vite's `import.meta.env`.

```ts
// wely.config.ts
import { defineConfig } from './src/runtime'

export default defineConfig({
  appName: 'My App',
  version: '1.0.0',  // used for data-wely-version in dev tools (when devInfo is enabled)
  apiURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  debug: import.meta.env.DEV,
  theme: import.meta.env.VITE_THEME ?? 'light',
})
```

Environment variables go in `.env` (Vite convention — only `VITE_` prefixed variables are exposed):

```bash
# .env
VITE_API_URL=https://api.production.com
VITE_THEME=dark
```

The config must be imported before any component renders (typically in your entry file):

```ts
// main.ts
import '../wely.config'
import './components'
```

**Reading config inside components** — every `ctx` has a `config` property:

```ts
defineComponent({
  tag: 'w-api-status',
  state: () => ({ status: '' }),
  async setup(ctx) {
    const res = await fetch(ctx.config.apiURL + '/health')
    ctx.state.status = res.ok ? 'up' : 'down'
  },
  render(ctx) {
    return html`<span>API: ${ctx.state.status}</span>`
  },
})
```

**Reading config outside components:**

```ts
import { getConfig, useConfig } from 'welyjs'

const cfg = getConfig()             // full config object
const apiURL = useConfig('apiURL')  // single key
const theme = useConfig('theme', 'light')  // with fallback
```

### Registry Utilities

```ts
import { getComponent, getAllComponents } from 'welyjs'

getComponent('w-counter')   // ComponentDef | undefined
getAllComponents()           // Map<string, ComponentDef>
```

### Re-exported from Lit

```ts
import { html, css, nothing } from 'welyjs'
```

These are the only Lit symbols exposed. `LitElement` and all other internals remain hidden.

## Project Structure

```
src/
  runtime/
    defineComponent.ts    Core factory
    config.ts             Global config store
    registry.ts           Tag → definition map
    fetch.ts              HTTP client
    resource.ts           Async data primitive (createResource)
    store.ts              Shared reactive state (createStore)
    shared-styles.ts      Tailwind → Shadow DOM bridge
    types.ts              Public type definitions
    index.ts              Barrel export
  bundle.ts               Bundle entry (runtime + components)
  components/
    w-counter.ts          Example counter
    w-button.ts           Example button with variants
    w-counter-card.ts     Example composed component (nesting)
    w-user-list.ts        Example async data + shared store
    index.ts
  styles/
    tailwind.css          Tailwind entry
  playground/
    main.ts               Dev playground entry
index.html                Playground page
wely.config.ts            App-level config (env-aware)
vite.config.ts            Vite + Vitest (single config)
.env                      Environment variables
```

## Self Documentation

Wely promotes self-documenting code at every layer:

### 1. JSDoc on Public API

All public types, interfaces, and functions ship with JSDoc comments. Hover over `defineComponent`, `ComponentContext`, `createClient`, `defineConfig`, etc. in any IDE to see inline documentation with examples:

```ts
// IDE will show: "Set the project-wide configuration…"
defineConfig({ apiURL: '...' })

// IDE will show: "Create a configured HTTP client…"
const api = createClient({ baseURL: '...' })
```

### 2. Self-Documenting Component Files

`wely create` generates components with structured section headers:

```ts
/**
 * <w-card>
 *
 * @prop {String} title
 *
 * @example
 * ```html
 * <w-card title="..."></w-card>
 * ```
 */

defineComponent({
  // ── Tag ────────────────────────────────────────────────
  tag: 'w-card',

  // ── Props ───────────────────────────────────────────────
  // Synced from HTML attributes. Available as ctx.props.*
  props: { title: String },

  // ── State ───────────────────────────────────────────────
  // Reactive — mutations auto-trigger re-render
  state() { return {} },

  // ── Actions ────────────────────────────────────────────
  // Named handlers. Use in templates as ctx.actions.*
  actions: { ... },

  // ── Render ──────────────────────────────────────────────
  // Return the template. Tailwind classes work in Shadow DOM.
  render(ctx) { ... },
})
```

Each section clearly communicates its purpose so anyone (human or LLM) reading the file can understand the component at a glance.

### 3. Auto-Generated Component Reference

Run `wely docs` to scan all component files and produce a `COMPONENTS.md` with a summary table, prop types, actions, and usage examples:

```bash
wely docs
# → COMPONENTS.md

wely docs --out docs/components.md
# → custom output path
```

Example output:

```md
| Tag | Props | Actions | File |
|---|---|---|---|
| `<w-button>` | `label`, `variant`, `disabled` | `handleClick` | `src/components/w-button.ts` |
| `<w-counter>` | `start` | `increment`, `decrement`, `reset` | `src/components/w-counter.ts` |
```

## Styling

Tailwind CSS v4 is integrated at two levels:

1. **Playground / host page** — import `src/styles/tailwind.css` normally.
2. **Inside Shadow DOM** — Tailwind is compiled to a constructable `CSSStyleSheet` and automatically adopted into every component's shadow root via `adoptedStyleSheets`. Utility classes work inside component templates out of the box.

Components also accept a `styles` field for scoped CSS using Lit's `css` helper:

```ts
import { defineComponent, html, css } from 'welyjs'

defineComponent({
  tag: 'w-card',
  styles: css`:host { display: block; padding: 1rem; }`,
  render: () => html`<slot></slot>`,
})
```

### Tailwind in projects using Wely CLI

| Scenario | Tailwind setup |
|----------|----------------|
| **Minimal setup** | Run `wely init` then `wely build` or `wely dev`. Wely creates `src/styles/tailwind.css` with correct `@source` on first run. Tailwind is bundled with Wely — no extra deps. |
| **Bundle consumer** | You use `wely export` and drop the bundle into another app. Tailwind is already compiled — no config needed. |
| **Custom setup** | With your own `vite.config`, add `@source` in `src/styles/tailwind.css` so Tailwind scans your templates. |

Example `src/styles/tailwind.css` (adjust `@source` if components live elsewhere):

```css
@import "tailwindcss";
@source "../components/**/*.ts";
@source "../**/*.html";
```

## CLI

Wely CLI runs in the **current working directory** — use it from any project that has Wely installed. New projects need only `welyjs` as a dependency; Vite and Tailwind come with it.

### Project setup

```bash
# Minimal: creates wely.config.ts + package.json with welyjs
wely init
npm install
```

On first `wely build` or `wely dev`, the CLI creates `src/bundle.ts`, `src/wely-components/index.ts`, and other files as needed.

**Components directory** — Components are created in `src/wely-components` by default (Wely-branded path to avoid collisions). Override via `package.json`:

```json
{
  "wely": { "componentsDir": "src/components" }
}
```

This setting is used by `create`, `sync`, `list`, `docs`, `build`, and `dev` commands.

### Component management

```bash
# Scaffold a new component
wely create w-card

# Scaffold with props and actions
wely create w-user-list --props name:String,age:Number --actions refresh,delete

# List all components
wely list

# Regenerate components index from existing files
wely sync

# Generate COMPONENTS.md from component source files
wely docs

# Generate docs to a custom path
wely docs --out docs/api.md
```

`create` generates the file in the components directory (default `src/wely-components`), pre-filled with the `defineComponent` boilerplate, and auto-updates `index.ts`.

`sync` scans the components directory and regenerates the barrel index so every `w-*.ts` file is imported automatically.

### Build & Export

| Mode | Command | Output | Use case |
|---|---|---|---|
| **Library** (default) | `wely build` | `wely.es.js` + `wely.umd.js` | Wely repo — consumers import runtime |
| **Bundle** | `wely build --bundle` | `wely.bundle.es.js` + `wely.bundle.umd.js` | Runtime + components in one file |
| **Chunked** | `wely build --chunks` | `wely.chunked.es.js` + `chunks/*.js` | Vendor, runtime, components split — cache-friendly |
| **Minimal** | `wely build` (no vite.config) | `wely.bundle.*.js` | Consumer project — bundle by default |
| **All** | `wely build --all` | Both sets | Publish both variants |

**Chunked build** — Splits output into `vendor` (Lit), `runtime` (Wely API), and `components` (your components). The browser loads chunks in parallel; when you update components, only the components chunk changes. Use: `<script type="module" src="wely.chunked.es.js"></script>`. Copy the entire `dist/` folder (including `chunks/`) when deploying.

```bash
# Minimal project (no vite.config) — bundle mode automatically
wely build

# Full repo with vite.config
wely build                  # library only
wely build --bundle         # runtime + components
wely build --chunks         # split into vendor, runtime, components
wely build --all            # both

# Export to another project (builds first by default)
wely export ../my-app/public/vendor/wely

# Export without rebuilding (uses existing dist/)
wely export ./out --no-build

# Clean target directory before exporting
wely export ../my-app/lib/wely --clean
```

### Dev & Test

```bash
wely dev
wely test
wely test --run
npm run test:e2e     # CLI + build output e2e tests
npm run test:browser # Playwright — real browser render tests
```

**`wely dev`** — Starts the playground at `localhost:5173` (or next available port). Creates `index.html`, `src/playground/main.ts`, and `src/styles/tailwind.css` on first run. All components are auto-rendered; new components added with `wely create` appear via HMR.

Run via npm script:

```bash
npm run wely -- build
npm run wely -- export ../other-project/vendor/wely
```

Or link globally:

```bash
npm link
wely build --export ~/projects/my-app/public/vendor/wely
```

### GitHub Pages

Build the project landing page for GitHub Pages:

```bash
wely page
# → docs/index.html (static page describing the repo)
```

Then push and enable: **Settings → Pages → Source: Deploy from a branch → /docs**.

## Build Output

**Published package** (`prepublishOnly`) includes runtime only:

| Output | Description |
|--------|-------------|
| `wely.es.js` / `wely.umd.js` | Runtime (13 KB gzip) — `defineComponent`, store, fetch, resource, Tailwind |

```ts
import { defineComponent, html } from 'welyjs'
```

**Consumer project** — With `wely init` + `wely build` (no vite.config), you create a bundle with your own components. `dist/wely.bundle.*.js` contains your runtime plus your components.

**Bundle size optimization** — The default build uses esbuild minify (consumer) or terser (Wely repo). For smaller production bundles: (1) Use `wely build --chunks` — splits vendor/runtime/components so the browser caches Lit and Wely separately; component updates only invalidate the components chunk. (2) With a custom `vite.config`, add `minify: 'terser'` and `terserOptions: { compress: { drop_console: true } }` to strip `console.*` calls — terser typically yields ~5–15% smaller output than esbuild. (3) Ensure `build.target` matches your lowest supported browser to avoid unnecessary polyfills.

## Browser Support

Wely relies on Custom Elements v1, Shadow DOM, `adoptedStyleSheets`, and `Proxy`. The build target and `browserslist` in `package.json` are configured accordingly:

| Browser | Minimum Version | Limiting API |
|---|---|---|
| Chrome | 73+ | `adoptedStyleSheets` |
| Edge | 79+ | Chromium-based |
| Firefox | 101+ | `adoptedStyleSheets` |
| Safari | 16.4+ | `adoptedStyleSheets` |

These targets are set in two places:

- **`package.json`** → `browserslist` — consumed by Tailwind CSS and other PostCSS tools.
- **`vite.config.ts`** → `build.target` — controls JavaScript syntax level in the Vite/Rollup output.

To adjust browser support, edit both:

```jsonc
// package.json
"browserslist": [
  "Chrome >= 73",
  "Firefox >= 101",
  "Safari >= 16.4",
  "Edge >= 79"
]
```

```ts
// vite.config.ts
build: {
  target: ['chrome73', 'firefox101', 'safari16.4', 'edge79'],
}
```

## Design Principles

- **Single factory** — every component is a `defineComponent()` call, no classes.
- **LLM-friendly** — the `actions` pattern separates logic from templates so each section can be generated independently.
- **Auto-reactive state** — state changes trigger re-renders via `Proxy`; no manual `update()` required.
- **Zero lock-in** — output is native custom elements. Drop them into any framework or plain HTML.
- **Minimal runtime** — the core factory is under 170 lines.

## Future Roadmap

- JSON-driven component rendering via the registry
- Plugin hooks (before/after `defineComponent`)
- Backend-driven UI composition
- SSR hydration (via `@lit-labs/ssr`)
- AI-generated component definitions

## Tech Stack

| Layer | Tool |
|---|---|
| Language | TypeScript |
| Rendering | Lit (internal) |
| Styling | Tailwind CSS v4 |
| Dev / Build | Vite |
| Testing | Vitest + jsdom |
| Output | ES module + UMD |

## License

MIT
