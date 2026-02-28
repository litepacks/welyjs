import { defineComponent, html } from '../runtime'

defineComponent({
  tag: 'w-counter',

  props: {
    start: Number,
  },

  state() {
    return { count: 0 }
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
          class="w-8 h-8 rounded-md bg-zinc-200 hover:bg-zinc-300 active:bg-zinc-400 text-zinc-700 font-semibold transition-colors cursor-pointer"
          @click=${ctx.actions.decrement}
        >-</button>
        <span class="min-w-[3ch] text-center text-lg font-mono tabular-nums">${ctx.state.count}</span>
        <button
          class="w-8 h-8 rounded-md bg-zinc-200 hover:bg-zinc-300 active:bg-zinc-400 text-zinc-700 font-semibold transition-colors cursor-pointer"
          @click=${ctx.actions.increment}
        >+</button>
        <button
          class="px-3 h-8 rounded-md bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-500 text-sm transition-colors cursor-pointer"
          @click=${ctx.actions.reset}
        >Reset</button>
      </div>
    `
  },
})
