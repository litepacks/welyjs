import '../../wely.config'
import { getAllComponents } from '../runtime'

async function init() {
  await import('../components')
  const app = document.getElementById('app')
  if (!app) return
  for (const [tag] of getAllComponents()) {
    const section = document.createElement('section')
    section.className = 'mb-8 p-4 border border-zinc-200 rounded-lg bg-white'
    const label = document.createElement('h2')
    label.className = 'text-base font-semibold text-zinc-700 mb-3'
    label.textContent = `<${tag}>`
    section.appendChild(label)
    const el = document.createElement(tag)
    section.appendChild(el)
    app.appendChild(section)
  }
}

init()
