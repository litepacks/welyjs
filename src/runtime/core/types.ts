export const nothing = Symbol('wely.nothing')

export interface TemplateResult {
  readonly __welyTemplate: true
  readonly strings: readonly string[]
  readonly values: readonly unknown[]
}

export interface CSSResult {
  readonly cssText: string
}

export type RenderValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Node
  | TemplateResult
  | typeof nothing
  | RenderValue[]
