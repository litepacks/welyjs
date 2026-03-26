# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.12] - 2025-03-24

### Added

- `vitest.consumer.config.ts` and `wely test`: when the project has no `vitest.config.*` or `vite.config.*`, Vitest uses this bundled config (avoids resolving a parent directory’s Vite config).
- Export `welyjs/vitest-consumer` for optional reuse or extension.
- `wely init`: `test` script plus `vitest` and `jsdom` devDependencies (semver aligned with this package).

### Changed

- README and `docs/index.html`: testing workflow and `wely test` behavior.

## [0.0.11] - 2025-03-24

### Added

- This changelog.
- CLI on [Commander](https://github.com/tj/commander.js): `-h` / `--help`, `-v` / `--version`, `help [command]`, structured subcommands, and clearer errors.
- Preview Lab: CodeMirror 6 HTML editor with light/dark-aware styling.
- Preview Lab: `sessionStorage` for snippet, live preview toggle, and tag filter.
- Preview Lab: one sandbox preview for full markup (multiple custom elements and wrappers); props apply to the first matching registered element in document order.
- Styles for the snippet editor and sandbox stage in the playground shell.

### Changed

- Preview Lab: live / apply no longer overwrites the editor with a minimized single-tag string; your markup stays while the preview updates.
- Playground: dark-mode contrast for home CTAs; primary button styling resilient to Tailwind `button` preflight.
- `bin/wely.mjs`: resolve package root with `dirname(import.meta.url)` + one `..` so bundled Vite configs resolve correctly.

### Fixed

- Consumer `wely dev`: `package.json` `exports` and Vite alias for `welyjs/playground/app` so the virtual playground entry imports resolve.

## [0.0.10]

### Added

- Multi-view playground (home, docs, gallery, preview lab), hash routing, theme toggle.
- Preview lab with debounced markup, props ↔ snippet sync, component search.
- Docs and screenshot script for playground assets.

### Changed

- Playground uses `welyjs` imports like downstream apps; local dev uses Vite alias and `tsconfig` paths.

## [0.0.8]

### Added

- Interactive props panel in playground flows.

## [0.0.6]

### Added

- Default config / playground init helpers.

### Changed

- Action handlers may receive an event argument (see migration notes in docs).

## [0.0.5]

### Changed

- Documented `componentsDir` and aligned consumer layout expectations.

## [0.0.3]

### Changed

- Build/minify tooling updates; repository metadata in `package.json`.

## [0.0.2]

### Added

- Chunked build mode (`--chunks`) and related docs.

## [0.0.1]

### Added

- Initial release: `defineComponent()` runtime on Lit, Tailwind in Shadow DOM, Vite library build, CLI, and demo components.
