export type AdminErrorKind =
  | 'auth'
  | 'csrf'
  | 'validation'
  | 'forbidden'
  | 'conflict'
  | 'rate_limit'
  | 'network'
  | 'unknown'

export interface NormalizedAdminError {
  kind: AdminErrorKind
  code: string
  message: string
  fieldErrors: Record<string, string>
  status?: number
}

interface AdminErrorBody {
  code?: string
  message?: string
  fields?: Record<string, string | string[]>
}

function mapCodeToKind(code: string, status?: number): AdminErrorKind {
  switch (code) {
    case 'AUTH_REQUIRED':
    case 'AUTH_FAILED':
    case 'OTP_REQUIRED':
      return 'auth'
    case 'CSRF_FAILED':
      return 'csrf'
    case 'VALIDATION':
      return 'validation'
    case 'FORBIDDEN':
      return 'forbidden'
    case 'STALE_REVISION':
      return 'conflict'
    case 'RATE_LIMITED':
      return 'rate_limit'
    default:
      if (status === 403) return 'forbidden'
      if (status === 409) return 'conflict'
      return 'unknown'
  }
}

function normalizeFieldErrors(
  fields?: Record<string, string | string[]>,
): Record<string, string> {
  if (!fields) return {}
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(' ') : value,
    ]),
  )
}

export async function normalizeAdminError(
  response: Response,
): Promise<NormalizedAdminError> {
  const status = response.status
  let body: AdminErrorBody | null = null

  try {
    body = (await response.json()) as AdminErrorBody
  } catch {
    body = null
  }

  const code = body?.code ?? `HTTP_${status}`
  const message =
    body?.message ??
    (status === 0 ? 'Network request failed' : `Request failed (${status})`)

  return {
    kind: mapCodeToKind(code, status),
    code,
    message,
    fieldErrors: normalizeFieldErrors(body?.fields),
    status,
  }
}

export function normalizeNetworkError(error: unknown): NormalizedAdminError {
  return {
    kind: 'network',
    code: 'NETWORK_ERROR',
    message: error instanceof Error ? error.message : 'Network request failed',
    fieldErrors: {},
  }
}
