/**
 * <w-canvas-draw>
 *
 * An interactive canvas drawing pad component supporting mouse and touch input.
 * Allows drawing with custom colors and brush sizes, clearing, and downloading the image.
 *
 * @prop {Number} width
 * @prop {Number} height
 *
 * @example
 * ```html
 * <w-canvas-draw width="500" height="300"></w-canvas-draw>
 * ```
 */

import { defineComponent, html } from '../runtime'

defineComponent({
  tag: 'w-canvas-draw',

  props: {
    width: Number,
    height: Number,
  },

  state() {
    return {
      color: '#3b82f6',
      lineWidth: 4,
      isDrawing: false,
      lastX: 0,
      lastY: 0,
      hasDrawing: false,
    }
  },

  actions: {
    startDrawing(ctx, event?: Event) {
      if (!event) return
      event.preventDefault()
      const canvas = ctx.el.shadowRoot?.querySelector('canvas')
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const ctx2d = canvas.getContext('2d')
      if (!ctx2d) return

      ctx.state.isDrawing = true

      // Get correct coordinates for mouse or touch
      let clientX = 0
      let clientY = 0
      if (event instanceof MouseEvent) {
        clientX = event.clientX
        clientY = event.clientY
      } else if (window.TouchEvent && event instanceof TouchEvent && event.touches[0]) {
        clientX = event.touches[0].clientX
        clientY = event.touches[0].clientY
      } else {
        return
      }

      ctx.state.lastX = clientX - rect.left
      ctx.state.lastY = clientY - rect.top

      ctx2d.beginPath()
      ctx2d.moveTo(ctx.state.lastX as number, ctx.state.lastY as number)
    },

    draw(ctx, event?: Event) {
      if (!event) return
      if (!ctx.state.isDrawing) return
      event.preventDefault()

      const canvas = ctx.el.shadowRoot?.querySelector('canvas')
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const ctx2d = canvas.getContext('2d')
      if (!ctx2d) return

      let clientX = 0
      let clientY = 0
      if (event instanceof MouseEvent) {
        clientX = event.clientX
        clientY = event.clientY
      } else if (window.TouchEvent && event instanceof TouchEvent && event.touches[0]) {
        clientX = event.touches[0].clientX
        clientY = event.touches[0].clientY
      } else {
        return
      }

      const x = clientX - rect.left
      const y = clientY - rect.top

      ctx2d.strokeStyle = ctx.state.color as string
      ctx2d.lineWidth = ctx.state.lineWidth as number
      ctx2d.lineCap = 'round'
      ctx2d.lineJoin = 'round'

      ctx2d.lineTo(x, y)
      ctx2d.stroke()

      ctx.state.lastX = x
      ctx.state.lastY = y
      ctx.state.hasDrawing = true
    },

    stopDrawing(ctx) {
      ctx.state.isDrawing = false
    },

    clear(ctx) {
      const canvas = ctx.el.shadowRoot?.querySelector('canvas')
      if (!canvas) return
      const ctx2d = canvas.getContext('2d')
      if (!ctx2d) return
      ctx2d.clearRect(0, 0, canvas.width, canvas.height)
      ctx.state.hasDrawing = false
    },

    changeColor(ctx, event?: Event) {
      if (!event) return
      const btn = event.currentTarget as HTMLButtonElement
      const color = btn.dataset.color
      if (color) {
        ctx.state.color = color
      }
    },

    changeWidth(ctx, event?: Event) {
      if (!event) return
      const input = event.target as HTMLInputElement
      ctx.state.lineWidth = Number(input.value)
    },

    save(ctx) {
      const canvas = ctx.el.shadowRoot?.querySelector('canvas')
      if (!canvas) return
      const dataUrl = canvas.toDataURL()
      ctx.emit('w-save', { dataUrl })

      // Create a temporary link to download
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'wely-drawing.png'
      a.click()
    },
  },

  render(ctx) {
    const width = Number(ctx.props.width) || 480
    const height = Number(ctx.props.height) || 320
    const colors = [
      { hex: '#000000', label: 'Black' },
      { hex: '#3b82f6', label: 'Blue' },
      { hex: '#ef4444', label: 'Red' },
      { hex: '#10b981', label: 'Green' },
      { hex: '#f59e0b', label: 'Yellow' },
      { hex: '#8b5cf6', label: 'Purple' },
    ]

    return html`
      <div class="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-white dark:bg-zinc-900 space-y-4 shadow-sm max-w-lg mx-auto">
        <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
          <span class="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Drawing Canvas</span>
          <span class="text-xs text-zinc-500">${ctx.state.hasDrawing ? 'Drawing active' : 'Canvas empty'}</span>
        </div>

        <div class="relative overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white">
          <canvas
            width=${width}
            height=${height}
            class="block w-full cursor-crosshair touch-none"
            @mousedown=${ctx.actions.startDrawing}
            @mousemove=${ctx.actions.draw}
            @mouseup=${ctx.actions.stopDrawing}
            @mouseleave=${ctx.actions.stopDrawing}
            @touchstart=${ctx.actions.startDrawing}
            @touchmove=${ctx.actions.draw}
            @touchend=${ctx.actions.stopDrawing}
          ></canvas>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Color Picker -->
          <div class="flex items-center gap-1.5">
            ${colors.map(
              (c) => html`
                <button
                  type="button"
                  data-color=${c.hex}
                  class="w-6 h-6 rounded-full border-2 focus:outline-none transition-transform hover:scale-110 cursor-pointer ${ctx.state.color === c.hex ? 'border-zinc-800 dark:border-zinc-200 scale-105' : 'border-transparent'}"
                  style="background-color: ${c.hex}"
                  @click=${ctx.actions.changeColor}
                  aria-label=${c.label}
                ></button>
              `,
            )}
          </div>

          <!-- Brush Size -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-zinc-500 font-medium">Size: ${ctx.state.lineWidth}px</span>
            <input
              type="range"
              min="1"
              max="20"
              .value=${ctx.state.lineWidth}
              class="w-20 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-800 dark:accent-zinc-200"
              @input=${ctx.actions.changeWidth}
            />
          </div>

          <!-- Clear / Save Actions -->
          <div class="flex gap-2">
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium border border-zinc-200 dark:border-zinc-800 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              @click=${ctx.actions.clear}
            >
              Clear
            </button>
            <button
              type="button"
              class="px-3 py-1.5 text-xs font-medium bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 rounded-md hover:bg-zinc-700 dark:hover:bg-zinc-300 transition-colors cursor-pointer"
              ?disabled=${!ctx.state.hasDrawing}
              @click=${ctx.actions.save}
            >
              Download
            </button>
          </div>
        </div>
      </div>
    `
  },
})
