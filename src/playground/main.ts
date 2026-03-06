import '../../wely.config'
import { getAllComponents } from '../runtime'

function propTypeName(ctor: unknown): string {
  if (ctor === Number) return 'Number'
  if (ctor === String) return 'String'
  if (ctor === Boolean) return 'Boolean'
  if (ctor === Array) return 'Array'
  if (ctor === Object) return 'Object'
  return 'String'
}

async function init() {
  await import('../components')
  const app = document.getElementById('app')
  if (!app) return
  for (const [tag, def] of getAllComponents()) {
    const section = document.createElement('section')
    section.className = 'mb-8 p-4 border border-zinc-200 rounded-lg bg-white'
    const label = document.createElement('h2')
    label.className = 'text-base font-semibold text-zinc-700 mb-2'
    label.textContent = `<${tag}>`
    section.appendChild(label)
    const props = def.props ?? {}
    if (Object.keys(props).length > 0) {
      const propsDesc = document.createElement('p')
      propsDesc.className = 'text-sm text-zinc-500 mb-3 font-mono'
      propsDesc.textContent =
        'Props: ' +
        Object.entries(props)
          .map(([k, ctor]) => `${k}: ${propTypeName(ctor)}`)
          .join(', ')
      section.appendChild(propsDesc)
    }
    const el = document.createElement(tag)
    section.appendChild(el)
    app.appendChild(section)
  }
}

init()
