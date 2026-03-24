import { getAllComponents } from '../runtime'
import { chevronHtml, createSection } from './props'
import { SVG } from './svg'

export function mountGallery(container: HTMLElement): () => void {
  container.className = 'wp-view wp-view-gallery'

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
  searchInput.setAttribute('autocomplete', 'off')
  searchInput.setAttribute('spellcheck', 'false')
  searchInput.setAttribute('aria-label', 'Search components')
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

  toolbar.appendChild(countLabel)
  toolbar.appendChild(toggleBtn)
  container.appendChild(toolbar)

  const list = document.createElement('div')
  list.className = 'wp-list'
  container.appendChild(list)

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

  const onSearch = () => {
    const q = searchInput.value.toLowerCase().trim()
    let visible = 0
    sections.forEach(({ tag, section }) => {
      const match = !q || tag.toLowerCase().includes(q)
      section.style.display = match ? '' : 'none'
      if (match) visible++
    })
    updateCount(visible)
  }

  searchInput.addEventListener('input', onSearch)

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

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      searchInput.value = ''
      onSearch()
    }
  }
  searchInput.addEventListener('keydown', onKey)

  return () => {
    searchInput.removeEventListener('input', onSearch)
    searchInput.removeEventListener('keydown', onKey)
  }
}
