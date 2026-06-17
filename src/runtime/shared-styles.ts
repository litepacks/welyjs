import tailwindCss from 'virtual:wely-tailwind.css?inline'

let _sheet: CSSStyleSheet | null = null

export function getTailwindSheet(): CSSStyleSheet | null {
  if (!tailwindCss || !String(tailwindCss).trim()) return null
  if (_sheet) return _sheet

  try {
    _sheet = new CSSStyleSheet()
    _sheet.replaceSync(String(tailwindCss))
    return _sheet
  } catch {
    return null
  }
}
