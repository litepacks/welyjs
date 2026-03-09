/**
 * Dev server config for Wely consumer projects.
 * Used when running `wely dev` in a project that has no vite.config.
 *
 * Everything is served through a Vite plugin — zero files are
 * created in the consumer project for the playground.
 */
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const root = process.cwd()
const componentsDir = process.env.WELY_COMPONENTS_DIR || ''
const configPath = process.env.WELY_CONFIG_PATH || ''

function welyPlaygroundPlugin() {
  const VIRTUAL_ENTRY = 'virtual:wely-playground'
  const RESOLVED_ENTRY = '\0' + VIRTUAL_ENTRY
  const VIRTUAL_CSS = 'virtual:wely-dev.css'
  const RESOLVED_CSS = '\0' + VIRTUAL_CSS

  const playgroundJs = `
import '${configPath}'
import '${VIRTUAL_CSS}'
import { getAllComponents } from 'welyjs'

function typeName(ctor) {
  if (ctor === Number) return 'Number'
  if (ctor === Boolean) return 'Boolean'
  if (ctor === Array) return 'Array'
  if (ctor === Object) return 'Object'
  return 'String'
}

function createPropInput(name, ctor, el) {
  const row = document.createElement('label')
  row.className = 'wp-prop-row'
  const nameSpan = document.createElement('span')
  nameSpan.className = 'wp-prop-name'
  nameSpan.textContent = name
  const badge = document.createElement('span')
  badge.className = 'wp-badge'
  badge.textContent = typeName(ctor)
  row.appendChild(nameSpan)
  row.appendChild(badge)
  if (ctor === Boolean) {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.className = 'wp-checkbox'
    input.checked = el.hasAttribute(name)
    input.addEventListener('change', () => input.checked ? el.setAttribute(name, '') : el.removeAttribute(name))
    row.appendChild(input)
  } else {
    const input = document.createElement('input')
    input.type = ctor === Number ? 'number' : 'text'
    input.className = 'wp-input' + (ctor === Array || ctor === Object ? ' wp-mono' : '')
    input.value = el.getAttribute(name) ?? ''
    input.placeholder = ctor === Number ? '0' : ctor === Array ? '[]' : ctor === Object ? '{}' : 'value'
    input.addEventListener('input', () => el.setAttribute(name, input.value))
    row.appendChild(input)
  }
  return row
}

const SVG = {
  chevron: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search: '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
  moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',
  collapseAll: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  expandAll: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}

function chevronHtml(open) {
  return '<span class="wp-chevron' + (open ? ' wp-open' : '') + '">' + SVG.chevron + '</span>'
}

function createSection(tag, def) {
  let collapsed = false
  const section = document.createElement('section')
  section.className = 'wp-section'
  section.dataset.tag = tag

  const header = document.createElement('button')
  header.type = 'button'
  header.className = 'wp-section-header'

  const arrow = document.createElement('span')
  arrow.className = 'wp-arrow'
  arrow.innerHTML = chevronHtml(true)

  const tagLabel = document.createElement('span')
  tagLabel.className = 'wp-tag'
  tagLabel.innerHTML = '&lt;' + tag + '&gt;'

  const propCount = Object.keys(def.props ?? {}).length
  const countBadge = document.createElement('span')
  countBadge.className = 'wp-prop-count'
  countBadge.textContent = propCount > 0 ? propCount + ' prop' + (propCount > 1 ? 's' : '') : ''

  header.appendChild(arrow)
  header.appendChild(tagLabel)
  header.appendChild(countBadge)
  section.appendChild(header)

  const body = document.createElement('div')
  body.className = 'wp-section-body'

  const el = document.createElement(tag)
  const props = def.props ?? {}
  const entries = Object.entries(props)
  if (entries.length > 0) {
    const panel = document.createElement('div')
    panel.className = 'wp-props-panel'
    const title = document.createElement('div')
    title.className = 'wp-props-title'
    title.textContent = 'Props'
    panel.appendChild(title)
    entries.forEach(([k, c]) => panel.appendChild(createPropInput(k, c, el)))
    body.appendChild(panel)
  }
  body.appendChild(el)
  section.appendChild(body)

  header.addEventListener('click', () => {
    collapsed = !collapsed
    body.style.display = collapsed ? 'none' : ''
    arrow.innerHTML = chevronHtml(!collapsed)
  })

  return section
}

function initTheme() {
  const stored = localStorage.getItem('wely-playground-theme')
  if (stored === 'dark' || (!stored && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark')
    return true
  }
  document.documentElement.removeAttribute('data-theme')
  return false
}

async function init() {
  let dark = initTheme()
  await import('${componentsDir}')
  const app = document.getElementById('app')
  if (!app) return

  const toolbar = document.createElement('div')
  toolbar.className = 'wp-toolbar'

  const searchWrap = document.createElement('div')
  searchWrap.className = 'wp-search-wrap'
  const searchIconEl = document.createElement('span')
  searchIconEl.className = 'wp-search-icon'
  searchIconEl.innerHTML = SVG.search
  const searchInput = document.createElement('input')
  searchInput.type = 'text'
  searchInput.placeholder = 'Search components...'
  searchInput.className = 'wp-search-input'
  searchWrap.appendChild(searchIconEl)
  searchWrap.appendChild(searchInput)
  toolbar.appendChild(searchWrap)

  const countLabel = document.createElement('span')
  countLabel.className = 'wp-count'

  const toggleBtn = document.createElement('button')
  toggleBtn.type = 'button'
  toggleBtn.className = 'wp-btn'
  toggleBtn.innerHTML = SVG.collapseAll + ' Collapse All'
  let allCollapsed = false

  const themeBtn = document.createElement('button')
  themeBtn.type = 'button'
  themeBtn.className = 'wp-btn'
  themeBtn.innerHTML = dark ? SVG.sun + ' Light' : SVG.moon + ' Dark'

  toolbar.appendChild(countLabel)
  toolbar.appendChild(toggleBtn)
  toolbar.appendChild(themeBtn)
  app.appendChild(toolbar)

  const list = document.createElement('div')
  list.className = 'wp-list'
  app.appendChild(list)

  const components = getAllComponents()
  const sections = []

  for (const [tag, def] of components) {
    const section = createSection(tag, def)
    sections.push({ tag, section })
    list.appendChild(section)
  }

  function updateCount(visible) {
    countLabel.textContent = visible + ' / ' + sections.length
  }
  updateCount(sections.length)

  searchInput.addEventListener('input', () => {
    const q = searchInput.value.toLowerCase().trim()
    let visible = 0
    sections.forEach(({ tag, section }) => {
      const match = !q || tag.toLowerCase().includes(q)
      section.style.display = match ? '' : 'none'
      if (match) visible++
    })
    updateCount(visible)
  })

  toggleBtn.addEventListener('click', () => {
    allCollapsed = !allCollapsed
    toggleBtn.innerHTML = allCollapsed ? SVG.expandAll + ' Expand All' : SVG.collapseAll + ' Collapse All'
    sections.forEach(({ section }) => {
      const body = section.querySelector('.wp-section-body')
      const arrow = section.querySelector('.wp-arrow')
      if (body) body.style.display = allCollapsed ? 'none' : ''
      if (arrow) arrow.innerHTML = chevronHtml(!allCollapsed)
    })
  })

  themeBtn.addEventListener('click', () => {
    dark = !dark
    if (dark) document.documentElement.setAttribute('data-theme', 'dark')
    else document.documentElement.removeAttribute('data-theme')
    localStorage.setItem('wely-playground-theme', dark ? 'dark' : 'light')
    themeBtn.innerHTML = dark ? SVG.sun + ' Light' : SVG.moon + ' Dark'
  })

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { searchInput.value = ''; searchInput.dispatchEvent(new Event('input')) }
  })
}
init()
`

  const playgroundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Wely Playground</title>
  <script>
    var t = localStorage.getItem('wely-playground-theme');
    if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches))
      document.documentElement.setAttribute('data-theme', 'dark');
  </script>
  <style>
    :root {
      --wp-bg: #fafafa; --wp-fg: #18181b; --wp-muted: #71717a; --wp-subtle: #a1a1aa;
      --wp-border: #e4e4e7; --wp-surface: #fff; --wp-surface2: #f4f4f5; --wp-surface3: #fafafa;
      --wp-accent: #d97706; --wp-accent2: #f59e0b; --wp-ring: rgba(245,158,11,.35);
    }
    [data-theme="dark"] {
      --wp-bg: #09090b; --wp-fg: #f4f4f5; --wp-muted: #a1a1aa; --wp-subtle: #71717a;
      --wp-border: #27272a; --wp-surface: #18181b; --wp-surface2: #27272a; --wp-surface3: #1c1c1f;
      --wp-accent: #fbbf24; --wp-accent2: #f59e0b; --wp-ring: rgba(251,191,36,.3);
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--wp-bg);
      color: var(--wp-fg);
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
      transition: background .2s, color .2s;
    }
    .wp-shell { max-width: 720px; margin: 0 auto; padding: 2.5rem 1.5rem; }
    .wp-header { margin-bottom: 2rem; }
    .wp-header h1 { font-size: 1.25rem; font-weight: 700; letter-spacing: -.01em; }
    .wp-header h1 span { font-weight: 300; color: var(--wp-subtle); }

    /* --- Toolbar --- */
    .wp-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 1.25rem; flex-wrap: wrap; }
    .wp-search-wrap { position: relative; flex: 1 1 200px; min-width: 160px; max-width: 340px; }
    .wp-search-icon {
      position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
      color: var(--wp-subtle); display: flex; pointer-events: none;
    }
    .wp-search-input {
      width: 100%; padding: 7px 12px 7px 34px;
      border: 1px solid var(--wp-border); border-radius: 8px;
      font-size: 13px; background: var(--wp-surface); color: var(--wp-fg);
      outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .wp-search-input::placeholder { color: var(--wp-subtle); }
    .wp-search-input:focus { border-color: var(--wp-accent2); box-shadow: 0 0 0 3px var(--wp-ring); }

    .wp-count { font-size: 12px; font-family: ui-monospace, monospace; color: var(--wp-subtle); white-space: nowrap; font-variant-numeric: tabular-nums; }

    .wp-btn {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 12px; padding: 6px 12px; border-radius: 8px;
      border: 1px solid var(--wp-border); background: var(--wp-surface);
      color: var(--wp-muted); cursor: pointer; white-space: nowrap;
      transition: background .15s, color .15s, border-color .15s;
      user-select: none; line-height: 1;
    }
    .wp-btn:hover { background: var(--wp-surface2); color: var(--wp-fg); }
    .wp-btn svg { flex-shrink: 0; }

    /* --- List --- */
    .wp-list { display: flex; flex-direction: column; gap: 10px; }

    /* --- Section --- */
    .wp-section {
      border: 1px solid var(--wp-border); border-radius: 12px;
      background: var(--wp-surface); overflow: hidden;
      box-shadow: 0 1px 2px rgba(0,0,0,.04);
      transition: background .2s, border-color .2s;
    }
    .wp-section-header {
      width: 100%; display: flex; align-items: center; gap: 10px;
      padding: 12px 18px; text-align: left;
      background: transparent; border: none; cursor: pointer;
      color: var(--wp-fg); font: inherit; user-select: none;
      transition: background .12s;
    }
    .wp-section-header:hover { background: var(--wp-surface2); }
    .wp-arrow { color: var(--wp-subtle); display: flex; flex-shrink: 0; transition: color .12s; }
    .wp-section-header:hover .wp-arrow { color: var(--wp-fg); }
    .wp-chevron { display: inline-flex; transition: transform .2s ease; }
    .wp-chevron.wp-open { transform: rotate(90deg); }
    .wp-tag {
      font-size: 13px; font-weight: 600; font-family: ui-monospace, SFMono-Regular, monospace;
      color: var(--wp-accent); background: var(--wp-surface2);
      padding: 2px 8px; border-radius: 5px;
    }
    .wp-prop-count { margin-left: auto; font-size: 11px; font-family: ui-monospace, monospace; color: var(--wp-subtle); }

    .wp-section-body { padding: 4px 18px 18px; border-top: 1px solid var(--wp-border); }

    /* --- Props panel --- */
    .wp-props-panel {
      margin: 10px 0 14px; padding: 10px 12px;
      background: var(--wp-surface3); border-radius: 8px;
      border: 1px solid var(--wp-border);
    }
    .wp-props-title {
      font-size: 10px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .06em; color: var(--wp-subtle); margin-bottom: 8px;
    }
    .wp-prop-row { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 3px 0; }
    .wp-prop-name { font-family: ui-monospace, monospace; color: var(--wp-muted); min-width: 70px; }
    .wp-badge {
      font-size: 10px; text-transform: uppercase; letter-spacing: .04em;
      background: var(--wp-surface2); color: var(--wp-subtle);
      padding: 1px 5px; border-radius: 4px;
    }
    .wp-checkbox { margin-left: auto; width: 16px; height: 16px; accent-color: var(--wp-accent2); cursor: pointer; }
    .wp-input {
      margin-left: auto; flex: 1; max-width: 200px;
      padding: 4px 8px; border: 1px solid var(--wp-border); border-radius: 6px;
      font-size: 13px; background: var(--wp-surface); color: var(--wp-fg);
      outline: none; transition: border-color .15s, box-shadow .15s;
    }
    .wp-input:focus { border-color: var(--wp-accent2); box-shadow: 0 0 0 2px var(--wp-ring); }
    .wp-mono { font-family: ui-monospace, monospace; }

    /* --- Empty state --- */
    .wp-empty { text-align: center; padding: 3rem 1rem; color: var(--wp-subtle); font-size: 14px; }
  </style>
</head>
<body>
  <div class="wp-shell">
    <div class="wp-header">
      <h1>Wely <span>playground</span></h1>
    </div>
    <div id="app"></div>
  </div>
  <script type="module" src="/${VIRTUAL_ENTRY}"></script>
</body>
</html>`

  const tailwindCss = `@import "tailwindcss";\n@source "${componentsDir}/**/*.ts";\n`

  return {
    name: 'wely-playground',

    resolveId(id) {
      if (id === VIRTUAL_ENTRY || id === '/' + VIRTUAL_ENTRY) return RESOLVED_ENTRY
      if (id === VIRTUAL_CSS) return RESOLVED_CSS
    },

    load(id) {
      if (id === RESOLVED_ENTRY) return playgroundJs
      if (id === RESOLVED_CSS) return tailwindCss
    },

    configureServer(server) {
      return () => {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url?.split('?')[0]
          if (url === '/' || url === '/index.html') {
            const transformed = await server.transformIndexHtml('/', playgroundHtml)
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/html')
            res.end(transformed)
            return
          }
          next()
        })
      }
    },
  }
}

export default defineConfig({
  root,
  plugins: [
    welyPlaygroundPlugin(),
    tailwindcss(),
  ],
})
