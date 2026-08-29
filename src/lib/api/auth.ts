import type { components } from '@/generated/admin-api'
import { adminFetch, setCsrfTokenProvider } from '@/lib/api/client'
import { normalizeAdminError, normalizeNetworkError } from '@/lib/api/errors'

export type AdminUserOut = components['schemas']['AdminUserOut']
export type LoginIn = components['schemas']['LoginIn']

export class AdminApiError extends Error {
  readonly kind: string
  readonly code: string
  readonly status?: number
  readonly fieldErrors: Record<string, string>

  constructor(
    message: string,
    kind: string,
    code: string,
    status?: number,
    fieldErrors: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'AdminApiError'
    this.kind = kind
    this.code = code
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

let cachedCsrfToken: string | null = null

async function toAdminApiError(response: Response): Promise<AdminApiError> {
  const normalized = await normalizeAdminError(response)
  return new AdminApiError(
    normalized.message,
    normalized.kind,
    normalized.code,
    normalized.status,
    normalized.fieldErrors,
  )
}

export async function adminJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  try {
    const response = await adminFetch(path, init)
    if (!response.ok) {
      throw await toAdminApiError(response)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  } catch (error) {
    if (error instanceof AdminApiError) {
      throw error
    }
    const normalized = normalizeNetworkError(error)
    throw new AdminApiError(
      normalized.message,
      normalized.kind,
      normalized.code,
    )
  }
}

export async function fetchCsrfToken(): Promise<string> {
  const body = await adminJson<{ csrfToken: string }>('/auth/csrf')
  cachedCsrfToken = body.csrfToken
  return body.csrfToken
}

export function installDefaultCsrfProvider(): void {
  setCsrfTokenProvider(async () => {
    if (cachedCsrfToken) {
      return cachedCsrfToken
    }
    return fetchCsrfToken()
  })
}

export async function loginAdmin(payload: LoginIn): Promise<AdminUserOut> {
  await fetchCsrfToken()
  return adminJson<AdminUserOut>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function fetchCurrentAdmin(): Promise<AdminUserOut | null> {
  const response = await adminFetch('/auth/me')
  if (response.status === 401 || response.status === 403) {
    return null
  }
  if (!response.ok) {
    throw await toAdminApiError(response)
  }
  return (await response.json()) as AdminUserOut
}

export async function logoutAdmin(): Promise<void> {
  await adminJson('/auth/logout', { method: 'POST' })
  cachedCsrfToken = null
}
