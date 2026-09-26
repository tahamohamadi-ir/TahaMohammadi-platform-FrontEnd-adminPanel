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
  /** The backend `issues` array (e.g. `409 VALIDATION_BLOCKED`) — empty
   * when the envelope carries none. Mirrors the wire's additive extension:
   * readers that do not need issues ignore the field. */
  issues: AdminErrorIssue[]
}

export interface AdminErrorIssue {
  code: string
  messageToken: string
  nodeKey?: string
  relationKey?: string
  groupKey?: string
}

interface AdminErrorBody {
  code?: string
  message?: string
  fields?: Record<string, string | string[]>
  issues?: unknown
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
    case 'PRECONDITION_REQUIRED':
    case 'APPROVAL_REQUIRED':
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

function normalizeIssues(bodyIssues: unknown): AdminErrorIssue[] {
  if (!Array.isArray(bodyIssues)) return []
  const issues: AdminErrorIssue[] = []
  for (const entry of bodyIssues) {
    if (typeof entry !== 'object' || entry === null) continue
    const record = entry as Record<string, unknown>
    if (typeof record['code'] !== 'string') continue
    const issue: AdminErrorIssue = {
      code: record['code'],
      messageToken:
        typeof record['messageToken'] === 'string'
          ? record['messageToken']
          : '',
    }
    for (const key of ['nodeKey', 'relationKey', 'groupKey'] as const) {
      if (typeof record[key] === 'string') {
        issue[key] = record[key]
      }
    }
    issues.push(issue)
  }
  return issues
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
    issues: normalizeIssues(body?.issues),
  }
}

export function normalizeNetworkError(error: unknown): NormalizedAdminError {
  return {
    kind: 'network',
    code: 'NETWORK_ERROR',
    message: error instanceof Error ? error.message : 'Network request failed',
    fieldErrors: {},
    issues: [],
  }
}
