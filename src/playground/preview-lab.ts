import { getAllComponents } from '../runtime'
import { createPreviewMount } from './props'
import { setRoute } from './router'
import { SVG } from './svg'

function stripScripts(html: string): string {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/** Serialize mounted element back to a minimal HTML string for the snippet editor. */
function elementToSnippet(el: HTMLElement): string {
  const tag = el.tagName.toLowerCase()
  const parts: string[] = []
  for (let i = 0; i < el.attributes.length; i++) {
    const { name, value } = el.attributes[i]
    if (name.startsWith('data-wely')) continue
    if (value === '') parts.push(name)
    else parts.push(`${name}="${escapeAttr(value)}"`)
  }
  const attrStr = parts.length ? ` ${parts.join(' ')}` : ''
  return `<${tag}${attrStr}></${tag}>`
}

function findFirstAllowedElement(fragment: DocumentFragment, allowed: Set<string>): Element | null {
  const tree = document.createTreeWalker(fragment, NodeFilter.SHOW_ELEMENT)
  let n: Node | null = tree.nextNode()
  while (n) {
    const el = n as Element
    const name = el.tagName.toLowerCase()
    if (allowed.has(name)) return el
    n = tree.nextNode()
  }
  return null
}

const SNIPPET_DEBOUNCE_MS = 280

export function mountPreviewLab(container: HTMLElement, initialTag?: string): () => void {
  container.className = 'wp-view wp-view-preview'

  const components = getAllComponents()
  const tags = [...components.keys()].sort()
  const allowed = new Set(tags)

  if (tags.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'wp-empty'
    empty.textContent = 'No components registered. Add files under your components folder and import the index.'
    container.appendChild(empty)
    return () => {}
  }

  let selected = initialTag && allowed.has(initialTag) ? initialTag : tags[0] ?? ''

  const layout = document.createElement('div')
  layout.className = 'wp-preview-layout'

  const sidebar = document.createElement('div')
  sidebar.className = 'wp-preview-sidebar'

  const searchWrap = document.createElement('div')
  searchWrap.className = 'wp-search-wrap wp-search-wrap--fill'
  const searchIconEl = document.createElement('span')
  searchIconEl.className = 'wp-search-icon'
  searchIconEl.innerHTML = SVG.search
  const searchInput = document.createElement('input')
  searchInput.type = 'text'
  searchInput.placeholder = 'Filter tags...'
  searchInput.className = 'wp-search-input'
  searchInput.setAttribute('autocomplete', 'off')
  searchInput.setAttribute('spellcheck', 'false')
  searchInput.setAttribute('aria-label', 'Filter component tags')
  searchWrap.appendChild(searchIconEl)
  searchWrap.appendChild(searchInput)
  sidebar.appendChild(searchWrap)

  const tagList = document.createElement('div')
  tagList.className = 'wp-tag-list'
  sidebar.appendChild(tagList)

  const main = document.createElement('div')
  main.className = 'wp-preview-main'

  const headline = document.createElement('div')
  headline.className = 'wp-preview-headline'
  const titleEl = document.createElement('span')
  titleEl.className = 'wp-tag wp-preview-title'
  headline.appendChild(titleEl)
  main.appendChild(headline)

  const previewHost = document.createElement('div')
  previewHost.className = 'wp-preview-host'
  main.appendChild(previewHost)

  const snippetSection = document.createElement('div')
  snippetSection.className = 'wp-snippet-section'
  const snippetLabel = document.createElement('label')
  snippetLabel.className = 'wp-snippet-label'
  snippetLabel.textContent = 'Markup (registered custom elements; scripts stripped)'
  const snippetHint = document.createElement('p')
  snippetHint.className = 'wp-snippet-hint'
  snippetHint.textContent =
    'Wrap multiple nodes or use a single tag. First matching registered element wins. Props panel edits sync here; with Live on, this field updates the preview as you type.'
  const liveRow = document.createElement('div')
  liveRow.className = 'wp-snippet-live-row'
  const liveCb = document.createElement('input')
  liveCb.type = 'checkbox'
  liveCb.checked = true
  liveCb.id = 'wp-snippet-live'
  const liveLabel = document.createElement('label')
  liveLabel.className = 'wp-snippet-live-label'
  liveLabel.htmlFor = 'wp-snippet-live'
  liveLabel.textContent = 'Live preview (debounced)'
  liveRow.appendChild(liveCb)
  liveRow.appendChild(liveLabel)

  const snippetTa = document.createElement('textarea')
  snippetTa.className = 'wp-snippet-ta'
  snippetTa.placeholder = '<w-counter start="2"></w-counter>\n<!-- or -->\n<div class="p-4"><w-button label="Hi"></w-button></div>'
  const snippetActions = document.createElement('div')
  snippetActions.className = 'wp-snippet-actions'
  const snippetBtn = document.createElement('button')
  snippetBtn.type = 'button'
  snippetBtn.className = 'wp-btn'
  snippetBtn.textContent = 'Apply now'
  snippetActions.appendChild(snippetBtn)

  snippetSection.appendChild(snippetLabel)
  snippetSection.appendChild(snippetHint)
  snippetSection.appendChild(liveRow)
  snippetSection.appendChild(snippetTa)
  snippetSection.appendChild(snippetActions)
  main.appendChild(snippetSection)

  layout.appendChild(sidebar)
  layout.appendChild(main)
  container.appendChild(layout)

  const tagButtons: { tag: string; btn: HTMLButtonElement }[] = []

  let detachMount: (() => void) | undefined
  let snippetDebounce: ReturnType<typeof setTimeout> | undefined

  function clearMount() {
    detachMount?.()
    detachMount = undefined
    previewHost.replaceChildren()
  }

  function mountFromTag(tag: string, attrSource?: Element) {
    clearMount()
    const def = components.get(tag)
    if (!def) return

    const { root, element } = createPreviewMount(tag, def)
    if (attrSource) {
      for (let i = 0; i < attrSource.attributes.length; i++) {
        const a = attrSource.attributes[i]
        element.setAttribute(a.name, a.value)
      }
    }

    previewHost.appendChild(root)
    titleEl.textContent = `<${tag}>`
    selected = tag
    snippetTa.value = elementToSnippet(element)

    const ac = new AbortController()
    const syncSnippetFromProps = () => {
      snippetTa.value = elementToSnippet(element)
    }
    root.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', syncSnippetFromProps, { signal: ac.signal })
      inp.addEventListener('change', syncSnippetFromProps, { signal: ac.signal })
    })
    detachMount = () => ac.abort()
  }

  function renderTagButtons(filter: string) {
    tagList.replaceChildren()
    tagButtons.length = 0
    const q = filter.toLowerCase().trim()
    for (const tag of tags) {
      if (q && !tag.toLowerCase().includes(q)) continue
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'wp-tag-pill' + (tag === selected ? ' wp-tag-pill-active' : '')
      btn.textContent = tag
      btn.addEventListener('click', () => {
        setRoute('preview', tag)
      })
      tagList.appendChild(btn)
      tagButtons.push({ tag, btn })
    }
  }

  function tryApplySnippet(options?: { silent?: boolean; syncUrl?: boolean }): boolean {
    const raw = stripScripts(snippetTa.value)
    const tpl = document.createElement('template')
    tpl.innerHTML = raw.trim()
    const first =
      findFirstAllowedElement(tpl.content, allowed) ?? (tpl.content.firstElementChild as Element | null)
    if (!first || !allowed.has(first.tagName.toLowerCase())) {
      if (!options?.silent) {
        snippetTa.classList.add('wp-snippet-error')
        setTimeout(() => snippetTa.classList.remove('wp-snippet-error'), 700)
      }
      return false
    }

    const name = first.tagName.toLowerCase()
    selected = name
    searchInput.value = ''
    renderTagButtons('')
    if (options?.syncUrl) setRoute('preview', name)
    mountFromTag(name, first)
    return true
  }

  function scheduleSnippetApply() {
    if (!liveCb.checked) return
    clearTimeout(snippetDebounce)
    snippetDebounce = setTimeout(() => {
      tryApplySnippet({ silent: true })
    }, SNIPPET_DEBOUNCE_MS)
  }

  searchInput.addEventListener('input', () => renderTagButtons(searchInput.value))
  snippetBtn.addEventListener('click', () => tryApplySnippet({ silent: false, syncUrl: true }))
  snippetTa.addEventListener('input', scheduleSnippetApply)

  renderTagButtons('')
  mountFromTag(selected)
  if (!snippetTa.value.trim()) snippetTa.value = `<${selected}></${selected}>`

  return () => {
    clearTimeout(snippetDebounce)
    clearMount()
  }
}
