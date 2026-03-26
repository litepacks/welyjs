import { html } from '@codemirror/lang-html'
import type { Extension } from '@codemirror/state'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { basicSetup } from 'codemirror'
import { oneDark } from '@codemirror/theme-one-dark'

const themeCompartment = new Compartment()

function pickTheme(): Extension {
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? oneDark
    : EditorView.theme(
        {
          '&': {
            backgroundColor: 'var(--wp-surface)',
            color: 'var(--wp-fg)',
          },
          '.cm-content': { caretColor: 'var(--wp-fg)' },
          '.cm-scroller': {
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            fontSize: '12px',
            lineHeight: '1.45',
          },
          '.cm-gutters': {
            backgroundColor: 'var(--wp-surface2)',
            color: 'var(--wp-subtle)',
            border: 'none',
          },
          '.cm-activeLineGutter': { backgroundColor: 'transparent' },
        },
        { dark: false },
      )
}

export type PreviewEditor = {
  getValue: () => string
  setValue: (value: string) => void
  onChange: (fn: () => void) => () => void
  setErrorFlash: (on: boolean) => void
  destroy: () => void
  focus: () => void
}

export function createPreviewEditor(wrap: HTMLElement, initialDoc: string): PreviewEditor {
  wrap.classList.add('wp-snippet-editor-wrap')

  const changeListeners = new Set<() => void>()
  let view: EditorView

  const obs = new MutationObserver(() => {
    view.dispatch({ effects: themeCompartment.reconfigure(pickTheme()) })
  })
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  view = new EditorView({
    parent: wrap,
    state: EditorState.create({
      doc: initialDoc,
      extensions: [
        basicSetup,
        html(),
        themeCompartment.of(pickTheme()),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            for (const fn of changeListeners) fn()
          }
        }),
      ],
    }),
  })

  return {
    getValue: () => view.state.doc.toString(),
    setValue: (value: string) => {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
    },
    onChange: (fn: () => void) => {
      changeListeners.add(fn)
      return () => {
        changeListeners.delete(fn)
      }
    },
    setErrorFlash: (on: boolean) => {
      wrap.classList.toggle('wp-snippet-error', on)
    },
    destroy: () => {
      obs.disconnect()
      view.destroy()
    },
    focus: () => {
      view.focus()
    },
  }
}
