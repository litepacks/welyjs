/**
 * <w-pokemon-grid>
 *
 * Fetches Pokémon from [PokéAPI](https://pokeapi.co/) and displays
 * them in a grid with sprite, name, and types.
 *
 * @prop {Number} limit
 *
 * @example
 * ```html
 * <w-pokemon-grid limit="12"></w-pokemon-grid>
 * ```
 */

import { defineComponent, html, createClient } from '../runtime'

const API = 'https://pokeapi.co/api/v2'

interface Pokemon {
  id: number
  name: string
  sprites: { front_default: string | null }
  types: Array<{ type: { name: string } }>
}

const api = createClient({ baseURL: API })

defineComponent({
  tag: 'w-pokemon-grid',

  props: {
    limit: Number,
  },

  state() {
    return {
      pokemon: null as { data: Pokemon[] | undefined; loading: boolean; error: Error | undefined } | null,
      search: '',
    }
  },

  setup(ctx) {
    const limit = Math.min(Number(ctx.props.limit) || 12, 151)
    const ids = Array.from({ length: limit }, (_, i) => i + 1)

    const pokemon = ctx.resource<Pokemon[]>(
      (signal) =>
        Promise.all(
          ids.map((id) =>
            api.get<Pokemon>(`/pokemon/${id}`, { signal }).then((r) => r.data),
          ),
        ),
      { immediate: true },
    )

    ctx.state.pokemon = pokemon as any
  },

  actions: {
    refresh(ctx) {
      ;(ctx.state.pokemon as any)?.refetch?.()
    },
    onSearch(ctx, event) {
      const input = event?.target as HTMLInputElement | undefined
      ctx.state.search = input?.value ?? ''
    },
  },

  render(ctx) {
    const res = ctx.state.pokemon as any

    if (!res) return html`<p class="text-gray-500">Initializing…</p>`

    if (res.loading) {
      return html`
        <div class="flex items-center gap-2 text-amber-600">
          <span class="animate-spin inline-block w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full"></span>
          Loading Pokémon…
        </div>
      `
    }

    if (res.error) {
      return html`
        <div class="text-red-600">
          <p>Error: ${res.error.message}</p>
          <button class="mt-2 px-3 py-1.5 bg-red-100 rounded-md hover:bg-red-200" @click=${ctx.actions.refresh}>
            Retry
          </button>
        </div>
      `
    }

    const list: Pokemon[] = Array.isArray(res.data) ? res.data : []
    const search = (ctx.state.search ?? '').toLowerCase().trim()
    const filtered = search
      ? list.filter(
          (p) =>
            p.name.toLowerCase().includes(search) ||
            (p.types ?? []).some((t) => (t.type?.name ?? '').toLowerCase().includes(search)),
        )
      : list

    return html`
      <div class="space-y-4">
        <div class="flex flex-wrap items-center gap-2 sm:gap-3">
          <input
            type="search"
            placeholder="Search by name or type…"
            class="flex-1 min-w-[160px] px-3 py-1.5 border border-amber-200 rounded-md text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
            .value=${ctx.state.search}
            @input=${ctx.actions.onSearch}
          />
          <span class="text-sm text-zinc-500">from <a href="https://pokeapi.co" target="_blank" rel="noopener" class="text-amber-600 hover:underline">PokéAPI</a></span>
          <button
            class="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-md text-sm font-medium hover:bg-amber-200"
            @click=${ctx.actions.refresh}
          >
            Refresh
          </button>
        </div>
        ${search && filtered.length === 0
          ? html`<p class="text-zinc-500 text-sm py-4">No Pokémon matching "${ctx.state.search}"</p>`
          : ''}
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          ${filtered.map(
            (p) => html`
              <div class="rounded-xl border border-amber-100 bg-amber-50/50 p-4 text-center">
                <img
                  src=${p.sprites?.front_default ?? ''}
                  alt=${p.name}
                  class="mx-auto w-20 h-20 object-contain"
                  loading="lazy"
                />
                <p class="font-semibold capitalize text-zinc-800 mt-2">${p.name}</p>
                <div class="flex justify-center gap-1 mt-1">
                  ${(p.types ?? []).map(
                    (t) =>
                      html`<span
                        class="px-2 py-0.5 text-xs rounded-full bg-amber-200 text-amber-900 capitalize"
                        >${t.type?.name ?? ''}</span
                      >`,
                  )}
                </div>
              </div>
            `,
          )}
        </div>
      </div>
    `
  },
})
