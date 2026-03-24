import type { Route } from './router'

export function renderHome(container: HTMLElement, onNavigate: (r: Route) => void) {
  container.className = 'wp-view wp-view-home'

  const p1 = document.createElement('p')
  p1.className = 'wp-lead'
  p1.textContent =
    'Wely is a small framework for native custom elements: one defineComponent() factory, Lit under the hood, Tailwind in Shadow DOM. Use this playground to browse demo components, read integration snippets, and try the live preview lab.'

  const actions = document.createElement('div')
  actions.className = 'wp-cta-row'

  const b1 = document.createElement('button')
  b1.type = 'button'
  b1.className = 'wp-btn wp-btn-primary'
  b1.textContent = 'Browse components'
  b1.addEventListener('click', () => onNavigate('gallery'))

  const b2 = document.createElement('button')
  b2.type = 'button'
  b2.className = 'wp-btn'
  b2.textContent = 'Preview lab'
  b2.addEventListener('click', () => onNavigate('preview'))

  const b3 = document.createElement('button')
  b3.type = 'button'
  b3.className = 'wp-btn'
  b3.textContent = 'Integration'
  b3.addEventListener('click', () => onNavigate('docs'))

  actions.appendChild(b1)
  actions.appendChild(b2)
  actions.appendChild(b3)

  const hint = document.createElement('p')
  hint.className = 'wp-muted'
  hint.textContent =
    'Tip: Edit files under your components folder — Vite HMR updates the preview without a full reload.'

  container.appendChild(p1)
  container.appendChild(actions)
  container.appendChild(hint)
}
