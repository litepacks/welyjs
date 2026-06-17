/**
 * <w-todo-demo>
 *
 * @prop {String} title
 *
 * @example
 * ```html
 * <w-todo-demo title="..."></w-todo-demo>
 * ```
 */

import { defineComponent, html } from 'welyjs'

type Todo = {
  id: number
  text: string
  done: boolean
}

defineComponent({
  // ── Tag ────────────────────────────────────────────────
  tag: 'w-todo-demo',

  // ── Props ───────────────────────────────────────────────
  // Synced from HTML attributes. Available as ctx.props.*
  props: {
    title: String,
  },

  // ── State ───────────────────────────────────────────────
  // Reactive — mutations auto-trigger re-render
  state() {
    return {
      input: '',
      seq: 3,
      todos: [
        { id: 1, text: 'Review the Wely CLI flow', done: true },
        { id: 2, text: 'Add a new task', done: false },
      ] as Todo[],
    }
  },

  // ── Setup ───────────────────────────────────────────────
  // Runs once on first connect. Initialize state from props here.
  setup(ctx) {
    if (!ctx.props.title) {
      ;(ctx.el as HTMLElement).setAttribute('title', 'Todo List')
    }
  },

  // ── Actions ────────────────────────────────────────────
  // Named handlers. Use in templates as ctx.actions.*
  actions: {
    add(ctx) {
      const text = ctx.state.input.trim()
      if (!text) return
      ctx.state.todos = [...ctx.state.todos, { id: ctx.state.seq, text, done: false }]
      ctx.state.seq += 1
      ctx.state.input = ''
    },
    toggle(ctx, event) {
      const id = Number((event?.target as HTMLElement | null)?.getAttribute('data-id'))
      ctx.state.todos = ctx.state.todos.map((todo) =>
        todo.id === id ? { ...todo, done: !todo.done } : todo,
      )
    },
    remove(ctx, event) {
      const id = Number((event?.target as HTMLElement | null)?.getAttribute('data-id'))
      ctx.state.todos = ctx.state.todos.filter((todo) => todo.id !== id)
    },
    onInput(ctx, event) {
      const input = event?.target as HTMLInputElement | null
      ctx.state.input = input?.value ?? ''
    },
  },

  // ── Render ──────────────────────────────────────────────
  // Return the template. Tailwind classes work in Shadow DOM.
  render(ctx) {
    const title = (ctx.props.title as string) || 'Todo List'
    const doneCount = ctx.state.todos.filter((todo) => todo.done).length

    return html`
      <div class="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <header class="flex flex-col gap-1 border-b border-zinc-100 pb-4">
          <h3 class="text-lg font-semibold leading-tight tracking-tight text-zinc-900">${title}</h3>
          <p class="text-sm leading-relaxed text-zinc-500">
            ${doneCount} of ${ctx.state.todos.length} completed
          </p>
        </header>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            class="h-10 min-h-10 flex-1 rounded-lg border border-zinc-300 px-3 text-sm leading-normal text-zinc-900 placeholder:text-zinc-400"
            placeholder="Add a task..."
            .value=${ctx.state.input}
            @input=${ctx.actions.onInput}
          />
          <button
            class="h-10 shrink-0 cursor-pointer rounded-lg bg-blue-600 px-4 text-sm font-medium text-white"
            @click=${ctx.actions.add}
          >
            Add task
          </button>
        </div>

        <ul class="flex flex-col gap-2.5">
          ${ctx.state.todos.map(
            (todo) => html`
              <li
                class="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 sm:flex-nowrap"
              >
                <button
                  class="shrink-0 cursor-pointer rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700"
                  data-id="${todo.id}"
                  @click=${ctx.actions.toggle}
                >
                  ${todo.done ? 'Undo' : 'Done'}
                </button>
                <span
                  class="min-w-0 flex-1 text-sm leading-relaxed ${todo.done ? 'text-zinc-400 line-through' : 'text-zinc-800'}"
                >
                  ${todo.text}
                </span>
                <button
                  class="shrink-0 cursor-pointer rounded-md bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700"
                  data-id="${todo.id}"
                  @click=${ctx.actions.remove}
                >
                  Remove
                </button>
              </li>
            `,
          )}
        </ul>
      </div>
    `
  },
})
