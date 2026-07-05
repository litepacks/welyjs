import { defineComponent, html } from '../runtime'

const variantClasses: Record<string, string> = {
  default: 'bg-[var(--wp-surface2)] hover:bg-[var(--wp-border)] active:opacity-85 text-[var(--wp-fg)]',
  primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
  danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
  ghost: 'bg-transparent hover:bg-[var(--wp-surface2)] active:opacity-85 text-[var(--wp-muted)]',
}

defineComponent({
  tag: 'w-button',

  props: {
    label: { type: String, default: 'Click me' },
    variant: { type: String, default: 'default' },
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
