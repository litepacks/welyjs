import type { ComponentDef } from 'welyjs'
import { SVG } from './svg'

export function typeName(ctor: unknown): string {
  const actual = typeof ctor === 'object' && ctor !== null && 'type' in ctor ? (ctor as any).type : ctor;
  if (actual === Number) return 'Number'
  if (actual === Boolean) return 'Boolean'
  if (actual === Array) return 'Array'
  if (actual === Object) return 'Object'
  return 'String'
}

export function createPropInput(name: string, propDef: unknown, el: HTMLElement): HTMLElement {
  const ctor = typeof propDef === 'function' ? propDef : (propDef as any).type;
  const defaultValue = typeof propDef === 'object' && propDef && 'default' in propDef ? (propDef as any).default : undefined;

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
    const hasAttr = el.hasAttribute(name)
    input.checked = hasAttr ? true : (defaultValue === true)
    input.addEventListener('change', () => {
      if (input.checked) el.setAttribute(name, '')
      else el.removeAttribute(name)
    })
    row.appendChild(input)
  } else {
    const input = document.createElement('input')
    input.type = ctor === Number ? 'number' : 'text'
    input.className = 'wp-input' + (ctor === Array || ctor === Object ? ' wp-mono' : '')
    const attrVal = el.getAttribute(name)
    input.value = attrVal !== null ? attrVal : (defaultValue !== undefined ? String(defaultValue) : '')
    input.placeholder = ctor === Number ? '0' : ctor === Array ? '[]' : ctor === Object ? '{}' : 'value'
    input.addEventListener('input', () => el.setAttribute(name, input.value))
    row.appendChild(input)
  }

  return row
}

export function chevronHtml(open: boolean): string {
  return `<span class="wp-chevron${open ? ' wp-open' : ''}">${SVG.chevron}</span>`
}

export function createSection(tag: string, def: ComponentDef): HTMLElement {
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

/** Props panel for an existing custom element instance (Preview Lab). */
export function createPropsPanelForElement(el: HTMLElement, def: ComponentDef): HTMLElement | null {
  const props = def.props ?? {}
  const entries = Object.entries(props)
  if (entries.length === 0) return null

  // Pre-populate default attributes on el
  for (const [k, c] of entries) {
    if (typeof c === 'object' && c && 'default' in c) {
      if (!el.hasAttribute(k)) {
        const val = (c as any).default
        if (val === true) el.setAttribute(k, '')
        else if (val !== false && val != null) {
          el.setAttribute(k, typeof val === 'object' ? JSON.stringify(val) : String(val))
        }
      }
    }
  }

  const panel = document.createElement('div')
  panel.className = 'wp-props-panel'
  const title = document.createElement('div')
  title.className = 'wp-props-title'
  title.textContent = 'Props'
  panel.appendChild(title)
  entries.forEach(([k, c]) => panel.appendChild(createPropInput(k, c, el)))
  return panel
}

/** Expanded preview for a single component (no collapsible header). */
export function createPreviewMount(tag: string, def: ComponentDef): { root: HTMLElement; element: HTMLElement } {
  const root = document.createElement('div')
  root.className = 'wp-preview-panel'

  const el = document.createElement(tag)
  const panel = createPropsPanelForElement(el, def)
  if (panel) root.appendChild(panel)

  const stage = document.createElement('div')
  stage.className = 'wp-preview-stage'
  stage.appendChild(el)
  root.appendChild(stage)

  return { root, element: el }
}

/**
 * Preview Lab: one panel (props for first matching element) + a stage that may contain full markup.
 */
export function createUnifiedPreviewRoot(
  stage: HTMLElement,
  firstElement: HTMLElement,
  def: ComponentDef,
): { root: HTMLElement; element: HTMLElement } {
  const root = document.createElement('div')
  root.className = 'wp-preview-panel'

  const panel = createPropsPanelForElement(firstElement, def)
  if (panel) root.appendChild(panel)

  root.appendChild(stage)
  return { root, element: firstElement }
}
