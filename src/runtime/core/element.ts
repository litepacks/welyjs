import { commit } from './renderer'
import { html } from './html'
import type { CSSResult, TemplateResult } from './types'

export class WelyElement extends HTMLElement {
  static styles?: CSSResult[]
  static observedAttributes: string[] = []

  private _updateQueued = false
  private _stylesApplied = false

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this.requestUpdate()
  }

  disconnectedCallback(): void {}

  attributeChangedCallback(_name: string, _oldValue: string | null, _newValue: string | null): void {
    this.requestUpdate()
  }

  requestUpdate(): void {
    if (this._updateQueued) return
    this._updateQueued = true
    queueMicrotask(() => {
      this._updateQueued = false
      this.performUpdate()
    })
  }

  protected performUpdate(): void {
    if (!this.shadowRoot) return
    this.ensureStyles()
    const tpl = this.renderTemplate()
    commit(this.shadowRoot, tpl)
  }

  protected renderTemplate(): TemplateResult {
    return html``
  }

  private ensureStyles(): void {
    if (this._stylesApplied || !this.shadowRoot) return
    this._stylesApplied = true
    const ctor = this.constructor as typeof WelyElement
    const styles = ctor.styles ?? []
    if (styles.length === 0) return

    try {
      const existing = this.shadowRoot.adoptedStyleSheets ?? []
      const next = [...existing]
      for (const style of styles) {
        const sheet = new CSSStyleSheet()
        sheet.replaceSync(style.cssText)
        next.unshift(sheet)
      }
      this.shadowRoot.adoptedStyleSheets = next
    } catch {
      const styleTag = document.createElement('style')
      styleTag.textContent = styles.map((s) => s.cssText).join('\n')
      this.shadowRoot.prepend(styleTag)
    }
  }
}
