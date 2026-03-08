import '../../wely.config'
import { getAllComponents } from '../runtime'

function typeName(ctor: unknown): string {
  if (ctor === Number) return 'Number'
  if (ctor === Boolean) return 'Boolean'
  if (ctor === Array) return 'Array'
  if (ctor === Object) return 'Object'
  return 'String'
}

function createPropInput(name: string, ctor: unknown, el: HTMLElement): HTMLElement {
  const row = document.createElement('label')
  row.className = 'flex items-center gap-2 text-sm'

  const nameSpan = document.createElement('span')
  nameSpan.className = 'font-mono text-zinc-600 min-w-[80px]'
  nameSpan.textContent = name

  const badge = document.createElement('span')
  badge.className = 'text-[10px] bg-zinc-100 text-zinc-400 rounded px-1 py-0.5 uppercase tracking-wide'
  badge.textContent = typeName(ctor)

  row.appendChild(nameSpan)
  row.appendChild(badge)

  if (ctor === Boolean) {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.className = 'ml-auto h-4 w-4 accent-amber-500'
    input.checked = el.hasAttribute(name)
    input.addEventListener('change', () => {
      if (input.checked) el.setAttribute(name, '')
      else el.removeAttribute(name)
    })
    row.appendChild(input)
  } else if (ctor === Number) {
    const input = document.createElement('input')
    input.type = 'number'
    input.className = 'ml-auto w-24 px-2 py-1 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-400'
    input.value = el.getAttribute(name) ?? ''
    input.placeholder = '0'
    input.addEventListener('input', () => el.setAttribute(name, input.value))
    row.appendChild(input)
  } else if (ctor === Array || ctor === Object) {
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'ml-auto flex-1 max-w-[200px] px-2 py-1 border border-zinc-200 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-400'
    input.value = el.getAttribute(name) ?? ''
    input.placeholder = ctor === Array ? '[]' : '{}'
    input.addEventListener('input', () => el.setAttribute(name, input.value))
    row.appendChild(input)
  } else {
    const input = document.createElement('input')
    input.type = 'text'
    input.className = 'ml-auto flex-1 max-w-[200px] px-2 py-1 border border-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-amber-400'
    input.value = el.getAttribute(name) ?? ''
    input.placeholder = 'value'
    input.addEventListener('input', () => el.setAttribute(name, input.value))
    row.appendChild(input)
  }

  return row
}

async function init() {
  await import('../components')
  const app = document.getElementById('app')
  if (!app) return

  for (const [tag, def] of getAllComponents()) {
    const section = document.createElement('section')
    section.className = 'mb-8 p-5 border border-zinc-200 rounded-xl bg-white shadow-sm'

    const header = document.createElement('div')
    header.className = 'flex items-center gap-2 mb-3'
    const tagLabel = document.createElement('h2')
    tagLabel.className = 'text-base font-semibold text-zinc-800'
    tagLabel.innerHTML = `<code class="bg-zinc-100 px-2 py-0.5 rounded text-amber-600">&lt;${tag}&gt;</code>`
    header.appendChild(tagLabel)
    section.appendChild(header)

    const el = document.createElement(tag)

    const props = def.props ?? {}
    const entries = Object.entries(props)
    if (entries.length > 0) {
      const propsPanel = document.createElement('div')
      propsPanel.className = 'mb-4 p-3 bg-zinc-50 rounded-lg border border-zinc-100 space-y-2'
      const propsTitle = document.createElement('div')
      propsTitle.className = 'text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2'
      propsTitle.textContent = 'Props'
      propsPanel.appendChild(propsTitle)
      for (const [name, ctor] of entries) {
        propsPanel.appendChild(createPropInput(name, ctor, el))
      }
      section.appendChild(propsPanel)
    }

    section.appendChild(el)
    app.appendChild(section)
  }
}

init()
