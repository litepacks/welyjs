import { describe, it, expect, beforeEach } from 'vitest'
import { defineConfig, getConfig, useConfig, resetConfig } from '../config'

beforeEach(() => {
  resetConfig()
})

describe('config', () => {
  it('stores and retrieves config values', () => {
    defineConfig({ apiURL: 'https://api.test.com', debug: true })

    const cfg = getConfig()
    expect(cfg.apiURL).toBe('https://api.test.com')
    expect(cfg.debug).toBe(true)
  })

  it('returns empty object when no config defined', () => {
    const cfg = getConfig()
    expect(cfg).toEqual({})
  })

  it('useConfig reads a single key', () => {
    defineConfig({ theme: 'dark', version: 3 })

    expect(useConfig('theme')).toBe('dark')
    expect(useConfig('version')).toBe(3)
  })

  it('useConfig returns fallback for missing keys', () => {
    defineConfig({ apiURL: '/api' })

    expect(useConfig('missing')).toBeUndefined()
    expect(useConfig('missing', 'default')).toBe('default')
  })

  it('getConfig returns a frozen snapshot', () => {
    defineConfig({ a: 1, b: 2 })

    const cfg = getConfig()
    expect(cfg.a).toBe(1)
    expect(cfg.b).toBe(2)
  })

  it('defineConfig returns the config object', () => {
    const result = defineConfig({ foo: 'bar' })
    expect(result).toEqual({ foo: 'bar' })
  })

  it('overrides previous config on re-call', () => {
    defineConfig({ a: 1 })
    defineConfig({ b: 2 })

    const cfg = getConfig()
    expect(cfg.a).toBeUndefined()
    expect(cfg.b).toBe(2)
  })
})
