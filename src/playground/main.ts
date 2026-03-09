import '../../wely.config'
import { getAllComponents } from '../runtime'
import type { ComponentDef } from '../runtime/types'

const SVG = {
  chevron:
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  search:
    '<svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
  moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>',
  collapseAll:
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  expandAll:
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
}

function typeName(ctor: unknown): string {
  if (ctor === Number) return 'Number'
  if (ctor === Boolean) return 'Boolean'
  if (ctor === Array) return 'Array'
  if (ctor === Object) return 'Object'
  return 'String'
}

function createPropInput(name: string, ctor: unknown, el: HTMLElement): HTMLElement {
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
    input.addEventListener('change', () => {
      if (input.checked) el.setAttribute(name, '')
      else el.removeAttribute(name)
    })
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

function chevronHtml(open: boolean): string {
  return `<span class="wp-chevron${open ? ' wp-open' : ''}">${SVG.chevron}</span>`
}

function createSection(tag: string, def: ComponentDef): HTMLElement {
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
  tagLabel.innerHTML = `&lt;${tag}&gt;`

  const propCount = Object.keys(def.props ?? {}).length
  const countBadge = document.createElement('span')
  countBadge.className = 'wp-prop-count'
  countBadge.textContent = propCount > 0 ? `${propCount} prop${propCount > 1 ? 's' : ''}` : ''

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

function initTheme(): boolean {
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
  await import('../components')
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
  const sections: { tag: string; section: HTMLElement }[] = []

  for (const [tag, def] of components) {
    const section = createSection(tag, def)
    sections.push({ tag, section })
    list.appendChild(section)
  }

  function updateCount(visible: number) {
    countLabel.textContent = `${visible} / ${sections.length}`
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
      const body = section.querySelector<HTMLElement>('.wp-section-body')
      const arrow = section.querySelector<HTMLElement>('.wp-arrow')
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
    if (e.key === 'Escape') {
      searchInput.value = ''
      searchInput.dispatchEvent(new Event('input'))
    }
  })
}

init()
