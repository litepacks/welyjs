// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Base configuration for an API client instance. */
export interface ClientConfig {
  /** Prefix prepended to every request path (e.g. `https://api.example.com`). */
  baseURL?: string
  /** Default headers merged into every request. */
  headers?: Record<string, string>
  /** Default timeout in milliseconds. Triggers `AbortController` on expiry. */
  timeout?: number
}

/** Per-request options (no body). */
export interface RequestConfig {
  headers?: Record<string, string>
  /** Query parameters appended to the URL. */
  params?: Record<string, string | number | boolean>
  signal?: AbortSignal
  timeout?: number
}

/** Per-request options (with body). */
export interface BodyRequestConfig extends RequestConfig {
  body?: unknown
}

/** Typed response wrapper returned by every client method. */
export interface ApiResponse<T = unknown> {
  /** Parsed response body (JSON or text). */
  data: T
  status: number
  statusText: string
  headers: Headers
  ok: boolean
}

/**
 * Error thrown on non-2xx responses or network failures.
 * Carries the HTTP `status` and the parsed response `data` for inspection.
 */
export class ApiError extends Error {
  status: number
  statusText: string
  data: unknown

  constructor(message: string, status: number, statusText: string, data: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.statusText = statusText
    this.data = data
  }
}

type RequestInterceptor = (url: string, init: RequestInit) => RequestInit | Promise<RequestInit>
type ResponseInterceptor = <T>(response: ApiResponse<T>) => ApiResponse<T> | Promise<ApiResponse<T>>
type ErrorInterceptor = (error: ApiError) => void

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/** HTTP client instance returned by `createClient()`. */
export interface ApiClient {
  get<T = unknown>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>
  post<T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>
  put<T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>
  patch<T = unknown>(url: string, body?: unknown, config?: RequestConfig): Promise<ApiResponse<T>>
  delete<T = unknown>(url: string, config?: RequestConfig): Promise<ApiResponse<T>>
  /** Register a request interceptor (modify headers, log, etc.). */
  onRequest(fn: RequestInterceptor): void
  /** Register a response interceptor (transform data, log, etc.). */
  onResponse(fn: ResponseInterceptor): void
  /** Register an error handler (redirect on 401, show toast, etc.). */
  onError(fn: ErrorInterceptor): void
}

/**
 * Create a configured HTTP client. Zero dependencies — built on native `fetch`.
 *
 * @example
 * ```ts
 * const api = createClient({
 *   baseURL: 'https://api.example.com',
 *   headers: { Authorization: 'Bearer token' },
 *   timeout: 5000,
 * })
 *
 * const { data } = await api.get<User[]>('/users')
 * ```
 */
export function createClient(config: ClientConfig = {}): ApiClient {
  const requestInterceptors: RequestInterceptor[] = []
  const responseInterceptors: ResponseInterceptor[] = []
  const errorInterceptors: ErrorInterceptor[] = []

  function buildURL(path: string, params?: Record<string, string | number | boolean>): string {
    const base = config.baseURL?.replace(/\/+$/, '') ?? ''
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = new URL(`${base}${normalizedPath}`, globalThis.location?.origin ?? 'http://localhost')

    if (params) {
      for (const [key, val] of Object.entries(params)) {
        url.searchParams.set(key, String(val))
      }
    }

    return config.baseURL ? url.toString() : `${normalizedPath}${url.search}`
  }

  async function request<T>(method: string, url: string, body?: unknown, reqConfig?: RequestConfig): Promise<ApiResponse<T>> {
    const fullURL = buildURL(url, reqConfig?.params)

    let init: RequestInit = {
      method,
      headers: {
        ...config.headers,
        ...reqConfig?.headers,
      },
    }

    if (body !== undefined && body !== null) {
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
      if (!isFormData) {
        init.headers = { 'Content-Type': 'application/json', ...init.headers as Record<string, string> }
        init.body = JSON.stringify(body)
      } else {
        init.body = body as FormData
      }
    }

    const timeout = reqConfig?.timeout ?? config.timeout
    let controller: AbortController | undefined
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    if (reqConfig?.signal) {
      init.signal = reqConfig.signal
    } else if (timeout) {
      controller = new AbortController()
      init.signal = controller.signal
      timeoutId = setTimeout(() => controller!.abort(), timeout)
    }

    for (const interceptor of requestInterceptors) {
      init = await interceptor(fullURL, init)
    }

    try {
      const raw = await fetch(fullURL, init)

      let data: T
      const contentType = raw.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        data = await raw.json()
      } else {
        data = await raw.text() as T
      }

      if (!raw.ok) {
        const err = new ApiError(
          `${method.toUpperCase()} ${url} failed with ${raw.status}`,
          raw.status,
          raw.statusText,
          data,
        )
        for (const handler of errorInterceptors) handler(err)
        throw err
      }

      let response: ApiResponse<T> = {
        data,
        status: raw.status,
        statusText: raw.statusText,
        headers: raw.headers,
        ok: raw.ok,
      }

      for (const interceptor of responseInterceptors) {
        response = await interceptor(response) as ApiResponse<T>
      }

      return response
    } catch (err) {
      if (err instanceof ApiError) throw err

      const isAbort = err instanceof DOMException && err.name === 'AbortError'
      const apiErr = new ApiError(
        isAbort ? `Request timeout after ${timeout}ms` : (err as Error).message,
        0,
        isAbort ? 'Timeout' : 'NetworkError',
        null,
      )
      for (const handler of errorInterceptors) handler(apiErr)
      throw apiErr
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  return {
    get:    <T>(url: string, cfg?: RequestConfig) => request<T>('GET', url, undefined, cfg),
    post:   <T>(url: string, body?: unknown, cfg?: RequestConfig) => request<T>('POST', url, body, cfg),
    put:    <T>(url: string, body?: unknown, cfg?: RequestConfig) => request<T>('PUT', url, body, cfg),
    patch:  <T>(url: string, body?: unknown, cfg?: RequestConfig) => request<T>('PATCH', url, body, cfg),
    delete: <T>(url: string, cfg?: RequestConfig) => request<T>('DELETE', url, undefined, cfg),
    onRequest:  (fn) => { requestInterceptors.push(fn) },
    onResponse: (fn) => { responseInterceptors.push(fn) },
    onError:    (fn) => { errorInterceptors.push(fn) },
  }
}
