import { defineComponent, html } from '../runtime'

const variantClasses: Record<string, string> = {
  default: 'bg-zinc-200 hover:bg-zinc-300 active:bg-zinc-400 text-zinc-800',
  primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
  danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
  ghost: 'bg-transparent hover:bg-zinc-100 active:bg-zinc-200 text-zinc-700',
}

defineComponent({
  tag: 'w-button',

  props: {
    label: String,
    variant: String,
    disabled: Boolean,
  },

  state() {
    return { pressed: false }
  },

  actions: {
    handleClick(ctx) {
      if (ctx.props.disabled) return
      ctx.emit('w-click', { label: ctx.props.label })
    },
  },

  render(ctx) {
    const variant = (ctx.props.variant as string) ?? 'default'
    const classes = variantClasses[variant] ?? variantClasses.default
    const disabledCls = ctx.props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'

    return html`
      <button
        class="inline-flex items-center justify-center px-4 h-9 rounded-md text-sm font-medium transition-colors ${classes} ${disabledCls}"
        ?disabled=${ctx.props.disabled}
        @click=${ctx.actions.handleClick}
      >
        ${ctx.props.label ?? html`<slot></slot>`}
      </button>
    `
  },
})
