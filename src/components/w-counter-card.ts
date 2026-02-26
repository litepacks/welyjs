/**
 * <w-counter-card>
 *
 * Composed component — uses `<w-counter>` and `<w-button>` internally
 * to demonstrate nested Web Components with parent → child data flow.
 *
 * @prop {String} title
 * @prop {Number} start
 *
 * @example
 * ```html
 * <w-counter-card title="Score" start="10"></w-counter-card>
 * ```
 */

import dayjs from 'dayjs'
import { defineComponent, html } from '../runtime'

defineComponent({
  // ── Tag ────────────────────────────────────────────────
  tag: 'w-counter-card',

  // ── Props ───────────────────────────────────────────────
  props: {
    title: String,
    start: Number,
  },

  // ── State ───────────────────────────────────────────────
  state() {
    return { lastEvent: '' }
  },

  // ── Actions ────────────────────────────────────────────
  actions: {
    onCounterClick(ctx) {
      ctx.state.lastEvent = `Button clicked at ${dayjs().format('HH:mm:ss')}`
    },
  },

  // ── Render ──────────────────────────────────────────────
  render(ctx) {
    const title = (ctx.props.title as string) ?? 'Counter'
    return html`
      <div class="border border-zinc-200 rounded-lg p-4 bg-white space-y-3">
        <h3 class="text-sm font-semibold text-zinc-700">${title}</h3>
        <w-counter start=${ctx.props.start ?? 0}></w-counter>
        <div class="flex gap-2">
          <w-button label="Action" variant="primary" @w-click=${ctx.actions.onCounterClick}></w-button>
          <w-button label="Ghost" variant="ghost" @w-click=${ctx.actions.onCounterClick}></w-button>
        </div>
        ${ctx.state.lastEvent
          ? html`<p class="text-xs text-zinc-400">${ctx.state.lastEvent}</p>`
          : ''}
      </div>
    `
  },
})
