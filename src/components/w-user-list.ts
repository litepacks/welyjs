/**
 * <w-user-list>
 *
 * Demonstrates async data fetching with `ctx.resource()` and
 * shared state with `ctx.use()`. Fetches users from an API endpoint
 * and displays them with loading/error states.
 *
 * @prop {String} endpoint
 *
 * @example
 * ```html
 * <w-user-list endpoint="https://jsonplaceholder.typicode.com/users"></w-user-list>
 * ```
 */

import { defineComponent, html, createClient, createStore } from '../runtime'

interface User {
  id: number
  name: string
  email: string
}

const api = createClient()

export const userFilterStore = createStore({
  state: () => ({ search: '' }),
  actions: {
    setSearch(state, value: string) {
      state.search = value
    },
  },
})

defineComponent({
  // ── Tag ────────────────────────────────────────────────
  tag: 'w-user-list',

  // ── Props ───────────────────────────────────────────────
  props: {
    endpoint: String,
  },

  // ── State ───────────────────────────────────────────────
  state() {
    return {
      users: null as { data: User[] | undefined; loading: boolean; error: Error | undefined } | null,
    }
  },

  // ── Setup ───────────────────────────────────────────────
  setup(ctx) {
    const url = (ctx.props.endpoint as string) || 'https://jsonplaceholder.typicode.com/users'
    const users = ctx.resource<User[]>(
      (signal) => api.get<User[]>(url, { signal }).then((r) => r.data),
      { immediate: true },
    )

    const filter = ctx.use(userFilterStore)

    ctx.state.users = users as any
    ctx.state._filter = filter as any
  },

  // ── Actions ────────────────────────────────────────────
  actions: {
    refresh(ctx) {
      (ctx.state.users as any)?.refetch?.()
    },
    onSearch(ctx) {
      const input = ctx.el.shadowRoot?.querySelector('input') as HTMLInputElement | null
      userFilterStore.actions.setSearch(input?.value ?? '')
    },
  },

  // ── Render ──────────────────────────────────────────────
  render(ctx) {
    const res = ctx.state.users as any
    const filter = (ctx.state._filter as any)?.state ?? { search: '' }

    if (!res) return html`<p class="text-gray-500">Initializing…</p>`

    if (res.loading) {
      return html`
        <div class="flex items-center gap-2 text-blue-600">
          <span class="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full"></span>
          Loading…
        </div>
      `
    }

    if (res.error) {
      return html`
        <div class="text-red-600">
          <p>Error: ${res.error.message}</p>
          <button class="mt-2 px-3 py-1 bg-red-100 rounded hover:bg-red-200" @click=${ctx.actions.refresh}>
            Retry
          </button>
        </div>
      `
    }

    const search = (filter.search ?? '').toLowerCase()
    const raw = res.data
    const list: User[] = Array.isArray(raw) ? raw : []
    const users = list.filter(
      (u) => !search || u.name.toLowerCase().includes(search) || (u.email && u.email.toLowerCase().includes(search)),
    )

    return html`
      <div class="space-y-3">
        <div class="flex gap-2">
          <input
            type="text"
            placeholder="Filter users…"
            class="flex-1 px-3 py-1.5 border rounded text-sm"
            .value=${filter.search}
            @input=${ctx.actions.onSearch}
          />
          <button
            class="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            @click=${ctx.actions.refresh}
          >
            Refresh
          </button>
        </div>
        <ul class="divide-y">
          ${users.map(
            (u: User) => html`
              <li class="py-2">
                <span class="font-medium">${u.name}</span>
                <span class="text-gray-500 text-sm ml-2">${u.email}</span>
              </li>
            `,
          )}
        </ul>
        ${users.length === 0 ? html`<p class="text-gray-400 text-sm">No results</p>` : ''}
      </div>
    `
  },
})
