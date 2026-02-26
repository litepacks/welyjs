import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createClient, ApiError } from '../fetch'

const mockFetch = vi.fn()

beforeEach(() => {
  mockFetch.mockReset()
  vi.stubGlobal('fetch', mockFetch)
})

function jsonResponse(data: unknown, status = 200, statusText = 'OK') {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  })
}

function textResponse(text: string, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: () => Promise.reject(new Error('not json')),
    text: () => Promise.resolve(text),
  })
}

describe('createClient', () => {
  it('performs a GET request', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ id: 1, name: 'Ali' }))
    const api = createClient({ baseURL: 'https://api.test.com' })

    const res = await api.get('/users/1')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.test.com/users/1')
    expect(init.method).toBe('GET')
    expect(res.data).toEqual({ id: 1, name: 'Ali' })
    expect(res.status).toBe(200)
    expect(res.ok).toBe(true)
  })

  it('performs a POST with JSON body', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ id: 2 }, 201))
    const api = createClient({ baseURL: 'https://api.test.com' })

    const res = await api.post('/users', { name: 'Veli' })

    const [, init] = mockFetch.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"name":"Veli"}')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(res.status).toBe(201)
  })

  it('merges base headers with request headers', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({}))
    const api = createClient({
      baseURL: 'https://api.test.com',
      headers: { Authorization: 'Bearer abc' },
    })

    await api.get('/me', { headers: { 'X-Custom': 'yes' } })

    const [, init] = mockFetch.mock.calls[0]
    const headers = init.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer abc')
    expect(headers['X-Custom']).toBe('yes')
  })

  it('appends query params', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse([]))
    const api = createClient({ baseURL: 'https://api.test.com' })

    await api.get('/search', { params: { q: 'test', page: 2 } })

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('q=test')
    expect(url).toContain('page=2')
  })

  it('throws ApiError on non-ok response', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ error: 'Not found' }, 404, 'Not Found'))
    const api = createClient({ baseURL: 'https://api.test.com' })

    await expect(api.get('/missing')).rejects.toThrow(ApiError)

    try {
      mockFetch.mockReturnValueOnce(jsonResponse({ error: 'Forbidden' }, 403, 'Forbidden'))
      await api.get('/secret')
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError)
      expect((e as ApiError).status).toBe(403)
      expect((e as ApiError).data).toEqual({ error: 'Forbidden' })
    }
  })

  it('handles text responses', async () => {
    mockFetch.mockReturnValueOnce(textResponse('hello world'))
    const api = createClient()

    const res = await api.get<string>('/text')

    expect(res.data).toBe('hello world')
  })

  it('supports PUT, PATCH, DELETE', async () => {
    const api = createClient({ baseURL: 'https://api.test.com' })

    mockFetch.mockReturnValueOnce(jsonResponse({ ok: true }))
    await api.put('/item/1', { name: 'updated' })
    expect(mockFetch.mock.calls[0][1].method).toBe('PUT')

    mockFetch.mockReturnValueOnce(jsonResponse({ ok: true }))
    await api.patch('/item/1', { name: 'patched' })
    expect(mockFetch.mock.calls[1][1].method).toBe('PATCH')

    mockFetch.mockReturnValueOnce(jsonResponse({ ok: true }))
    await api.delete('/item/1')
    expect(mockFetch.mock.calls[2][1].method).toBe('DELETE')
  })

  it('calls request interceptor', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({}))
    const api = createClient({ baseURL: 'https://api.test.com' })

    api.onRequest((_url, init) => {
      (init.headers as Record<string, string>)['X-Intercepted'] = 'true'
      return init
    })

    await api.get('/test')

    const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>
    expect(headers['X-Intercepted']).toBe('true')
  })

  it('calls response interceptor', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ value: 1 }))
    const api = createClient({ baseURL: 'https://api.test.com' })

    const spy = vi.fn((res) => res)
    api.onResponse(spy)

    await api.get('/test')

    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0].data).toEqual({ value: 1 })
  })

  it('calls error interceptor on failure', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ msg: 'fail' }, 500, 'Internal Server Error'))
    const api = createClient({ baseURL: 'https://api.test.com' })

    const errors: ApiError[] = []
    api.onError((err) => errors.push(err))

    await expect(api.get('/fail')).rejects.toThrow()
    expect(errors).toHaveLength(1)
    expect(errors[0].status).toBe(500)
  })

  it('throws on network error', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    const api = createClient({ baseURL: 'https://api.test.com' })

    await expect(api.get('/down')).rejects.toThrow(ApiError)

    try {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))
      await api.get('/down')
    } catch (e) {
      expect((e as ApiError).status).toBe(0)
      expect((e as ApiError).statusText).toBe('NetworkError')
    }
  })
})
