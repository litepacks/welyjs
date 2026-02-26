import tailwindCss from '../styles/tailwind.css?inline'

let _sheet: CSSStyleSheet | null = null

export function getTailwindSheet(): CSSStyleSheet | null {
  if (_sheet) return _sheet

  try {
    _sheet = new CSSStyleSheet()
    _sheet.replaceSync(tailwindCss)
    return _sheet
  } catch {
    return null
  }
}
