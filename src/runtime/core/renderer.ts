import { isTemplateResult } from './html'
import { nothing } from './types'
import type { TemplateResult } from './types'

const TOKEN_PREFIX = '__WELY_PART_'
const TOKEN_RE = /__WELY_PART_(\d+)__/g
const COMMENT_PREFIX = 'wely-part:'

type AttributePart = {
  type: 'attr'
  index: number
  element: Element
  name: string
}

type InterpolatedAttributePart = {
  type: 'attr-interpolated'
  element: Element
  name: string
  indices: number[]
  segments: string[]
}

type BooleanPart = {
  type: 'boolean'
  index: number
  element: Element
  name: string
}

type PropertyPart = {
  type: 'property'
  index: number
  element: Element
  name: string
}

type EventPart = {
  type: 'event'
  index: number
  element: Element
  name: string
  cleanup?: () => void
}

type ChildPart = {
  type: 'child'
  index: number
  anchor: Comment
  nodes: Node[]
}

type Part = AttributePart | InterpolatedAttributePart | BooleanPart | PropertyPart | EventPart | ChildPart

type View = {
  key: string
  parts: Part[]
}

const viewByRoot = new WeakMap<ShadowRoot, View>()
const templateByKey = new Map<string, HTMLTemplateElement>()

function keyOf(strings: readonly string[]): string {
  return strings.join('$$wely$$')
}

function marker(index: number): string {
  return `${TOKEN_PREFIX}${index}__`
}

function compileTemplate(strings: readonly string[]): HTMLTemplateElement {
  const key = keyOf(strings)
  const cached = templateByKey.get(key)
  if (cached) return cached

  let raw = strings[0] ?? ''
  for (let i = 1; i < strings.length; i += 1) {
    raw += marker(i - 1) + (strings[i] ?? '')
  }

  const tpl = document.createElement('template')
  tpl.innerHTML = raw
  const frag = tpl.content

  const walker = document.createTreeWalker(frag, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  const textNodes: Text[] = []

  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node as Text)
      continue
    }

    const el = node as Element
    const attrs = [...el.attributes]
    for (const attr of attrs) {
      TOKEN_RE.lastIndex = 0
      if (!TOKEN_RE.test(attr.value)) continue
      TOKEN_RE.lastIndex = 0

      const exact = attr.value.match(/^__WELY_PART_(\d+)__$/)
      if (exact) {
        const index = Number(exact[1])
        if (attr.name.startsWith('@')) {
          el.setAttribute('data-wely-event', `${index}:${attr.name.slice(1)}`)
          el.removeAttribute(attr.name)
        } else if (attr.name.startsWith('?')) {
          el.setAttribute('data-wely-bool', `${index}:${attr.name.slice(1)}`)
          el.removeAttribute(attr.name)
        } else if (attr.name.startsWith('.')) {
          el.setAttribute('data-wely-prop', `${index}:${attr.name.slice(1)}`)
          el.removeAttribute(attr.name)
        } else {
          el.setAttribute('data-wely-attr', `${index}:${attr.name}`)
          el.removeAttribute(attr.name)
        }
        continue
      }

      const indices: number[] = []
      const segments: string[] = []
      let offset = 0
      TOKEN_RE.lastIndex = 0
      for (const m of attr.value.matchAll(TOKEN_RE)) {
        const full = m[0]
        const index = Number(m[1])
        const start = m.index ?? 0
        const end = start + full.length
        segments.push(attr.value.slice(offset, start))
        indices.push(index)
        offset = end
      }
      segments.push(attr.value.slice(offset))
      const meta = JSON.parse(el.getAttribute('data-wely-attrtpl') ?? '[]') as Array<{
        name: string
        indices: number[]
        segments: string[]
      }>
      meta.push({ name: attr.name, indices, segments })
      el.setAttribute('data-wely-attrtpl', JSON.stringify(meta))
      el.removeAttribute(attr.name)
    }
  }

  for (const text of textNodes) {
    const matches = [...text.data.matchAll(TOKEN_RE)]
    if (matches.length === 0) continue
    const parent = text.parentNode
    if (!parent) continue

    let last = 0
    for (const m of matches) {
      const full = m[0]
      const rawIndex = m[1]
      const start = m.index ?? 0
      const end = start + full.length
      const staticText = text.data.slice(last, start)
      if (staticText) parent.insertBefore(document.createTextNode(staticText), text)
      const anchor = document.createComment(`${COMMENT_PREFIX}${rawIndex}`)
      parent.insertBefore(anchor, text)
      last = end
    }
    const trailing = text.data.slice(last)
    if (trailing) parent.insertBefore(document.createTextNode(trailing), text)
    parent.removeChild(text)
  }

  templateByKey.set(key, tpl)
  return tpl
}

