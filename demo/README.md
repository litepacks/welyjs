# Wely CLI Demo

This folder demonstrates the Wely workflow using **only Wely CLI commands** (no custom Vite config).

## Setup

```bash
cd demo
npm install
# or from scratch in any folder:
# wely setup
```

`package.json` uses `welyjs: "file:.."`, so this demo always runs against the local package in the parent folder.  
`wely.autoComponents` is enabled — components are discovered from `src/wely-components` without maintaining `src/bundle.ts` imports.

## Run Dev Playground

```bash
npm run dev
# wely doctor   — verify setup
```

## Build

```bash
npm run build
# auto-discovery is on by default (wely.autoComponents: true)
```

This generates:

- `dist/wely.bundle.es.js`
- `dist/wely.bundle.umd.js`

## Test

```bash
npm run test -- --run
# wely test --changed   — only changed component tests
```

## Plain HTML Usage (No Framework)

```bash
npx wely embed    # generates html-usage/index.html from your build
```

After building, open `html-usage/index.html` in a browser (or serve the folder with any static server).  
The bundle loads with `defer`; boot uses `wely.ready()` so load order is safe.

```html
<script src="../dist/wely.bundle.umd.js" defer></script>
<w-todo-demo title="HTML Usage"></w-todo-demo>
<script>
  wely.ready('w-todo-demo').then(() => { /* upgraded */ });
</script>
```

## Add Another Component via CLI

```bash
npx wely create w-note --props title:String --actions save --test
npx wely list
npx wely sync
```
