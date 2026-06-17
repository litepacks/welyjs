import { resolveWelyjsAlias } from './welyjs-alias'

export function welyConsumerResolve(root: string): Record<string, string> {
  return {
    ...resolveWelyjsAlias(root),
  }
}
