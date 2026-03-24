function copyButton(label: string, text: string): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'wp-code-block'

  const pre = document.createElement('pre')
  const code = document.createElement('code')
  code.textContent = text
  pre.appendChild(code)

  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'wp-btn wp-copy-btn'
  btn.textContent = label
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text)
      btn.textContent = 'Copied'
      setTimeout(() => {
        btn.textContent = label
      }, 1500)
    } catch {
      btn.textContent = 'Failed'
      setTimeout(() => {
        btn.textContent = label
      }, 1500)
    }
  })

  wrap.appendChild(pre)
  wrap.appendChild(btn)
  return wrap
}

function heading(text: string, level: 'h2' | 'h3'): HTMLElement {
  const el = document.createElement(level)
  el.className = level === 'h2' ? 'wp-doc-h2' : 'wp-doc-h3'
  el.textContent = text
  return el
}

export function renderDocs(container: HTMLElement) {
  container.className = 'wp-view wp-view-docs'

  const intro = document.createElement('p')
  intro.className = 'wp-lead'
  intro.textContent =
    'Add Wely to a page with a module script (bundler or built file), or drop in a UMD bundle. Your project’s wely build produces ES + UMD under dist/.'

  const esm = heading('ES modules (bundler or type="module")', 'h2')
  const esmCode = `import { defineComponent, html } from 'welyjs'

defineComponent({
  tag: 'w-hello',
  render() {
    return html\`<span>Hello</span>\`
  },
})`

  const umd = heading('Classic script (UMD bundle)', 'h2')
  const umdCode = `<!-- After copying wely.bundle.umd.js from your dist/ folder -->
<script src="./wely.bundle.umd.js"></script>
<w-counter start="3"></w-counter>`

  const cli = heading('CLI quick reference', 'h2')
  const table = document.createElement('table')
  table.className = 'wp-doc-table'
  table.innerHTML = `
<thead><tr><th>Command</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>wely init</code></td><td>Create wely.config.ts and ensure welyjs in package.json</td></tr>
<tr><td><code>wely create w-tag --props x:String</code></td><td>Scaffold a component and sync the index</td></tr>
<tr><td><code>wely dev</code></td><td>Dev server + this playground</td></tr>
<tr><td><code>wely build</code></td><td>Bundle runtime + your components (ES + UMD by default)</td></tr>
<tr><td><code>wely build --chunks</code></td><td>Split vendor / runtime / components chunks (with vite.config)</td></tr>
<tr><td><code>wely export &lt;path&gt;</code></td><td>Copy dist output to another folder</td></tr>
</tbody>`

  const note = document.createElement('p')
  note.className = 'wp-muted'
  note.innerHTML =
    'Published <code>welyjs</code> on npm is <strong>runtime only</strong>. Your app’s <code>wely build</code> output includes your custom elements. See README → “Build outputs”.'

  container.appendChild(intro)
  container.appendChild(esm)
  container.appendChild(copyButton('Copy', esmCode))
  container.appendChild(umd)
  container.appendChild(copyButton('Copy', umdCode))
  container.appendChild(cli)
  container.appendChild(table)
  container.appendChild(note)
}
