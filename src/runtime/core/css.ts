import type { CSSResult } from './types'

function toCssText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'cssText' in value) {
    return String((value as { cssText: unknown }).cssText)
  }
  return ''
}

export function css(strings: TemplateStringsArray, ...values: unknown[]): CSSResult {
  let cssText = strings[0] ?? ''
  for (let i = 0; i < values.length; i += 1) {
    cssText += toCssText(values[i]) + (strings[i + 1] ?? '')
  }
  return { cssText }
}
