import { defineComponent, html } from '../runtime'

defineComponent({
  tag: 'w-counter',

  props: {
    start: { type: Number, default: 10 },
  },

  state() {
    return { count: 0 }
  },

  devInfo: {
    version: '1.0.0',
  },

  setup(ctx) {
    ctx.state.count = Number(ctx.props.start) || 0
  },

  actions: {
    increment(ctx) { ctx.state.count++ },
    decrement(ctx) { ctx.state.count-- },
    reset(ctx) { ctx.state.count = Number(ctx.props.start) || 0 },
  },

  render(ctx) {
    return html`
      <div class="inline-flex items-center gap-2">
        <button
          class="w-8 h-8 rounded-md bg-[var(--wp-surface2)] hover:bg-[var(--wp-border)] active:opacity-80 text-[var(--wp-fg)] font-semibold transition-colors cursor-pointer"
          @click=${ctx.actions.decrement}
        >-</button>
        <span class="min-w-[3ch] text-center text-lg font-mono tabular-nums text-[var(--wp-fg)]">${ctx.state.count}</span>
        <button
          class="w-8 h-8 rounded-md bg-[var(--wp-surface2)] hover:bg-[var(--wp-border)] active:opacity-80 text-[var(--wp-fg)] font-semibold transition-colors cursor-pointer"
          @click=${ctx.actions.increment}
        >+</button>
        <button
          class="px-3 h-8 rounded-md bg-[var(--wp-surface3)] hover:bg-[var(--wp-surface2)] active:opacity-80 text-[var(--wp-muted)] text-sm transition-colors cursor-pointer"
          @click=${ctx.actions.reset}
        >Reset</button>
      </div>
    `
  },
})
