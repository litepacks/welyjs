import { mountGallery } from './gallery'
import { renderDocs } from './docs'
import { renderHome } from './home'
import { mountPreviewLab } from './preview-lab'
import { parseHash, setRoute, type Route } from './router'
import { SVG } from './svg'
import { applyTheme, initTheme } from './theme'

const NAV: { route: Route; label: string; hash: string }[] = [
  { route: 'home', label: 'Home', hash: '#/home' },
  { route: 'docs', label: 'Docs', hash: '#/docs' },
  { route: 'gallery', label: 'Components', hash: '#/gallery' },
  { route: 'preview', label: 'Preview', hash: '#/preview' },
]

export function mountApp() {
  let dark = initTheme()
  const app = document.getElementById('app')
  if (!app) return

  app.replaceChildren()

  const shell = document.createElement('div')
  shell.className = 'wp-app'

  const headerRow = document.createElement('div')
  headerRow.className = 'wp-header-row'

  const brand = document.createElement('div')
  brand.className = 'wp-brand'
  brand.innerHTML = '<h1>Wely <span>playground</span></h1>'

  const nav = document.createElement('nav')
  nav.className = 'wp-nav'

  const headerActions = document.createElement('div')
  headerActions.className = 'wp-header-actions'

  const menuBtn = document.createElement('button')
  menuBtn.type = 'button'
  menuBtn.className = 'wp-btn wp-menu-btn'
  menuBtn.innerHTML = SVG.menu
  menuBtn.setAttribute('aria-label', 'Toggle menu')
  menuBtn.addEventListener('click', () => {
    nav.classList.toggle('wp-nav-open')
    menuBtn.innerHTML = nav.classList.contains('wp-nav-open') ? SVG.close : SVG.menu
  })

  const navLinks: { route: Route; el: HTMLAnchorElement }[] = []
  for (const { route, label, hash } of NAV) {
    const a = document.createElement('a')
    a.className = 'wp-nav-link'
    a.href = hash
    a.textContent = label
    a.addEventListener('click', () => {
      nav.classList.remove('wp-nav-open')
      menuBtn.innerHTML = SVG.menu
    })
    nav.appendChild(a)
    navLinks.push({ route, el: a })
  }

  const themeBtn = document.createElement('button')
  themeBtn.type = 'button'
  themeBtn.className = 'wp-btn wp-theme-btn'
  themeBtn.innerHTML = dark ? SVG.sun + ' Light' : SVG.moon + ' Dark'
  themeBtn.addEventListener('click', () => {
    dark = !dark
    applyTheme(dark)
    themeBtn.innerHTML = dark ? SVG.sun + ' Light' : SVG.moon + ' Dark'
  })

  headerActions.appendChild(themeBtn)
  headerActions.appendChild(menuBtn)

  headerRow.appendChild(brand)
  headerRow.appendChild(nav)
  headerRow.appendChild(headerActions)

  const main = document.createElement('div')
  main.id = 'wp-main'

  shell.appendChild(headerRow)
  shell.appendChild(main)
  app.appendChild(shell)

  let cleanup: (() => void) | undefined

  function updateNav() {
    const { route } = parseHash()
    for (const { route: r, el } of navLinks) {
      el.classList.toggle('wp-nav-active', r === route)
    }
  }

  function render() {
    cleanup?.()
    cleanup = undefined
    const { route, previewTag } = parseHash()
    main.replaceChildren()
    updateNav()

    const onNavigate = (r: Route) => setRoute(r)

    if (route === 'home') renderHome(main, onNavigate)
    else if (route === 'docs') renderDocs(main)
    else if (route === 'gallery') cleanup = mountGallery(main)
    else cleanup = mountPreviewLab(main, previewTag)
  }

  window.addEventListener('hashchange', render)
  if (!location.hash || location.hash === '#') location.hash = '#/home'
  render()
}
