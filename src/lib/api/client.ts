import { adminApiPath } from '@/config/env'

/** Header name expected by the backend CSRF guard (`admin_common._check_csrf`). */
export const CSRF_HEADER_NAME = 'X-CSRFToken'

export type CsrfTokenProvider = () => string | null | Promise<string | null>

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
): Promise<Record<string, string>> {
  if (!isMutationMethod(method) || csrfTokenProvider === null) {
    return {}
  }

  const token = await csrfTokenProvider()
  if (!token) {
    return {}
  }

  return { [CSRF_HEADER_NAME]: token }
}

/**
 * Same-origin admin API fetch wrapper.
 * Uses cookie credentials and injects CSRF headers on mutations when a provider is set.
 */
export async function adminFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const method = init.method ?? 'GET'
  const csrfHeaders = await resolveCsrfHeaders(method)
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
