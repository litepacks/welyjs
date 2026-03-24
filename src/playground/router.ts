export type Route = 'home' | 'docs' | 'gallery' | 'preview'

export function parseHash(): { route: Route; previewTag?: string } {
  const raw = location.hash.replace(/^#/, '').trim() || '/home'
  const q = raw.indexOf('?')
  const pathPart = q >= 0 ? raw.slice(0, q) : raw
  const queryPart = q >= 0 ? raw.slice(q + 1) : ''
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`
  const params = new URLSearchParams(queryPart)

  if (path.startsWith('/docs')) return { route: 'docs' }
  if (path.startsWith('/gallery')) return { route: 'gallery' }
  if (path.startsWith('/preview')) return { route: 'preview', previewTag: params.get('tag') ?? undefined }
  return { route: 'home' }
}

export function setRoute(route: Route, previewTag?: string) {
  if (route === 'home') location.hash = '#/home'
  else if (route === 'preview') {
    if (previewTag) location.hash = `#/preview?tag=${encodeURIComponent(previewTag)}`
    else location.hash = '#/preview'
  } else location.hash = `#/${route}`
}
