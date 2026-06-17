import type { TemplateResult } from './types'

export function html(strings: TemplateStringsArray, ...values: unknown[]): TemplateResult {
  return {
    __welyTemplate: true,
    strings: [...strings],
    values,
  }
}

export function isTemplateResult(value: unknown): value is TemplateResult {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { __welyTemplate?: boolean }).__welyTemplate === true
  )
}
