export function initTheme(): boolean {
  const stored = localStorage.getItem('wely-playground-theme')
  if (stored === 'dark' || (!stored && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.setAttribute('data-theme', 'dark')
    return true
  }
  document.documentElement.removeAttribute('data-theme')
  return false
}

export function applyTheme(dark: boolean) {
  if (dark) document.documentElement.setAttribute('data-theme', 'dark')
  else document.documentElement.removeAttribute('data-theme')
  localStorage.setItem('wely-playground-theme', dark ? 'dark' : 'light')
}
