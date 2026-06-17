import type { Route } from './router'

export function renderHome(container: HTMLElement, onNavigate: (r: Route) => void) {
  container.className = 'wp-view wp-view-home'

  const hero = document.createElement('header')
  hero.className = 'wp-home-hero'

  const title = document.createElement('h2')
  title.className = 'wp-home-title'
  title.textContent = 'Build native Web Components with one API'

  const lead = document.createElement('p')
  lead.className = 'wp-home-lead'
  lead.textContent =
    'Wely gives you a single defineComponent() factory, a built-in playground, and bundles you can drop into any page. Start below — no framework lock-in.'

  hero.appendChild(title)
  hero.appendChild(lead)

  const grid = document.createElement('div')
  grid.className = 'wp-home-grid'

  const cards: { route: Route; title: string; body: string; primary?: boolean }[] = [
    {
      route: 'gallery',
      title: 'Browse components',
      body: 'Searchable gallery with live props for every registered tag.',
      primary: true,
    },
    {
      route: 'preview',
      title: 'Preview lab',
      body: 'Edit HTML snippets and see components update in real time.',
    },
    {
      route: 'docs',
      title: 'Integration',
      body: 'Copy ES module, UMD, and CLI snippets for your project.',
    },
  ]

  for (const card of cards) {
    const el = document.createElement('article')
    el.className = 'wp-home-card'

    const h3 = document.createElement('h3')
    h3.className = 'wp-home-card-title'
    h3.textContent = card.title

    const p = document.createElement('p')
    p.className = 'wp-home-card-body'
    p.textContent = card.body

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = card.primary ? 'wp-btn wp-btn-primary wp-home-card-btn' : 'wp-btn wp-home-card-btn'
    btn.textContent = 'Open'
    if (card.primary) {
      btn.style.setProperty('background-color', 'var(--wp-accent2)')
      btn.style.setProperty('color', '#0a0a0a')
      btn.style.setProperty('border-color', 'var(--wp-accent2)')
      btn.style.setProperty('font-weight', '600')
    }
    btn.addEventListener('click', () => onNavigate(card.route))

    el.appendChild(h3)
    el.appendChild(p)
    el.appendChild(btn)
    grid.appendChild(el)
  }

  const hint = document.createElement('p')
  hint.className = 'wp-home-hint'
  hint.innerHTML =
    '<strong>Tip:</strong> Edit files under your components folder — Vite HMR refreshes the playground without a full reload.'

  container.appendChild(hero)
  container.appendChild(grid)
  container.appendChild(hint)
}
