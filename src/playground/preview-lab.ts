import { getAllComponents } from 'welyjs'
import { createUnifiedPreviewRoot } from './props'
import { createPreviewEditor } from './preview-editor'
import { parseHash, setRoute } from './router'
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
const STORAGE_KEY = 'wely-playground-preview-v1'
const PERSIST_DEBOUNCE_MS = 320

type SavedState = { snippet: string; live: boolean; filter: string; lastTag: string }

function loadSaved(): SavedState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedState) : null
  } catch {
    return null
  }
}

function saveSaved(state: SavedState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore quota / private mode */
  }
}

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

  const urlTag = initialTag && allowed.has(initialTag) ? initialTag : tags[0] ?? ''
  const saved = loadSaved()

  let selected = urlTag

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
    'HTML with syntax highlighting. Multiple components and wrappers go in one preview. Props apply to the first registered element in document order. Live updates the stage without replacing your editor text; session storage keeps markup across reloads.'
  const liveRow = document.createElement('div')
  liveRow.className = 'wp-snippet-live-row'
  const liveCb = document.createElement('input')
  liveCb.type = 'checkbox'
  liveCb.id = 'wp-snippet-live'
  const liveLabel = document.createElement('label')
  liveLabel.className = 'wp-snippet-live-label'
  liveLabel.htmlFor = 'wp-snippet-live'
  liveLabel.textContent = 'Live preview (debounced)'

  const savedOk = saved && saved.lastTag === urlTag
  liveCb.checked = savedOk ? saved!.live : true
  searchInput.value = savedOk ? saved!.filter : ''

  liveRow.appendChild(liveCb)
  liveRow.appendChild(liveLabel)

  const editorHost = document.createElement('div')
  editorHost.className = 'wp-snippet-editor-host'

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
  snippetSection.appendChild(editorHost)
  snippetSection.appendChild(snippetActions)
  main.appendChild(snippetSection)

  layout.appendChild(sidebar)
  layout.appendChild(main)
  container.appendChild(layout)

  const initialDoc = savedOk ? saved!.snippet : `<${urlTag}></${urlTag}>`
  const editor = createPreviewEditor(editorHost, initialDoc)

  let detachMount: (() => void) | undefined
  let snippetDebounce: ReturnType<typeof setTimeout> | undefined
  let persistDebounce: ReturnType<typeof setTimeout> | undefined
  const offEditorChange = editor.onChange(() => {
    schedulePersist()
    scheduleSnippetApply()
  })

  function currentStorageTag(): string {
    const { previewTag } = parseHash()
    if (previewTag && allowed.has(previewTag)) return previewTag
    return tags[0] ?? ''
  }

  function schedulePersist() {
    clearTimeout(persistDebounce)
    persistDebounce = setTimeout(() => {
      saveSaved({
        snippet: editor.getValue(),
        live: liveCb.checked,
        filter: searchInput.value,
        lastTag: currentStorageTag(),
      })
    }, PERSIST_DEBOUNCE_MS)
  }

  function clearMount() {
    detachMount?.()
    detachMount = undefined
    previewHost.replaceChildren()
  }

  function flashSnippetError() {
    editor.setErrorFlash(true)
    setTimeout(() => editor.setErrorFlash(false), 700)
  }

  function mountPreviewFromEditor(options?: { silent?: boolean; syncUrl?: boolean }): boolean {
    const raw = stripScripts(editor.getValue())
    const trimmed = raw.trim()
    if (!trimmed) {
      if (!options?.silent) flashSnippetError()
      return false
    }

    const tpl = document.createElement('template')
    tpl.innerHTML = trimmed
    const imported = document.importNode(tpl.content, true)
    const first = findFirstAllowedElement(imported, allowed)
    if (!first || !allowed.has(first.tagName.toLowerCase())) {
      if (!options?.silent) flashSnippetError()
      return false
    }

    const name = first.tagName.toLowerCase()
    const def = components.get(name)
    if (!def) return false

    selected = name
    searchInput.value = ''
    renderTagButtons('')
    if (options?.syncUrl) setRoute('preview', name)

    clearMount()

    const stage = document.createElement('div')
    stage.className = 'wp-preview-stage wp-preview-stage--sandbox'
    stage.appendChild(imported)

    const { root, element } = createUnifiedPreviewRoot(stage, first as HTMLElement, def)
    previewHost.appendChild(root)
    titleEl.textContent = `Preview · <${name}> (props → first match)`

    const ac = new AbortController()
    const syncSnippetFromProps = () => {
      editor.setValue(elementToSnippet(element))
    }
    root.querySelectorAll('input').forEach((inp) => {
      inp.addEventListener('input', syncSnippetFromProps, { signal: ac.signal })
      inp.addEventListener('change', syncSnippetFromProps, { signal: ac.signal })
    })
    detachMount = () => ac.abort()

    schedulePersist()
    return true
  }

  function renderTagButtons(filter: string) {
    tagList.replaceChildren()
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
    }
  }

  function scheduleSnippetApply() {
    if (!liveCb.checked) return
    clearTimeout(snippetDebounce)
    snippetDebounce = setTimeout(() => {
      mountPreviewFromEditor({ silent: true })
    }, SNIPPET_DEBOUNCE_MS)
  }

  searchInput.addEventListener('input', () => {
    renderTagButtons(searchInput.value)
    schedulePersist()
  })
  liveCb.addEventListener('change', () => {
    schedulePersist()
    if (liveCb.checked) scheduleSnippetApply()
  })
  snippetBtn.addEventListener('click', () => mountPreviewFromEditor({ silent: false, syncUrl: true }))

  renderTagButtons(searchInput.value)
  mountPreviewFromEditor({ silent: true })
  saveSaved({
    snippet: editor.getValue(),
    live: liveCb.checked,
    filter: searchInput.value,
    lastTag: currentStorageTag(),
  })

  return () => {
    clearTimeout(snippetDebounce)
    clearTimeout(persistDebounce)
    offEditorChange()
    editor.destroy()
    clearMount()
  }
}
