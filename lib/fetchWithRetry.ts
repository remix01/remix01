export type FetchRetrySuccess<T> = {
  ok: true
  data: T
  status: number
  attempt: number
  durationMs: number
  cacheStatus: string | null
}

export type FetchRetryFailure = {
  ok: false
  status: number | null
  attempt: number
  durationMs: number
  isMissing: boolean
  isTransient: boolean
  reason: string
  cacheStatus: string | null
  errorCode?: string
  errorMessage?: string
}

export type FetchRetryResult<T> = FetchRetrySuccess<T> | FetchRetryFailure

type FetchRetryOptions = {
  retries?: number
  initialDelayMs?: number
  timeoutMs?: number
  method?: string
  headers?: Record<string, string>
  cache?: RequestCache
  next?: NextFetchRequestConfig
  body?: BodyInit
  requestLabel?: string
}

const DEFAULT_RETRIES = 2
const DEFAULT_INITIAL_DELAY_MS = 250
const DEFAULT_TIMEOUT_MS = 3000

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isTransientStatus(status: number) {
  return status === 429 || status >= 500
}

function parseErrorPayload(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return { errorCode: undefined, errorMessage: undefined }
  }

  const maybeCode = Reflect.get(payload, 'code') ?? Reflect.get(payload, 'errorCode')
  const maybeMessage = Reflect.get(payload, 'message') ?? Reflect.get(payload, 'error')

  return {
    errorCode: typeof maybeCode === 'string' ? maybeCode : undefined,
    errorMessage: typeof maybeMessage === 'string' ? maybeMessage : undefined,
  }
}

export async function fetchWithRetry<T>(url: string, options: FetchRetryOptions = {}): Promise<FetchRetryResult<T>> {
  const retries = options.retries ?? DEFAULT_RETRIES
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const method = options.method ?? 'GET'

  let attempt = 0
  let lastFailure: FetchRetryFailure | null = null

  while (attempt <= retries) {
    attempt += 1
    const startedAt = Date.now()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, {
        method,
        headers: options.headers,
        body: options.body,
        cache: options.cache,
        next: options.next,
        signal: controller.signal,
      })

      clearTimeout(timeout)

      const durationMs = Date.now() - startedAt
      const cacheStatus = response.headers.get('x-vercel-cache')

      if (response.ok) {
        const data = (await response.json()) as T

        console.info('[dynamic-route-fetch] success', {
          requestLabel: options.requestLabel,
          url,
          status: response.status,
          attempt,
          durationMs,
          cacheStatus,
        })

        return {
          ok: true,
          data,
          status: response.status,
          attempt,
          durationMs,
          cacheStatus,
        }
      }

      const maybeJson = await response.json().catch(() => null)
      const { errorCode, errorMessage } = parseErrorPayload(maybeJson)
      const isMissing = response.status === 404
      const isTransient = isTransientStatus(response.status)

      lastFailure = {
        ok: false,
        status: response.status,
        attempt,
        durationMs,
        isMissing,
        isTransient,
        reason: isMissing ? 'resource_missing' : isTransient ? 'transient_http_error' : 'http_error',
        cacheStatus,
        errorCode,
        errorMessage,
      }

      const failureLog = {
        requestLabel: options.requestLabel,
        url,
        status: response.status,
        attempt,
        durationMs,
        cacheStatus,
        reason: lastFailure.reason,
        errorCode,
      }
      if (isMissing) {
        console.info('[dynamic-route-fetch] missing', failureLog)
      } else {
        console.warn('[dynamic-route-fetch] failure', failureLog)
      }

      if (!isTransient || attempt > retries) {
        return lastFailure
      }
    } catch (error) {
      clearTimeout(timeout)

      const durationMs = Date.now() - startedAt
      const reason = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'network_error'

      lastFailure = {
        ok: false,
        status: null,
        attempt,
        durationMs,
        isMissing: false,
        isTransient: true,
        reason,
        cacheStatus: null,
        errorMessage: error instanceof Error ? error.message : String(error),
      }

      console.warn('[dynamic-route-fetch] exception', {
        requestLabel: options.requestLabel,
        url,
        attempt,
        durationMs,
        reason,
        error: lastFailure.errorMessage,
      })

      if (attempt > retries) {
        return lastFailure
      }
    }

    const backoffMs = initialDelayMs * 2 ** (attempt - 1)
    await sleep(backoffMs)
  }

  return lastFailure ?? {
    ok: false,
    status: null,
    attempt,
    durationMs: 0,
    isMissing: false,
    isTransient: true,
    reason: 'unknown_error',
    cacheStatus: null,
  }
}
