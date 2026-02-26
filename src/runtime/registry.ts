import type { ComponentDef } from './types'

const registry = new Map<string, ComponentDef>()

export function registerComponent(tag: string, def: ComponentDef): void {
  if (registry.has(tag)) {
    console.warn(`[wely] Component "${tag}" is already registered. Skipping.`)
    return
  }
  registry.set(tag, def)
}

export function getComponent(tag: string): ComponentDef | undefined {
  return registry.get(tag)
}

export function getAllComponents(): Map<string, ComponentDef> {
  return new Map(registry)
}