function cloneParts(fragment: DocumentFragment): Part[] {
  const parts: Part[] = []

  const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.nodeType === Node.COMMENT_NODE) {
      const comment = node as Comment
      if (comment.data.startsWith(COMMENT_PREFIX)) {
        parts.push({
          type: 'child',
          index: Number(comment.data.slice(COMMENT_PREFIX.length)),
          anchor: comment,
          nodes: [],
        })
      }
      continue
    }

    const el = node as Element
    const eventMeta = el.getAttribute('data-wely-event')
    if (eventMeta) {
      const [index, name] = eventMeta.split(':')
      parts.push({ type: 'event', index: Number(index), element: el, name })
      el.removeAttribute('data-wely-event')
    }

    const boolMeta = el.getAttribute('data-wely-bool')
    if (boolMeta) {
      const [index, name] = boolMeta.split(':')
      parts.push({ type: 'boolean', index: Number(index), element: el, name })
      el.removeAttribute('data-wely-bool')
    }

    const propMeta = el.getAttribute('data-wely-prop')
    if (propMeta) {
      const [index, name] = propMeta.split(':')
      parts.push({ type: 'property', index: Number(index), element: el, name })
      el.removeAttribute('data-wely-prop')
    }

    const attrMeta = el.getAttribute('data-wely-attr')
    if (attrMeta) {
      const [index, name] = attrMeta.split(':')
      parts.push({ type: 'attr', index: Number(index), element: el, name })
      el.removeAttribute('data-wely-attr')
    }

    const attrTplMeta = el.getAttribute('data-wely-attrtpl')
    if (attrTplMeta) {
      const list = JSON.parse(attrTplMeta) as Array<{ name: string; indices: number[]; segments: string[] }>
      for (const entry of list) {
        parts.push({
          type: 'attr-interpolated',
          element: el,
          name: entry.name,
          indices: entry.indices,
          segments: entry.segments,
        })
      }
      el.removeAttribute('data-wely-attrtpl')
    }
  }

  return parts
}

function renderValue(value: unknown): Node[] {
  if (value === nothing || value == null || value === false) return []

  if (Array.isArray(value)) {
    const out: Node[] = []
    for (const item of value) out.push(...renderValue(item))
    return out
  }

  if (value instanceof Node) return [value]

  if (isTemplateResult(value)) {
    const fragment = instantiate(value)
    return [...fragment.childNodes]
  }

  return [document.createTextNode(String(value))]
}

function instantiate(template: TemplateResult): DocumentFragment {
  const tpl = compileTemplate(template.strings)
  const fragment = tpl.content.cloneNode(true) as DocumentFragment
  const parts = cloneParts(fragment)
  for (const part of parts) {
    applyPart(part, template.values)
  }
  return fragment
}

function clearNodes(nodes: Node[]): void {
  for (const node of nodes) node.parentNode?.removeChild(node)
  nodes.length = 0
}

function applyPart(part: Part, values: readonly unknown[]): void {
  if (part.type === 'attr') {
    const value = values[part.index]
    if (value == null || value === false) part.element.removeAttribute(part.name)
    else part.element.setAttribute(part.name, String(value))
    return
  }

  if (part.type === 'attr-interpolated') {
    let text = part.segments[0] ?? ''
    for (let i = 0; i < part.indices.length; i += 1) {
      const v = values[part.indices[i]]
      text += (v == null || v === false ? '' : String(v)) + (part.segments[i + 1] ?? '')
    }
    part.element.setAttribute(part.name, text)
    return
  }

  if (part.type === 'boolean') {
    const value = values[part.index]
    if (value) part.element.setAttribute(part.name, '')
    else part.element.removeAttribute(part.name)
    return
  }

  if (part.type === 'property') {
    const value = values[part.index]
    ;(part.element as any)[part.name] = value
    return
  }

  if (part.type === 'event') {
    const value = values[part.index]
    if (part.cleanup) {
      part.cleanup()
      part.cleanup = undefined
    }
    if (typeof value === 'function') {
      const listener = value as EventListener
      part.element.addEventListener(part.name, listener)
      part.cleanup = () => part.element.removeEventListener(part.name, listener)
    }
    return
  }

  clearNodes(part.nodes)
  const value = values[part.index]
  const nextNodes = renderValue(value)
  for (const node of nextNodes) {
    part.anchor.parentNode?.insertBefore(node, part.anchor)
    part.nodes.push(node)
  }
}

export function commit(root: ShadowRoot, template: TemplateResult): void {
  const key = keyOf(template.strings)
  const view = viewByRoot.get(root)

  if (!view || view.key !== key) {
    root.textContent = ''
    const tpl = compileTemplate(template.strings)
    const fragment = tpl.content.cloneNode(true) as DocumentFragment
    const parts = cloneParts(fragment)
    root.appendChild(fragment)
    const nextView = { key, parts }
    viewByRoot.set(root, nextView)
    for (const part of nextView.parts) applyPart(part, template.values)
    return
  }

  for (const part of view.parts) {
    applyPart(part, template.values)
  }
}
