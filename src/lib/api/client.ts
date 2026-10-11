import { adminApiPath } from '@/config/env'

/** Header name expected by the backend CSRF guard (`admin_common._check_csrf`). */
export const CSRF_HEADER_NAME = 'X-CSRFToken'

export type CsrfTokenProvider = (
  forceRefresh?: boolean,
) => string | null | Promise<string | null>

let csrfTokenProvider: CsrfTokenProvider | null = null

/** Register a hook that supplies the CSRF token for state-changing requests. */
export function setCsrfTokenProvider(provider: CsrfTokenProvider | null): void {
  csrfTokenProvider = provider
}

function isMutationMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())
}

async function resolveCsrfHeaders(
  method: string,
  forceRefresh = false,
): Promise<Record<string, string>> {
  if (!isMutationMethod(method) || csrfTokenProvider === null) {
    return {}
  }

  const token = await csrfTokenProvider(forceRefresh)
  if (!token) {
    return {}
  }

  return { [CSRF_HEADER_NAME]: token }
}

/**
 * Same-origin admin API fetch wrapper.
 * Uses cookie credentials and injects CSRF headers on mutations when a provider is set.
 *
 * A single 403 `CSRF_FAILED` is retried once with a freshly read token. Django
 * rotates the CSRF secret on login, so a token cached before sign-in is stale
 * and would otherwise make the first save after sign-in a dead end. The retry
 * is bounded to one attempt so a genuine permission failure still surfaces.
 */
export async function adminFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const method = init.method ?? 'GET'
  const response = await performFetch(path, init, method, false)
  if (response.status === 403 && isMutationMethod(method)) {
    const body = await response.clone().text()
    if (body.includes('CSRF_FAILED') && onCsrfRejected) {
      onCsrfRejected()
      return performFetch(path, init, method, true)
    }
  }
  return response
}

type CsrfRejectedHandler = () => void

let onCsrfRejected: CsrfRejectedHandler | null = null

/** Register the hook that discards a token the server just rejected. */
export function setCsrfRejectedHandler(
  handler: CsrfRejectedHandler | null,
): void {
  onCsrfRejected = handler
}

async function performFetch(
  path: string,
  init: RequestInit,
  method: string,
  forceRefresh: boolean,
): Promise<Response> {
  const csrfHeaders = forceRefresh
    ? await resolveCsrfHeaders(method, true)
    : await resolveCsrfHeaders(method)
  const headers = new Headers(init.headers)

  for (const [name, value] of Object.entries(csrfHeaders)) {
    headers.set(name, value)
  }

  return fetch(adminApiPath(path), {
    ...init,
    credentials: 'include',
    headers,
  })
}
